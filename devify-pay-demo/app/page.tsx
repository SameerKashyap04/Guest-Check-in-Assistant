"use client";

import { useState } from "react";

export default function StorefrontPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const product = {
    id: "prod_pro_plan",
    name: "Aura Test Membership",
    description: "Instant ₹10 Rupees Payment to verify Paytm / UPI auto-verification.",
    amountRupees: 10,
    amountPaise: 1000,
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
  };

  async function handleCheckout() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          productName: product.name,
          amountPaise: product.amountPaise,
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      let data: any = {};
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Server returned non-JSON error (${res.status}): ${text.slice(0, 100)}`);
      }

      if (!res.ok) {
        throw new Error(data.message || "Failed to create checkout session");
      }

      // Redirect customer to Devify Pay hosted checkout page
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("No checkout URL returned from Devify Pay");
      }
    } catch (err: any) {
      console.error("Checkout Error:", err);
      setError(err.message || "Something went wrong during checkout.");
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px" }}>
      {/* Header / Brand */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 48, borderBottom: "1px solid #27272a", paddingBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff" }}>
            A
          </div>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.5px" }}>AuraStore</span>
        </div>
        <div style={{ fontSize: 13, background: "#18181b", padding: "6px 14px", borderRadius: 20, border: "1px solid #27272a", color: "#a1a1aa" }}>
          ⚡ Powered by <strong style={{ color: "#fff" }}>Devify Pay</strong>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center" }}>
        {/* Product Image Card */}
        <div style={{ borderRadius: 24, overflow: "hidden", border: "1px solid #27272a", background: "#18181b", position: "relative" }}>
          <img
            src={product.image}
            alt={product.name}
            style={{ width: "100%", height: 360, objectFit: "cover", display: "block" }}
          />
          <div style={{ padding: 24 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#a855f7", textTransform: "uppercase", letterSpacing: 1 }}>Featured Plan</span>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: "8px 0 4px", color: "#fff" }}>{product.name}</h2>
            <p style={{ color: "#a1a1aa", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{product.description}</p>
          </div>
        </div>

        {/* Checkout Card */}
        <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 24, padding: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 20px" }}>Order Summary</h3>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, fontSize: 15, color: "#a1a1aa" }}>
            <span>Item</span>
            <span style={{ color: "#fff", fontWeight: 600 }}>{product.name}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, fontSize: 15, color: "#a1a1aa" }}>
            <span>Billing Interval</span>
            <span style={{ color: "#fff" }}>Annual</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, fontSize: 15, color: "#a1a1aa" }}>
            <span>Tax (Included)</span>
            <span style={{ color: "#4ade80" }}>₹0.00</span>
          </div>

          <div style={{ borderTop: "1px dashed #27272a", borderBottom: "1px dashed #27272a", padding: "16px 0", marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>Total Payable</span>
            <span style={{ fontSize: 28, fontWeight: 800, color: "#6366f1" }}>₹{product.amountRupees}.00</span>
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444", color: "#fca5a5", padding: "12px 16px", borderRadius: 12, fontSize: 13, marginBottom: 20 }}>
              {error}
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={loading}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: 14,
              border: "none",
              background: loading ? "#3f3f46" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              fontSize: 16,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 10px 25px -5px rgba(99,102,241,0.4)",
              transition: "all 0.2s ease",
            }}
          >
            {loading ? "Initializing Devify Pay..." : `Pay ₹${product.amountRupees} via UPI`}
          </button>

          <p style={{ textAlign: "center", color: "#71717a", fontSize: 12, marginTop: 16 }}>
            🔒 Instant UPI Payment via Google Pay / PhonePe / Paytm
          </p>
        </div>
      </main>
    </div>
  );
}
