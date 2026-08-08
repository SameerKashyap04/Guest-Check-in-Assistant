# Pricing & Entitlement Matrix Specification
**Guest Check-in Assistant**

---

## 1. Master Pricing Matrix

| Plan ID | Display Name | Monthly Price (INR) | Yearly Price (INR) | Target Customer |
|---|---|---:|---:|---|
| `FREE` | Free | ₹0 | ₹0 | Trial users & tiny homestays |
| `STARTER` | Starter | ₹299/mo | ₹2,999/yr | Small homestays (up to 5 rooms) |
| `PROFESSIONAL` | Professional | ₹799/mo | ₹7,999/yr | Hotels & resorts |
| `MULTI_PROPERTY` | Multi-Property | ₹1,999/mo | ₹19,999/yr | Property managers (up to 10 properties) |
| `ENTERPRISE` | Enterprise | Custom | Custom | Hotel chains & groups |

---

## 2. Feature Entitlements

| Entitlement Key | Free | Starter | Professional | Multi-Property |
|---|---|---|---|---|
| `maxProperties` | 1 | 1 | 1 | 10 |
| `maxRoomsPerProperty` | 5 | 5 | 30 | Unlimited (999) |
| `monthlyCheckInLimit` | 20 | Unlimited | Unlimited | Unlimited |
| `ocrScanning` | ❌ Locked | ❌ Locked | ✅ Enabled | ✅ Enabled |
| `unlimitedExports` | ❌ (5/mo) | ✅ Enabled | ✅ Enabled | ✅ Enabled |
| `backups` | ❌ Manual | ❌ Manual | ✅ Automated | ✅ Automated |
| `staffAccounts` | ❌ (1 Owner) | ❌ (1 Owner) | ✅ Up to 5 | ✅ Unlimited |
| `multiProperty` | ❌ Disabled | ❌ Disabled | ❌ Disabled | ✅ Enabled |

---

## 3. Special Launch Offer (First 100 Properties)
- **30-Day Free Trial** with full Professional entitlements.
- **₹199/month** for first 3 months.
- **Free Migration & Onboarding Call**.
- **12-Month Price Lock**.
