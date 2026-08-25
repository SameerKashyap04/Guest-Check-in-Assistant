"use client";

// ─── DESIGN.md — Airbnb Design System ────────────────────────────────────────
// Table = host-card style: white canvas, rounded.md (14px), hairline border
// Plan badges = guest-favorite-badge: rounded.full pill, 11px/600
// Manage modal = reservation-card: white, rounded.md, 24px padding
// Inputs: text-input style — hairline border, ink focus, 8px radius
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import { AdminLayout, useAdminContext } from "@/components/AdminLayout";
import { Search, X, Check } from "lucide-react";
import { adminDataService } from "@/lib/adminDataService";

const C = {
  primary:  "#7c3aed",
  ink:      "#222222",
  body:     "#3f3f3f",
  muted:    "#6a6a6a",
  canvas:   "#ffffff",
  soft:     "#f8f7fb",
  hairline: "#dddddd",
  hairlineSoft: "#ebebeb",
};

const SHADOW = {
  boxShadow: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.10) 0 4px 8px",
};

interface OwnerUser {
  id: string; name: string; businessName: string; email: string;
  phone: string; propertyId: string;
  plan: "FREE" | "STARTER" | "PROFESSIONAL" | "MULTI_PROPERTY";
  status: "active" | "trialing" | "past_due" | "cancelled";
  rooms: number; checkInsThisMonth: number; createdAt: string;
}

const PLAN_BADGE: Record<string, { bg: string; text: string }> = {
  PROFESSIONAL:   { bg: "#ede9fe", text: C.primary },
  STARTER:        { bg: "#fefce8", text: "#854d0e" },
  FREE:           { bg: C.soft,    text: C.muted },
  MULTI_PROPERTY: { bg: "#eff6ff", text: "#1d4ed8" },
};

export default function UsersPage() {
  const { maskPii } = useAdminContext();
  const [search, setSearch]       = useState("");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [selected, setSelected]   = useState<OwnerUser | null>(null);
  const [msg, setMsg]             = useState("");

  const [users, setUsers] = useState<OwnerUser[]>([]);

  useEffect(() => {
    const unsub = adminDataService.subscribeUsers((adminUsers) => {
      setUsers(adminUsers.map((u, i) => ({
        id: u.id || `usr_${i}`,
        name: u.name || 'Owner',
        businessName: u.property || u.name || 'Homestay',
        email: u.email || '',
        phone: u.email || u.role || 'Host',
        propertyId: u.propertyId || u.id.substring(0, 7).toUpperCase(),
        plan: (u.plan?.toUpperCase().includes('PRO') ? 'PROFESSIONAL' : u.plan?.toUpperCase().includes('STARTER') ? 'STARTER' : 'FREE') as any,
        status: (u.status?.toLowerCase() === 'trialing' ? 'trialing' : 'active') as any,
        rooms: u.rooms || 8,
        checkInsThisMonth: u.checkIns || 0,
        createdAt: u.joinedDate || 'Recent',
      })));
    });
    return () => unsub();
  }, []);

  const maskPhone = (p: string) => maskPii ? p.replace(/(\+91 \d{5}) \d{5}/, "$1 *****") : p;

  const filteredUsers = users.filter(u => {
    const matchSearch = [u.name, u.businessName, u.propertyId, u.email]
      .some(v => v.toLowerCase().includes(search.toLowerCase()));
    const matchPlan = planFilter === "ALL" || u.plan === planFilter;
    return matchSearch && matchPlan;
  });

  const updatePlan = (plan: OwnerUser["plan"]) => {
    if (!selected) return;
    setUsers(prev => prev.map(u => u.id === selected.id ? { ...u, plan } : u));
    setSelected({ ...selected, plan });
    setMsg(`Updated ${selected.businessName} to ${plan}`);
    setTimeout(() => setMsg(""), 2500);
  };

  const inputStyle = {
    backgroundColor: C.canvas,
    border: `1px solid ${C.hairline}`,
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 14,
    color: C.ink,
    outline: "none",
    width: "100%",
  };

  return (
    <AdminLayout>
      {/* Toast */}
      {msg && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Property Owners</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Manage homestay accounts, check-in quotas, and subscription tiers.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search by name, business, or property ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-600 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
          {["ALL", "FREE", "STARTER", "PROFESSIONAL"].map((s) => (
            <button
              key={s}
              onClick={() => setPlanFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                planFilter === s
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table — host-card style */}
      <div style={{
        backgroundColor: C.canvas,
        border: `1px solid ${C.hairline}`,
        borderRadius: 14,
        overflow: "hidden",
        ...SHADOW,
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, color: C.body }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.hairline}`, backgroundColor: C.soft }}>
                {["Property & Owner", "Property ID", "Plan & Status", "Rooms", "Monthly Check-ins", ""].map(h => (
                  <th key={h} style={{
                    padding: "12px 20px", textAlign: "left",
                    fontSize: 11, fontWeight: 700, color: C.muted,
                    textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "48px 20px", textAlign: "center", color: C.muted }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 4 }}>No property owners found</p>
                    <p style={{ fontSize: 13, color: C.muted }}>Real-time host registrations will appear here automatically.</p>
                  </td>
                </tr>
              ) : filteredUsers.map((user, i) => {
                const pb = PLAN_BADGE[user.plan] ?? PLAN_BADGE.FREE;
                return (
                  <tr
                    key={user.id}
                    style={{ borderBottom: i < filteredUsers.length - 1 ? `1px solid ${C.hairlineSoft}` : "none" }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.soft)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <td style={{ padding: "16px 20px" }}>
                      <p style={{ fontWeight: 600, color: C.ink }}>{user.businessName}</p>
                      <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                        {user.name} {user.email ? `· ${user.email}` : ""}
                      </p>
                    </td>
                    <td style={{ padding: "16px 20px", fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: C.muted }}>
                      {user.propertyId}
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <div className="flex items-center gap-2">
                        {/* guest-favorite-badge */}
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          backgroundColor: pb.bg, color: pb.text,
                          borderRadius: 9999, paddingInline: 9, paddingBlock: 3,
                        }}>
                          {user.plan}
                        </span>
                        {user.status === "trialing" && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: "#1d4ed8",
                            backgroundColor: "#eff6ff", borderRadius: 9999,
                            paddingInline: 7, paddingBlock: 2,
                          }}>
                            TRIAL
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "16px 20px", fontWeight: 600, color: C.ink }}>{user.rooms}</td>
                    <td style={{ padding: "16px 20px", fontWeight: 600, color: "#15803d" }}>
                      {user.checkInsThisMonth}
                    </td>
                    <td style={{ padding: "16px 20px", textAlign: "right" }}>
                      <button
                        onClick={() => setSelected(user)}
                        style={{
                          fontSize: 12, fontWeight: 500,
                          paddingInline: 14, paddingBlock: 7,
                          backgroundColor: C.soft, color: C.ink,
                          border: `1px solid ${C.hairline}`,
                          borderRadius: 8, cursor: "pointer",
                          transition: "border-color 0.1s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = C.ink)}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = C.hairline)}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manage Modal — reservation-card style */}
      {selected && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div style={{
            backgroundColor: C.canvas,
            borderRadius: 14,
            padding: 28,
            maxWidth: 480,
            width: "100%",
            ...SHADOW,
          }}>
            {/* Header */}
            <div className="flex items-start justify-between mb-5 pb-4" style={{ borderBottom: `1px solid ${C.hairline}` }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>{selected.businessName}</h3>
                <p style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>ID: {selected.propertyId}</p>
              </div>
              <button onClick={() => setSelected(null)}
                style={{
                  width: 32, height: 32, borderRadius: 9999,
                  backgroundColor: C.soft, border: "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: C.muted,
                }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {msg && (
              <div className="mb-4 flex items-center gap-2 p-3 rounded-lg"
                style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                <Check className="w-4 h-4" style={{ color: "#15803d" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#15803d" }}>{msg}</span>
              </div>
            )}

            {/* Owner details grid */}
            <div className="grid grid-cols-2 gap-3 mb-5 p-4 rounded-lg"
              style={{ backgroundColor: C.soft, border: `1px solid ${C.hairlineSoft}` }}>
              {[
                { label: "Owner", value: selected.name },
                { label: "Phone", value: maskPhone(selected.phone) },
                { label: "Email", value: selected.email },
                { label: "Joined", value: selected.createdAt },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 2 }}>{label}</p>
                  <p style={{ fontSize: 13, fontWeight: 500, color: C.ink }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Plan change */}
            <div className="mb-5">
              <p style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 10 }}>
                Change Plan Tier
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(["FREE", "STARTER", "PROFESSIONAL"] as const).map(p => {
                  const active = selected.plan === p;
                  return (
                    <button
                      key={p}
                      onClick={() => updatePlan(p)}
                      style={{
                        padding: "10px 0",
                        fontSize: 12, fontWeight: 600,
                        borderRadius: 8,
                        backgroundColor: active ? C.ink : C.soft,
                        color: active ? "#ffffff" : C.body,
                        border: `1px solid ${active ? C.ink : C.hairline}`,
                        cursor: "pointer",
                        transition: "all 0.1s",
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setSelected(null)}
              style={{
                width: "100%", paddingBlock: 12,
                fontSize: 14, fontWeight: 500,
                backgroundColor: C.ink, color: "#ffffff",
                border: "none", borderRadius: 8, cursor: "pointer",
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#3f3f3f")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = C.ink)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
