# What We Eat

Find a place to eat in Singapore, build a shortlist, and send a no-login vote link to your group chat.
Design: `docs/superpowers/specs/2026-10-30-what-we-eat-design.md`. Plan: `docs/superpowers/plans/2026-10-30-what-we-eat-v1.md`.

## Run it now (no accounts needed)

```bash
npm install
npm run dev
```

Without Supabase the app uses the 25 bundled sample restaurants, and polls only work on one device.

## Turn on the online database (free)

1. Create a free project at supabase.com.
2. In the SQL editor run `supabase/migrations/001_schema.sql`, then `002_points.sql`.
3. Auth > Providers > Google: enable it (needs a Google Cloud OAuth client) and add your site URL to the redirect URLs.
4. Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Load the sample restaurants:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx scripts/seed.ts
```

Edit `data/sample-restaurants.csv` to change the list. Columns: name, area, lat, lng, price_band (1-4), cuisine, tags (separated by `|`), hours (for example `daily 11:00-22:00`, blank if unknown), closed (`yes` to hide).

## Reviews and suggested restaurants

- Reviews arrive as `approved = false`. Approve one in the Supabase table editor (set `approved` to true) and the reviewer gets +5 points.
- Create a Google Form that collects the submitter's email plus the same columns as the CSV. Put its link in `VITE_SUGGEST_FORM_URL`.
- Export approved responses to a CSV (header row matching the columns above plus `email`) and run:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx scripts/import-approved.ts approved.csv
```

## Deploy free on Cloudflare Pages

Connect the repo, build command `npm run build`, output directory `dist`, and add the same `VITE_` variables. `public/_redirects` makes poll links like `/p/abc123` work.
Add the repository secrets `SUPABASE_URL` and `SUPABASE_ANON_KEY` so `.github/workflows/keepalive.yml` keeps the free Supabase project from pausing.

## Tests

```bash
npm test
```

## Not verified against a live Supabase project yet

The SQL in `supabase/migrations/`, Google sign-in, realtime vote updates and the import scripts have unit tests with fakes but have not been run against a real project. Run through the steps above and try a poll across two phones before sharing it.
