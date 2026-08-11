# Subscription Architecture

## Overview

The Guest Check-in Assistant uses a local-first, offline-safe subscription system. Subscription state is cached locally and never blocks the user from accessing their existing data, even without network connectivity.

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│                  Mobile App                      │
│                                                  │
│  ┌──────────────┐    ┌──────────────────────┐   │
│  │ Zustand Store │◄───│  Entitlement Service │   │
│  │ (MMKV)       │    │  (Feature Gates)     │   │
│  └──────┬───────┘    └──────────┬───────────┘   │
│         │                       │                │
│  ┌──────▼───────┐    ┌──────────▼───────────┐   │
│  │ SQLite       │    │  UI Screens          │   │
│  │ Usage Table  │    │  (Settings, Scanner,  │   │
│  │              │    │   Rooms, Reports)    │   │
│  └──────────────┘    └──────────────────────┘   │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │         Payment Provider (Abstract)       │   │
│  │  ┌─────────┐  ┌──────────┐  ┌─────────┐ │   │
│  │  │  Stub   │  │ Razorpay │  │ Stripe  │ │   │
│  │  └─────────┘  └──────────┘  └─────────┘ │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│               Firebase (Cloud)                   │
│  ┌──────────┐  ┌────────────┐  ┌────────────┐  │
│  │ Auth     │  │ Firestore  │  │ Cloud Fn   │  │
│  │          │  │ (sub data) │  │ (verify)   │  │
│  └──────────┘  └────────────┘  └────────────┘  │
└─────────────────────────────────────────────────┘
```

## Data Flow

### 1. Subscription State (Zustand + MMKV)

The `useSubscriptionStore` is the single source of truth for the client-side UI. It is:
- Persisted via MMKV (survives app restarts)
- Initialized from cached state on app launch
- Updated from server when connectivity is available
- Never blocks UI rendering on network requests

### 2. Entitlement Service (Pure Functions)

`entitlementService.ts` provides stateless functions that read from the Zustand store:
- `canUseFeature(feature)` → boolean
- `getLimit(limitKey)` → number
- `isAtLimit(metric)` → boolean
- `hasPlan(minimumPlan)` → boolean

Screens never check plan names directly. They always call these functions.

### 3. Usage Tracking (Zustand + SQLite)

Monthly counters are tracked in `useSubscriptionStore.usage`:
- Auto-resets when the calendar month changes
- Incremented after successful actions (not before)
- Also backed up to SQLite `subscription_usage` table

### 4. Grace Period (Offline Tolerance)

The system uses a 30-day grace period:
- If the app hasn't verified with the server in 30 days, it continues using cached entitlements
- After subscription expiry, a 7-day grace period allows continued access
- The user is NEVER locked out of their existing data

## File Structure

```
src/
├── types/
│   └── subscription.ts          # Enums, interfaces, types
├── config/
│   └── plans.ts                 # Plan definitions, entitlement matrix
├── services/
│   ├── entitlementService.ts    # Feature gates, limit checks
│   ├── paymentProvider.ts       # Payment abstraction
│   ├── analyticsService.ts      # Analytics abstraction
│   └── backupService.ts         # Backup/restore service
├── store/
│   └── useSubscriptionStore.ts  # Zustand store (MMKV-persisted)
├── components/subscription/
│   ├── UpgradePrompt.tsx        # Contextual upgrade modal
│   ├── UsageDashboard.tsx       # Usage progress widget
│   └── PlanBadge.tsx            # Plan tier badge
└── app/subscription/
    ├── _layout.tsx              # Subscription route layout
    └── pricing.tsx              # Plan selection screen
```

## Integration Points

| Screen | Gate | Service Call |
|--------|------|-------------|
| `checkin/review.tsx` | Monthly check-in limit | `isAtLimit('monthlyCheckIns')` + `incrementCheckIn()` |
| `(tabs)/scanner.tsx` | OCR scanning access | `canUseFeature('ocrScanning')` + `incrementOcrScan()` |
| `(tabs)/scanner.tsx` | Self-check-in approval | `incrementCheckIn()` |
| `(tabs)/rooms.tsx` | Room count limit | `isRoomLimitReached(rooms.length)` |
| `reports.tsx` | Monthly export limit | `isAtLimit('monthlyExports')` + `incrementExport()` |
| `(tabs)/settings.tsx` | Subscription display | `useSubscriptionStore` + `PlanBadge` + `UsageDashboard` |

## Security Model

1. **Client-side state is for UX only** — it controls what the UI shows, not what data is accessible
2. **Server-side verification** is required for payment validation (documented as TODO)
3. **No payment credentials** (card numbers, CVV) are ever stored locally
4. **Grace periods** prevent offline lockout but don't grant new features
5. **Guest data is never gated** — all existing check-in records remain accessible regardless of plan
