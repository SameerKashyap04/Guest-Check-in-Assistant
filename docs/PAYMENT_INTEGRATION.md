# Payment Integration Guide (Razorpay / Stripe)

## Overview

The Guest Check-in Assistant monetization model uses an abstract `PaymentProvider` interface (`src/services/paymentProvider.ts`). This allows seamless integration with payment gateways such as Razorpay (primary for India) and Stripe (international).

## Razorpay Integration Architecture

### Client-side (React Native App)

1. **Package Installation**:
   ```bash
   npm install react-native-razorpay
   ```

2. **Flow**:
   - User selects a plan on `src/app/subscription/pricing.tsx`.
   - App calls backend Cloud Function to create a Razorpay Subscription / Order ID.
   - App launches Razorpay Checkout SDK sheet using the generated `subscription_id` or `order_id`.
   - On payment success, Razorpay returns `razorpay_payment_id`, `razorpay_subscription_id`, and `razorpay_signature`.

3. **Code Example**:
   ```typescript
   import RazorpayCheckout from 'react-native-razorpay';

   const options = {
     description: 'Professional Plan Subscription',
     image: 'https://guest-checkin-assistant.firebaseapp.com/icon.png',
     currency: 'INR',
     key: 'rzp_live_XXXXXXXXXXXX',
     subscription_id: serverGeneratedSubId,
     name: 'Guest Check-in Assistant',
     prefill: {
       email: userEmail,
       contact: userPhone,
       name: businessName,
     },
     theme: { color: '#8B5CF6' }
   };

   RazorpayCheckout.open(options).then((data) => {
     // Verify signature on backend before activating entitlement
     verifyPaymentSignatureOnServer(data);
   }).catch((error) => {
     Alert.alert('Payment Cancelled', error.description);
   });
   ```

### Server-Side (Firebase Cloud Functions / Webhooks)

1. **Webhook Listener**:
   - `subscription.authenticated` -> Mark subscription as active.
   - `subscription.charged` -> Extend expiry date and issue invoice.
   - `subscription.halted` / `payment.failed` -> Set status to `past_due`, enter 7-day grace period.
   - `subscription.cancelled` -> Mark subscription as `cancelled`.

2. **Security & Signature Verification**:
   - Never trust client-side payload alone.
   - Compute HMAC SHA256 signature using `RAZORPAY_WEBHOOK_SECRET`.
   - Update Firestore `/owners/{uid}` document with verified `currentPlan` and `renewalDate`.
