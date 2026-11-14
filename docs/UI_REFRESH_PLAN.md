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

## P0 results (2026-11-14): three dark-first mockups, reviewed
Files in `docs/mockups/`: `refresh-a-plate.html` (A, Plate list), `refresh-b-hero.html` (B, Hero plus list), `refresh-c-shelves.html` (C, Shelves). Built by the UI Designer agent, judged by the UI Finish-Gate Reviewer (contrast computed from the CSS tokens, not from rendered pixels; light mode only spot-checked).

| | A Plate list | B Hero plus list | C Shelves |
|---|---|---|---|
| Decision | **PASS with 3 fixes** | HOLD | HOLD |
| Places visible at once (812 px tall) | 5 | 3 | 4 cards, only 6 unique places across 3 swipe rows |
| Card elements | 5 | 5 | 4 |
| Main problem | none blocking | cherry used on many panels (breaks "cherry is rare"), hero pushes the list down | slow to compare six places, no chip row |

All three pass text contrast (body 14.8 to 1, muted 6.3 to 7.2, cotton on cherry 9.05). In all three a Targeted cherry fill is only about 1.4 to 1 against the card, so the state must not rely on colour alone (A adds a centre dot, which survives greyscale).
**Recommendation: build A.** Fixes before building: chips and tabs at least 44 px tall; the Conquer control on a Spots row says "Conquer" in text (a bare flag looks the same as the Conquered state); choose one documented ring colour token (A's coral arc is not a palette token). Borrow from C: the text "Conquer" button, a separate "Nothing conquered yet" empty state, a static ring under reduced motion. Borrow from B: the "22 to go. Next up is ..." line (not its cherry panel).

### Motion notes (Whimsy Injector, held to the calm budget)
Build first: (1) **Target lock-on**, a thin ring closes onto the crosshair, 260 ms ease-out; (2) **Conquer flag-plant**, the flag drops 6 px into place, 340 ms, optional brief border flash. Both use a short-lived `just_changed` class set on a state change and cleared on `animationend`, otherwise all 25 cards animate on load. Later: hold-menu grow-in (150 ms), Spots ring fill (400 ms, with P3), "Link ready" label cross-fade (200 ms, least certain), empty-state rise-in (only if no illustration animates). Every one has an instant reduced-motion fallback. **Refuse:** a hold-progress ring, staggered list entrances, particle or paper-plane effects, any looping idle animation.

## Owner pick (2026-11-14): direction B, with A's empty-state art
Built on this branch, not pushed (462 tests pass, production build clean, checked on a 375 px screen in dark and light):
- **P1 foundations (partly):** dark is the default (a saved light choice is kept); one token set in `theme.css`; cherry is a fill with cotton text and never a thin outline on dark; touch targets are 44 px; the old duplicate and dead CSS rules were removed.
- **P2 Explore:** one hero card (the first result, larger, same card and behaviour), compact rows with one tag each, a quick-filter chip row (Date night, Big group, Open now, Halal, Filters) built on the real filters, sort as a quiet text control, a loading skeleton, "Start a vote" as the only cherry-filled action.
- **P3 Spots and Profile:** a progress ring ("Conquered N of 25", counting only places in our list), "N to go" and "Next up", Targets and Conquered tabs, A's plate-and-crosshair empty-state art with an "Explore places" link, a level ring on Profile.
- **Motion:** Target lock-on and Conquer flag-plant (no animation on first render; none under reduced motion), hold-menu grow-in.
- **Reviewer's B fixes applied:** no cherry panels, no gradient hero art, no all-caps label, ring colour is a documented token (cotton in dark, cherry in light), the Conquered badge is neutral so cherry appears only on the flag button.
Not done yet: P4 map bottom card, P5 the owner's drawn icons (waiting for the files), P6 audit (reduced-motion and greyscale pass, Lighthouse before and after), the self-hosted font, the clean-up audit of unused files, the light-mode review of every screen, and the onboarding tour.

## Not in this plan
Photos of food (licensing and moderation), a mascot, a raised centre tab button, parked ideas in `FUTURE_IDEAS.md`, and the Conquered rating and note feature (separate task).

## After the refresh
The onboarding tour (see `NEXT_STEPS.md`) is built **after** P2 to P3, because it points at the new Explore card, Spots tab and Profile.
