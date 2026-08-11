# Pricing & Entitlements Reference

## Plan Comparison Matrix

| Feature | Free | Starter (₹299/mo) | Professional (₹799/mo) | Multi-Property (₹1999/mo) |
|---------|------|-------------------|----------------------|-------------------------|
| **Rooms** | 10 | 5 | 30 | 30 per property |
| **Monthly Check-ins** | 20 | Unlimited | Unlimited | Unlimited |
| **Monthly Exports** | 5 | Unlimited | Unlimited | Unlimited |
| **Properties** | 1 | 1 | 1 | 10 |
| **Staff Accounts** | ✗ | ✗ | 5 | 20 |
| QR Self-Check-in | ✓ | ✓ | ✓ | ✓ |
| Offline Mode | ✓ | ✓ | ✓ | ✓ |
| Basic Reports | ✓ | ✓ | ✓ | ✓ |
| PDF Export | ✓ | ✓ | ✓ | ✓ |
| CSV Export | ✓ | ✓ | ✓ | ✓ |
| Unlimited Exports | ✗ | ✓ | ✓ | ✓ |
| **OCR Scanning** | ✗ | ✗ | ✓ | ✓ |
| Advanced Reports | ✗ | ✗ | ✓ | ✓ |
| Staff Accounts | ✗ | ✗ | ✓ | ✓ |
| Backup & Restore | ✗ | ✗ | ✓ | ✓ |
| Priority Support | ✗ | ✗ | ✓ | ✓ |
| Multi-Property | ✗ | ✗ | ✗ | ✓ |
| Centralized Dashboard | ✗ | ✗ | ✗ | ✓ |
| Role Permissions | ✗ | ✗ | ✗ | ✓ |

## Annual Pricing

| Plan | Monthly | Annual | Savings |
|------|---------|--------|---------|
| Free | ₹0 | ₹0 | – |
| Starter | ₹299/mo | ₹2,999/yr | ₹589/yr |
| Professional | ₹799/mo | ₹7,999/yr | ₹1,589/yr |
| Multi-Property | ₹1,999/mo | ₹19,999/yr | ₹3,989/yr |

## Launch Offer (Active)

- First 100 properties: ₹199/mo for 3 months
- Price lock: 12 months
- Includes: Free setup call + free data migration
- Config: `src/config/plans.ts` → `LAUNCH_OFFER`

## Trial Configuration

- Duration: 30 days
- Plan during trial: Professional
- Reminder days: 7, 3, 1 before expiry
- Config: `src/config/plans.ts` → `TRIAL_CONFIG`

## Feature Flag Reference

| Flag | Description | Minimum Plan |
|------|-------------|-------------|
| `qrCheckIn` | QR self-check-in link | Free |
| `offlineMode` | Offline-first data storage | Free |
| `basicReports` | Standard guest reports | Free |
| `pdfExport` | Export to PDF | Free |
| `csvExport` | Export to CSV | Free |
| `unlimitedExports` | No monthly export limit | Starter |
| `ocrScanning` | Automatic ID card OCR | Professional |
| `advancedReports` | Advanced analytics reports | Professional |
| `staffAccounts` | Multi-user staff access | Professional |
| `backups` | Database backup | Professional |
| `restore` | Database restore | Professional |
| `prioritySupport` | Priority email support | Professional |
| `multiProperty` | Manage multiple properties | Multi-Property |
| `centralizedDashboard` | Cross-property dashboard | Multi-Property |
| `rolePermissions` | Role-based access control | Multi-Property |
| `apiAccess` | REST API access | Enterprise |

## Modifying Plans

All plan definitions are in `src/config/plans.ts`. To change a plan:

1. Update the `PLANS` record with new pricing/limits/features
2. The entitlement service automatically picks up changes
3. No screen code changes needed — gates use `canUseFeature()` and `getLimit()`
