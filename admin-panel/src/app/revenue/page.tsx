"use client";

import React, { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight, CreditCard, Sparkles, PieChart } from "lucide-react";

export default function RevenuePage() {
  const [selectedPeriod, setSelectedPeriod] = useState<"MRR" | "ARR">("MRR");

  const revenueMetrics = [
    { label: "Net MRR", value: selectedPeriod === "MRR" ? "₹ 1,48,750" : "₹ 17,85,000", detail: "+24.5% vs previous month" },
    { label: "Gross Annualized ARR", value: "₹ 17,85,000", detail: "Based on current run-rate" },
    { label: "ARPU (Avg Revenue / User)", value: "₹ 695 / mo", detail: "+₹45 lift from Professional upgrades" },
    { label: "Monthly Churn Rate", value: "1.2%", detail: "Below industry target (<2%)" },
  ];

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Revenue & Financial Analytics
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            MRR growth, plan conversion funnels, and subscription lifetime value.
          </p>
        </div>

        <div className="bg-white border border-slate-200 p-1 rounded-xl flex items-center shadow-sm">
          <button
            onClick={() => setSelectedPeriod("MRR")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
              selectedPeriod === "MRR"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            MRR View
          </button>
          <button
            onClick={() => setSelectedPeriod("ARR")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
              selectedPeriod === "ARR"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            ARR View
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {revenueMetrics.map((m, i) => (
          <div key={i} className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{m.label}</p>
            <p className="text-2xl font-black text-slate-900 mt-2 mb-1">{m.value}</p>
            <p className="text-xs text-emerald-600 font-extrabold flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{m.detail}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-extrabold text-slate-900 mb-4 border-b border-slate-100 pb-3">
          Revenue Contribution Breakdown by Plan Tier
        </h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
            <div>
              <span className="text-slate-900 font-extrabold block">Starter Plan (₹299/mo)</span>
              <span className="text-xs text-slate-500 font-medium">82 properties subscribed</span>
            </div>
            <span className="text-emerald-600 font-black text-base">₹ 24,518 / mo</span>
          </div>

          <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
            <div>
              <span className="text-slate-900 font-extrabold block">Professional Plan (₹799/mo)</span>
              <span className="text-xs text-slate-500 font-medium">54 properties subscribed</span>
            </div>
            <span className="text-emerald-600 font-black text-base">₹ 43,146 / mo</span>
          </div>

          <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
            <div>
              <span className="text-slate-900 font-extrabold block">Multi-Property Plan (₹1,999/mo)</span>
              <span className="text-xs text-slate-500 font-medium">10 properties subscribed</span>
            </div>
            <span className="text-emerald-600 font-black text-base">₹ 19,990 / mo</span>
          </div>

          <div className="flex justify-between items-center text-sm font-black pt-2 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <span className="text-slate-900">Total Monthly Run-rate</span>
            <span className="text-emerald-600 text-lg">₹ 87,654 / mo</span>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
