# Admin API Endpoint Specification
**Guest Check-in Assistant**

---

## 1. Authentication & Security Header
All Admin API requests require a valid Bearer JWT token in the Authorization header:
`Authorization: Bearer <ADMIN_JWT_TOKEN>`

---

## 2. API Endpoints

### `GET /api/admin/dashboard`
Returns high-level business KPIs.
**Response**:
```json
{
  "totalUsers": 1284,
  "activeUsers": 842,
  "totalProperties": 1156,
  "activeSubscriptions": 426,
  "mrr": 324000,
  "arr": 3888000,
  "trialUsers": 128,
  "freeUsers": 730,
  "churnRate": 3.2,
  "totalCheckins": 24582,
  "ocrScans": 13421
}
```

### `GET /api/admin/subscriptions`
Lists all property subscriptions with plan and renewal status.

### `POST /api/admin/subscriptions/update-plan`
Allows Super Admins to manually change a customer's subscription plan.
**Body**: `{ "userId": "USR_101", "newPlan": "PROFESSIONAL" }`

### `POST /api/admin/subscriptions/extend-trial`
Extends trial duration for a specific property owner.
**Body**: `{ "userId": "USR_101", "extraDays": 14 }`

### `POST /api/webhooks/razorpay`
Server-trusted webhook endpoint for processing payment captured/failed events.
