-- Lets a signed-in person delete their own account from inside the app (Google Play requires this).
-- Run once in the Supabase SQL editor, after 001 to 004.
--
-- Everything tied to a person is removed automatically, because saves, spots, reviews and
-- points_ledger all reference auth.users with "on delete cascade". Polls and votes are anonymous
-- (they are linked to a device token, not to an account) so they hold no personal data and stay.

create or replace function delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then
    raise exception 'sign in required';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function delete_my_account() from public, anon;
grant execute on function delete_my_account() to authenticated;
