"use client";

import React, { useState } from "react";
import { AdminLayout, useAdminContext } from "@/components/AdminLayout";
import {
  Users,
  Building2,
  TrendingUp,
  CreditCard,
  Crown,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  Zap,
  Filter,
  Plus,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";

export default function DashboardPage() {
  const { isSyncing, refreshData } = useAdminContext();
  const [timeRange, setTimeRange] = useState<"month" | "year" | "all">("month");
  const [activePlanFilter, setActivePlanFilter] = useState<string>("ALL");
  const [showManualTrialModal, setShowManualTrialModal] = useState(false);

  // Form state for manual trial grant
  const [propertyIdInput, setPropertyIdInput] = useState("");
  const [trialDaysInput, setTrialDaysInput] = useState("30");
  const [grantSuccessMsg, setGrantSuccessMsg] = useState("");

  const kpis = [
    {
      title: "Monthly Recurring Revenue (MRR)",
      value: timeRange === "year" ? "₹ 17,85,000" : "₹ 1,48,750",
      change: "+24.5%",
      isPositive: true,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50 border-emerald-200",
    },
    {
      title: "Annualized Run Rate (ARR)",
      value: "₹ 17,85,000",
      change: "+18.2%",
      isPositive: true,
      icon: CreditCard,
      color: "text-violet-600",
      bg: "bg-violet-50 border-violet-200",
    },
    {
      title: "Active Properties / Homestays",
      value: "214",
      change: "+14 this month",
      isPositive: true,
      icon: Building2,
      color: "text-sky-600",
      bg: "bg-sky-50 border-sky-200",
    },
    {
      title: "Paid Subscriptions Ratio",
      value: "68.2%",
      change: "+5.1%",
      isPositive: true,
      icon: Crown,
      color: "text-amber-600",
      bg: "bg-amber-50 border-amber-200",
    },
  ];

  const planBreakdown = [
    { name: "Free", count: 68, percentage: "31.8%", price: "₹0", color: "bg-slate-400" },
    { name: "Starter", count: 82, percentage: "38.3%", price: "₹299/mo", color: "bg-amber-500" },
    { name: "Professional", count: 54, percentage: "25.2%", price: "₹799/mo", color: "bg-violet-600" },
    { name: "Multi-Property", count: 10, percentage: "4.7%", price: "₹1,999/mo", color: "bg-sky-500" },
  ];

  const [activities, setActivities] = useState([
    {
      id: 1,
      title: "New Subscription Upgraded",
      desc: "Coorg Hilltop Homestay upgraded to Professional Annual (₹7,999)",
      time: "12 mins ago",
      badge: "PROFESSIONAL",
      badgeBg: "bg-violet-100 text-violet-800 border-violet-200",
      type: "PROFESSIONAL",
    },
    {
      id: 2,
      title: "New Property Registered",
      desc: "Manali Pine Resort registered (12 rooms)",
      time: "45 mins ago",
      badge: "STARTER",
      badgeBg: "bg-amber-100 text-amber-800 border-amber-200",
      type: "STARTER",
    },
    {
      id: 3,
      title: "Trial Started",
      desc: "Wayanad Forest Lodge started 30-day Professional trial",
      time: "2 hours ago",
      badge: "TRIALING",
      badgeBg: "bg-sky-100 text-sky-800 border-sky-200",
      type: "TRIALING",
    },
    {
      id: 4,
      title: "High Usage Warning",
      desc: "Goa Beachside Lodge reached 90% of check-in limit (18/20)",
      time: "4 hours ago",
      badge: "WARNING",
      badgeBg: "bg-rose-100 text-rose-800 border-rose-200",
      type: "WARNING",
    },
  ]);

  const filteredActivities =
    activePlanFilter === "ALL"
      ? activities
      : activities.filter((a) => a.type === activePlanFilter);

  const handleGrantTrial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyIdInput.trim()) return;

    const newAct = {
      id: Date.now(),
      title: "Manual Trial Granted",
      desc: `Granted ${trialDaysInput}-day Professional trial to ${propertyIdInput.toUpperCase()}`,
      time: "Just now",
      badge: "TRIAL GRANTED",
      badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-200",
      type: "TRIALING",
    };

    setActivities([newAct, ...activities]);
    setGrantSuccessMsg(`Successfully granted ${trialDaysInput} days trial to ${propertyIdInput.toUpperCase()}`);
    setPropertyIdInput("");

    setTimeout(() => {
      setGrantSuccessMsg("");
      setShowManualTrialModal(false);
    }, 1500);
  };

  return (
    <AdminLayout>
      {/* Title & Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Monetization Dashboard
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Real-time overview of subscriptions, MRR/ARR revenue, and property analytics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time range selector */}
          <div className="bg-white border border-slate-200 p-1 rounded-xl flex items-center shadow-sm">
            <button
              onClick={() => setTimeRange("month")}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                timeRange === "month"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setTimeRange("year")}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                timeRange === "year"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Annual
            </button>
          </div>

          <button
            onClick={() => setShowManualTrialModal(true)}
            className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-violet-500/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Grant Trial</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid (Light Mode) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {kpi.title}
                </span>
                <div className={`p-2.5 rounded-xl border ${kpi.bg}`}>
                  <Icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 tracking-tight">
                  {kpi.value}
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-xs font-extrabold text-emerald-600 flex items-center">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    {kpi.change}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">vs last period</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two-Column Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Subscription Plan Distribution */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Plan Breakdown</h2>
                <p className="text-xs text-slate-500">214 active properties</p>
              </div>
              <span className="text-xs font-extrabold text-violet-700 bg-violet-100 px-2.5 py-1 rounded-full border border-violet-200">
                146 PAID
              </span>
            </div>

            <div className="space-y-4">
              {planBreakdown.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800">{item.name} ({item.price})</span>
                    <span className="text-slate-900 font-extrabold">
                      {item.count} properties ({item.percentage})
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: item.percentage }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-600 flex items-center justify-between">
            <span className="font-semibold">Average Revenue Per User (ARPU)</span>
            <span className="font-black text-emerald-600 text-sm">₹ 695 / mo</span>
          </div>
        </div>

        {/* Dynamic Activity Feed */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Live Activity Feed</h2>
              <p className="text-xs text-slate-500">Real-time subscription and onboarding logs</p>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {["ALL", "PROFESSIONAL", "STARTER", "TRIALING"].map((f) => (
                <button
                  key={f}
                  onClick={() => setActivePlanFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    activePlanFilter === f
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredActivities.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-medium">
                No activity records found for filter: {activePlanFilter}
              </div>
            ) : (
              filteredActivities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-start justify-between p-4 bg-slate-50/80 hover:bg-slate-100/60 rounded-xl border border-slate-200/60 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-extrabold text-slate-900">{act.title}</p>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${act.badgeBg}`}
                      >
                        {act.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">{act.desc}</p>
                  </div>
                  <span className="text-xs text-slate-400 font-semibold whitespace-nowrap ml-4">
                    {act.time}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Manual Grant Trial Modal */}
      {showManualTrialModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Grant Manual Trial</h3>
              </div>
              <button
                onClick={() => setShowManualTrialModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {grantSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{grantSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleGrantTrial} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Property ID or Owner Email
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HS-8821 or owner@homestay.com"
                    value={propertyIdInput}
                    onChange={(e) => setPropertyIdInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-violet-600 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Trial Duration (Days)
                  </label>
                  <select
                    value={trialDaysInput}
                    onChange={(e) => setTrialDaysInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-violet-600 focus:bg-white"
                  >
                    <option value="15">15 Days</option>
                    <option value="30">30 Days (Standard)</option>
                    <option value="60">60 Days (VIP Partner)</option>
                    <option value="90">90 Days (Reseller Deal)</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowManualTrialModal(false)}
                    className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-violet-600 text-white font-bold text-xs rounded-xl hover:bg-violet-700 shadow-md shadow-violet-500/20"
                  >
                    Activate Trial
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
