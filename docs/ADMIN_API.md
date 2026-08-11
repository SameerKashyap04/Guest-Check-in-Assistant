# Admin API & Data Schema

## Firestore Data Collections

### 1. `/owners/{uid}`
- `uid`: string (Firebase Auth UID)
- `email`: string
- `businessName`: string
- `propertyId`: string (e.g., `HS-8821`)
- `currentPlan`: `FREE` | `STARTER` | `PROFESSIONAL` | `MULTI_PROPERTY`
- `status`: `active` | `trialing` | `past_due` | `cancelled`
- `trialEndDate`: ISO string
- `renewalDate`: ISO string
- `createdAt`: ISO string

### 2. `/subscriptions/{subId}`
- `ownerId`: string
- `plan`: string
- `billingCycle`: `monthly` | `yearly`
- `amount`: number
- `provider`: `razorpay` | `stripe` | `manual`
- `status`: string

### 3. `/audit_logs/{logId}`
- `adminId`: string
- `action`: string
- `target`: string
- `timestamp`: serverTimestamp
