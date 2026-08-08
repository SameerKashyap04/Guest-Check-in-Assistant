# Subscription Architecture & Offline-First Entitlement System
**Guest Check-in Assistant**

---

## 1. Overview
The Subscription Architecture is designed to enforce B2B SaaS feature gating and limits while preserving **100% offline reliability**. A loss of network connectivity never blocks property owners from checking in guests or viewing their local records.

---

## 2. Component Diagram

```
Mobile App (Zustand & SQLite)
 ├── EntitlementService (Centralized Feature Gate)
 ├── useSubscriptionStore (MMKV Persistent State & Trial Tracker)
 └── SQLite Tables (subscription_state, subscription_usage, audit_logs)
       │
       │ (Periodic Sync & Webhook Handlers)
       ▼
Backend API (Next.js / Razorpay Gateway)
 ├── POST /api/webhooks/razorpay (Authoritative Server Signature Check)
 └── GET /api/admin/subscriptions (SaaS Management)
```

---

## 3. Storage & Cache Layers

1. **Local SQLite Cache (`subscription_state`)**: Caches the last verified plan, status, and renewal dates locally so the app runs instantly offline.
2. **MMKV Store (`subscription-storage-v1`)**: Powers `useSubscriptionStore` for fast reactively updated UI badges and usage meters.
3. **Usage Tracker (`subscription_usage`)**: Persists monthly check-in and export counters atomically with SQLite transactions using `UNIQUE(property_id, year_month)`.

---

## 4. Offline Entitlement Verification & Grace Period
- **Grace Period**: 14-day offline grace period.
- **Offline Rule**: If the network is unavailable during a check-in or export, the app uses cached entitlements rather than locking the user out.
- **Online Re-verification**: When connectivity is restored, `useSubscriptionStore.verifyOnlineSubscription()` silently syncs with the server.
