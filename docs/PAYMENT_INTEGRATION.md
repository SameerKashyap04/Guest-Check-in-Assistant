# Payment Integration & Razorpay Gateway Architecture
**Guest Check-in Assistant**

---

## 1. Overview
The payment architecture uses an isolated abstraction layer (`PaymentProvider`) to manage checkout, subscription renewal, signature verification, and webhook processing securely.

---

## 2. Payment Integration Workflow

```
Mobile App (PaymentProvider)
 ├── 1. Trigger createSubscription({ planId, billingCycle })
 ├── 2. Initialize Razorpay Checkout Order
 └── 3. User Completes UPI/NetBanking Payment
       │
       ▼
Backend API (Server Webhook)
 ├── 4. Razorpay sends payment.captured / subscription.charged webhook
 ├── 5. Server verifies X-Razorpay-Signature using secret key
 └── 6. Server updates customer plan authoritative state in database
```

---

## 3. Webhook Security & Idempotency
- **Signature Check**: All incoming webhooks verify HMAC SHA256 signatures with the Razorpay webhook secret.
- **Idempotency**: Webhook payload IDs are logged to `audit_logs` to prevent duplicate credit processing.
- **PCI Compliance**: Zero credit card, CVV, or banking credentials are ever handled or stored on client devices.
