# Next steps

State at 2026-11-01: v1 is live and verified (`npm run check:live` passes 28 of 28). Migrations 001 to 003 are applied.

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
| Decide the restaurant data source (see below) | - | Run the coverage tests and build the import. |

## Claude tasks
### Replace the made-up sample restaurants with real ones (the main open task)
Legal sources researched on 2026-11-01 (not legal advice):
- **data.gov.sg hawker centres** (NEA; Open Data Licence, free for personal and commercial use): hawker centres only.
- **OpenStreetMap** (ODbL: credit required; publishing a database built from it means offering that database under ODbL, so keep the restaurant list public in the repo and add a "data credits" line to the privacy page). Overpass counts on 2026-11-01: about 8,800 food places in Singapore (restaurants, cafes, fast food, food courts). Named: 4,554 restaurants, 1,817 cafes, 1,371 fast-food places. Of the named restaurants about half (2,271) have a cuisine tag and about a fifth (1,008) have opening hours; 53 more are tagged disused. A sample showed it is usable only as a candidate list: food centres are mixed in with restaurants, cuisine tags are messy (for example `Thai_Cuisine` or ten tags on one food centre), some places have no street address, and there are no prices. Needs curation, not a blind import.
- **Foursquare Open Source Places** (Apache 2.0, attribution): Singapore coverage NOT measured on 2026-11-01. The documentation pages did not expose download details, the public copy on source.coop looked last updated Aug 2025, and the full dataset is very large and may need a Hugging Face login or approval.
- **Overture Maps places** (CDLA-Permissive-2.0): an open public question about upstream rights; second choice.
- **Do not use**: Google Places (storing results is restricted), or scraping Burpple, Chope, Google Maps or Instagram.
- None of these give price bands or "group" / "date" tags. The owner curates those from their own knowledge; copy only facts (name, area, coordinates, cuisine), never descriptions, photos or reviews.
Plan: coverage test of OpenStreetMap and Foursquare, then a dry-run import script that writes a candidate CSV (columns as in `data/sample-restaurants.csv`) for the owner to curate, then `npm run seed`. Update the terms page once the listings are real (it currently says they are samples).

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
