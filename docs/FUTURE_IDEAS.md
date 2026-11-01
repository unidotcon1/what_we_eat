# Future ideas (parked on purpose)

Ideas from the owner on 2026-11-01 that are not part of the first app-store release. Nothing here is started. The current focus is in `docs/NEXT_STEPS.md`. Facts below marked "unverified" have not been checked against the provider's current terms.

## 1. Map
- **ArcGIS basemap.** Nicer than the plain OpenStreetMap tiles. Needs an Esri developer account and an API key, has a free usage quota (unverified), and requires on-map attribution. The strict security headers in `public/_headers` must allow the Esri hosts.
- Keep the current OpenStreetMap tiles as the fallback if the quota runs out.

## 2. Pack the most information into the smallest space (map pins and cards)
Rule of thumb: at most two visual encodings per pin, and never colour alone (add a shape, number or icon so it works for colour-blind users and in dark and light mode).
- **Pin fill gradient = rating quality.** Use a Bayesian average so a place with 2 reviews does not outrank one with 200: `score = (v / (v + m)) * R + (m / (v + m)) * C`, where `R` is the place's average, `v` its number of ratings, `C` the average across all places and `m` a minimum-votes constant (start with 5).
  - Source of ratings: **our own Journal ratings only.** Do not use Google ratings: storing Google Places data is restricted (see research notes in `docs/NEXT_STEPS.md`).
  - Until a place has enough ratings, show a neutral fill rather than a guess.
- **Pin border gradient = a second signal**, for example price band, or how busy it is now. Pick one; do not stack more.
- **Cluster** pins when zoomed out, and show the cuisine icon only when zoomed in.

## 3. "How busy is it now?" and traffic
- Google's "popular times" has **no official API**, and scraping it breaks their terms. Do not use it.
- Singapore government feeds worth checking (unverified): LTA DataMall (traffic speed bands, bus and train crowding, car park availability, free API key) and data.gov.sg real-time APIs (weather, rainfall, carpark availability).
- A restaurant's own crowd level has no free open source. Options that avoid legal risk: users tap "busy right now" or "quiet" when they are there (our own data, expires after about 2 hours), or a simple time-of-day pattern learned from those taps.

## 4. Events and area polygons layered on the map
- GeoJSON polygons on top of the map, for example planning areas or "event zones". Planning-area boundaries are published on data.gov.sg (unverified licence terms: check the Open Data Licence on the dataset page before use).
- Events data: there is no single open Singapore events feed that I have confirmed. Start with a hand-edited GeoJSON file in the repo (the owner adds events), and only automate later.

## 5. Toggleable layers
One "Layers" button on the map opens a small sheet with switches: Places, Busy now, Events, Areas. Remember the choice on the device. Default: Places only, so the map stays calm.

## 6. Other parked items
- Foursquare and Overture coverage tests for Singapore.
- Pull saves from the account onto a new device after sign-in.
- Food icons from Twemoji or Noto Emoji.
- Custom domain.
- Following other people, a public feed, and photos in the Journal (photos need storage that is not free beyond 1 GB, plus moderation).
- iPhone App Store release (needs the paid Apple developer account and extra native features; see the release plan).
