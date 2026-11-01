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
- Host the Android link file at `/.well-known/assetlinks.json` so the app opens without a browser bar. It needs the **Play App Signing SHA-256 fingerprint**, which only appears in Play Console after the first upload (App integrity). Then redeploy. To verify after deploying: `curl` the file, and check Cloudflare serves a dot-folder (unverified).
- **Account deletion.** Play requires apps that create accounts to offer deletion inside the app and a web address for the request. Today deletion is "open a GitHub issue". Needs an in-app "Delete my account" (a database function) plus a page that explains it.
- **User-generated content rules.** If people can share Conquered Spots publicly, Play expects in-app reporting and a way to block abusive content. Either ship the Report button with public sharing, or ship the first release without public sharing.
- Data safety answers (draft): email address (from Google sign-in), user content (spots, ratings, notes), device or other IDs (voting token), location (used only on the device for "Near me", not sent to our servers). Data is encrypted in transit. People can request deletion (once in-app deletion exists).
- Store text and screenshots.

## Known risks
- Closed-test rule is the long pole: about 2 weeks plus review time.
- If the tester count drops below 12 during the 14 days, the clock effectively restarts.
- A bare website wrapper can be rejected for being "just a website" on the App Store; on Google Play the main risks are the policies above (account deletion, user content, data safety).
- iPhone: stays the website added to the home screen for now. The App Store needs the paid Apple developer account (about US$99 a year, unverified), a Mac or a cloud builder, and real native features. Parked.
