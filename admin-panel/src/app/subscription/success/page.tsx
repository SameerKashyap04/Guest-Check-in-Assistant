"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ArrowRight, Smartphone, Sparkles, ShieldCheck } from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") || searchParams.get("orderId") || "ORD_DEVIFY_LIVE";
  const paymentId = searchParams.get("payment_id") || searchParams.get("paymentId") || "";
  const planId = (searchParams.get("planId") || searchParams.get("plan") || "STARTER").toUpperCase();
  const cycle = searchParams.get("cycle") || "monthly";
  const amount = searchParams.get("amount") || "399";

  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Attempt auto deep-link back to the mobile app
    const deepLinkUrl = `staymate://subscription/success?order_id=${encodeURIComponent(orderId)}&payment_id=${encodeURIComponent(paymentId)}&planId=${encodeURIComponent(planId)}&cycle=${encodeURIComponent(cycle)}&amount=${encodeURIComponent(amount)}`;
    
    // Only attempt if on mobile
    if (typeof window !== "undefined" && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      setRedirecting(true);
      const timer = setTimeout(() => {
        window.location.href = deepLinkUrl;
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [orderId, paymentId, planId, cycle, amount]);

  const deepLink = `staymate://subscription/success?order_id=${encodeURIComponent(orderId)}&payment_id=${encodeURIComponent(paymentId)}&planId=${encodeURIComponent(planId)}&cycle=${encodeURIComponent(cycle)}&amount=${encodeURIComponent(amount)}`;

  return (
    <div className="min-h-screen bg-[#090D16] text-white flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-lg bg-[#131b2e] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center">
        {/* Glow effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Animated Success Icon */}
        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 animate-in zoom-in-50 duration-300" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Payment Verified &bull; Devify Pay</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
          You're Subscribed!
        </h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          Thank you for subscribing to StayMate. Your{" "}
          <strong className="text-violet-400">{planId} Plan</strong> has been activated in real-time.
        </p>

        {/* Plan Overview Card */}
        <div className="bg-[#0b1120] border border-slate-800/80 rounded-2xl p-4 sm:p-5 text-left mb-6 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-400">Plan Tier</span>
            <span className="text-sm font-extrabold text-white px-2.5 py-0.5 rounded-lg bg-violet-950 text-violet-300 border border-violet-800">
              {planId} PLAN
            </span>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-400">Amount Paid</span>
            <span className="text-base font-black text-emerald-400">
              ₹{Number(amount).toLocaleString("en-IN")}.00
            </span>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-400">Billing Cycle</span>
            <span className="text-xs font-bold text-slate-300 capitalize">
              {cycle === "yearly" ? "Annual (12 Months)" : "Monthly"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Order Reference</span>
            <span className="text-xs font-mono text-slate-400 truncate max-w-[180px]">
              {orderId}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <a
            href={deepLink}
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-extrabold shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>Open in StayMate App</span>
            <ArrowRight className="w-4 h-4" />
          </a>

          <a
            href="https://admin-guest-check-in-assistant.vercel.app"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700/60 transition-all cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Go to Admin Dashboard</span>
          </a>
        </div>

        <p className="text-slate-500 text-[11px] mt-6">
          🔒 Secure 256-bit encrypted transaction processed via Devify Pay
        </p>
      </div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#090D16] text-white flex items-center justify-center">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
