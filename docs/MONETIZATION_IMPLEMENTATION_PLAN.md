# Monetization & Subscription System — Implementation Plan
**Project:** Guest Check-in Assistant  
**Version:** 1.2.0  
**Target:** Production B2B SaaS Monetization, Entitlements, Paywalls & Admin Control Center

---

## 1. Executive Summary & Existing Architecture Audit

Guest Check-in Assistant is an offline-first, local-first React Native mobile application built on Expo SDK 57 for Indian homestays and hotels.

### Current System Inspection
- **Navigation & Routing**: Expo Router (`src/app/(tabs)`: `index.tsx`, `rooms.tsx`, `scanner.tsx`, `settings.tsx` + stack screens: `checkin/review.tsx`, `registrations.tsx`, `reports.tsx`, `auth.tsx`, `self-checkin.tsx`).
- **Database & Storage**:
  - **SQLite** (`guestcheckin.db` via `expo-sqlite`): Manages `guests`, `rooms`, `stays` with `property_id` scoping.
  - **MMKV**: Fast key-value persistence for Zustand stores (`settings-storage`, `rooms-storage`).
  - **SecureStore**: Encrypted PIN & credential storage (`useAuthStore`).
- **State Management**: Zustand (`useAuthStore`, `useSettingsStore`, `useRoomsStore`).
- **OCR Engine**: ML Kit Text Recognition (`@react-native-ml-kit/text-recognition`) + Expo Camera in `scanner.tsx`.
- **Reports**: `expo-print` PDF generator & `expo-sharing` CSV exports in `reports.tsx`.
- **Cloud/Sync**: Optional Firebase Auth & Firestore sync (`src/services/firebaseAuth.ts`, `firebaseSync.ts`).

---

## 2. Subscription Plans & Entitlement Matrix

| Feature / Entitlement | FREE (₹0) | STARTER (₹299/mo) | PROFESSIONAL (₹799/mo) | MULTI-PROPERTY (₹1,999/mo) | ENTERPRISE (Custom) |
|---|---|---|---|---|---|
| **Max Properties** | 1 | 1 | 1 | 10 | Unlimited |
| **Max Rooms / Property** | 5 | 5 | 30 | Unlimited | Unlimited |
| **Monthly Check-ins** | 20 | Unlimited | Unlimited | Unlimited | Unlimited |
| **QR Self Check-in** | Included | Included | Included | Included | Included |
| **OCR ID Scanning** | Locked (Preview) | Locked | Included | Included | Included |
| **PDF & CSV Exports** | 5/month | Basic Unlimited | Unlimited | Unlimited | Unlimited |
| **Backups & Restore** | Manual local | Manual local | Automated Cloud/Local | Automated Cloud/Local | Custom Backup |
| **Staff Accounts** | 1 (Owner) | 1 (Owner) | Up to 5 staff | Unlimited | Unlimited |
| **Multi-Property Dashboard** | Disabled | Disabled | Disabled | Enabled | Enabled |
| **Priority Support** | Standard | Standard | Priority | Priority | Dedicated Manager |

---

## 3. Database Schema Changes & Migrations

### SQLite (`guestcheckin.db`) Migrations in `src/database/index.ts`
We will introduce 2 new tables to manage subscription state, offline usage counters, and audit logs locally:

```sql
-- Local Subscription & Usage Cache Table
CREATE TABLE IF NOT EXISTS subscription_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  current_plan TEXT NOT NULL DEFAULT 'FREE',
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'trialing', 'past_due', 'cancelled', 'expired'
  billing_cycle TEXT NOT NULL DEFAULT 'monthly', -- 'monthly', 'yearly'
  trial_start DATETIME,
  trial_end DATETIME,
  subscription_start DATETIME,
  renewal_date DATETIME,
  payment_provider TEXT DEFAULT 'none',
  external_subscription_id TEXT,
  last_verified_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Local Monthly Usage Tracker Table
CREATE TABLE IF NOT EXISTS subscription_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id TEXT NOT NULL,
  year_month TEXT NOT NULL, -- e.g., '2026-08'
  checkin_count INTEGER DEFAULT 0,
  export_count INTEGER DEFAULT 0,
  ocr_count INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(property_id, year_month)
);

-- Local Security Audit Log Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  property_id TEXT,
  action TEXT NOT NULL,
  details TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Architectural & File Hierarchy Plan

### New Mobile Files to Create

1. **`src/types/subscription.ts`**: Types for Plans (`FREE`, `STARTER`, `PROFESSIONAL`, `MULTI_PROPERTY`, `ENTERPRISE`), Subscription Status, Entitlement Matrix, Usage Metrics, and Payment Provider interfaces.
2. **`src/config/plans.ts`**: Master plan definition constants, pricing in INR, limits, launch offer configurations (`LAUNCH_OFFER_ENABLED = true`), trial duration (`TRIAL_DURATION_DAYS = 30`).
3. **`src/services/entitlementService.ts`**: Centralized service providing `canUseFeature(feature)`, `getLimit(limitKey)`, `hasPlan(plan)`, and `checkUsageLimit(metric)`.
4. **`src/store/useSubscriptionStore.ts`**: Persistent Zustand store managing subscription state, local usage counters, offline grace periods, and payment sync.
5. **`src/services/paymentProvider.ts`**: Abstraction for subscription creation, upgrade, cancellation, and verification (integrating Razorpay/Mock adapter).
6. **`src/services/analyticsService.ts`**: Abstracted event tracking (`ocr_started`, `checkin_completed`, `pricing_viewed`) stripping all PII.
7. **`src/components/subscription/UpgradeModal.tsx`**: Reusable contextual paywall popup with clear feature benefits and upgrade CTAs.
8. **`src/components/subscription/UsageMeter.tsx`**: Visual progress bar for check-in and room limits.
9. **`src/app/subscription/pricing.tsx`**: Modern, native pricing screen with Monthly/Yearly toggle, Professional badge, and feature comparisons.
10. **`src/app/subscription/manage.tsx`**: Current subscription details, billing history, usage statistics, and renewal management.

### Files to Modify in Mobile App

- `src/database/index.ts`: Add `subscription_state`, `subscription_usage`, `audit_logs` table creation & migration steps.
- `src/app/(tabs)/settings.tsx`: Add **Subscription** section with current plan badge, usage meters, and "Upgrade Plan" navigation.
- `src/app/(tabs)/scanner.tsx`: Integrate OCR entitlement check with locked preview & `UpgradeModal`.
- `src/app/(tabs)/rooms.tsx`: Enforce plan room limit check before opening Add Room dialog.
- `src/features/checkin/hooks/useAutoCapture.ts` & `src/app/checkin/review.tsx`: Enforce monthly check-in limit (20 for FREE) with upgrade prompt before completing stay #21.
- `src/app/reports.tsx`: Enforce monthly export limits for PDF/CSV on Free plan.

---

## 5. Web Admin Panel & Backend API Architecture (`/admin`)

To fulfill the requirements of Sections 32–61, we will implement a Next.js Admin Panel and Backend API Service.

### Web Admin Structure (`src/admin` / Next.js)
```
src/admin/
 ├── app/
 │    ├── layout.tsx
 │    ├── page.tsx (Login)
 │    ├── dashboard/page.tsx (Overview KPIs: Users, MRR, ARR, Active Subscriptions)
 │    ├── revenue/page.tsx (Financial Analytics, Charts, Date Filters)
 │    ├── users/page.tsx & [id]/page.tsx (User Management, Activity, Properties)
 │    ├── properties/page.tsx (Property Listings, Room Counts, Usage)
 │    ├── subscriptions/page.tsx (Subscription Table, Status, Plan Changes, Trial Extensions)
 │    ├── payments/page.tsx (Transactions, Success/Failed Log)
 │    ├── plans/page.tsx (Plan Pricing & Entitlement Configurator)
 │    └── audit-logs/page.tsx (Admin Action Logs)
 ├── components/ (Sidebar, MetricCards, Charts, StatusBadges)
 └── lib/ (Admin Auth, API Client, Role Verification)
```

### Backend API Services (`src/services/backendApi.ts` / Next.js API Routes)
- `POST /api/admin/auth/login`: Admin authentication.
- `GET /api/admin/dashboard`: Aggregated metrics (MRR, ARR, active users, churn).
- `GET /api/admin/subscriptions`: Subscription listings & management.
- `POST /api/admin/subscriptions/update-plan`: Change plan or extend trial.
- `GET /api/admin/payments`: Verified payment logs.
- `POST /api/webhooks/razorpay`: Server-trusted webhook handler for subscription payment events.

---

## 6. Offline-First & Security Guarantees

1. **Offline Entitlement Protection**: Local SQLite database caches verified subscription state. In offline mode, the app uses cached entitlements without locking out users.
2. **Authoritative Server Verification**: Client cannot mutate plan levels locally for production payments; subscription state updates are signed/verified by backend webhooks.
3. **Data Privacy (DPDP & Aadhaar)**: Zero guest document images or full identity numbers are sent to analytics or exposed in raw form on the Admin Panel. Sensitive numbers are masked in UI and exports.

---

## 7. Documentation Artifacts to Produce

1. `/docs/MONETIZATION_IMPLEMENTATION_PLAN.md`
2. `/docs/SUBSCRIPTION_ARCHITECTURE.md`
3. `/docs/PRICING_AND_ENTITLEMENTS.md`
4. `/docs/PAYMENT_INTEGRATION.md`
5. `/docs/ADMIN_PANEL_ARCHITECTURE.md`
6. `/docs/ADMIN_API.md`
7. `/docs/ADMIN_ROLES_AND_PERMISSIONS.md`
8. `/docs/ANALYTICS_METRICS.md`
9. `/docs/REVENUE_METRICS.md`

---

## 8. Risk Assessment & Mitigation

| Risk | Impact | Mitigation Strategy |
|---|---|---|
| **Accidental Lockout Offline** | High | Default to 14-day offline grace period using cached SQLite subscription state. Never fail hard on network errors. |
| **Data Migration Corruption** | High | Use safe SQLite `CREATE TABLE IF NOT EXISTS` and wrapped `ALTER TABLE` try-catch blocks. |
| **Double Counting Check-ins** | Medium | Use atomic SQLite transactions with `UNIQUE(property_id, year_month)` constraint for usage tracking. |
| **Unauthorized Admin Access** | High | Enforce server-side JWT verification & `SUPER_ADMIN`/`ADMIN` role checks on all API endpoints. |
