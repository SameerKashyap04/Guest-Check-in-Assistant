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

interface OwnerUser {
  id: string; name: string; businessName: string; email: string;
  phone: string; propertyId: string;
  plan: "FREE" | "STARTER" | "PROFESSIONAL" | "MULTI_PROPERTY";
  status: "active" | "trialing" | "past_due" | "cancelled";
  rooms: number; checkInsThisMonth: number; createdAt: string;
}

const PLAN_BADGE: Record<string, { bg: string; text: string }> = {
  PROFESSIONAL:   { bg: "#fff1f2", text: C.primary },
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

  const [users, setUsers] = useState<OwnerUser[]>([
    { id: "usr_101", name: "Ramesh Hegde",   businessName: "Coorg Hilltop Homestay",      email: "ramesh.hegde@coorgstay.com",      phone: "+91 98450 12345", propertyId: "HS-8821", plan: "PROFESSIONAL", status: "active",   rooms: 18, checkInsThisMonth: 142, createdAt: "2026-01-15" },
    { id: "usr_102", name: "Anil Sharma",    businessName: "Manali Pine Resort",           email: "anil.sharma@manaliresort.in",     phone: "+91 98160 54321", propertyId: "HS-4492", plan: "STARTER",      status: "active",   rooms: 12, checkInsThisMonth: 86,  createdAt: "2026-02-01" },
    { id: "usr_103", name: "Vikram Menon",   businessName: "Wayanad Forest Lodge",         email: "v.menon@wayanadlodge.com",        phone: "+91 94470 99887", propertyId: "HS-3109", plan: "PROFESSIONAL", status: "trialing", rooms: 24, checkInsThisMonth: 65,  createdAt: "2026-03-04" },
    { id: "usr_104", name: "Priya Nair",     businessName: "Munnar Tea Valley Guesthouse", email: "priya@teavalleyguesthouse.in",    phone: "+91 97440 11223", propertyId: "HS-9012", plan: "FREE",         status: "active",   rooms: 8,  checkInsThisMonth: 18,  createdAt: "2026-02-18" },
    { id: "usr_105", name: "Sunil D'Souza",  businessName: "Goa Beachside Lodge",          email: "sunil@goabeachside.com",          phone: "+91 98221 33445", propertyId: "HS-7734", plan: "STARTER",      status: "active",   rooms: 15, checkInsThisMonth: 195, createdAt: "2026-01-10" },
  ]);

  useEffect(() => {
    const unsub = adminDataService.subscribeUsers((adminUsers) => {
      if (adminUsers.length > 0) {
        setUsers(adminUsers.map((u, i) => ({
          id: u.id || `usr_${i}`,
          name: u.name || 'Owner',
          businessName: u.property || 'Homestay',
          email: u.email || 'user@example.com',
          phone: '+91 98450 12345',
          propertyId: `HS-${1000 + i}`,
          plan: (u.plan?.toUpperCase().includes('PRO') ? 'PROFESSIONAL' : u.plan?.toUpperCase().includes('STARTER') ? 'STARTER' : 'FREE') as any,
          status: (u.status?.toLowerCase() === 'trialing' ? 'trialing' : 'active') as any,
          rooms: 8,
          checkInsThisMonth: 42,
          createdAt: u.joinedDate || '2026-01-15',
        })));
      }
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
    fontSize: 14, color: C.ink,
    padding: "10px 14px",
    border: `1px solid ${C.hairline}`,
    borderRadius: 8,
    outline: "none",
    backgroundColor: C.soft,
  };

  return (
    <AdminLayout>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: C.ink }}>Property Owners</h1>
          <p style={{ fontSize: 14, fontWeight: 400, color: C.muted, marginTop: 4 }}>
            Manage homestay accounts, check-in quotas, and subscription tiers.
          </p>
        </div>
      </div>

      {/* Search + Filter bar */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3" style={{ color: C.muted }} />
          <input
            type="text"
            placeholder="Search by name, business, or property ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, width: "100%", paddingLeft: 36, boxSizing: "border-box" }}
            onFocus={e => { e.currentTarget.style.borderColor = C.ink; e.currentTarget.style.backgroundColor = C.canvas; }}
            onBlur={e  => { e.currentTarget.style.borderColor = C.hairline; e.currentTarget.style.backgroundColor = C.soft; }}
          />
        </div>
        {/* Plan filter — category-strip */}
        <div className="flex items-center gap-1 p-1" style={{ backgroundColor: C.canvas, border: `1px solid ${C.hairline}`, borderRadius: 9999 }}>
          {["ALL", "FREE", "STARTER", "PROFESSIONAL"].map(p => (
            <button
              key={p}
              onClick={() => setPlanFilter(p)}
              style={{
                fontSize: 11, fontWeight: 600,
                paddingInline: 12, paddingBlock: 6,
                borderRadius: 9999,
                backgroundColor: planFilter === p ? C.ink : "transparent",
                color: planFilter === p ? "#ffffff" : C.muted,
                border: "none", cursor: "pointer", whiteSpace: "nowrap",
                transition: "all 0.1s",
              }}
            >
              {p}
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
              {filteredUsers.map((user, i) => {
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
                        {user.name} · {maskPhone(user.phone)}
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
