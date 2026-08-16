# Monetization Plan for StayMate

The best model is **B2B subscription SaaS**: property owners pay monthly or annually for faster check-ins, offline records, reports, and multi-property management. Keep the guest-facing QR check-in free so it reduces friction and drives adoption.

---

## 1. Target Customers

Prioritize customers who experience the problem frequently:

- **Homestays and guesthouses** with 2–20 rooms.
- **Small hotels and resorts** in rural or low-connectivity areas.
- **Property managers** operating multiple homestays.
- **Hostel, lodge, and serviced-apartment owners**.
- **Local hotel associations and tourism consultants** who can resell the product.

> **Note**: Do not initially target large hotel chains. They usually require complex integrations, lengthy procurement processes, custom support, and enterprise security reviews.

---

## 2. Recommended Pricing

Use a free trial followed by simple property-based plans. These prices are starting hypotheses to be tested with real owners.

| Plan | Suggested Price | Suitable For | Included Features |
|---|---:|---|---|
| **Free** | ₹0 | Trial users & very small properties | 1 property, up to 20 check-ins/month, basic guest records, QR check-in |
| **Starter** | ₹299/mo or ₹2,999/yr | Small homestays | 1 property, 5 rooms, unlimited check-ins, offline mode, basic PDF/CSV exports |
| **Professional** | ₹799/mo or ₹7,999/yr | Hotels & resorts | 1 property, up to 30 rooms, OCR scanning, staff accounts, advanced reports, backups |
| **Multi-Property** | ₹1,999/mo or ₹19,999/yr | Property managers | Up to 10 properties, centralized dashboard, role permissions, consolidated reports |
| **Enterprise** | Custom pricing | Hotel groups & chains | Unlimited properties, API access, dedicated onboarding, SLA support, custom integrations |

Offer roughly **two months free on annual billing**. Subscription pricing creates predictable revenue, while a free tier or trial lets owners experience the product before paying.

### Suggested Launch Offer
For the first 100 paying properties:
- 30-day free trial.
- ₹199/month for the first three months.
- Free migration of existing guest records.
- Free setup call and staff training.
- Price locked for 12 months.

---

## 3. Free vs. Paid Feature Matrix

### Keep Free
The free experience should demonstrate value quickly:
- Basic guest registration.
- QR-based guest form.
- 1 property and limited rooms.
- Offline data entry.
- Limited PDF / CSV exports.
- Basic occupancy view.

### Put Behind Paid Plan
Charge for features that save time, reduce risk, or support business growth:
- Unlimited check-ins.
- Camera OCR scanning.
- Unlimited PDF and CSV reports.
- Automated backups and restore.
- Multiple staff logins & role-based permissions.
- Multi-property management.
- Advanced occupancy and revenue reports.
- Cloud synchronization across devices.
- WhatsApp or SMS notifications.
- API and PMS/accounting integrations.
- Priority support and onboarding.

---

## 4. Additional Revenue Streams

Add these only after the core subscription is working.

### Paid Add-ons
- **Extra property**: ₹299–₹499/month.
- **Additional staff user**: ₹99–₹199/month.
- **Branded reports**: ₹999 one-time or included in Professional.
- **Data migration**: ₹2,000–₹10,000 depending on record volume.
- **On-site or video training**: ₹1,500–₹5,000 per session.
- **Custom integration**: ₹25,000–₹1,50,000 one-time.
- **Priority support**: ₹499–₹1,499/month.

### Partner Commissions
Create partnerships with hotel-management consultants, local tourism associations, POS/accounting software providers, CCTV/Wi-Fi installers, and booking platforms. Offer 20–30% of first-year subscription revenue or recurring commissions. Avoid in-app advertising inside check-in workflows to maintain trust.

---

## 5. Privacy and Trust Strategy

Privacy should be part of the product’s commercial positioning, not just a legal compliance task.

- **Data Minimization**: Collect only fields necessary for check-in and government reporting.
- **Clear Privacy Notice**: Explain what info is collected, purpose, and retention duration.
- **Consent & Rights**: Practical withdrawal and deletion process.
- **Encryption**: Encrypt local SQLite/MMKV databases and exported files.
- **Access Protection**: PIN, biometric, and automatic screen lock.
- **Data Masking**: Mask sensitive document numbers (e.g. Aadhaar) in standard UI views and exports unless explicitly required.
- **Audit Logs**: Maintain logs for data exports, deletions, and staff access.
- **DPDP Act & UIDAI Alignment**: Ensure compliance with India's Digital Personal Data Protection Act and relevant UIDAI guidelines.

---

## 6. Sales and Distribution Plan

### First 30 Customers
Use direct, local sales rather than paid advertising:
1. Visit homestays, lodges, and resorts in key tourism clusters.
2. Demonstrate scanning an ID and generating a report in under two minutes.
3. Offer free setup and a 30-day trial.
4. Record time saved and collect testimonials.
5. Convert trials into annual subscriptions.

> **Core Value Proposition**: *"Check guests in faster, keep records organized offline, and generate authority-ready reports without paper registers."*

### Scalable Channels
- Partner with local hotel associations.
- Create Hindi and regional-language sales material.
- Publish short video walkthroughs.
- Referral rewards for existing property owners.
- Reseller accounts for hospitality consultants.

---

## 7. Product-Led Upgrade Funnel

Design the app so users naturally encounter paid value:
1. User registers a property.
2. User completes first manual check-in.
3. App displays time saved and records stored.
4. User tries free QR check-in.
5. On the 3rd–5th check-in, introduce OCR scanning with a clear upgrade prompt.
6. When requesting additional reports or staff accounts, present relevant tier upgrades.
7. Trigger usage-based trial reminders.

---

## 8. First-Year Execution Roadmap

```
Months 1-2: Validate Willingness to Pay
 ├── Interview 30 property owners
 ├── Test price points (₹299, ₹799, ₹1,999)
 └── Secure 10-15 paying design partners

Months 3-4: Launch Paid Version
 ├── Release Free, Starter, Professional plans
 ├── Integrate subscription payment gateway (e.g., Razorpay Subscriptions)
 └── Deploy privacy controls, consent logs, & automated data retention

Months 5-8: Improve Retention & Localization
 ├── Add staff accounts & role-based controls
 ├── Add regional language support
 └── Conversion campaign for annual billing (2 months free)

Months 9-12: Expand Revenue & Integrations
 ├── Launch Multi-Property tier
 ├── Partner/reseller accounts
 └── Test enterprise contracts for small hotel groups
```

---

## 9. Core Metrics to Monitor

- **Conversion**: Trial-to-paid conversion rate, Annual plan adoption rate (Target: ≥40%).
- **Revenue**: Monthly Recurring Revenue (MRR), Average Revenue Per Property (ARPU).
- **Retention**: Monthly churn (Target: <3–5%).
- **Engagement**: Check-ins per active property, OCR usage rate, Report generation frequency.

---

## Strategic Summary

Adopt a **Free + Starter + Professional** B2B SaaS model. Keep guest QR check-in free to eliminate friction, while gating high-value owner features (**OCR scanning, unlimited reports, multi-device cloud sync, automated backups, staff accounts**). Maintain strict privacy standards (DPDP Act alignment) as a competitive advantage.
