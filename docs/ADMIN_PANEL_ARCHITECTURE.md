# Web Admin Panel Architecture & SaaS Control Center
**Guest Check-in Assistant**

---

## 1. Executive Summary
The Web Admin Panel is an internal SaaS control center for the product owner and management team to monitor business growth, MRR/ARR, churn, active subscriptions, and customer support actions.

---

## 2. Technical Stack
- **Framework**: Next.js / React Native Web Stack with TypeScript.
- **Styling**: Tailwind CSS & NativeWind design system.
- **State & API**: REST API services via `BackendApiService`.
- **Security**: Server-side JWT authentication & RBAC (`SUPER_ADMIN` / `ADMIN`).

---

## 3. Module Hierarchy

```
src/admin/
 ├── components/
 │    └── AdminLayout.tsx (Sidebar navigation, brand header, active route states)
 └── pages/
      ├── DashboardPage.tsx (KPI Overview: MRR, ARR, Active Subscriptions, Churn)
      ├── SubscriptionsPage.tsx (Subscription table, plan overrides, trial extensions)
      ├── UsersPage.tsx (Customer directory & detail inspector)
      └── RevenuePage.tsx (Financial analytics & cohort reports)
```

---

## 4. Privacy & Data Protection Rules
- **Privacy Minimization**: The Admin Panel does NOT expose raw guest identity document images or full Aadhaar numbers by default.
- **Audit Logging**: All admin overrides (e.g. plan upgrades, trial extensions) are recorded in `audit_logs`.
