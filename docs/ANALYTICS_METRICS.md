# Product Analytics & Event Tracking Specification
**Guest Check-in Assistant**

---

## 1. Privacy First Tracking Policy
Product analytics MUST NOT transmit guest personal data, identity numbers, names, or document images. All tracked properties are sanitized by `AnalyticsService`.

---

## 2. Core Tracked Events

- `app_opened`: Triggered on application launch.
- `property_created`: Triggered when a new property is configured.
- `first_checkin_completed`: High-value activation milestone.
- `qr_checkin_used`: Self check-in link usage event.
- `ocr_started`: OCR camera scan launched.
- `ocr_completed`: Document fields successfully recognized.
- `report_generated`: C-Form or occupancy report viewed.
- `export_created`: PDF or CSV export generated.
- `pricing_viewed`: User opened pricing comparison screen.
- `upgrade_prompt_viewed`: Contextual paywall modal displayed.
- `checkout_started`: User selected a subscription plan.
- `subscription_started`: Payment successfully verified.
- `trial_started`: 30-day trial activated.
