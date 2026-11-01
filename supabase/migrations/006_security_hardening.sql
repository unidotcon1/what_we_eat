-- Security hardening after the 2026-11-01 audit. Run once in the Supabase SQL editor, after 001 to 005.
-- Safe to run twice. It changes no data.
--
-- 1. create_poll: anyone (no login) can call it, so cap how fast polls can be made.
-- 2. spots_limit: pin search_path, and stop two parallel inserts from slipping past the 5000 cap.
-- 3. delete_my_account: pin search_path to empty so no object can be swapped in by name.
-- 4. Delete polls older than 30 days every night (only if pg_cron is available; otherwise it just says so).

-- 1. Throttle poll creation -------------------------------------------------------------------
create index if not exists polls_created_at on polls (created_at);
create index if not exists polls_creator_created on polls (creator_token, created_at);

create or replace function create_poll(p_title text, p_restaurant_ids text[], p_token text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_title text := btrim(coalesce(p_title, ''));
  v_ids text[];
  v_code text;
  v_hash text;
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

  v_hash := encode(sha256(convert_to(p_token, 'utf8')), 'hex');

  -- one device: at most 20 polls an hour; everyone together: at most 1000 an hour
  if (select count(*) from polls where creator_token = v_hash and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'too many polls from this device, please try again later';
  end if;
  if (select count(*) from polls where created_at > now() - interval '1 hour') >= 1000 then
    raise exception 'too many polls right now, please try again later';
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
      insert into polls (code, title, creator_token) values (v_code, v_title, v_hash);
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

-- 2. spots_limit: fixed search_path, and one insert at a time per person ------------------------
create or replace function spots_limit() returns trigger
language plpgsql set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.user_id::text));
  if (select count(*) from spots where user_id = new.user_id) >= 5000 then
    raise exception 'spot limit reached';
  end if;
  return new;
end $$;

revoke all on function spots_limit() from public, anon, authenticated;

-- 3. delete_my_account: empty search_path, every name fully qualified ---------------------------
create or replace function delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'sign in required';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function delete_my_account() from public, anon;
grant execute on function delete_my_account() to authenticated;

-- 4. Nightly clean-up of old polls (needs the pg_cron extension) --------------------------------
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('delete-old-polls', '17 3 * * *', 'select public.delete_old_polls()');
exception when others then
  raise notice 'pg_cron is not available, so old polls are not deleted automatically: %', sqlerrm;
end $$;
