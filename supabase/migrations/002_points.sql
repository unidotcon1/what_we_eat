-- Points: the 30-a-day cap (Singapore time), the once-only first-save rule and the once-per-restaurant
-- submission rule are enforced here, not in the browser. Mirrors src/domain/points.ts.

-- The day a point was earned (Singapore time). A review approved later counts against the day it was written.
alter table points_ledger
  add column earned_on date not null default ((now() at time zone 'Asia/Singapore')::date);

-- re-running the submission import can never pay the same submission twice
create unique index points_submission_once
  on points_ledger (user_id, restaurant_id) where kind = 'submission';

create function grant_points(p_user uuid, p_kind text, p_restaurant text, p_earned_on date default null)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_day date := coalesce(p_earned_on, (now() at time zone 'Asia/Singapore')::date);
  v_today int;
  v_grant int;
  v_rows int;
begin
  select coalesce(sum(points), 0) into v_today
  from points_ledger
  where user_id = p_user and earned_on = v_day;

  v_grant := greatest(0, least(5, 30 - v_today));
  -- a first save is all or nothing: a partial grant would use up the once-per-restaurant bonus for good
  if p_kind = 'first_save' and v_grant < 5 then
    return 0;
  end if;
  if v_grant = 0 then
    return 0;
  end if;

  -- unique indexes make first_save and submission rows once-only per (user, restaurant)
  insert into points_ledger (user_id, kind, restaurant_id, points, earned_on)
  values (p_user, p_kind, p_restaurant, v_grant, v_day)
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  return case when v_rows = 1 then v_grant else 0 end;
end $$;

-- not callable from the app: only server-side code (service role) and the trigger below use it
revoke all on function grant_points(uuid, text, text, date) from public, anon, authenticated;

-- A signed-in user claims the first-save bonus for a restaurant they have saved.
create function claim_first_save(p_restaurant text) returns int
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'sign in required';
  end if;
  if not exists (select 1 from saves where user_id = auth.uid() and restaurant_id = p_restaurant) then
    raise exception 'restaurant is not saved';
  end if;
  return grant_points(auth.uid(), 'first_save', p_restaurant);
end $$;

grant execute on function claim_first_save(text) to authenticated;

-- Approving a review in the Supabase dashboard (approved = true) awards the review points,
-- counted against the day the review was written.
create function reviews_award() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.approved and not old.approved then
    perform grant_points(new.user_id, 'review', new.restaurant_id, (new.created_at at time zone 'Asia/Singapore')::date);
  end if;
  return new;
end $$;

create trigger reviews_award_points
after update of approved on reviews
for each row execute function reviews_award();

-- Total points for the signed-in user, for the Me page.
create function my_points() returns int
language sql security definer set search_path = public as $$
  select coalesce(sum(points), 0)::int from points_ledger where user_id = auth.uid();
$$;

grant execute on function my_points() to authenticated;

-- Manual check to run once in the Supabase SQL editor (replace the uuid with a real auth.users id):
--   select grant_points('<uuid>', 'review', null);   -- run 7 times: totals 30, the 7th returns 0
--   select grant_points('<uuid>', 'first_save', 'kopi-kin');  -- with 29 earned today returns 0, with 25 returns 5
