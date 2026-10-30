-- What We Eat v1 schema. Run in the Supabase SQL editor.

create table restaurants (
  id text primary key,
  name text not null,
  area text not null,
  lat double precision not null,
  lng double precision not null,
  price_band int not null check (price_band between 1 and 4),
  cuisine text not null,
  tags text[] not null default '{}',
  hours jsonb,
  closed boolean not null default false
);

create table saves (
  user_id uuid not null references auth.users on delete cascade,
  restaurant_id text not null references restaurants on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);

create table polls (
  code text primary key,
  title text not null,
  closed boolean not null default false,
  creator_token text not null,
  created_at timestamptz not null default now()
);

create table poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_code text not null references polls on delete cascade,
  restaurant_id text not null references restaurants
);

create table votes (
  poll_code text not null references polls on delete cascade,
  voter_token text not null,
  option_id uuid not null references poll_options on delete cascade,
  primary key (poll_code, voter_token)
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  restaurant_id text not null references restaurants on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text not null check (char_length(body) <= 280),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('review', 'submission', 'first_save')),
  restaurant_id text references restaurants on delete set null,
  points int not null,
  created_at timestamptz not null default now()
);

-- a first-save bonus can only ever be earned once per user per restaurant
create unique index points_first_save_once
  on points_ledger (user_id, restaurant_id) where kind = 'first_save';

-- Row-level security
alter table restaurants enable row level security;
alter table saves enable row level security;
alter table polls enable row level security;
alter table poll_options enable row level security;
alter table votes enable row level security;
alter table reviews enable row level security;
alter table points_ledger enable row level security;

create policy "restaurants readable by all" on restaurants for select using (true);

create policy "own saves" on saves for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "polls readable by all" on polls for select using (true);
create policy "options readable by all" on poll_options for select using (true);
create policy "votes readable by all" on votes for select using (true);

-- creator_token holds a sha256 hash, so reading polls never reveals the token.
create function create_poll(p_title text, p_restaurant_ids text[], p_token text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text := substr(md5(random()::text || clock_timestamp()::text), 1, 6);
  v_id text;
begin
  insert into polls (code, title, creator_token)
  values (v_code, p_title, encode(sha256(convert_to(p_token, 'utf8')), 'hex'));
  foreach v_id in array p_restaurant_ids loop
    insert into poll_options (poll_code, restaurant_id) values (v_code, v_id);
  end loop;
  return v_code;
end $$;

-- Voting goes through these functions so closed polls reject votes and
-- only the creator's token can close a poll.
create function cast_vote(p_code text, p_option uuid, p_token text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from polls where code = p_code and closed) then
    raise exception 'poll is closed';
  end if;
  if not exists (select 1 from poll_options where id = p_option and poll_code = p_code) then
    raise exception 'unknown option';
  end if;
  -- voter_token stores a sha256 hash, so reading votes never reveals a token others could reuse
  insert into votes (poll_code, voter_token, option_id)
  values (p_code, encode(sha256(convert_to(p_token, 'utf8')), 'hex'), p_option)
  on conflict (poll_code, voter_token) do update set option_id = excluded.option_id;
end $$;

create function my_vote(p_code text, p_token text) returns uuid
language sql security definer set search_path = public as $$
  select option_id from votes
  where poll_code = p_code and voter_token = encode(sha256(convert_to(p_token, 'utf8')), 'hex');
$$;

create function close_poll(p_code text, p_token text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update polls set closed = true
  where code = p_code and creator_token = encode(sha256(convert_to(p_token, 'utf8')), 'hex');
end $$;

create policy "approved reviews readable" on reviews for select
  using (approved or auth.uid() = user_id);
create policy "own pending reviews" on reviews for insert
  with check (auth.uid() = user_id and approved = false);

create policy "own ledger readable" on points_ledger for select using (auth.uid() = user_id);
-- ledger rows are written only by award_points (see 002_points.sql)

-- live results on the vote page
alter publication supabase_realtime add table votes;
alter publication supabase_realtime add table polls;

grant execute on function create_poll(text, text[], text) to anon, authenticated;
grant execute on function cast_vote(text, uuid, text) to anon, authenticated;
grant execute on function close_poll(text, text) to anon, authenticated;
grant execute on function my_vote(text, text) to anon, authenticated;
