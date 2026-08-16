# Admin Panel Architecture

## Overview

The Admin Panel is a standalone, web-based management portal built using **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS**. It connects directly to the shared Firebase backend (`Firestore` & `Firebase Auth`) used by the StayMate mobile application.

## Directory Location & Structure

```
admin-panel/
├── src/
│   ├── app/
│   │   ├── layout.tsx         # App Router Root Layout
│   │   ├── page.tsx           # Monetization Dashboard (MRR/ARR KPIs & Live Log)
│   │   ├── users/page.tsx     # Property Owners Directory
│   │   ├── properties/page.tsx # Property Directory
│   │   ├── subscriptions/page.tsx # Subscriptions Ledger
│   │   ├── payments/page.tsx  # Payment Logs
│   │   ├── revenue/page.tsx   # Financial & ARPU Analytics
│   │   ├── analytics/page.tsx # Check-in & OCR Usage Stats
│   │   ├── plans/page.tsx     # Plan & Entitlements Configuration Matrix
│   │   ├── audit-logs/page.tsx # Immutable Admin Audit Logs
│   │   └── login/page.tsx     # Admin Portal Authentication
│   ├── components/
│   │   └── AdminLayout.tsx    # Sidebar Navigation & PII Privacy Toggle
│   └── lib/
│       └── firebase.ts        # Shared Firebase Client SDK
```

## Security & PII Protection Standards

1. **Default PII Masking**:
   - raw identity document photos (Aadhaar/Passport scans) and full 12-digit Aadhaar numbers are masked by default.
   - Admin UI includes a strict `PII Masking` status toggle.

2. **Role-Based Access Control**:
   - Access restricted to Firebase Auth users with `admin: true` custom claim or registered in `/admins` Firestore collection.

3. **Audit Trails**:
   - Every administrative override (e.g. extending a trial, manual plan change, unmasking PII) creates an immutable record in `/audit_logs`.
