# What We Eat: staged plan

Written 2026-11-01 at the start of Stage 1. Stage 1 is built in the `stage-1-conquered-spots` branch (not pushed, so the live site is unchanged until the owner uploads it). Stages 2 to 4 are planned only.

## What the repo actually contained at the start (verified by search)
- There is **no "Marker", "Journal" or "marked" concept** anywhere in code, data or SQL. The only "marker" is Leaflet's `L.marker` map pin in `src/ui/components/MapView.tsx`. So there is nothing to rename and no "marked" records to migrate.
- The closest existing thing is **Saved**: a heart on each restaurant card, stored on the device (`wwe.saves`) and, when signed in, in the `saves` table. These mean "I want to go", not "I have been".
- A Leaflet + OpenStreetMap map already exists (`MapView`), as a List/Map toggle on Explore. Stage 1 reuses it. No map library is switched.
- 197 tests passed before this pass started.

## Stage 1: main content (built in this pass)
Scope and acceptance criteria.

1. **Two spot states.** A spot is either **Conquered** (visited) or **Targeted** (want to visit). A place is stored once and moves between the two states. There is no Journal.
   - Accept: add a spot in each state; move it each way; delete it; adding the same place twice never makes two records.
2. **"Conquered Spots" naming.** UI labels use "Conquered Spots" and "Targeted Spots". Code and data use `spots` with state `conquered | targeted`.
   - Accept: no "Saved" tab or heart remains in the UI; no leftover "marker" naming of our own (the Leaflet library call stays).
3. **Add a spot** from a centre **+** button, with four routes: search the catalogue, pin on the map, manual add (name, address, pin), and import.
   - Accept: each route creates a spot in the chosen state.
4. **Google Maps import (Google Takeout).** Reads the Saved Places JSON and list CSV exports. Shows a preview with matched and unmatched rows, and the owner picks Conquered or Targeted for the whole import.
   - Accept: a 100-row file produces the correct match report (tested with a generated 100-place fixture); unmatched rows that have a location can be added as new places; nothing is written until the owner confirms.
5. **Discover screen.** Search bar, a "Near you" row of cards with Conquered and Targeted buttons, curated lists that show place counts, and a shortcut to the existing group vote.
6. **Map screen.** The existing map, full screen, with the catalogue and the owner's spots drawn differently by state; tap a pin to set its state.
7. **Profile screen.** Conquered and Targeted counts with a list of each (move and delete from the list), plus the old Me content (sign-in, points, theme, privacy and terms).
8. **Bottom navigation.** Discover | Map | Profile, with a centre + button for Add Spot.
9. **Migration.** Existing saved places become spots. Nothing is deleted: `wwe.saves` and the `saves` table stay as they are.
   - Accept: the device migration runs once; the database migration (`004_spots.sql`) copies `saves` rows into `spots` and can be run twice safely; existing data still loads.
10. **Tests** cover the spot data model, the import parsing and the import matching, plus the migration.

Kept working, unchanged: group polls and vote links (`/vote`, `/p/<code>`), the filter screen (now at `/explore`), reviews, points, privacy and terms, security headers.

### Stage 1 explicitly does NOT include
Onboarding, ArcGIS, rating-based icons, layers, traffic or crowd data, social features. Even where quick.

## Stage 2: onboarding (planned, not built)
- Location screen with Skip, then choose 3 to 5 cuisines (Continue disabled until 3 chosen). Use the choices to order Discover. Both screens skippable and resumable.
- Depends on: Stage 1 Discover; a place to store preferences (device first, `profiles` table when signed in).
- Open questions: which cuisine list (ours has nine; the reference app has more); whether "skip" still asks again later; how choices weigh against distance.

## Stage 3: map upgrade and information density (planned, not built)
- **Compare ArcGIS Maps SDK against the current Leaflet + OpenStreetMap map** on cost, licensing, platform support and migration effort, and recommend one. Do not migrate until the owner approves. Open points to research: free-tier limits and attribution, whether it needs an API key and what leaks into the browser, bundle size against our offline cache, and how the strict content policy (`public/_headers`) would change.
- **Icon fill** = Bayesian-adjusted rating: `score = (v/(v+m))*R + (m/(v+m))*C`, with `m = 50` (tunable) and `C` the mean rating of places in view. Raw rating shown only in details. Depends on having a legal rating source; Google ratings cannot be stored under its terms, so this needs a decision (see below).
- **Border gradient** = one second metric. Undecided between crowd level, open-now status, or days since conquered. Open-now and days-since-conquered need no new data source, which makes them the cheap options.
- **Icon shape**: Conquered = stamp, Targeted = outline pin. **Marker size** = review count, clustered below a zoom threshold. **Colourblind-safe palette and a legend.**
- Depends on: Stage 1 spots on the map.

## Stage 4: layers, traffic and crowd (planned, not built)
- Togglable layers: Conquered, Targeted, Events (GeoJSON polygons), Traffic, Crowd. A layer that is off does not fetch its data.
- **Traffic and crowd: candidate sources, official ones marked.**
  - LTA DataMall (Land Transport Authority, **official**): traffic speed bands, traffic incidents, and more. Needs a free account key. Check its licence terms and rate limits.
  - data.gov.sg (**official**): real-time traffic images, other open data under the Open Data Licence.
  - Google Popular Times: **no official API for crowd levels; do not scrape it.**
  - Crowd level has no confirmed legal source yet. To research: venue-supplied data, user reports.
- Depends on: Stage 3 map decision.

## Later (no stage yet)
Social feed, followers, user posts, curated editor lists, feed-unlock gating. Also: bulk price and tag helpers for curating the OpenStreetMap candidate list (suggested defaults plus apply-by-filter), real restaurant data replacing the samples (see `docs/NEXT_STEPS.md`).

## Decisions needed (assumptions I made, with the cost of being wrong)
1. **Existing saves become Targeted, not Conquered.** The brief says "marked" records go to Conquered, but no such records exist. Our saves were "want to go" hearts, so Targeted is the faithful mapping. One constant (`LEGACY_SAVE_STATE`) flips it. Cost if wrong: owner moves a handful of spots.
2. **Group vote stays**, reachable from Discover and Profile, not from the bottom bar (the brief's bar has three tabs and a +).
3. **Filters stay** as a "browse and filter" screen at `/explore`, opened from the Discover search bar.
4. **Search uses our own catalogue**, not Google Maps. Google Places results cannot be stored under Google's terms and cost money, and the brief says no keys in code. Places missing from the catalogue use pin or manual add. Cost if wrong: Stage 1 cannot find a place that is not in the 25 sample restaurants (real data is a separate task).
5. **"Popular near you" is shown as "Near you".** We have no popularity data. Cards sort by distance when location is allowed, otherwise in catalogue order. Cost: label only.
6. **Curated lists are generated by rules** from tags and cuisine (Date night, Big groups, Halal, Cafes, by cuisine), with live place counts. Hand-written editor lists are a later item.
7. **Takeout import matches against our catalogue only.** Rows with a location but no match can be added as new places; rows with no location are listed as unmatched and not added. Importing never downgrades a place that is already Conquered.
8. **Manual add** requires a name and a pin; the address is optional (some places have none). Cost: one line.
9. **Points:** the +5 "first save" becomes "first catalogue spot". The database function is updated in migration 004.
10. **Storage:** spots live on the device first and sync to a new `spots` table when signed in. Until the owner runs `004_spots.sql`, spots stay on the device and nothing breaks.
11. **No new keys, hosts or packages are needed in Stage 1**, so the content policy and environment variables are unchanged.
12. The Stage 1 branch is **not pushed**: pushing `main` deploys the live site, and the brief says to stop so the owner can upload.

## Owner decisions, 2026-11-01 (added after review)
- The Stage 1 branch is the base; the earlier "Marker" and "Journal" working names are dropped.
- Words in the app: **Target** for a place to go next (a crosshair icon replaces the heart), **Conquered Spot** for a place been to, and **Spots** as the name of the bottom-bar tab and the umbrella word. Do not use "Targets/Conquered" or "Targeted Spots" as labels.
- Focus before adding more content: make the UI neater and more pleasing. The brand stays cherry, cotton and noir. Borrow patterns from Eatventure, not its mascot, orange-on-charcoal look or the word "foodprint". Avoid a raised round centre button in a pill bar that mimics Eatventure; give the centre action our own shape.
- Conquered Spots can carry a 1 to 5 rating and a note up to 280 characters, private by default with an optional "share with everyone" switch (text only, no photos), which will replace the separate review form. Moderation: publish at once with a Report button and a daily limit. Shown with a chosen nickname, never the Google name or email. Sharing needs sign-in; Target works without sign-in. Not part of Stage 1.
- Google Maps import is part of the plan (built as Takeout import in Stage 1).
- Release path: Android first through Google Play (wrapper app). See docs/ANDROID_RELEASE.md.

## UI pass, 2026-11-01 (built on this branch, not pushed)
Built and tested (322 tests pass): bottom bar Explore | Map | Add (square crosshair button) | Spots | Profile; one crosshair Target button per card (filled when a Target, a flag when Conquered); "Start a vote" mode on Explore replaces the second button on every card; Spots screen with Targets and Conquered tabs (Conquer, move back, remove); Map tab with pins that differ by shape as well as colour, plus a legend; Add a spot (search our catalogue); Profile shows Target and Conquered counts; old Saved page and old save code removed; old hearts become Targets on first load (device) and join the account copy after sign-in.
Decision: the **flag** icon means Conquered everywhere (owner, 2026-11-01). The Spots tab uses a list icon so the flag stays reserved for Conquered.
Not built yet: Takeout import screen (data layer exists), add by map pin, add by hand, Conquered rating/note/share, onboarding, Android icon. The database file 004_spots.sql has not been run, so spots stay on the device until the owner runs it.

Update 2026-11-02: the UI pass is live on the main branch. Add a spot moved out of the bottom bar (it looked like search): there is now a + at the top left of Explore and an Add button in the Spots header, and the bar has four tabs: Explore, Map, Spots, Profile.

Update 2026-11-02 (later): Import screen built at /import (upload a Takeout .csv or .json, preview matched and unmatched, choose Targets or Conquered, optionally add places not in our list, confirm; nothing is written before the confirm; never demotes a Conquered Spot; the file is read on the device). The + at the top left of Explore was removed (it duplicated search). Add a spot now also offers the import.

Update 2026-11-02 (later still): press and hold on a card's crosshair opens a small menu (Target, Conquer, and Remove when the place is already a spot). A quick tap still toggles the Target. The menu also opens on right-click or the keyboard menu key, closes on Escape or a tap elsewhere, and a hold cancelled by scrolling (moving more than 10 px) opens nothing. Hold time 500 ms.
