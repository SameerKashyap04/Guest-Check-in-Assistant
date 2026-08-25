import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const timestamp = req.headers.get("x-devify-timestamp") || "";
    const signature = req.headers.get("x-devify-signature") || "";
    const event = req.headers.get("x-devify-event") || "";

    const webhookSecret = process.env.DEVIFY_WEBHOOK_SECRET;

    // Verify webhook HMAC signature if secret is set
    if (webhookSecret && signature) {
      const payloadToSign = `${timestamp}.${rawBody}`;
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(payloadToSign)
        .digest("hex");

      if (signature !== expectedSignature) {
        console.warn("⚠️ Invalid Webhook Signature received");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    console.log(`✅ [Devify Pay Webhook Received]: ${event}`, payload);

    if (event === "payment.success" || event === "order.paid") {
      console.log(`🎉 Payment Completed for Order: ${payload.order_id || payload.id}`);

      // Auto-create subscription for customer upon payment completion
      const devifyUrl = process.env.DEVIFY_API_URL || "https://devifypay.site";
      const apiKey = process.env.DEVIFY_API_KEY;

      if (apiKey) {
        try {
          const plansRes = await fetch(`${devifyUrl}/v1/plans`, {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          const plansData = await plansRes.json();
          const planId = plansData?.data?.[0]?.id;

          if (planId) {
            const subRes = await fetch(`${devifyUrl}/v1/subscriptions`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
                "Idempotency-Key": `idem_sub_webhook_${payload.payment_id || payload.order_id || payload.id}`,
              },
              body: JSON.stringify({
                plan_id: planId,
                customer: {
                  name: payload.customer_name || "Test Customer",
                  email: payload.customer_email || "customer@example.com",
                  phone: payload.customer_phone || "9876543210",
                },
                metadata: {
                  webhook_event: event,
                  order_id: payload.order_id || payload.id,
                  payment_id: payload.payment_id,
                },
              }),
            });
            const subData = await subRes.json();
            console.log("✅ Subscription created on Devify Pay via Webhook:", subData);
          } else {
            console.warn("⚠️ Webhook: No plan found to create subscription.");
          }
        } catch (subErr) {
          console.error("❌ Webhook subscription creation failed:", subErr);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
