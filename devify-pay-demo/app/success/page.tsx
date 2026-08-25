"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("payment_id") || "N/A";
  const orderId = searchParams.get("order_id") || "N/A";

  const [subscription, setSubscription] = useState<any>(null);
  const [loadingSub, setLoadingSub] = useState(true);
  const [subError, setSubError] = useState<string | null>(null);

  useEffect(() => {
    async function activateSubscription() {
      try {
        const res = await fetch("/api/confirm-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentId,
            orderId,
            customerName: "Test Customer",
            customerEmail: "customer@example.com",
            customerPhone: "9876543210",
          }),
        });

        const data = await res.json();
        if (res.ok && data.subscription) {
          setSubscription(data.subscription);
        } else {
          setSubError(data.message || "Could not create subscription");
        }
      } catch (err: any) {
        console.error("Subscription confirmation error:", err);
        setSubError(err.message || "Failed to connect");
      } finally {
        setLoadingSub(false);
      }
    }

    activateSubscription();
  }, [paymentId, orderId]);

  return (
    <div style={{ maxWidth: 540, margin: "80px auto 0", padding: 32, background: "#18181b", borderRadius: 24, border: "1px solid #27272a", textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 20px" }}>
        ✓
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px", color: "#fff" }}>Payment Successful!</h1>
      <p style={{ color: "#a1a1aa", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
        Thank you for your purchase. Your payment has been processed and verified via Devify Pay.
      </p>

      {/* Subscription Card */}
      <div style={{ background: "#09090b", borderRadius: 16, padding: 20, border: "1px solid #27272a", marginBottom: 24, textAlign: "left" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#a855f7", textTransform: "uppercase", letterSpacing: 1 }}>Subscription Status</span>
          {loadingSub ? (
            <span style={{ fontSize: 12, color: "#a1a1aa" }}>Creating subscription...</span>
          ) : subscription ? (
            <span style={{ fontSize: 12, background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)", padding: "2px 10px", borderRadius: 12, fontWeight: 600 }}>
              {subscription.status || "ACTIVE"}
            </span>
          ) : (
            <span style={{ fontSize: 12, color: "#ef4444" }}>Pending</span>
          )}
        </div>

        {subscription && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 4 }}>Aura Test Membership Plan</div>
            <div style={{ fontSize: 12, fontFamily: "monospace", color: "#a1a1aa" }}>Sub ID: {subscription.id}</div>
          </div>
        )}

        {subError && !subscription && (
          <div style={{ fontSize: 13, color: "#fca5a5" }}>{subError}</div>
        )}
      </div>

      {/* Payment Reference Card */}
      <div style={{ background: "#09090b", borderRadius: 12, padding: 16, border: "1px solid #27272a", marginBottom: 28, textAlign: "left" }}>
        <div style={{ fontSize: 12, color: "#71717a", marginBottom: 4 }}>Payment Reference ID</div>
        <div style={{ fontSize: 14, fontFamily: "monospace", color: "#6366f1", wordBreak: "break-all" }}>{paymentId}</div>
      </div>

      <Link
        href="/"
        style={{
          display: "inline-block",
          padding: "12px 28px",
          background: "#27272a",
          color: "#fff",
          borderRadius: 12,
          textDecoration: "none",
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        ← Back to Storefront
      </Link>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", color: "#fff", paddingTop: 100 }}>Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
