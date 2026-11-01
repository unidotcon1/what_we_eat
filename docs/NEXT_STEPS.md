# Next steps

State at 2026-11-02 (import screen built on main, not yet pushed after the live UI release): the Spots UI is live (Explore with one crosshair per card, Map tab, Spots screen with Targets and Conquered, Add a spot, four-tab bar; Conquered uses a flag icon). 325 unit tests pass and `npm run check:live` passes 30 of 30. Migrations 001 to 003 are applied; **004_spots.sql is not applied yet**, so spots live on the device only until the owner pastes it into the Supabase SQL editor.

## Done by the owner (verified where noted)
- Google consent screen published (privacy and terms links added).
- Cloudflare "Always Use HTTPS" on.
- Two-phone poll test completed.
- Supabase: Email provider off (public settings show only Google, verified 2026-11-01); "Allow anonymous sign-ins" off (screenshot); "Allow new users to sign up" stays ON (needed for new Google users).
- GitHub keep-alive: manual run passed on 2026-10-30. Next scheduled runs: Monday and Thursday 03:00 UTC. If the Actions tab ever shows a red run, check the secrets `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
- Claude's saved Cloudflare login revoked.
- Google Form idea dropped (the suggest link, import script and form docs were removed).

## Still open for the owner
| Task | Where | Then Claude |
|------|-------|-------------|
| Confirm **Redirect URLs** are only `https://what-we-eat.unidotcon.workers.dev/**` and `http://localhost:5173/**`, Site URL = the live address | Supabase, Authentication, URL Configuration | Cannot be checked from outside; ask for a screenshot of the list. |
| Run `supabase/migrations/006_security_hardening.sql` (poll throttle, nightly poll clean-up, safer functions). Say "ran 006". | Supabase, SQL editor | Run `npm run check:live`; try creating a poll. If the last block prints "pg_cron is not available", enable the pg_cron extension (Database, Extensions) and run just that block again. |
| Turn on **2-step verification / a passkey** for GitHub, Cloudflare, Supabase and the Google account that owns the Cloud project | Each site's security settings | Nothing to check from here. These four logins are the real way in to the app (see Security below). |
| GitHub: protect `main` (require a pull request, block force pushes), switch on secret scanning, push protection and Dependabot alerts | github.com/unidotcon1/what_we_eat, Settings | Dependabot opens weekly update PRs once `.github/dependabot.yml` is pushed. |
| Supabase: confirm Google is the only sign-in provider, then run **Security Advisor** (Database, Advisors) and send a screenshot of anything red or orange | Supabase dashboard | Fix what it reports. |
| Google Cloud: OAuth consent screen scopes are only `openid`, `email`, `profile`; the client's Authorised redirect URI is only the Supabase callback | console.cloud.google.com | Ask for a screenshot. |
| Decide the restaurant data source (see below) | - | Run the coverage tests and build the import. |

## Security (audit of 2026-11-01)
Result: no way found to take over a user's Google account or to get admin access. Google passwords never reach the app (Google sign-in with PKCE; the app holds only the public key). Anonymous visitors cannot write to any table, cannot call the points or delete functions, and cannot reach the auth admin API (probed live). Production dependencies: 0 known vulnerabilities.
Fixed in code (2026-11-01): the Google Maps import (the weakest link) now strips control characters, cuts names and addresses to the database limits and caps a file at 5000 places; saving to the account goes in chunks, retries rows one by one and shows a notice if some fail; signing out clears this phone's spots; account deletion needs the word DELETE typed; the CSP names only our own database host; the import page no longer claims places are never uploaded.
Still open (cannot be fixed in code): the owner's own logins (above); Supabase redirect-URL list (above); a Cloudflare rate-limit rule on `/rest/v1/rpc/create_poll` is a good extra layer. Accepted: points can be farmed up to the 30 a day cap by inserting spots directly; review spam across many Google accounts. `npm audit` still lists build-only items via vite-plugin-pwa (never shipped).
Rule of thumb: nothing secret in the repo or the app bundle; `.env` stays on this machine; if the Supabase secret key is ever pasted anywhere, rotate it.

## Next build tasks (Stage 1 remainder), in order
0. **UI refresh: the most urgent task.** Make the app appealing like Eatventure but calmer (one hero per screen, five things per card, motion and reward instead of clutter). Full plan, phases and four questions for the owner: `docs/UI_REFRESH_PLAN.md`. Plan only so far.
1. ~~Google Maps import screen~~ built 2026-11-02 (route `/import`, reached from Add a spot). Still to do: test it with a real export from the owner, since fixtures cannot show every real Google file layout.
2. **Skippable tour of the main features**, built after the UI refresh (P2 and P3) so it points at the new screens.
   - Shows once on first open. Every step has **Skip** (also Escape and a tap outside); finishing or skipping sets `wwe.tour_done` on the device so it never nags.
   - About five short steps, one idea each: find a place (search and chips); tap the crosshair to Target, press and hold to Conquer or Untarget; Start a vote and send it to friends; Spots and the Map; Profile (import from Google Maps, sign in).
   - **Profile has "Take the tour again"**, which clears the flag and replays it from step one, any time.
   - Rules: no new package (a small overlay we write ourselves, so the content policy and bundle stay as they are); works with a screen reader (focus stays inside the tour, each step announced, Skip first in tab order); animation is dropped when the phone asks for reduced motion; the tour must never block the vote link page `/p/<code>` (people opening a friend's link skip it automatically).
   - Test first: shows on first run only; Skip and Escape both end it and remember; Profile replays it; never shows on `/p/<code>`; keyboard and screen-reader behaviour.
3. Add by map pin and add by hand (name and pin required).
4. Conquered Spot rating (1 to 5), note (280 characters), private by default with a share switch, nickname, Report button (replaces the review form; see "Owner decisions" in PLAN.md).
5. Android release prep (see docs/ANDROID_RELEASE.md): icon, account deletion, 12-tester closed test.
6. Optional taste questions on first run (cuisine chips, location prompt), then Stage 3 and 4 in PLAN.md. The tour in item 2 replaces the "onboarding" screens that were planned here.

## Android prep status (2026-11-02)
Done and committed, not yet pushed: manifest polish, in-app account deletion plus /delete-account page, empty /.well-known/assetlinks.json, icon options, store listing drafts (docs/PLAY_LISTING.md), PWABuilder guide (docs/ANDROID_RELEASE.md).
Icon chosen (C, plate that is a target) and generated. Waiting on the owner: run supabase/migrations/005_delete_account.sql; create the Google Play developer account; pick the package name; recruit 12 testers; replace the sample restaurants with real ones before any store release.
Waiting on Play: after the first upload, the App signing SHA-256 fingerprint goes into public/.well-known/assetlinks.json.

## Claude tasks
### Replace the made-up sample restaurants with real ones (the main open task)
Legal sources researched on 2026-11-01 (not legal advice):
- **data.gov.sg hawker centres** (NEA; Open Data Licence, free for personal and commercial use): hawker centres only.
- **OpenStreetMap** (ODbL: credit required; publishing a database built from it means offering that database under ODbL, so keep the restaurant list public in the repo and add a "data credits" line to the privacy page). Overpass counts on 2026-11-01: about 8,800 food places in Singapore (restaurants, cafes, fast food, food courts). Named: 4,554 restaurants, 1,817 cafes, 1,371 fast-food places. Of the named restaurants about half (2,271) have a cuisine tag and about a fifth (1,008) have opening hours; 53 more are tagged disused. A sample showed it is usable only as a candidate list: food centres are mixed in with restaurants, cuisine tags are messy (for example `Thai_Cuisine` or ten tags on one food centre), some places have no street address, and there are no prices. Needs curation, not a blind import.
- **Foursquare Open Source Places** (Apache 2.0, attribution): Singapore coverage NOT measured on 2026-11-01. The documentation pages did not expose download details, the public copy on source.coop looked last updated Aug 2025, and the full dataset is very large and may need a Hugging Face login or approval.
- **Overture Maps places** (CDLA-Permissive-2.0): an open public question about upstream rights; second choice.
- **Do not use**: Google Places (storing results is restricted), or scraping Burpple, Chope, Google Maps or Instagram.
- None of these give price bands or "group" / "date" tags. The owner curates those from their own knowledge; copy only facts (name, area, coordinates, cuisine), never descriptions, photos or reviews.
**Built 2026-11-01:** `npm run candidates:osm` writes `data/candidates/osm-sg-candidates.csv` (git-ignored; 7,609 candidates: 58% with a cuisine, 21% with opening hours, 96% with an approximate area, 268 halal-tagged). Area names are the nearest of about 50 known centres within 2.5 km, so they are approximate. `price_band` and tags like `group`/`date` are blank for the owner to fill.
Next: the owner picks and fills in a few hundred rows; then make `scripts/seed.ts` accept a CSV path (it reads `data/sample-restaurants.csv` now), seed, replace the sample data, add a "data credits: OpenStreetMap contributors" line to the privacy page, and update the terms page (it currently says listings are samples). Optionally test Overture Maps as a second source.


### Other
- Real-database check of the review unique and not-blank rules and the back-dating trigger from migration 003 (applied, only partly exercised).
- Points of kind `submission` still exist in SQL and `src/domain/points.ts` but nothing awards them now; remove in a future migration if wanted.

## Ideas, not started
- Pull saves from the account onto a new device after sign-in (today they are pushed up, not pulled down).
- Food icons from Twemoji or Noto Emoji so they look the same on every phone.
- Custom domain (optional).
- A different voting token for every poll (needs a migration plan for existing polls).
- Hide `user_id` on public review reads (use a view; test how row rules interact with column rights).
- A cleanup job for old polls: `delete_old_polls()` exists (30 days) but nothing runs it yet.

## Minor items deferred during the build
A failed vote (network blip, or the poll closing mid-tap) replaces the whole poll page with the error text instead of showing it inline, "Open now" crashes on hand-edited hours missing a day key, closed places are unlabeled on the Saved tab, the theme toggle has no "follow my phone" option, a name-derived restaurant id can overwrite an existing one on import, the GitHub keep-alive schedule stops after 60 days of no repo activity.
