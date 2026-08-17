# StayMate — Airbnb-style Redesign

Full mobile-app redesign of StayMate (the homestay/hotel check-in & compliance app),
restyled in Airbnb's visual language using tokens pulled via `npx getdesign@latest add airbnb`.

## Files

- **`app.html`** — Open this in any browser. A fully clickable phone-frame prototype covering
  every screen in the original blueprint:
  - PIN unlock / biometric lock screen
  - Dashboard (greeting, live sync badge, search, reports, metrics grid, recent check-ins, guest detail sheet)
  - Check-in & Scanner (document type selector, camera viewfinder, manual entry, review & complete check-in)
  - Rooms inventory (summary bar, status filters, grid/list toggle, room cards)
  - Settings (property card, subscription usage, data storage, security, plans & pricing)
  - Global search overlay, compliance reports overlay, pricing/upgrade overlay
- **`DESIGN.md`** — The extracted Airbnb design-token reference (colors, type scale, spacing,
  component specs, elevation, responsive rules) that every screen was built from.

## Design language applied

| Token | Value | Where it shows up |
|---|---|---|
| Primary (Rausch) | `#ff385c` | Primary buttons, FAB, active states, price highlights |
| Ink / Body / Muted | `#222222` / `#3f3f3f` / `#6a6a6a` | Text hierarchy |
| Radius | 8 / 14 / 20 / 32 / full | Buttons / cards / sheets / pills / avatars |
| Shadow | single soft tier | Cards, floating tab bar, sheets — no heavy elevation stacking |
| Type | Inter (Cereal/Circular substitute) | 600–700 weight display, 400 body, restrained sizing |
| Status colors | emerald / sky / amber / rose | Room availability, guest verification |

The floating pill-shaped bottom tab bar with an elevated "Rausch" FAB for Check-in mirrors
Airbnb's search-orb treatment — the single boldest color moment on each screen, exactly as the
brief's own product structure intended it (an elevated glowing center action).

## Next steps if you want this shipped into the real app

- Swap the mock JS data (`GUESTS`, `ROOMS`, `PLANS`) for your SQLite/Firebase queries.
- Port the screens 1:1 into React Native components — the spacing/radius/color tokens in
  `DESIGN.md` map directly onto a `theme.ts` file for `src/app/(tabs)/*`.
- Camera/OCR viewfinder is a static mock here; wire it back to `expo-camera` + `DocumentParser.ts`.
