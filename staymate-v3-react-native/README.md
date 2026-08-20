# StayMate V3 — React Native + Expo

This is a presentational React Native / Expo port of the supplied StayMate V3 HTML prototype. The source-of-truth relationship is:

- `app.html` = interaction + visual source.
- `DESIGN.md` = styling/tokens source.
- `README.md` = screen/architecture source.

The V3 direction keeps the V2 visual language, purple `#7C3AED`, the floating labeled bottom navigation, V1 room information hierarchy in the V2 two-column grid, and the V1 three-step manual workflow. fileciteturn0file1L5-L21

## Included

- PIN / biometric lock
- Dashboard
- Check-in scanner
- Document-type selection
- Manual Entry: Guest Details → Stay Details → Review & Confirm
- Rooms grid + compact list view + status filters
- Settings
- Username & password account portal
- Self check-in QR/link sharing + approvals
- Guest detail sheet
- Search overlay
- Compliance reports overlay
- Pricing overlay
- Premium confirmation modal/toast primitives

The prototype source explicitly documents the same interactions and flows, including PIN unlock, scanner, manual entry, room filtering, and settings. fileciteturn0file2L29-L42

## Run

```bash
npm install
npx expo start
```

Then press `i` for iOS Simulator or `a` for Android Emulator, or scan the Expo QR from a physical device.

## Important fidelity note

The implementation uses native React Native primitives (`View`, `Text`, `Pressable/TouchableOpacity`, `ScrollView`, `Modal`) plus `react-native-svg` for the custom SVG icon set. It intentionally does not use a WebView or render the HTML inside the app.

The HTML uses Inter and the V3 token set; the Expo port keeps those token values and component dimensions as closely as React Native layout/rendering allows. The V3 design system specifies the purple accent and compact white/light rounded mobile-first direction. fileciteturn0file1L24-L43

## Source mapping

- `src/theme/tokens.ts` — V3 color/radius/spacing/elevation tokens.
- `src/components/Icon.tsx` — SVG icon paths matching the HTML icon vocabulary.
- `src/components/BottomNav.tsx` — floating labeled tab bar + elevated Check-in FAB.
- `src/components/RoomCard.tsx` — V1 room-information hierarchy used by V3.
- `src/screens/*` — screen-level presentational components.
- `App.tsx` — stateful prototype shell and modal/sheet composition.

## Current prototype behavior

Like the supplied HTML, authentication, OCR, camera capture and backend persistence are UI behaviors/placeholders. Real Expo camera/OCR/database integrations can be wired into the same screen boundaries later.
