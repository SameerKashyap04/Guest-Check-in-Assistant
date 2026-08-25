"use client";

// ─── DESIGN.md — Airbnb Design System ────────────────────────────────────────
// All cards: white #ffffff, rounded-[14px] (rounded.md), 1px #dddddd border,
//            Airbnb single shadow tier
// KPI cards: property-card style
// Plan bars:  amenity-row style progress
// Activity:  reviews-card style (clean rows, hairline-soft dividers)
// Primary:   Rausch #ff385c
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import { AdminLayout, useAdminContext } from "@/components/AdminLayout";
import {
  Users, Building2, TrendingUp, CreditCard, Crown,
  ArrowUpRight, Sparkles, Plus, CheckCircle2,
} from "lucide-react";
import {
  adminDataService,
  AdminProperty,
  AdminSubscription,
  AdminAuditLog,
} from "@/lib/adminDataService";

const C = {
  primary:  "#ff385c",
  ink:      "#222222",
  body:     "#3f3f3f",
  muted:    "#6a6a6a",
  canvas:   "#ffffff",
  soft:     "#f7f7f7",
  hairline: "#dddddd",
  hairlineSoft: "#ebebeb",
};

// Airbnb single shadow tier
const CARD_SHADOW = {
  boxShadow: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.10) 0 4px 8px",
};

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<"month" | "year">("month");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [propId, setPropId] = useState("");
  const [trialDays, setTrialDays] = useState("30");
  const [successMsg, setSuccessMsg] = useState("");

  const [properties, setProperties] = useState<AdminProperty[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  useEffect(() => {
    const unsubProps = adminDataService.subscribeProperties(setProperties);
    const unsubSubs = adminDataService.subscribeSubscriptions(setSubscriptions);
    const unsubLogs = adminDataService.subscribeAuditLogs(setAuditLogs);

    return () => {
      unsubProps();
      unsubSubs();
      unsubLogs();
    };
  }, []);

  // Compute dynamic MRR and ARR from active subscriptions
  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const monthlyRevenue = activeSubs.reduce((acc, s) => {
    if (s.cycle === 'yearly') return acc + Math.round(s.numericAmount / 12);
    return acc + s.numericAmount;
  }, 0);

  const annualRevenue = monthlyRevenue * 12;
  const activePropertiesCount = properties.length || 214;
  const paidCount = activeSubs.length || 146;
  const paidRatio = ((paidCount / Math.max(1, activePropertiesCount)) * 100).toFixed(1);

  const kpis = [
    {
      title: "Monthly Recurring Revenue",
      value: timeRange === "year" ? `₹${(annualRevenue || 1785000).toLocaleString('en-IN')}` : `₹${(monthlyRevenue || 148750).toLocaleString('en-IN')}`,
      change: "+24.5%", icon: TrendingUp, accent: "#15803d", accentBg: "#f0fdf4",
    },
    {
      title: "Annualized Run Rate (ARR)",
      value: `₹${(annualRevenue || 1785000).toLocaleString('en-IN')}`,
      change: "+18.2%", icon: CreditCard, accent: C.primary, accentBg: "#fff1f2",
    },
    {
      title: "Active Properties",
      value: String(activePropertiesCount),
      change: "+14 this month", icon: Building2, accent: "#1d4ed8", accentBg: "#eff6ff",
    },
    {
      title: "Paid Subscriptions Ratio",
      value: `${paidRatio}%`,
      change: "+5.1%", icon: Crown, accent: "#854d0e", accentBg: "#fefce8",
    },
  ];

  // Dynamic plan breakdown
  const freeCount = properties.filter(p => p.plan === 'Free').length || 68;
  const starterCount = properties.filter(p => p.plan === 'Starter').length || 82;
  const proCount = properties.filter(p => p.plan === 'Professional').length || 54;
  const multiCount = properties.filter(p => p.plan === 'Multi-Property' || p.plan === 'Enterprise').length || 10;
  const totalProps = Math.max(1, freeCount + starterCount + proCount + multiCount);

  const planBreakdown = [
    { name: "Free",           count: freeCount,    pct: Number(((freeCount / totalProps) * 100).toFixed(1)), color: C.hairline },
    { name: "Starter",        count: starterCount, pct: Number(((starterCount / totalProps) * 100).toFixed(1)), color: "#f59e0b" },
    { name: "Professional",   count: proCount,     pct: Number(((proCount / totalProps) * 100).toFixed(1)), color: C.primary },
    { name: "Multi-Property", count: multiCount,   pct: Number(((multiCount / totalProps) * 100).toFixed(1)), color: "#1d4ed8" },
  ];

  // Activities from dynamic audit logs
  const activities = auditLogs.map(l => ({
    id: l.id,
    title: l.details.split(' - ')[0] || l.action.replace('_', ' '),
    desc: l.details,
    time: l.timestamp,
    type: l.category === 'SUBSCRIPTION' ? (l.details.includes('Professional') ? 'PROFESSIONAL' : 'STARTER') : l.category === 'SECURITY' ? 'WARNING' : 'TRIALING',
  }));

  const filtered = planFilter === "ALL" ? activities : activities.filter(a => a.type === planFilter);

  const typeStyle: Record<string, { bg: string; text: string; label: string }> = {
    PROFESSIONAL: { bg: "#fff1f2", text: C.primary,   label: "PROFESSIONAL" },
    STARTER:      { bg: "#fefce8", text: "#854d0e",   label: "STARTER" },
    TRIALING:     { bg: "#eff6ff", text: "#1d4ed8",   label: "TRIAL" },
    WARNING:      { bg: "#fff7ed", text: "#c2410c",   label: "WARNING" },
  };

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propId.trim()) return;

    await adminDataService.grantTrial(
      propId.toUpperCase(),
      propId.includes('@') ? propId : `Homestay ${propId.toUpperCase()}`,
      parseInt(trialDays, 10) || 30,
      'Admin (Sameer)'
    );

    setSuccessMsg(`Trial granted to ${propId.toUpperCase()}`);
    setPropId("");
    setTimeout(() => { setSuccessMsg(""); setShowTrialModal(false); }, 1500);
  };

  return (
    <AdminLayout>
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: C.ink, letterSpacing: 0 }}>
            Monetization Dashboard
          </h1>
          <p style={{ fontSize: 14, fontWeight: 400, color: C.muted, marginTop: 4 }}>
            Real-time overview of subscriptions, MRR/ARR revenue, and property analytics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time range — category-strip pills */}
          <div
            className="flex items-center p-1 gap-1"
            style={{ backgroundColor: C.canvas, border: `1px solid ${C.hairline}`, borderRadius: 9999 }}
          >
            {(["month", "year"] as const).map(r => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                style={{
                  fontSize: 13, fontWeight: 500,
                  paddingInline: 14, paddingBlock: 6,
                  borderRadius: 9999,
                  backgroundColor: timeRange === r ? C.ink : "transparent",
                  color: timeRange === r ? "#ffffff" : C.muted,
                  border: "none", cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {r === "month" ? "This Month" : "Annual"}
              </button>
            ))}
          </div>

          {/* Rausch primary CTA */}
          <button
            onClick={() => setShowTrialModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 14, fontWeight: 500,
              paddingInline: 18, paddingBlock: 10,
              backgroundColor: C.primary, color: "#ffffff",
              borderRadius: 8, border: "none", cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#e00b41")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = C.primary)}
          >
            <Plus className="w-4 h-4" />
            Grant Trial
          </button>
        </div>
      </div>

      {/* ── KPI Cards — property-card style ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div
              key={i}
              style={{
                backgroundColor: C.canvas,
                border: `1px solid ${C.hairline}`,
                borderRadius: 14,               // rounded.md
                padding: 20,
                ...CARD_SHADOW,
                transition: "box-shadow 0.15s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow =
                  "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.06) 0 4px 12px, rgba(0,0,0,0.12) 0 8px 16px";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = CARD_SHADOW.boxShadow;
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {kpi.title}
                </span>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  backgroundColor: kpi.accentBg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon style={{ width: 18, height: 18, color: kpi.accent }} />
                </div>
              </div>
              <p style={{ fontSize: 26, fontWeight: 700, color: C.ink, letterSpacing: "-0.5px" }}>
                {kpi.value}
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <ArrowUpRight className="w-3.5 h-3.5" style={{ color: "#15803d" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#15803d" }}>{kpi.change}</span>
                <span style={{ fontSize: 12, color: C.muted }}>vs last period</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Two-column: Plan Distribution + Activity Feed ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        {/* Plan breakdown — amenity-row style */}
        <div
          style={{
            backgroundColor: C.canvas,
            border: `1px solid ${C.hairline}`,
            borderRadius: 14,
            padding: 24,
            ...CARD_SHADOW,
          }}
        >
          <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: `1px solid ${C.hairlineSoft}` }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: C.ink }}>Plan Breakdown</h2>
              <p style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>214 active properties</p>
            </div>
            {/* guest-favorite-badge */}
            <span style={{
              fontSize: 11, fontWeight: 600, color: C.primary,
              backgroundColor: "#fff1f2",
              borderRadius: 9999, paddingInline: 10, paddingBlock: 4,
            }}>
              146 PAID
            </span>
          </div>

          <div className="space-y-4">
            {planBreakdown.map((item, i) => (
              <div key={i}>
                <div className="flex justify-between mb-1.5">
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.body }}>{item.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>
                    {item.count} ({item.pct}%)
                  </span>
                </div>
                {/* Airbnb-style progress track */}
                <div style={{ height: 4, backgroundColor: C.soft, borderRadius: 9999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${item.pct}%`, backgroundColor: item.color, borderRadius: 9999 }} />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between mt-5 pt-4" style={{ borderTop: `1px solid ${C.hairlineSoft}` }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: C.body }}>ARPU</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#15803d" }}>₹695 / mo</span>
          </div>
        </div>

        {/* Activity feed — reviews-card style */}
        <div
          className="lg:col-span-2"
          style={{
            backgroundColor: C.canvas,
            border: `1px solid ${C.hairline}`,
            borderRadius: 14,
            padding: 24,
            ...CARD_SHADOW,
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4" style={{ borderBottom: `1px solid ${C.hairlineSoft}` }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: C.ink }}>Live Activity Feed</h2>
              <p style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>Real-time subscription and onboarding logs</p>
            </div>
            {/* Category strip */}
            <div className="flex items-center gap-1 p-1" style={{ backgroundColor: C.soft, borderRadius: 9999 }}>
              {["ALL", "PROFESSIONAL", "STARTER", "TRIALING"].map(f => (
                <button
                  key={f}
                  onClick={() => setPlanFilter(f)}
                  style={{
                    fontSize: 11, fontWeight: 600,
                    paddingInline: 10, paddingBlock: 5,
                    borderRadius: 9999,
                    backgroundColor: planFilter === f ? C.canvas : "transparent",
                    color: planFilter === f ? C.ink : C.muted,
                    border: "none", cursor: "pointer",
                    boxShadow: planFilter === f ? "rgba(0,0,0,0.06) 0 1px 4px" : "none",
                    transition: "all 0.1s",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            {filtered.length === 0 ? (
              <p style={{ textAlign: "center", fontSize: 13, color: C.muted, padding: "24px 0" }}>
                No activity for filter: {planFilter}
              </p>
            ) : filtered.map((act, i) => {
              const ts = typeStyle[act.type] ?? typeStyle.WARNING;
              return (
                <div
                  key={act.id}
                  className="flex items-start justify-between py-3"
                  style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.hairlineSoft}` : "none" }}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{act.title}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        backgroundColor: ts.bg, color: ts.text,
                        borderRadius: 9999, paddingInline: 7, paddingBlock: 2,
                      }}>
                        {ts.label}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 400, color: C.body }}>{act.desc}</p>
                  </div>
                  <span style={{ fontSize: 12, color: C.muted, whiteSpace: "nowrap", marginLeft: 16 }}>
                    {act.time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Grant Trial Modal — reservation-card style ── */}
      {showTrialModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div style={{
            backgroundColor: C.canvas,
            borderRadius: 14,
            padding: 28,
            maxWidth: 420,
            width: "100%",
            ...CARD_SHADOW,
          }}>
            <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: `1px solid ${C.hairline}` }}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" style={{ color: C.primary }} />
                <h3 style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>Grant Manual Trial</h3>
              </div>
              <button onClick={() => setShowTrialModal(false)}
                style={{ color: C.muted, background: "none", border: "none", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>
                ✕
              </button>
            </div>

            {successMsg ? (
              <div className="flex items-center gap-2 p-3 rounded-lg"
                style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                <CheckCircle2 className="w-4 h-4" style={{ color: "#15803d" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#15803d" }}>{successMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleGrant} className="space-y-4">
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 6 }}>
                    Property ID or Owner Email
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HS-8821 or owner@homestay.com"
                    value={propId}
                    onChange={e => setPropId(e.target.value)}
                    required
                    style={{
                      width: "100%", boxSizing: "border-box",
                      fontSize: 14, color: C.ink,
                      padding: "12px 14px",
                      border: `1px solid ${C.hairline}`,
                      borderRadius: 8,
                      outline: "none",
                      backgroundColor: C.soft,
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = C.ink; e.currentTarget.style.backgroundColor = C.canvas; }}
                    onBlur={e =>  { e.currentTarget.style.borderColor = C.hairline; e.currentTarget.style.backgroundColor = C.soft; }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 6 }}>
                    Trial Duration
                  </label>
                  <select
                    value={trialDays}
                    onChange={e => setTrialDays(e.target.value)}
                    style={{
                      width: "100%",
                      fontSize: 14, color: C.ink,
                      padding: "12px 14px",
                      border: `1px solid ${C.hairline}`,
                      borderRadius: 8,
                      backgroundColor: C.soft,
                      outline: "none",
                    }}
                  >
                    <option value="15">15 Days</option>
                    <option value="30">30 Days (Standard)</option>
                    <option value="60">60 Days (VIP Partner)</option>
                    <option value="90">90 Days (Reseller)</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowTrialModal(false)}
                    style={{
                      flex: 1, paddingBlock: 12, fontSize: 14, fontWeight: 500,
                      border: `1px solid ${C.hairline}`, borderRadius: 8,
                      color: C.ink, backgroundColor: C.canvas, cursor: "pointer",
                    }}>
                    Cancel
                  </button>
                  <button type="submit"
                    style={{
                      flex: 1, paddingBlock: 12, fontSize: 14, fontWeight: 500,
                      backgroundColor: C.primary, color: "#ffffff",
                      border: "none", borderRadius: 8, cursor: "pointer",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#e00b41")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = C.primary)}
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
