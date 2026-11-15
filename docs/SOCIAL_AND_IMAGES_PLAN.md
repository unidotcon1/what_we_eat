# Images, menus, directions, profile pictures and posts: phased plan

Written 2026-11-15 from the owner's brief and answers. Phase 1 is built on the branch; the rest waits for the owner's go-ahead on the points marked **decide**.

## Owner's answers
- **Posts (photo + text about where you went), shown under Spots:** the user chooses who sees them in settings. The admin (owner) can see everyone's.
- **Restaurant photos:** build with drawn placeholder art now; real photos arrive when real restaurants are chosen.
- **Explore, image version:** a hero plus horizontal rows, Netflix-style. A setting switches between **Details** (the current list) and **Images**.
- **Directions:** a route drawn on the in-app map **and** a button into Google Maps that guides properly.
- **Profile picture:** people design it (assumed: a built-in designer, colour, shape and emoji, with no photo uploads, so nothing is stored).
- Still unanswered: what "the environment for this project is based on the GitHub repo" means. Possible readings: the working copy for Claude sessions is the repo, or app settings and docs live in the repo. The repo is already the source of the live deploy and of `CLAUDE.md`.

## Phase 1 (built on the branch 2026-11-15, 552 tests pass): images, menu, directions, view setting
What the owner will see: Profile has an "Explore view: Details | Images" choice; Images shows a hero and rows of same-shaped posters (checked on a 375 px screen: every poster 132 by 198, no sideways overflow, nothing under 44 px); the details page has the picture slot, Target and Conquer, a cherry Directions button with Walk, Transit or Drive, and a Menu section. Posters in this layout have a tap-to-Target button only; the press-and-hold Conquer menu is on the list cards, and Conquer is on the details page.
- **Setting "Explore view: Details or Images"** in the Profile menu card, saved on the device.
- **Images layout:** one hero (the nearest place, 16:10), then rows (Near you, Date night, Big groups, Open late, Halal), each with "View more". With a search or filter active it becomes a plain poster grid.
- **Netflix-neat rules we follow:** every poster is the same shape and width (2:3 in rows, 16:10 hero); one line of title under it and nothing else on the picture; a small Target button; same gap everywhere; horizontal rows snap and peek at the next poster; art loads lazily; no more than five rows.
- **Placeholder art:** one drawn poster per cuisine, built only from palette tones (plate rings plus the cuisine emoji), so every poster looks like it belongs.
- **Details page:** image slot on top, Target and Conquer buttons, one cherry **Directions** button (opens Google Maps at the exact coordinates with the travel mode chosen, and starts guidance for walking and driving), and a **Menu** section.
- **Menu section:** shows menu sections and prices if the place has them, otherwise a "See the menu" link to the restaurant's own site, otherwise "Menu not added yet". Menus and photos are copied from nowhere: owner-supplied only.
- **Data:** optional `image`, `menu_url`, `menu` on a restaurant. Images must be same-origin files under `/restaurants/` (the security policy already allows them); menu links must be https. Migration `007_restaurant_media.sql` adds the columns; the owner runs it only once real data is ready.

## Phase 2: profile picture designer (small, no storage)
Pick a shape, a colour from the palette and an emoji or initials; shown on Profile and on posts. Saved on the device first, then in a `profiles` table once signed in (migration 008). No uploads, so no moderation or storage cost.

## Phase 3: posts under Spots (the big one) **decide before building**
- A post = one photo plus short text, tied to a place the person conquered. Shown as a feed on the Spots screen.
- **Visibility setting** with three choices: Only me (default), People with the link, Everyone. "Everyone" means a Report button, daily limits and a terms and privacy update before it goes live.
- **Photos:** shrunk on the phone before upload (about 1080 px wide, WebP, about 100 to 150 KB), and the **location and camera data are stripped** (photos taken on a phone carry GPS). Free storage is 1 GB, so roughly 7,000 to 10,000 photos.
- **Admin sees everyone's:** this makes the owner's login even more valuable and must be written into the privacy policy. Recommendation: do the moderation from the Supabase dashboard (the owner can already open it) and from Report reports, and build no in-app admin page unless needed. If an in-app admin view is wanted, it needs a protected admin role, two-step verification, and every look is logged.
- Legal: Singapore PDPA (consent, under-18s, takedown requests). Not legal advice; a short check by someone qualified is sensible before "Everyone" opens.

## Phase 4: route on the in-app map
Free routing options checked on 2026-11-15:
- **OpenRouteService:** a free key, directions limit listed as 2,000 a day on one official page; its pages and third-party listings disagree, so verify at openrouteservice.org/plans before relying on it. A key placed in the app would be public, so use our own small Cloudflare Worker as a proxy (key stays secret, caching and a rate limit).
- **OSRM public demo server:** the project says it is not for production use and may disappear without notice.
- Google Maps stays the dependable guide (Phase 1). Public transport routing exists only there.

## Order
1 (done on the branch) then 2, then 4, then 3 after the owner decides the admin and legal points.
