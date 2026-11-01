# UI refresh plan: make it appealing, not cluttered

Status: **plan only, nothing built** (written 2026-11-02). Owner priority: most urgent task. Eatventure is inspiration for patterns only (no mascot, no orange-on-charcoal, no word "foodprint"). Its screens are crowded; we win by being calmer.

## Where we are (seen on a 375 px phone, dark mode)
- Explore is a long list of identical dark rows: small emoji tile, name, area and price, two tags, a crosshair. Nothing is the hero, so nothing pulls the eye.
- Almost everything is a thin outline or a flat dark box. There is no depth, no motion, no moment of reward when you Target or Conquer.
- Cherry (`#810100`) on noir (`#1b1717`) is only about 1.6 to 1 contrast (my calculation, not yet measured with a tool). Cherry outlines and cherry text on dark, such as "Start a vote", look faint. A common minimum for UI parts is 3 to 1. In dark mode cherry should be a **fill with cotton text**, not an outline or text colour.
- Cuisine tiles are emoji, which look different on Android and iPhone.
- Profile is a counts row, an import box and a sign-in button; no sense of progress even though levels and points exist.

## What "appealing but calm" means: five rules
1. **One hero per screen.** Each screen has one thing the eye lands on first.
2. **One primary action per screen**, drawn as a cherry fill. Everything else is quiet.
3. **A card shows at most five things:** icon tile, name, area and price, one tag, the Target button. Extra tags and detail move to the place page.
4. **Delight comes from motion and reward, not from more elements.** Small, quick (under 400 ms), skipped when the phone asks for reduced motion.
5. **Cherry is rare.** Cotton, noir and tones of them do the work, so the red means something.

## What we copy in spirit, and where we beat it
| Eatventure pattern | Ours | Why it is calmer |
|---|---|---|
| Collection and progress feel | A single "Conquered 3 of 25" ring and a level badge on Spots and Profile, using the points and levels already built | One number, not a dashboard |
| Cards with a strong visual | Larger cuisine tile as the card's left block, name in a bigger weight | Fewer chips, bigger shapes |
| Quick filters | One horizontal chip row: Date night, Big group, Late, Halal, then "More" | Replaces the Filters and Sort buttons as the first thing you see |
| Reward moment | Press the crosshair: it "locks on" (short ring animation). Conquer: a flag plants and the card settles | 300 ms, no popups, no confetti |
| Social | "Start a vote" stays the one group action at the top of Explore ("Pick one for us" is parked) | Our real strength: deciding as a group, which a logging app does not do |

## Phases (each ends with screenshots on 360 and 375 px, light and dark, for the owner to approve)
**P0. Direction (before any code).** Three HTML mockups of Explore, Spots and Profile in `docs/mockups/` (same method as before), built on the real palette, dark first. The owner picks one.
**P1. Foundations and clean-up.** Design tokens in `theme.css`: type scale, spacing scale, three levels of surface tone, radius, shadow, motion durations. Fix dark-mode contrast (cherry as a fill). Add one self-hosted font file (the CSP already allows `font-src 'self'`, so no new host). Contrast check on every colour pair. Clean-up audit: list every file, CSS rule, image and dependency that nothing uses; show the list; delete after the owner says yes.
**P2. Explore.** New card (the five-things rule), chip row, calmer header, the lock-on animation, and a skeleton loader instead of "Loading...".
**P3. Spots and Profile.** Progress ring, level badge, nicer empty states with one illustration each, flag-plant animation on Conquer.
**P4. Map.** Pins keep shape plus colour. Tapping a pin opens a small bottom card (name, area, Target button) instead of a popup.
**P5. Icons.** Replace emoji cuisine tiles with the owner's own drawings (about 12 cuisines, to be sent later) so Android and iPhone look the same. Own artwork, so no licence problem. Blocked until the files arrive.
**P6. Polish and audit.** Run the `avoid-ai-design` skill, reduced-motion pass, touch targets at least 44 px, screen-reader names kept (existing tests must stay green), bundle size and Lighthouse before and after, 5-second test: show someone the Explore screen for 5 seconds and ask what it is for.

Each phase is test-first where there is logic (animation state, progress count, chip filters) and screenshot-checked where it is visual. Nothing is pushed until the owner says so.

## Owner decisions (2026-11-02)
1. **Dark leads.** Mockups and the first build pass are dark-first; light mode is built and checked second.
2. **Cuisine icons: the owner draws them** and will send them later. Until then the emoji stay. P5 waits for the files; ask for SVG (or PNG at least 192 px), one per cuisine, transparent background.
3. **"Pick one for us" is parked** as one of the last options (see `docs/FUTURE_IDEAS.md`). It is not in P2.
4. **A self-hosted font is fine, with a lean-files rule:** ship only the weights and characters actually used (for example one variable font file, Latin only), and in P1 also audit the project for files nobody uses (source files, images, CSS rules, dependencies, docs) and remove them with the owner's OK. Nothing is deleted without listing it first.

## Not in this plan
Photos of food (licensing and moderation), a mascot, a raised centre tab button, parked ideas in `FUTURE_IDEAS.md`, and the Conquered rating and note feature (separate task).

## After the refresh
The onboarding tour (see `NEXT_STEPS.md`) is built **after** P2 to P3, because it points at the new Explore card, Spots tab and Profile.
