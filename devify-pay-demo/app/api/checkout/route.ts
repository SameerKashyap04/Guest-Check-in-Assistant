import { NextResponse } from "next/server";

async function parseJsonResponse(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return await res.json();
  }
  const text = await res.text();
  throw new Error(`Devify Pay API returned HTTP ${res.status} (HTML/text): ${text.slice(0, 150)}`);
}

export async function POST(req: Request) {
  try {
    const { productName, amountPaise } = await req.json();

    const devifyUrl = process.env.DEVIFY_API_URL || "https://devifypay.site";
    const apiKey = process.env.DEVIFY_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { message: "DEVIFY_API_KEY is not configured in .env.local" },
        { status: 500 }
      );
    }

    const timestamp = Date.now();

    // Step 1: Create Order on Devify Pay API
    const orderRes = await fetch(`${devifyUrl}/v1/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Idempotency-Key": `idem_order_${timestamp}`,
      },
      body: JSON.stringify({
        amount: amountPaise || 1000, // 10 rupees in paise
        currency: "INR",
        description: productName || "Demo Order",
        customer: {
          name: "Test Customer",
          email: "customer@example.com",
          phone: "9876543210",
        },
      }),
    });

    const orderData = await parseJsonResponse(orderRes);

    if (!orderRes.ok) {
      console.error("Devify Pay Order Error:", orderData);
      return NextResponse.json(
        { message: orderData?.error?.message || "Failed to create order on Devify Pay" },
        { status: orderRes.status }
      );
    }

    // Step 2: Initialize Payment for the order
    const paymentRes = await fetch(`${devifyUrl}/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Idempotency-Key": `idem_payment_${timestamp}`,
      },
      body: JSON.stringify({
        order_id: orderData.id,
        method: "UPI",
      }),
    });

    const paymentData = await parseJsonResponse(paymentRes);

    if (!paymentRes.ok) {
      console.error("Devify Pay Payment Error:", paymentData);
      return NextResponse.json(
        { message: paymentData?.error?.message || "Failed to create payment" },
        { status: paymentRes.status }
      );
    }

    // Step 3: Return hosted checkout URL to frontend
    let checkoutUrl: string = paymentData.checkout_url;
    if (checkoutUrl && !checkoutUrl.startsWith("http://") && !checkoutUrl.startsWith("https://")) {
      checkoutUrl = `https://${checkoutUrl}`;
    }

    // Attach merchant redirect_url so customer is auto-redirected back to /success after payment
    const origin = req.headers.get("origin") || "http://localhost:3005";
    checkoutUrl = `${checkoutUrl}?redirect_url=${encodeURIComponent(`${origin}/success`)}`;

    return NextResponse.json({
      success: true,
      orderId: orderData.id,
      paymentId: paymentData.id,
      checkoutUrl,
    });
  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
