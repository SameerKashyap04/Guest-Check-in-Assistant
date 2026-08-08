# Admin Roles & Permission Matrix
**Guest Check-in Assistant**

---

## 1. Role Definitions

1. **SUPER_ADMIN**:
   - SaaS Owner / Core Executive team.
   - Full read and write permissions across all users, subscriptions, plans, pricing configurations, financial analytics, and admin account management.

2. **ADMIN**:
   - Support & Operations team.
   - Read permissions for users, properties, subscriptions, and payments.
   - Restricted write permissions (can extend trials & trigger support actions; cannot modify master plan pricing or manage super admin credentials).

---

## 2. Permission Matrix

| Capability / Action | SUPER_ADMIN | ADMIN | Property Owner |
|---|:---:|:---:|:---:|
| View MRR / ARR Analytics | ✅ | ✅ | ❌ |
| View All Customers & Properties | ✅ | ✅ | ❌ (Own property only) |
| Change Customer Subscription Plan | ✅ | ❌ | ❌ |
| Extend Customer Trial | ✅ | ✅ | ❌ |
| Configure Plan Pricing | ✅ | ❌ | ❌ |
| Export System Audit Logs | ✅ | ❌ | ❌ |
