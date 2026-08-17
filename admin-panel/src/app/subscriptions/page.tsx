"use client";

// ─── DESIGN.md — Airbnb Design System ────────────────────────────────────────
// Same table + modal treatment as Users page (host-card / reservation-card)
// Status badges: guest-favorite-badge style, rounded.full pills
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Search, X, Check } from "lucide-react";

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

const SHADOW = {
  boxShadow: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.10) 0 4px 8px",
};

interface SubRecord {
  id: string; property: string; plan: string; cycle: string;
  amount: string; status: "active" | "trialing" | "past_due" | "cancelled";
  renewalDate: string; provider: string;
}

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  active:   { bg: "#f0fdf4", text: "#15803d" },
  trialing: { bg: "#eff6ff", text: "#1d4ed8" },
  past_due: { bg: "#fff7ed", text: "#c2410c" },
  cancelled:{ bg: C.soft,   text: C.muted },
};

export default function SubscriptionsPage() {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch]           = useState("");
  const [selected, setSelected]       = useState<SubRecord | null>(null);
  const [msg, setMsg]                 = useState("");

  const [subs, setSubs] = useState<SubRecord[]>([
    { id: "sub_901", property: "Coorg Hilltop Homestay",      plan: "PROFESSIONAL", cycle: "yearly",  amount: "₹7,999", status: "active",   renewalDate: "2027-01-15",          provider: "Razorpay"     },
    { id: "sub_902", property: "Manali Pine Resort",           plan: "STARTER",      cycle: "monthly", amount: "₹299",   status: "active",   renewalDate: "2026-04-01",          provider: "Razorpay"     },
    { id: "sub_903", property: "Wayanad Forest Lodge",         plan: "PROFESSIONAL", cycle: "monthly", amount: "₹799",   status: "trialing", renewalDate: "2026-04-04 (Trial end)", provider: "Direct Trial" },
    { id: "sub_904", property: "Goa Beachside Lodge",          plan: "STARTER",      cycle: "monthly", amount: "₹299",   status: "past_due", renewalDate: "2026-03-10 (Past due)", provider: "Razorpay"     },
  ]);

  const filtered = subs.filter(s => {
    const matchSearch = [s.property, s.id].some(v => v.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === "ALL" || s.status.toUpperCase() === statusFilter.replace("_", "_");
    return matchSearch && matchStatus;
  });

  const changeStatus = (newStatus: SubRecord["status"]) => {
    if (!selected) return;
    setSubs(prev => prev.map(s => s.id === selected.id ? { ...s, status: newStatus } : s));
    setSelected({ ...selected, status: newStatus });
    setMsg(`${selected.id} marked as ${newStatus.toUpperCase()}`);
    setTimeout(() => setMsg(""), 2500);
  };

  const inputStyle = {
    fontSize: 14, color: C.ink,
    padding: "10px 14px",
    border: `1px solid ${C.hairline}`,
    borderRadius: 8, outline: "none",
    backgroundColor: C.soft,
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: C.ink }}>Subscriptions</h1>
          <p style={{ fontSize: 14, fontWeight: 400, color: C.muted, marginTop: 4 }}>
            Monitor active subscriptions, trial statuses, and billing cycles.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3" style={{ color: C.muted }} />
          <input
            type="text" placeholder="Search by property or subscription ID…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, width: "100%", paddingLeft: 36, boxSizing: "border-box" }}
            onFocus={e => { e.currentTarget.style.borderColor = C.ink; e.currentTarget.style.backgroundColor = C.canvas; }}
            onBlur={e  => { e.currentTarget.style.borderColor = C.hairline; e.currentTarget.style.backgroundColor = C.soft; }}
          />
        </div>
        <div className="flex items-center gap-1 p-1" style={{ backgroundColor: C.canvas, border: `1px solid ${C.hairline}`, borderRadius: 9999 }}>
          {["ALL", "ACTIVE", "TRIALING", "PAST_DUE"].map(st => (
            <button key={st} onClick={() => setStatusFilter(st)}
              style={{
                fontSize: 11, fontWeight: 600,
                paddingInline: 12, paddingBlock: 6,
                borderRadius: 9999,
                backgroundColor: statusFilter === st ? C.ink : "transparent",
                color: statusFilter === st ? "#ffffff" : C.muted,
                border: "none", cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: C.canvas, border: `1px solid ${C.hairline}`, borderRadius: 14, overflow: "hidden", ...SHADOW }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, color: C.body }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.hairline}`, backgroundColor: C.soft }}>
                {["Sub ID", "Property", "Plan & Cycle", "Amount", "Status", "Renewal Date", ""].map(h => (
                  <th key={h} style={{
                    padding: "12px 20px", textAlign: "left",
                    fontSize: 11, fontWeight: 700, color: C.muted,
                    textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub, i) => {
                const sb = STATUS_BADGE[sub.status] ?? STATUS_BADGE.cancelled;
                return (
                  <tr key={sub.id}
                    style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.hairlineSoft}` : "none" }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.soft)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <td style={{ padding: "16px 20px", fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: C.muted }}>{sub.id}</td>
                    <td style={{ padding: "16px 20px", fontWeight: 600, color: C.ink }}>{sub.property}</td>
                    <td style={{ padding: "16px 20px" }}>
                      <div className="flex items-center gap-2">
                        <span style={{ fontWeight: 600, color: C.ink, fontSize: 13 }}>{sub.plan}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: C.muted,
                          backgroundColor: C.soft, borderRadius: 9999,
                          paddingInline: 7, paddingBlock: 2, textTransform: "uppercase",
                        }}>
                          {sub.cycle}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "16px 20px", fontWeight: 700, color: "#15803d" }}>{sub.amount}</td>
                    <td style={{ padding: "16px 20px" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        backgroundColor: sb.bg, color: sb.text,
                        borderRadius: 9999, paddingInline: 9, paddingBlock: 3,
                      }}>
                        {sub.status.replace("_", " ").toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "16px 20px", fontSize: 12, color: C.muted }}>{sub.renewalDate}</td>
                    <td style={{ padding: "16px 20px", textAlign: "right" }}>
                      <button onClick={() => setSelected(sub)}
                        style={{
                          fontSize: 12, fontWeight: 500,
                          paddingInline: 14, paddingBlock: 7,
                          backgroundColor: C.soft, color: C.ink,
                          border: `1px solid ${C.hairline}`,
                          borderRadius: 8, cursor: "pointer",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = C.ink)}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = C.hairline)}
                      >
                        Override
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Override modal */}
      {selected && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div style={{ backgroundColor: C.canvas, borderRadius: 14, padding: 28, maxWidth: 440, width: "100%", ...SHADOW }}>
            <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: `1px solid ${C.hairline}` }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>Override Subscription</h3>
                <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{selected.id}</p>
              </div>
              <button onClick={() => setSelected(null)}
                style={{ width: 32, height: 32, borderRadius: 9999, backgroundColor: C.soft, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X className="w-4 h-4" style={{ color: C.muted }} />
              </button>
            </div>

            {msg && (
              <div className="mb-4 flex items-center gap-2 p-3 rounded-lg"
                style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                <Check className="w-4 h-4" style={{ color: "#15803d" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#15803d" }}>{msg}</span>
              </div>
            )}

            <p style={{ fontSize: 13, color: C.body, marginBottom: 14 }}>
              Property: <strong style={{ color: C.ink }}>{selected.property}</strong>
            </p>

            <p style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 10 }}>Override Status</p>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {(["active", "trialing", "past_due", "cancelled"] as const).map(st => {
                const active = selected.status === st;
                return (
                  <button key={st} onClick={() => changeStatus(st)}
                    style={{
                      paddingBlock: 10,
                      fontSize: 12, fontWeight: 600,
                      borderRadius: 8,
                      backgroundColor: active ? C.ink : C.soft,
                      color: active ? "#ffffff" : C.body,
                      border: `1px solid ${active ? C.ink : C.hairline}`,
                      cursor: "pointer", textTransform: "uppercase",
                    }}
                  >
                    {st.replace("_", " ")}
                  </button>
                );
              })}
            </div>

            <button onClick={() => setSelected(null)}
              style={{
                width: "100%", paddingBlock: 12,
                fontSize: 14, fontWeight: 500,
                backgroundColor: C.ink, color: "#ffffff",
                border: "none", borderRadius: 8, cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
