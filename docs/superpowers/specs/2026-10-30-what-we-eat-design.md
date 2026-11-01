# What We Eat: v1 Design

## Intent and why
A Singapore restaurant finder for two moments: a large group of friends choosing a place to eat last-minute, and a couple looking for a date spot. The differentiator against Google Maps is **deciding together in under a minute**: filter, build a shortlist, send a no-login vote link to the group chat. Validation research (UX Researcher agent) says the group chat (WhatsApp/Telegram) is the real competitor, so voting must need no install and no login.

## Goals
- Find restaurants by price band and location, plus group/date tags.
- Bookmark restaurants.
- Create a shortlist, press "Send to friends", and share a no-login poll link via WhatsApp or Telegram share.
- Points for contributing (reviews, submitted restaurants, first saves) with a daily cap and levels.
- ~~Users can submit restaurants through a Google Form~~ (dropped by the owner on 2026-11-01).
- Light and dark mode, following the phone setting with a manual toggle.
- Publish for ~$0.

## Non-goals (v1)
- Video uploads or linked videos, video feed, video-type filters (removed by the user).
- Telegram bot or native chat polls (removed by the user).
- Table booking, deals, payments, native iOS/Android store apps.
- Paid APIs (Google Places).

## Anti-goals
- A dead-feeling app (empty lists, stale or closed restaurants).
- Voting that needs an account, an install, or more than one tap.
- Points that can be farmed.
- Any recurring cost the user cannot cover.

## Constraints
- Solo builder (the user, with Claude), budget $0 (optional $25 Google Play later).
- Singapore only. Data is sample restaurants first (made-up but realistic), real ones later.
- Do not copy third-party text or photos; facts only.
- Free-tier limits: verify Supabase free-tier terms (project pauses after inactivity; add a keep-alive ping).

## Approaches considered
A. **PWA + Supabase + free static hosting** (chosen). Free, one build serves the app and the vote page.
B. Native app (Expo) + Supabase. Costs $25 (Play) / $99 a year (Apple), and the vote link still needs a web page, so two builds.
C. No-code (Glide/AppSheet). Cannot do the points cap, no-login voting or the palette.
The user chose A.

## Decisions (as decided with the user)
**Platform:** installable web app (PWA). Hosting: Cloudflare Pages or Vercel free tier (builder's call).
**Database and auth:** Supabase Postgres. Google sign-in only for posting reviews, submitting, saving and earning points. Shortlist voting needs no login.
**Data seeding:** 20-30 sample restaurants in a Google Sheet, imported into Postgres.
**Navigation:** bottom tab bar pinned to the bottom: Explore, Saved, Vote, Me. The friend vote page has no tab bar. The Filters sheet slides over the tab bar.
**Explore:** search bar, a "Filters (n)" button, a sort control, active filters shown as removable tags with Clear, list/map toggle, cards with save (heart) and add-to-shortlist (+).
**Filters sheet** (five groups): Price ($, $$, $$$, $$$$ per person); Location (near me or pick an area, distance slider); Who's eating (big group 6+, date night, solo/small); Cuisine; Dietary and hours (halal, vegetarian, open now). A "Show N places" live-count button applies them.
**Shortlist and poll:** "Send to friends" creates a poll row in Postgres with a short link; the share sheet opens WhatsApp or Telegram with a prefilled message listing options plus the link. Friends vote without login; results update live.
**Points:** +5 approved review, +5 approved restaurant submission, +5 first save of a restaurant; cap 30 points per day; levels at 50, 150, 400 points. Numbers tunable after testing.
**Submissions:** dropped on 2026-11-01. The Google Form, the import script and the suggest link were removed. The +5 submission points still exist in SQL but nothing awards them.
**Theme:** Cotton `#EDEBDD`, Cherry Red `#810100`, Maroon `#630000`, Noir Black `#1B1717`. Dark mode: Noir background, Cotton text, Cherry/Maroon accents. Light mode: Cotton background, Noir text, Cherry buttons. App name: What We Eat. Mockups are in `.superpowers/brainstorm/`.

## Added after the builder check
**Decided by the user:**
- The shortlist is a draft kept on the device until "Send to friends". The Vote tab lists the user's polls (created and joined) with the draft at the top. Saved is bookmarks only.
- Saving and building a shortlist work without login (stored on the device, merged into the account on sign-in). Google sign-in is only asked for when posting a review or submitting a restaurant; points count from then.
- A review is a 1-5 rating plus up to 280 characters of text, no photos. The user approves reviews by hand in the Supabase dashboard; there is no admin screen in v1.

**Builder-check calls made by Claude (user can override):**
- Polls: single choice per person; voters can change their vote until the poll closes; voters identified by a token stored on the device; anyone can create a poll; no expiry in v1, creator can close it; results visible to anyone with the link; ties shown as ties.
- Price: one band per restaurant, set by hand. Roughly $ under S$15, $$ S$15-30, $$$ S$30-60, $$$$ over S$60 per person. Multi-select filter shows any selected band. Group and date-night tags are curated in the Sheet.
- Hours: optional field per restaurant plus a "permanently closed" flag; "open now" only filters restaurants that have hours.
- Form submissions: the Form collects the submitter's email; approved entries are imported by hand; the +5 goes to the matching Google sign-in email.
- First-save points: once per user per restaurant ever (ledger row), so unsave and re-save earns nothing.
- Near me: if location is denied, fall back to the area picker. Map shows pins for the filtered list with a link to Google Maps directions; no clustering.
- PWA: caches the app shell only; no push notifications or offline browsing.

## Visual refinements (approved by user, to improve later)
- Filter controls are rounded rectangles (about 8px corners), not pills.
- UI icons from Lucide (lucide-react, free, ISC licence).
- Each restaurant has one main cuisine (extra column in the Sheet) that picks a food icon shown in a rounded tile at the left of its card; cuisine filter chips use the same icons. Mockups use emoji; the build should use a free set (Twemoji or Noto Emoji) so icons look the same on every phone.
- Mockup: `docs/mockups/explore-icons-rounded-filters.html`.

## Validation plan (from UX Researcher agent, to run alongside the build)
Test the shared vote link first: target at least 60% of invitees voting within 24h; below 30% means rethink the core. Recruit 10+ non-friends, not only the 20 friends. Retention target: 30% of testers return in week 2.

## Left to the builder
Framework choice (React + Vite vs Next.js), map provider (OneMap or OpenStreetMap, both free), exact level names, database schema, row-level security policies, how the daily points cap is enforced, how the approved Form entries are imported, domain name, review text rules.
