# Android release plan (Google Play)

Goal: get What We Eat onto Google Play as soon as possible, from the live web app, with a Vivo phone as the first test device. Facts marked "unverified" must be checked in the Play Console before relying on them.

## How it works
The Android app is a thin wrapper (a "Trusted Web Activity") around https://what-we-eat.unidotcon.workers.dev. It opens our website full screen without a browser bar. Website changes go live for the app immediately, so **UI polish does not need a new Play upload**. Only changes to the wrapper itself (icon, name, version) do.

Tools: PWABuilder (pwabuilder.com, in the browser, free) or Bubblewrap (command line, needs Java and the Android SDK). Recommended: PWABuilder, because nothing has to be installed.

## The schedule risk: the 14-day test
Google requires new personal developer accounts (created after 13 November 2023) to run a **closed test with at least 12 testers, opted in continuously for 14 days**, before it grants production access. Organisation accounts are exempt (they need a business registration, so not practical here). Source: Google Play Console Help, "App testing requirements for new personal developer accounts". So: **start the 14 days as early as possible**, with the current app, and keep improving the website during the test.

## Owner tasks, in order
1. **Create a Google Play developer account** at play.google.com/console (personal). One-time fee, about US$25 (unverified). It asks for identity verification and contact details; check in the sign-up which details are shown publicly (unverified).
2. **Decide the permanent names** (they cannot be changed after the first upload):
   - Package name, for example `com.unidotcon1.whatweeat`.
   - App name shown on the phone: "What We Eat".
3. **Recruit 12 testers** with Google accounts, ideally on Android phones. They must accept the invitation and stay opted in for 14 days; 12 invites sent is not 12 testers. Collect their Gmail addresses.
4. **Prepare store text and pictures** (Claude drafts them): short description (up to 80 characters), full description, a 512 x 512 icon, a 1024 x 500 feature graphic, at least 2 phone screenshots, category Food & Drink, the privacy policy address (`/privacy`, already live).
5. **Complete the Play Console forms**: content rating questionnaire, Data safety form (see below), target audience (not for children), ads (none).
6. In Play Console create the app, open **Testing, Closed testing**, add the tester list, upload the wrapper bundle, and share the opt-in link with testers.
7. After 14 days with 12 opted-in testers, apply for **production access**. Google then reviews it (days).

## Claude tasks (no owner action needed)
- Better app icon. The current icon is a generated placeholder plate. Needs an owner-approved design: 512 x 512 plus a maskable version.
- Manifest polish: stable `id`, `categories`, screenshots, shortcuts.
- Host the Android link file at `/.well-known/assetlinks.json` so the app opens without a browser bar. It needs the **Play App Signing SHA-256 fingerprint**, which only appears in Play Console after the first upload (App integrity). Then redeploy. Verified on the live site 2026-11-02: Cloudflare serves `/.well-known/assetlinks.json` as `application/json`.
- **Account deletion.** Play requires apps that create accounts to offer deletion inside the app and a web address for the request. Today deletion is "open a GitHub issue". Needs an in-app "Delete my account" (a database function) plus a page that explains it.
- **User-generated content rules.** If people can share Conquered Spots publicly, Play expects in-app reporting and a way to block abusive content. Either ship the Report button with public sharing, or ship the first release without public sharing.
- Data safety answers (draft): email address (from Google sign-in), user content (spots, ratings, notes), device or other IDs (voting token), location (used only on the device for "Near me", not sent to our servers). Data is encrypted in transit. People can request deletion (once in-app deletion exists).
- Store text and screenshots.

## Known risks
- Closed-test rule is the long pole: about 2 weeks plus review time.
- If the tester count drops below 12 during the 14 days, the clock effectively restarts.
- A bare website wrapper can be rejected for being "just a website" on the App Store; on Google Play the main risks are the policies above (account deletion, user content, data safety).
- iPhone: stays the website added to the home screen for now. The App Store needs the paid Apple developer account (about US$99 a year, unverified), a Mac or a cloud builder, and real native features. Parked.

## Status, 2026-11-02 (Claude's prep is done except where marked)
- **Manifest polished** (done, tested): stable id, food category, portrait, long-press shortcuts to Spots, Map and Add, separate maskable icon.
- **Account deletion** (built, tested and live; needs the owner to run `supabase/migrations/005_delete_account.sql`): Profile has "Delete my account" with a confirmation step, and https://what-we-eat.unidotcon.workers.dev/delete-account explains it. This is the web address to give Play Console.
- **Android link file** (placeholder, live and verified): `/.well-known/assetlinks.json` is an empty list. Locally it is built and served as JSON. After the first Play upload, send me the **App signing SHA-256 fingerprint** (Play Console, Test and release, App integrity) and I will put it in the file and push.
- **App icon** (done): the owner chose option C, the plate that is a target. Generated by `npx tsx scripts/make-icons.ts`: `public/icon-192.png`, `public/icon-512.png` (also the maskable icon), `public/apple-touch-icon.png` (iPhone home screen), and the Play Store files `docs/store/play-icon-512.png` and `docs/store/feature-graphic-1024x500.png`. The feature graphic is plain (emblem only); add the name and a line of text later if wanted.
- **Store text and data-safety answers** are drafted in `docs/PLAY_LISTING.md`.
- **Reporting content**: Play expects a way to report abusive user content if users can share it. Today the only user text is reviews, which are shown only after hand approval, and there is no public Conquered Spot sharing yet. Re-check this against the Play user-generated-content policy before submitting (unverified), and build a Report button before adding public sharing.

## Packaging with PWABuilder (owner steps; details may differ slightly from PWABuilder's current screens)
1. Go to pwabuilder.com and enter `https://what-we-eat.unidotcon.workers.dev`.
2. Review the score. Fix anything it flags as required (tell Claude what it says).
3. Choose **Package for stores**, then **Android**.
4. Set the package ID (the permanent name you chose), app name "What We Eat", version 1 (version code 1), and let PWABuilder create a **new signing key**.
5. Download the zip. It contains the `.aab` (the file to upload) and a **signing key file and its password**. Keep these in a safe place outside the project folder and never commit them: losing them blocks future updates.
6. In Play Console: Create app, Testing, Closed testing, Create release, upload the `.aab`, add testers, publish the release to testers.
7. Open **Test and release, App integrity** and copy the **App signing SHA-256 fingerprint**. Give it to Claude for `assetlinks.json`.
8. Share the opt-in link with the 12 testers. The 14-day clock needs 12 testers opted in continuously.
