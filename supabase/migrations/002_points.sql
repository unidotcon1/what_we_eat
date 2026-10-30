-- Points: the 30-a-day cap (Singapore time) and once-only first-save rule are enforced here,
-- not in the browser. Mirrors src/domain/points.ts.

create function grant_points(p_user uuid, p_kind text, p_restaurant text) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_today int;
  v_grant int;
  v_rows int;
begin
  select coalesce(sum(points), 0) into v_today
  from points_ledger
  where user_id = p_user
    and (created_at at time zone 'Asia/Singapore')::date = (now() at time zone 'Asia/Singapore')::date;

  v_grant := greatest(0, least(5, 30 - v_today));
  if v_grant = 0 then
    return 0;
  end if;

  -- a first_save row is unique per (user, restaurant) forever, so unsave + re-save never pays twice
  insert into points_ledger (user_id, kind, restaurant_id, points)
  values (p_user, p_kind, p_restaurant, v_grant)
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  return case when v_rows = 1 then v_grant else 0 end;
end $$;

-- not callable from the app: only server-side code (service role) and the trigger below use it
revoke all on function grant_points(uuid, text, text) from public, anon, authenticated;

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

-- Approving a review in the Supabase dashboard (approved = true) awards the review points.
create function reviews_award() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.approved and not old.approved then
    perform grant_points(new.user_id, 'review', new.restaurant_id);
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
