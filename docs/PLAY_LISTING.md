# Google Play listing drafts

Drafts to paste into Play Console. Check each against the real app on release day. Anything marked "unverified" must be checked in Play Console.

## Blockers before anyone can install it from the store
1. **Replace the sample restaurants.** The 25 restaurants are made up (the terms page says so). A store listing must not mislead: publish only after real places are loaded (see `docs/NEXT_STEPS.md`, OpenStreetMap candidates).
2. Run `supabase/migrations/005_delete_account.sql` so "Delete my account" works.
3. ~~App icon~~ done: option C. Files are in `docs/store/` (icon 512 and feature graphic 1024 x 500).

## App name
What We Eat

## Short description (80 characters maximum)
Find where to eat in Singapore, track places and let friends vote on it.

(72 characters.)

## Full description (4000 characters maximum)
Deciding where to eat shouldn't take longer than the meal.

What We Eat helps you and your friends pick a place in Singapore, and keeps your own record of where you have been and where you want to go.

FIND A PLACE
- Filter by price, area, distance, group size, date night, cuisine, halal and open now.
- See places on a map, with your own Targets and Conquered Spots drawn differently.

TARGET AND CONQUER
- Tap the crosshair to Target a place you want to go to.
- Plant your flag when you have been: it becomes a Conquered Spot.
- Bring in a list you already saved in Google Maps (from a Google Takeout export). The file itself is read on your phone and is not uploaded; the places you import are saved like any other Spot.

DECIDE TOGETHER
- Pick a few places, send a link to your group chat on WhatsApp or Telegram, and friends vote with one tap. They do not need an account or to install anything.

YOUR DATA
- Targets and Conquered Spots work without signing in. Sign in with Google to keep them on your account and earn points for reviews.
- Delete your account any time from Profile.

What We Eat is a small independent project. Restaurant details such as prices and opening hours can change, so check with the restaurant before you go.

## Category and tags
Category: Food & Drink. Contact: use a project email or the GitHub project page (decide which is shown publicly).

## Release notes (first release)
First release: find places, Target and Conquer them, import your Google Maps list, and vote with friends.

## Graphics
- App icon: 512 x 512 PNG (from the chosen icon).
- Feature graphic: 1024 x 500 PNG (draft after the icon is chosen).
- Phone screenshots: at least 2, ideally 4. **Take them on your Vivo phone** (real device, sharp): Explore, Spots (Targets and Conquered), Map, a vote link. Keep one language and no personal data on screen.

## Data safety form (draft answers)
- Collects personal info: **Email address** (from Google sign-in, only if the person signs in), optional.
- App activity / user content: **Spots, ratings and reviews** (stored on the account when signed in).
- Device or other IDs: a **random voting token** stored on the device (a hashed copy is stored for polls).
- Location: **not collected**. "Near me" is used on the device only and never sent to our servers.
- Data is **encrypted in transit** (HTTPS).
- People **can request deletion**: in the app (Profile, Delete my account) and at https://what-we-eat.unidotcon.workers.dev/delete-account.
- Data is **not sold** and **not shared** with third parties for advertising. It is processed by service providers (Supabase for database and sign-in, Google for sign-in, Cloudflare for hosting).
- Ads: none.

## Content rating questionnaire (guidance)
Answer honestly. The app has no violence, gambling or purchases. Reviews written by users are shown to others after hand approval, so declare **user-generated content** if the form asks. The rating is decided by the form (unverified; expect a low age rating).

## Privacy policy address
https://what-we-eat.unidotcon.workers.dev/privacy
