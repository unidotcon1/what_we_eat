-- Stage 1: Conquered and Targeted spots. Run once in the Supabase SQL editor, after 001 to 003.
-- Safe to run twice. Nothing is deleted: the old `saves` table is kept as it is.
-- Until this is run, spots stay on each device and the app keeps working.

create table if not exists spots (
  user_id uuid not null references auth.users on delete cascade,
  id text not null check (char_length(id) between 1 and 80),
  place_id text references restaurants on delete set null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  address text not null default '' check (char_length(address) <= 200),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  state text not null check (state in ('conquered', 'targeted')),
  source text not null check (source in ('catalog', 'pin', 'manual', 'import', 'legacy_save')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  conquered_at timestamptz,
  primary key (user_id, id)
);

create index if not exists spots_user_state on spots (user_id, state);

alter table spots enable row level security;
revoke all on spots from anon;

drop policy if exists "own spots" on spots;
create policy "own spots" on spots for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- one person cannot store an unlimited number of rows
create or replace function spots_limit() returns trigger
language plpgsql as $$
begin
  if (select count(*) from spots where user_id = new.user_id) >= 5000 then
    raise exception 'spot limit reached';
  end if;
  return new;
end $$;

drop trigger if exists spots_limit_trigger on spots;
create trigger spots_limit_trigger before insert on spots
for each row execute function spots_limit();

revoke all on function spots_limit() from public, anon, authenticated;

-- Existing saves (heart bookmarks) become Targeted spots. Re-running adds nothing new.
insert into spots (user_id, id, place_id, name, address, lat, lng, state, source, created_at, updated_at, conquered_at)
select s.user_id, 'r:' || s.restaurant_id, s.restaurant_id, r.name, r.area, r.lat, r.lng,
       'targeted', 'legacy_save', s.created_at, s.created_at, null
from saves s
join restaurants r on r.id = s.restaurant_id
on conflict (user_id, id) do nothing;

-- The once-only +5 for the first time you add a catalogue place now looks at spots instead of saves.
create or replace function claim_first_save(p_restaurant text) returns int
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'sign in required';
  end if;
  if not exists (select 1 from spots where user_id = auth.uid() and place_id = p_restaurant) then
    raise exception 'restaurant is not in your spots';
  end if;
  return grant_points(auth.uid(), 'first_save', p_restaurant);
end $$;

-- Check after running (should show one row per state you have, and no error):
--   select state, count(*) from spots where user_id = auth.uid() group by state;
