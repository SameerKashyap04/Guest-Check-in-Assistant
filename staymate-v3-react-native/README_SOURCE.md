# StayMate V3

## What changed

V3 is built directly from the uploaded V2 `app.html`, not recreated from screenshots. It implements the final decisions from the V1/V2 review.

### Kept from V2
- Dashboard layout and metrics
- Check-in scanner visual language
- Settings structure
- PIN / biometric lock screen
- Compact white/light UI
- Rounded card system and typography

### Updated for V3
- Purple primary `#7C3AED` + tint `#EDE9FE`
- V1-style floating bottom navigation with labels and elevated purple Check-in FAB
- Rooms: V1 card clarity (bed icon, status, room number, type, price) in V2 grid density
- Manual Entry: three-step flow — Guest Details → Stay Details → Review & Confirm
- Add-more-guest bottom sheet
- Scan review separated from manual entry and merged at confirmation

## Files

- `app.html` — interactive V3 prototype
- `DESIGN.md` — V3 design system + original V2 design reference
- `README.md` — this implementation guide

## Prototype interactions

- PIN unlock: any four digits or biometric icon
- Bottom navigation switches Dashboard / Rooms / Settings
- Center Check-in FAB opens scanner
- Scanner shutter opens OCR verification flow
- Manual Entry opens the three-step flow
- Add More Guest opens a bottom sheet and increments the guest count
- Rooms switch between grid/list and status filters
- Settings pricing overlay retains the V2 plan experience

## Porting to React Native

The prototype uses plain HTML/CSS/JavaScript so the interaction can be reviewed before porting. The V3 color, radius, spacing and typography tokens can be moved into the project's shared theme. The camera/OCR surface remains a prototype and should be wired to the real Expo camera/OCR implementation.

## Testing V3 Account & Popup UI

### Owner Account Login / Sign Up
1. Open `app.html` in a browser.
2. Enter the app and open **Settings**.
3. Under **GENERAL**, tap **Username & password**.
4. Test **Log in** and **Sign up** using the segmented control.
5. Test **Forgot password?** from the Log in tab.
6. Test **Continue with Google** and the primary buttons to verify toast feedback.

### Popup / Modal Testing
- **Log out:** Settings → Log out → test Cancel and Log out.
- **Property:** Settings → Property name & address.
- **Cloud mode:** Settings → Cloud mode.
- **Security:** Settings → Change security PIN / Auto-lock.
- **Self check-in:** Dashboard → Self check-in QR & link → Review / Approve.
- **Copy link:** Self check-in sheet → Copy link.
- **Pricing:** Settings → View plans & upgrade.

Note: this is an interactive UI prototype. Login/sign-up actions currently demonstrate the UI and feedback states; they do not connect to a real authentication backend.
