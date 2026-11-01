# What We Eat: notes for Claude Code

Singapore restaurant finder PWA. Groups filter places, build a shortlist, and send a no-login vote link to WhatsApp or Telegram.
Live: https://what-we-eat.unidotcon.workers.dev. Repo: github.com/unidotcon1/what_we_eat (public, MIT). Built with Claude Code.

## Start of every session
1. Read `docs/NEXT_STEPS.md` (open tasks and what to do when the owner says each one is done).
2. `git status -sb`, then `npm test`, then `npm run check:live` (28 checks on the live site and database; all should PASS).
3. Read `docs/superpowers/specs/2026-10-30-what-we-eat-design.md` only if a product question comes up.

## Rules the owner set
- **Never read, print or quote `.env` or `.env.local` values.** `.env` holds the Supabase secret key (scripts only); `.env.local` holds the app's public values. You may check which variable names exist and whether they are filled, nothing more.
- **snake_case for new identifiers.** Existing code is camelCase and React components stay PascalCase; do not rename old code unless asked.
- **Test first.** Write the failing test, watch it fail, then implement. Tests must never reach the real database (`vite.config.ts` blanks the `VITE_` variables for tests).
- Ask before anything outward-facing that was not requested (pushing is fine when asked; changing Supabase/Cloudflare/Google settings is the owner's job).
- Be honest about what is unverified.

## How things work
- Stack: React 18, TypeScript, Vite, react-router v7, Supabase (Postgres, Google auth), Leaflet/OpenStreetMap, vite-plugin-pwa (shell cache only), Vitest.
- `src/domain` pure logic (filters, points, poll, reviews). `src/data` Supabase access (`polls.ts` has a Supabase version and a device-only fallback used when no env vars). `src/local` device storage (saves, shortlist, voter token). `src/ui` pages and components. `scripts/` seed, icons, `check_live.ts`, `osm_candidates.ts` (read-only OpenStreetMap candidate list for the owner to curate).
- **Deploy = push to `main`.** Cloudflare builds (`npm run build`, then `npx wrangler deploy`) using its build variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. `wrangler.jsonc` serves `dist/` with a single-page-app fallback so `/p/<code>` works. `public/_headers` sets the security headers (strict CSP: any new external host must be added to it).
- **Database changes = a new numbered file in `supabase/migrations/`** (next is `004_*.sql`). Claude cannot run SQL; the owner pastes it into the Supabase SQL editor. Then verify with `npm run check:live` and ad-hoc REST calls using the anon key. Remove any test rows you create (service key from `.env`, never printed).
- Polls are private: read only through `get_poll(code)`; create/vote/close through security-definer functions; tokens are stored hashed. Points rules (30 a day in Singapore time, once-only first save and submission) live in SQL (`grant_points`).
- Windows machine: vitest needs the optional `@rolldown/binding-*` packages (already in `optionalDependencies`).
- Cloudflare CLI: the owner may have a saved `wrangler login`; the normal path is Git, not the CLI.

## Decisions (do not re-litigate without the owner)
Video uploads and a Telegram bot were cut. Saving works without login (device first, merged and synced when signed in). Voting needs no login. Reviews are approved by hand in the Supabase dashboard (+5 points). There is no restaurant-suggestion form: the owner dropped the Google Form idea (2026-11-01). Restaurants come from curated open data (see `docs/NEXT_STEPS.md`). The 25 restaurants are **sample data**, and the terms page says so; replace with real places before promoting.

## Accepted risks
Ballot stuffing is possible under no-login voting (capped at 500 votes per poll); one device token is reused across polls (hashed server-side); `reviews.user_id` is visible through the API. Four low `npm audit` items sit in build-only tooling.
