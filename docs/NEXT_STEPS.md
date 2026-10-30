# Next steps

State at 2026-10-30: v1 is live and verified (`npm run check:live` passes 28 of 28, 166 unit tests pass). Migrations 001 to 003 are applied. The items below are what is left.

## Owner tasks (things only the owner can click)
Tell Claude "done" for any of these and use the "Then Claude" column.

| # | Task | Where | Then Claude |
|---|------|-------|-------------|
| 1 | Turn off **Email** sign-ups and **anonymous sign-ins** | Supabase, Authentication, Sign In / Providers | Test that email sign-up is refused: `POST <supabase url>/auth/v1/signup` with the anon key and a fake email should fail ("signups not allowed"). Add that check to `scripts/check_live.ts`. |
| 2 | Narrow **Redirect URLs** to the live address and localhost, no wildcards; Site URL = live address | Supabase, Authentication, URL Configuration | Nothing to test from outside; ask the owner to sign in on the live site once. |
| 3 | **Publish** the Google consent screen (fill Branding: authorized domain `unidotcon.workers.dev`, privacy link `/privacy`, terms link `/terms`) | Google Cloud, Google Auth Platform | Ask the owner to sign in with a second Google account. |
| 4 | Fix the **keep-alive** workflow (a run failed; likely a malformed secret) | GitHub, Actions, "Keep Supabase awake", Run workflow | If it fails, ask for the last lines of the "Read one restaurant row" step. Secrets must be exactly `SUPABASE_URL` (`https://<id>.supabase.co`, no slash) and `SUPABASE_ANON_KEY` (publishable key). |
| 5 | Switch on **Always Use HTTPS** | Cloudflare, the site's settings | `curl -sI http://what-we-eat.unidotcon.workers.dev/` should redirect to https. |
| 6 | **Two-phone test**: open one poll on two phones, vote on one, see the other update (about 3 seconds) | phones | Fix if it does not. |
| 7 | Make a **Google Form** for restaurant suggestions (collect email plus the columns in `data/sample-restaurants.csv`) | Google Forms | Put its link in `VITE_SUGGEST_FORM_URL` in `.env.local` and as a Cloudflare build variable, push, then check the Explore page shows "Suggest a restaurant". |
| 8 | Optionally revoke Claude's saved Cloudflare login | Cloudflare, My Profile, API Tokens | Nothing; deploys do not need it. |

## Claude tasks (no owner action needed)
- Replace the made-up sample restaurants with real ones (the owner supplies or approves the list; keep the CSV columns; run `npm run seed`). Until then the terms page honestly says listings are samples.
- After an owner approves a Google Form export: `npx tsx scripts/import-approved.ts approved.csv` (header row matches the CSV plus `email`). This script has not been run on a real export yet.
- Real-database check of the points cap and review approval after migration 003 (the review unique and not-blank rules and the back-dating trigger were applied but only partly exercised).

## Ideas, not started
- Pull saves from the account onto a new device after sign-in (today they are pushed up, not pulled down).
- Food icons from Twemoji or Noto Emoji so they look the same on every phone (today: native emoji).
- Custom domain (optional, about US$10 to 30 a year).
- Make the per-poll voting token different for every poll (needs a migration plan for existing polls).
- Hide `user_id` on public review reads (use a view; test how row rules interact with column rights).
- Cleanup job for old polls: `delete_old_polls()` exists (30 days) but nothing runs it yet.

## Minor items deferred during the build
A failed vote (network blip, or the poll closing mid-tap) replaces the whole poll page with the error text instead of showing it inline, "Open now" crashes on hand-edited hours missing a day key, closed places are unlabeled on the Saved tab, the theme toggle has no "follow my phone" option, a name-derived restaurant id can overwrite an existing one on import, the GitHub keep-alive schedule stops after 60 days of no repo activity.
