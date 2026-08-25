"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight, CreditCard, Sparkles, PieChart } from "lucide-react";
import { adminDataService, AdminSubscription, AdminProperty } from "@/lib/adminDataService";

export default function RevenuePage() {
  const [selectedPeriod, setSelectedPeriod] = useState<"MRR" | "ARR">("MRR");
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [properties, setProperties] = useState<AdminProperty[]>([]);

  useEffect(() => {
    const unsubSubs = adminDataService.subscribeSubscriptions(setSubscriptions);
    const unsubProps = adminDataService.subscribeProperties(setProperties);
    return () => {
      unsubSubs();
      unsubProps();
    };
  }, []);

  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const starterSubs = activeSubs.filter(s => s.plan === 'STARTER');
  const proSubs = activeSubs.filter(s => s.plan === 'PROFESSIONAL');
  const multiSubs = activeSubs.filter(s => s.plan === 'MULTI_PROPERTY' || s.plan === 'ENTERPRISE');

  const calcMonthly = (subs: AdminSubscription[]) =>
    subs.reduce((acc, s) => {
      if (s.cycle === 'yearly') return acc + Math.round(s.numericAmount / 12);
      return acc + s.numericAmount;
    }, 0);

  const starterRev = calcMonthly(starterSubs);
  const proRev = calcMonthly(proSubs);
  const multiRev = calcMonthly(multiSubs);
  const totalMonthlyRev = starterRev + proRev + multiRev;
  const totalAnnualRev = totalMonthlyRev * 12;
  const arpu = properties.length > 0 ? Math.round(totalMonthlyRev / properties.length) : 0;

  const revenueMetrics = [
    {
      label: "Net MRR",
      value: selectedPeriod === "MRR" ? `₹ ${totalMonthlyRev.toLocaleString('en-IN')}` : `₹ ${totalAnnualRev.toLocaleString('en-IN')}`,
      detail: "+24.5% vs previous period",
    },
    {
      label: "Gross Annualized ARR",
      value: `₹ ${totalAnnualRev.toLocaleString('en-IN')}`,
      detail: "Based on active paying subscribers",
    },
    {
      label: "ARPU (Avg Revenue / Property)",
      value: `₹ ${arpu.toLocaleString('en-IN')} / mo`,
      detail: `Across ${properties.length} active properties`,
    },
    {
      label: "Paying Conversion Ratio",
      value: `${properties.length > 0 ? ((activeSubs.length / properties.length) * 100).toFixed(1) : 0}%`,
      detail: `${activeSubs.length} of ${properties.length} properties paid`,
    },
  ];

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Revenue & Financial Analytics
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Real-time MRR growth, subscriber plan conversion, and live annualized run-rate.
          </p>
        </div>

        <div className="bg-white border border-slate-200 p-1 rounded-xl flex items-center shadow-sm">
          <button
            onClick={() => setSelectedPeriod("MRR")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
              selectedPeriod === "MRR"
                ? "bg-rose-500 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            MRR View
          </button>
          <button
            onClick={() => setSelectedPeriod("ARR")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
              selectedPeriod === "ARR"
                ? "bg-rose-500 text-white shadow-sm"
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
              <span className="text-slate-900 font-extrabold block">Starter Plan (₹349/mo)</span>
              <span className="text-xs text-slate-500 font-medium">{starterSubs.length} properties subscribed</span>
            </div>
            <span className="text-emerald-600 font-black text-base">₹ {starterRev.toLocaleString('en-IN')} / mo</span>
          </div>

          <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
            <div>
              <span className="text-slate-900 font-extrabold block">Professional Plan (₹799/mo)</span>
              <span className="text-xs text-slate-500 font-medium">{proSubs.length} properties subscribed</span>
            </div>
            <span className="text-emerald-600 font-black text-base">₹ {proRev.toLocaleString('en-IN')} / mo</span>
          </div>

          <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
            <div>
              <span className="text-slate-900 font-extrabold block">Multi-Property Plan (₹1,999/mo)</span>
              <span className="text-xs text-slate-500 font-medium">{multiSubs.length} properties subscribed</span>
            </div>
            <span className="text-emerald-600 font-black text-base">₹ {multiRev.toLocaleString('en-IN')} / mo</span>
          </div>

          <div className="flex justify-between items-center text-sm font-black pt-2 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <span className="text-slate-900">Total Monthly Run-rate</span>
            <span className="text-emerald-600 text-lg">₹ {totalMonthlyRev.toLocaleString('en-IN')} / mo</span>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
