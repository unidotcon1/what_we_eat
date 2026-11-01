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
| Social | "Start a vote" and "Can't decide? Pick one for us" at the top of Explore | Our real strength: deciding as a group, which a logging app does not do |

## Phases (each ends with screenshots on 360 and 375 px, light and dark, for the owner to approve)
**P0. Direction (before any code).** Three HTML mockups of Explore, Spots and Profile in `docs/mockups/` (same method as before), built on the real palette. The owner picks one. Also decide the two open questions below.
**P1. Foundations.** Design tokens in `theme.css`: type scale, spacing scale, three levels of surface tone, radius, shadow, motion durations. Fix dark-mode contrast (cherry as a fill). Add one self-hosted font file (the CSP already allows `font-src 'self'`, so no new host). Contrast check on every colour pair.
**P2. Explore.** New card (the five-things rule), chip row, "Pick one for us" hero, calmer header, the lock-on animation, and a skeleton loader instead of "Loading...".
**P3. Spots and Profile.** Progress ring, level badge, nicer empty states with one illustration each, flag-plant animation on Conquer.
**P4. Map.** Pins keep shape plus colour. Tapping a pin opens a small bottom card (name, area, Target button) instead of a popup.
**P5. Icons.** Replace emoji cuisine tiles with our own small SVG set (about 12 cuisines) so Android and iPhone look the same. Own artwork, so no licence problem.
**P6. Polish and audit.** Run the `avoid-ai-design` skill, reduced-motion pass, touch targets at least 44 px, screen-reader names kept (existing tests must stay green), bundle size and Lighthouse before and after, 5-second test: show someone the Explore screen for 5 seconds and ask what it is for.

Each phase is test-first where there is logic (animation state, progress count, chip filters) and screenshot-checked where it is visual. Nothing is pushed until the owner says so.

## Open questions for the owner
1. Light or dark as the default look in the mockups? (Both will be built; one leads.)
2. Own SVG cuisine icons (P5), or keep emoji for now and spend the time elsewhere?
3. "Pick one for us" on Explore: yes or later? It is the biggest difference from Eatventure but it is new behaviour, so it needs your OK.
4. Is a self-hosted font file acceptable (adds roughly 30 to 60 KB, unverified until chosen)?

## Not in this plan
Photos of food (licensing and moderation), a mascot, a raised centre tab button, parked ideas in `FUTURE_IDEAS.md`, and the Conquered rating and note feature (separate task).

## After the refresh
The onboarding tour (see `NEXT_STEPS.md`) is built **after** P2 to P3, because it points at the new Explore card, Spots tab and Profile.
