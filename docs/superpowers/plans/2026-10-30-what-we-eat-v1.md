# What We Eat v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build What We Eat, a free-to-run installable web app (PWA) for finding Singapore restaurants and sending a no-login vote link to a group chat.

**Architecture:** React + TypeScript single-page app (Vite). Pure domain logic (filters, points) lives in `src/domain` and is unit tested; Supabase (Postgres, Google auth, realtime) is reached only through `src/data`. Device-local state (saves, shortlist draft, voter token) lives in `src/local`.

**Tech Stack:** Vite, React 18, TypeScript, React Router, Vitest + Testing Library, `@supabase/supabase-js`, `lucide-react`, Leaflet + OpenStreetMap tiles, `vite-plugin-pwa`, Cloudflare Pages (free).

**Spec:** `docs/superpowers/specs/2026-10-30-what-we-eat-design.md` (mockups in `docs/mockups/`).

## Global Constraints

- App name: **What We Eat**. Singapore only. Budget $0 (no paid APIs, no Google Places).
- Colours: Cotton `#EDEBDD`, Cherry Red `#810100`, Maroon `#630000`, Noir Black `#1B1717`. Dark mode: Noir background, Cotton text, Cherry/Maroon accents. Light mode: Cotton background, Noir text, Cherry buttons. Follows the phone setting; manual toggle on Me.
- Filter controls are rounded rectangles (8px radius), not pills. Icons: `lucide-react`; food icons from Twemoji or Noto Emoji.
- Bottom tab bar pinned: Explore, Saved, Vote, Me. The friend vote page (`/p/:code`) has no tab bar.
- Price bands per person: $ under S$15, $$ S$15-30, $$$ S$30-60, $$$$ over S$60; multi-select means any selected band.
- Points: +5 approved review, +5 approved restaurant submission, +5 first save per user per restaurant ever; cap 30 points per day (Singapore time); levels at 50, 150, 400.
- Review: rating 1-5 plus text up to 280 characters, no photos; approved by hand in the Supabase dashboard.
- Voting needs no login; saving and shortlist work without login; sign-in only for reviews, submissions and points.
- No video, no Telegram bot, no push notifications. PWA caches the app shell only.

## Review Focus

- Search with empty text or only spaces: returns the full filtered list, no crash.
- "Open now" when a restaurant has no hours: it is excluded, never shown as open.
- Location permission denied: "Near me" falls back to the area picker with a message.
- Same device votes twice on a poll: one vote counts, second changes it; voting on a closed poll is rejected.
- Poll with tied top options: shows a tie, not an arbitrary winner.
- Points at the daily cap boundary (29 then +5) and across midnight Singapore time.
- Unsave then re-save a restaurant: no second +5.
- Review of 281 characters or rating 0/6: rejected.
- Sheet import row with blank price or unknown cuisine: skipped with a printed reason, import continues.

---

## File Structure

- `src/domain/` types, `filters.ts`, `points.ts`, `poll.ts` (pure, no I/O)
- `src/data/` `supabase.ts`, `restaurants.ts`, `polls.ts`, `reviews.ts`, `auth.ts`
- `src/local/` `store.ts` (saves, shortlist draft, voter token)
- `src/ui/` `theme.css`, `TabBar.tsx`, `pages/*` (`Explore`, `Saved`, `Vote`, `Me`, `PollPage`), `components/*`
- `supabase/migrations/` schema + RLS; `scripts/` seed and import; `data/sample-restaurants.csv`

### Task 1: Scaffold, theme, tab bar

**Files:** Create Vite project files, `src/ui/theme.css`, `src/ui/TabBar.tsx`, `src/App.tsx`, `src/ui/TabBar.test.tsx`, `.gitignore` (include `.superpowers/`, `node_modules`, `.env*`)

**Interfaces:** Produces `TabBar` (routes `/`, `/saved`, `/vote`, `/me`), CSS variables `--bg --text --accent --surface`.

- [ ] **Step 1:** `git init`; scaffold Vite React-TS; install deps from Tech Stack; configure Vitest with jsdom.
- [ ] **Step 2:** Test `TabBar.test.tsx`: renders four labelled links Explore, Saved, Vote, Me; the link for the current route has `aria-current="page"`.
- [ ] **Step 3:** Implement `TabBar` with lucide icons (compass, bookmark, check-square, user), fixed to bottom; `theme.css` defines light values on `:root` and dark values under `@media (prefers-color-scheme: dark)` and `[data-theme="dark"]`.
- [ ] **Step 4:** Run `npx vitest run` (PASS) and `npm run dev`; confirm bar stays pinned at the bottom.
- [ ] **Step 5:** Commit `feat: scaffold app, theme and tab bar`.

### Task 2: Domain types and filters

**Files:** Create `src/domain/types.ts`, `src/domain/filters.ts`, `src/domain/filters.test.ts`

**Interfaces:** Produces
`type PriceBand = 1|2|3|4`; `type Restaurant = {id:string; name:string; area:string; lat:number; lng:number; priceBand:PriceBand; cuisine:string; tags:string[]; hours?:Record<'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun',[string,string][]>; closed:boolean}`;
`type Filters = {query:string; bands:PriceBand[]; maxKm?:number; origin?:{lat:number;lng:number}; area?:string; audience:('group'|'date'|'small')[]; cuisines:string[]; dietary:string[]; openNow:boolean}`;
`applyFilters(list:Restaurant[], f:Filters, now:Date): Restaurant[]`; `sortRestaurants(list, by:'nearest'|'price', origin?)`; `distanceKm(a,b): number`.

- [ ] **Step 1:** Tests: bands `[2,3]` returns both bands; `maxKm:2` excludes a restaurant 3 km away (origin Bugis); `query:"  "` returns all; closed restaurants never returned; `openNow` excludes no-hours restaurant and includes one open at Fri 20:00 SGT; audience `group` matches tag "group"; no-match returns `[]`.
- [ ] **Step 2:** Run, confirm FAIL. **Step 3:** Implement (haversine for distance; opening hours evaluated in `Asia/Singapore`). **Step 4:** Run, confirm PASS. **Step 5:** Commit.

### Task 3: Database schema, RLS and sample data

**Files:** Create `supabase/migrations/001_schema.sql`, `data/sample-restaurants.csv` (25 made-up Singapore restaurants: columns name, area, lat, lng, price_band, cuisine, tags, hours, closed), `scripts/seed.ts`, `scripts/seed.test.ts`

**Interfaces:** Produces tables `restaurants`, `saves(user_id, restaurant_id)`, `polls(code, title, closed, creator_token)`, `poll_options(poll_id, restaurant_id)`, `votes(poll_id, voter_token, option_id)` unique on `(poll_id, voter_token)`, `reviews(id, user_id, restaurant_id, rating check 1..5, body check <=280, approved default false)`, `points_ledger(user_id, kind, restaurant_id, points, created_at)` with unique `(user_id, restaurant_id)` where kind `first_save`. RLS: restaurants readable by all; votes insertable/updatable by anyone for open polls; reviews readable only when approved; ledger readable by owner. `parseRestaurantRow(row): Restaurant | {skip:string}`.

- [ ] **Step 1:** Test `seed.test.ts`: row with blank price returns `{skip:'missing price_band'}`; unknown cuisine skipped; valid row returns Restaurant with `priceBand:2`.
- [ ] **Step 2-4:** Implement `parseRestaurantRow` and the seed script (reads CSV, prints skip reasons, continues); write migration; run migration in a Supabase free project and seed.
- [ ] **Step 5:** Commit.

### Task 4: Data layer

**Files:** Create `src/data/supabase.ts`, `src/data/restaurants.ts`, `src/data/restaurants.test.ts`

**Interfaces:** Consumes Task 2 types. Produces `fetchRestaurants(): Promise<Restaurant[]>`; reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; falls back to bundled `data/sample-restaurants.csv`-derived JSON when env vars are missing.

- [ ] Test with mocked client: maps DB rows to `Restaurant`; on error rejects with a readable message. Implement, run, commit.

### Task 5: Explore page

**Files:** Create `src/ui/pages/Explore.tsx`, `src/ui/components/FilterBar.tsx`, `FilterSheet.tsx`, `RestaurantCard.tsx`, `src/ui/cuisineIcons.ts`, tests beside each

**Interfaces:** Consumes `applyFilters`, `fetchRestaurants`. Produces `cuisineIcon(cuisine:string): string` (emoji or Twemoji asset path, default fork-and-knife), `RestaurantCard` props `{r:Restaurant; saved:boolean; inShortlist:boolean; onSave():void; onToggleShortlist():void}`.

- [ ] Tests: filter bar shows "Filters (3)" when three filters are active; removing a tag updates the list; sheet "Show N places" shows the live count; card renders cuisine icon tile, name, area, band and tags; empty result shows "No places match" with a Clear button.
- [ ] Implement per mockup: search, Filters button, sort, active tags with Clear, list view, rounded-rectangle controls. Commit.

### Task 6: Local store (saves, shortlist draft)

**Files:** Create `src/local/store.ts`, `src/local/store.test.ts`, `src/ui/pages/Saved.tsx`

**Interfaces:** Produces `useSaves(): {saved:Set<string>; toggle(id):void}`, `useShortlist(): {ids:string[]; toggle(id):void; clear():void}`; storage keys `wwe.saves`, `wwe.shortlist`; safe when localStorage throws.

- [ ] Tests: toggle adds then removes; persists across reload; corrupt JSON in storage yields empty set; storage throwing does not crash. Implement; Saved page lists saved restaurants. Commit.

### Task 7: Polls (create, share, vote)

**Files:** Create `src/domain/poll.ts`, `poll.test.ts`, `src/data/polls.ts`, `src/ui/pages/PollPage.tsx`, `src/ui/pages/Vote.tsx`, `src/ui/components/ShareButtons.tsx`

**Interfaces:** Produces `tally(votes:{optionId:string}[], options:string[]): {counts:Record<string,number>; leaders:string[]}` (tie gives multiple leaders); `shareLinks(title:string, optionNames:string[], url:string): {whatsapp:string; telegram:string}` (`https://wa.me/?text=` and `https://t.me/share/url?url=&text=`); `createPoll(title, restaurantIds): Promise<{code:string}>`; `castVote(code, optionId): Promise<void>` using the device token from `store.ts`; `closePoll(code)` for the creator token.

- [ ] Tests: tie returns both leaders; share text lists numbered options and the link and is URL-encoded; second `castVote` from the same token replaces the first; vote on closed poll rejects; zero votes returns no leaders.
- [ ] Implement; Vote tab lists draft shortlist on top with "Send to friends" and the user's polls; `/p/:code` shows live bars via Supabase realtime with no tab bar. Commit.

### Task 8: Points

**Files:** Create `src/domain/points.ts`, `points.test.ts`, SQL function `award_points` in `supabase/migrations/002_points.sql`

**Interfaces:** Produces `awardPoints(todayTotal:number, kind:'review'|'submission'|'first_save', alreadyHadFirstSave:boolean): number` (returns granted points after the 30/day cap) and `levelFor(total:number): {level:number; nextAt:number|null}`.

- [ ] Tests: `awardPoints(25,'review',false)` is 5; `awardPoints(30,'review',false)` is 0; `awardPoints(0,'first_save',true)` is 0; `levelFor(49).level` is 1, `levelFor(50).level` is 2, `levelFor(400).nextAt` is null.
- [ ] Implement; mirror the cap and uniqueness in the SQL function (day boundary at Asia/Singapore). Test the function with two inserts at the cap. Commit.

### Task 9: Auth and Me page

**Files:** Create `src/data/auth.ts`, `src/ui/pages/Me.tsx`, `Me.test.tsx`

**Interfaces:** Produces `signInWithGoogle(): Promise<void>`, `useUser(): {user:User|null}`; on first sign-in, merges local saves into `saves` and awards first-save points once each.

- [ ] Tests: signed-out Me shows "Sign in with Google" and the theme toggle; signed-in shows points total, level progress and counts; toggling theme sets `data-theme`; merge with 3 local saves inserts 3 rows once even if run twice. Implement, commit.

### Task 10: Reviews and submissions

**Files:** Create `src/data/reviews.ts`, `src/ui/components/ReviewForm.tsx`, test, `scripts/import-approved.ts`, `scripts/import-approved.test.ts`

**Interfaces:** Produces `submitReview(restaurantId, rating, body): Promise<void>` (requires user; inserts with `approved=false`); `importApproved(rows): {imported:number; skipped:string[]}` matching submitter email to a user and awarding +5 through `award_points`.

- [ ] Tests: rating 0 and 6 rejected; 281-character body rejected; 280 accepted; signed-out user is prompted to sign in; import skips rows without a restaurant name. Implement; add "Suggest a restaurant" link to the Google Form (collects email). Commit.

### Task 11: Map and near me

**Files:** Create `src/ui/components/MapView.tsx`, `src/ui/useLocation.ts`, tests

**Interfaces:** Produces `useLocation(): {status:'idle'|'granted'|'denied'; coords?:{lat:number;lng:number}; request():void}`; `MapView` props `{items:Restaurant[]}` with one pin per item and a Google Maps directions link in each popup.

- [ ] Tests: denied status shows the area picker and a message; pin count equals items; Map/List toggle switches views. Implement with Leaflet and OSM tiles (include tile attribution). Commit.

### Task 12: PWA, theme finish, deploy

**Files:** Modify `vite.config.ts` (vite-plugin-pwa, shell cache only), `public/` icons, `.github/workflows/keepalive.yml`; create `README.md`

- [ ] Add manifest (name "What We Eat", theme colours); verify Lighthouse PWA installable and light/dark both pass contrast; deploy to Cloudflare Pages with the two env vars; add a scheduled weekly request to Supabase so the free project does not pause; commit.

---

## Self-review notes

- Spec coverage: filters, bookmarks, shortlist/poll link, points, submissions, reviews, dark/light, tab bar, cuisine icons, map and PWA each map to a task. Validation tests with friends happen after Task 12; the Google Form itself is created by the user.
- Names checked across tasks: `Restaurant`, `Filters`, `applyFilters`, `awardPoints`, `tally`, `shareLinks`, `useSaves`, `useShortlist`.
- Left to the builder: exact level names, schema column types, Leaflet marker styling, service worker details.
