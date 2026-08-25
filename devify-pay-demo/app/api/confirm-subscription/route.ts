import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const devifyUrl = process.env.DEVIFY_API_URL || "https://devifypay.site";
    const apiKey = process.env.DEVIFY_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { message: "DEVIFY_API_KEY is not configured" },
        { status: 500 }
      );
    }

    // Step 1: Fetch active plans for this application
    const plansRes = await fetch(`${devifyUrl}/v1/plans`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const plansData = await plansRes.json();
    let planId = plansData?.data?.[0]?.id;

    if (!planId) {
      return NextResponse.json(
        { message: "No active subscription plan found on Devify Pay." },
        { status: 404 }
      );
    }

    const timestamp = Date.now();
    const subIdempotencyKey = `idem_sub_${body.paymentId || body.orderId || timestamp}`;

    // Step 2: Create Subscription for Customer
    const subRes = await fetch(`${devifyUrl}/v1/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Idempotency-Key": subIdempotencyKey,
      },
      body: JSON.stringify({
        plan_id: planId,
        customer: {
          name: body.customerName || "Test Customer",
          email: body.customerEmail || "customer@example.com",
          phone: body.customerPhone || "9876543210",
        },
        metadata: {
          source: "aura_store_demo",
          order_id: body.orderId,
          payment_id: body.paymentId,
        },
      }),
    });

    const subData = await subRes.json();

    if (!subRes.ok) {
      console.error("Subscription Error on Devify Pay:", subData);
      return NextResponse.json(
        { message: subData?.error?.message || "Failed to create subscription" },
        { status: subRes.status }
      );
    }

    return NextResponse.json({
      success: true,
      subscription: subData,
    });
  } catch (error: any) {
    console.error("Confirm Subscription API Error:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
