-- Security hardening from the independent audit. Run once in the Supabase SQL editor, after 001 and 002.
-- Deploy the matching app version (it reads polls through get_poll) right after running this.

-- 1. Polls become private. Nobody can list polls, options or votes through the API any more;
--    a poll is read only by its code, through get_poll below.
drop policy if exists "polls readable by all" on polls;
drop policy if exists "options readable by all" on poll_options;
drop policy if exists "votes readable by all" on votes;
do $$
begin
  alter publication supabase_realtime drop table votes;
exception when undefined_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime drop table polls;
exception when undefined_object then null;
end $$;

-- 2. Keep the order the creator chose.
alter table poll_options add column if not exists position int not null default 0;

-- 3. create_poll: size limits, distinct places, longer random codes and a retry on a code clash.
create or replace function create_poll(p_title text, p_restaurant_ids text[], p_token text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_title text := btrim(coalesce(p_title, ''));
  v_ids text[];
  v_code text;
  v_tries int := 0;
  v_pos int := 0;
  v_id text;
begin
  if char_length(v_title) not between 1 and 80 then
    raise exception 'title must be 1 to 80 characters';
  end if;
  if p_token is null or char_length(p_token) not between 16 and 64 then
    raise exception 'invalid token';
  end if;

  -- distinct places, keeping the first-seen order
  select array_agg(x order by first_pos) into v_ids
  from (
    select x, min(ord) as first_pos
    from unnest(p_restaurant_ids) with ordinality as t(x, ord)
    group by x
  ) s;
  if v_ids is null or array_length(v_ids, 1) not between 2 and 10 then
    raise exception 'a poll needs 2 to 10 different places';
  end if;

  loop
    v_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
    begin
      insert into polls (code, title, creator_token)
      values (v_code, v_title, encode(sha256(convert_to(p_token, 'utf8')), 'hex'));
      exit;
    exception when unique_violation then
      v_tries := v_tries + 1;
      if v_tries >= 5 then
        raise exception 'could not create the poll, please try again';
      end if;
    end;
  end loop;

  foreach v_id in array v_ids loop
    v_pos := v_pos + 1;
    insert into poll_options (poll_code, restaurant_id, position) values (v_code, v_id, v_pos);
  end loop;
  return v_code;
end $$;

-- 4. cast_vote: token size check and a cap of 500 votes per poll (changing a vote is always allowed).
create or replace function cast_vote(p_code text, p_option uuid, p_token text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_hash text;
  v_count int;
begin
  if p_token is null or char_length(p_token) not between 16 and 64 then
    raise exception 'invalid token';
  end if;
  if exists (select 1 from polls where code = p_code and closed) then
    raise exception 'poll is closed';
  end if;
  if not exists (select 1 from poll_options where id = p_option and poll_code = p_code) then
    raise exception 'unknown option';
  end if;

  v_hash := encode(sha256(convert_to(p_token, 'utf8')), 'hex');
  if not exists (select 1 from votes where poll_code = p_code and voter_token = v_hash) then
    select count(*) into v_count from votes where poll_code = p_code;
    if v_count >= 500 then
      raise exception 'this poll has reached its vote limit';
    end if;
  end if;

  insert into votes (poll_code, voter_token, option_id) values (p_code, v_hash, p_option)
  on conflict (poll_code, voter_token) do update set option_id = excluded.option_id;
end $$;

-- 5. get_poll: the only way to read a poll. Returns no tokens and no other polls.
create or replace function get_poll(p_code text) returns json
language sql security definer set search_path = public as $$
  select json_build_object(
    'code', p.code,
    'title', p.title,
    'closed', p.closed,
    'options', coalesce((
      select json_agg(json_build_object('id', o.id, 'restaurant_id', o.restaurant_id) order by o.position, o.id)
      from poll_options o where o.poll_code = p.code
    ), '[]'::json),
    'votes', coalesce((
      select json_agg(json_build_object('option_id', v.option_id))
      from votes v where v.poll_code = p.code
    ), '[]'::json)
  )
  from polls p where p.code = p_code;
$$;

grant execute on function get_poll(text) to anon, authenticated;

-- 6. Points: lock per user so parallel calls cannot overshoot the 30-a-day cap.
create or replace function grant_points(p_user uuid, p_kind text, p_restaurant text, p_earned_on date default null)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_day date := coalesce(p_earned_on, (now() at time zone 'Asia/Singapore')::date);
  v_today int;
  v_grant int;
  v_rows int;
begin
  perform pg_advisory_xact_lock(hashtext(p_user::text));

  select coalesce(sum(points), 0) into v_today
  from points_ledger
  where user_id = p_user and earned_on = v_day;

  v_grant := greatest(0, least(5, 30 - v_today));
  if p_kind = 'first_save' and v_grant < 5 then
    return 0;
  end if;
  if v_grant = 0 then
    return 0;
  end if;

  insert into points_ledger (user_id, kind, restaurant_id, points, earned_on)
  values (p_user, p_kind, p_restaurant, v_grant, v_day)
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  return case when v_rows = 1 then v_grant else 0 end;
end $$;

-- 7. Reviews: one per person per restaurant, some text required, and the date is set by the server
--    (a client can no longer back-date a review to get around the daily points cap).
create unique index if not exists reviews_one_per_user_restaurant on reviews (user_id, restaurant_id);
alter table reviews add constraint reviews_body_not_blank check (char_length(btrim(body)) > 0) not valid;

create or replace function reviews_force_created_at() returns trigger
language plpgsql as $$
begin
  new.created_at := now();
  return new;
end $$;

create trigger reviews_set_created_at
before insert on reviews
for each row execute function reviews_force_created_at();

-- 8. Functions meant only for signed-in users or the database itself are no longer callable by anonymous users.
revoke all on function claim_first_save(text) from public, anon;
grant execute on function claim_first_save(text) to authenticated;
revoke all on function my_points() from public, anon;
grant execute on function my_points() to authenticated;
revoke all on function reviews_award() from public, anon, authenticated;
revoke all on function reviews_force_created_at() from public, anon, authenticated;

-- 9. Optional housekeeping: delete polls older than 30 days (run by hand now and then,
--    or schedule with pg_cron if you enable it).
create or replace function delete_old_polls() returns int
language plpgsql security definer set search_path = public as $$
declare v_rows int;
begin
  delete from polls where created_at < now() - interval '30 days';
  get diagnostics v_rows = row_count;
  return v_rows;
end $$;

revoke all on function delete_old_polls() from public, anon, authenticated;
