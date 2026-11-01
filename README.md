# What We Eat

A Singapore restaurant finder for two moments: a group of friends picking a place last-minute, and a couple looking for a date spot. A side project that started from the group-chat question "where do we eat?".

Pick places with filters (price band, area, distance, group size, date night, cuisine, halal, open now), shortlist a few, and send the group a vote link. Friends vote without an account or an install.

## Built with Claude Code

This project was built together with [Claude Code](https://claude.com/claude-code), Anthropic's coding assistant. I made the product decisions: the audience, the features, what to cut (video and a Telegram bot), the design and colours, and the free-tier tech approach. Claude Code wrote the code and tests from a design spec and an implementation plan, and a separate Claude review pass checked the finished branch before release. The spec and plan are in `docs/superpowers/`, and the design mockups are in `docs/mockups/`.

## How it works

- **No-login polls.** "Send to friends" creates a poll and opens WhatsApp or Telegram with a prefilled message and a link. Voting uses a per-device token. Tokens are stored as SHA-256 hashes, so reading the votes table never reveals a token someone could reuse to change another person's vote.
- **Rules live in the database, not the browser.** Poll creation, voting and closing go through `security definer` Postgres functions. Row-level security covers every table. The function that grants points is not callable from the app.
- **Points with real constraints.** A 30-a-day cap in Singapore time and once-only first-save and submission bonuses are enforced in SQL with partial unique indexes. Approving a review in the dashboard fires a trigger that awards the points.
- **Runs without a backend too.** Without Supabase configured, the app uses bundled sample data and device-only polls.

## Stack

React 18, TypeScript, Vite, React Router, Supabase (Postgres, Google OAuth, Realtime), Leaflet with OpenStreetMap tiles, Lucide icons, vite-plugin-pwa (app shell cache only), Vitest and Testing Library.

## Cost

Designed to run for $0: Cloudflare Pages and Supabase free tiers, plus a scheduled GitHub Action that keeps the free database from pausing.

## Quality

149 tests across 30 files, written test-first. The schema, poll functions and points rules were also checked against a real Supabase project. See `supabase/migrations/`.

### Known gaps

- Live vote updates between two phones have not been tested yet.
- Saves made on another device are pushed to the account but not pulled back.

Design: `docs/superpowers/specs/2026-10-30-what-we-eat-design.md`. Plan: `docs/superpowers/plans/2026-10-30-what-we-eat-v1.md`.

## Run it now (no accounts needed)

```bash
npm install
npm run dev
```

Without Supabase the app uses the 25 bundled sample restaurants, and polls only work on one device.

## Turn on the online database (free)

1. Create a free project at supabase.com.
2. In the SQL editor run `supabase/migrations/001_schema.sql`, then `002_points.sql`, then `003_hardening.sql` (private polls, size limits, review and points hardening).
3. Auth > Providers > Google: enable it (needs a Google Cloud OAuth client) and add your site URL to the redirect URLs.
4. Create `.env.local` (used by the app) with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (the publishable key).
5. Create `.env` (used by the scripts only, never committed) with `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` (the secret key). Then load the sample restaurants:

```bash
npx tsx scripts/seed.ts
```

Edit `data/sample-restaurants.csv` to change the list. Columns: name, area, lat, lng, price_band (1-4), cuisine, tags (separated by `|`), hours (for example `daily 11:00-22:00`, blank if unknown), closed (`yes` to hide).

## Finding real restaurants (OpenStreetMap candidates)

```bash
npm run candidates:osm              # downloads once, then reuses data/candidates/osm-raw.json
npm run candidates:osm -- --refresh # download again
```

Writes `data/candidates/osm-sg-candidates.csv` (about 7,600 Singapore restaurants, cafes and fast-food places) with the same columns as `data/sample-restaurants.csv` plus `osm_id`, `osm_cuisine` and `source`. It is read-only: nothing touches the app or the database. `price_band` is left blank on purpose; you fill in price and tags such as `group` or `date`, then copy the rows you keep into `data/`. The data is © OpenStreetMap contributors under the ODbL: keep the `source` column, credit OpenStreetMap, and keep the published restaurant list open.

## Reviews

Reviews arrive as `approved = false`. Approve one in the Supabase table editor (set `approved` to true) and the reviewer gets +5 points.

## Deploy free on Cloudflare Pages

Connect the repo with build command `npm run build` and deploy command `npx wrangler deploy`, root directory `/`, and add the same `VITE_` variables as build variables, plus `NODE_VERSION=22`. `wrangler.jsonc` serves `dist/` and sends unknown paths to `index.html`, which is what makes poll links like `/p/abc123` work.
Add the repository secrets `SUPABASE_URL` and `SUPABASE_ANON_KEY` so `.github/workflows/keepalive.yml` keeps the free Supabase project from pausing.

## Tests and health check

```bash
npm test               # unit tests
npm run check:live     # 30 checks against the live site and database (needs .env and .env.local)
```

Open tasks and how to resume work: `docs/NEXT_STEPS.md` and `CLAUDE.md`.

## License

[MIT](LICENSE). The sample restaurants in `data/sample-restaurants.csv` are made-up entries for demonstration.
