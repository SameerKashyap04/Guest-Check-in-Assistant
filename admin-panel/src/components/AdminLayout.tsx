"use client";

// ─── DESIGN.md — Airbnb Design System ────────────────────────────────────────
// Top nav:       white #ffffff canvas, 1px #dddddd hairline bottom border, 80px height
// Sidebar:       white canvas, 1px #dddddd right border
// Active nav:    Rausch #ff385c left accent bar + ink #222222 bold label
// Inactive nav:  muted #6a6a6a label, transparent bg
// Primary CTA:   Rausch #ff385c fill, white text, rounded-sm (8px)
// Typography:    display-md 21/700 for page titles, title-md 16/600 nav labels,
//                body-sm 14/400 meta text
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Building2, CreditCard, TrendingUp,
  BarChart3, Sliders, ShieldAlert, Shield, Eye, EyeOff, LogOut,
  ChevronRight, RefreshCw, Bell, CheckCircle2, Building, Tag, Gift,
  Settings, Phone, MessageCircle, AlertTriangle, AlertCircle
} from "lucide-react";
import { adminDataService, AdminProperty } from "@/lib/adminDataService";

interface AdminContextType {
  maskPii: boolean;
  setMaskPii: (v: boolean) => void;
  isSyncing: boolean;
  refreshData: () => void;
  dormantProperties: AdminProperty[];
}

const AdminContext = createContext<AdminContextType>({
  maskPii: false, setMaskPii: () => {},
  isSyncing: false, refreshData: () => {},
  dormantProperties: [],
});

export const useAdminContext = () => useContext(AdminContext);

interface AdminLayoutProps { children: React.ReactNode; }

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const [maskPii, setMaskPii]               = useState(false);
  const [isSyncing, setIsSyncing]           = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [properties, setProperties]         = useState<AdminProperty[]>([]);

  useEffect(() => {
    const unsub = adminDataService.subscribeProperties(setProperties);
    return () => unsub();
  }, []);

  const dormantProperties = properties.filter((p) => p.isOfflineWeekPlus);

  const refreshData = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 800);
  };

  const navItems = [
    { label: "Dashboard",        href: "/",              icon: LayoutDashboard },
    { label: "Property Owners",  href: "/users",         icon: Users },
    { label: "Properties",       href: "/properties",    icon: Building2 },
    { label: "Subscriptions",    href: "/subscriptions", icon: Shield },
    { label: "Payments",         href: "/payments",      icon: CreditCard },
    { label: "Coupons & Codes",  href: "/coupons",       icon: Tag },
    { label: "Refer & Earn",     href: "/referrals",     icon: Gift },
    { label: "Revenue",          href: "/revenue",       icon: TrendingUp },
    { label: "Usage Analytics",  href: "/analytics",     icon: BarChart3 },
    { label: "Plan Matrix",      href: "/plans",         icon: Sliders },
    { label: "Audit Logs",       href: "/audit-logs",    icon: ShieldAlert },
    { label: "Settings",         href: "/settings",      icon: Settings },
  ];

  return (
    <AdminContext.Provider value={{ maskPii, setMaskPii, isSyncing, refreshData, dormantProperties }}>
      {/* ── Root shell — surface-soft background ── */}
      <div className="min-h-screen flex" style={{ backgroundColor: "#f8f7fb", fontFamily: "'Inter', sans-serif" }}>

        {/* ════════════════════════════════════════
            SIDEBAR — white canvas, hairline border
            ════════════════════════════════════════ */}
        <aside
          className="w-64 flex flex-col flex-shrink-0 z-20"
          style={{
            backgroundColor: "#ffffff",
            borderRight: "1px solid #dddddd",
          }}
        >
          {/* Brand — top-nav height 80px */}
          <div
            className="flex items-center justify-between px-3.5"
            style={{
              height: 80,
              borderBottom: "1px solid #dddddd",
            }}
          >
            {/* StayMate Logo with Text */}
            <div className="flex items-center justify-between w-full">
              <img
                src="/logo-with-text.png"
                alt="StayMate"
                className="h-14 w-auto max-w-[175px] object-contain transition-transform duration-150 hover:scale-105"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span className="text-[10px] font-black uppercase tracking-wider bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full border border-violet-300 flex-shrink-0 shadow-xs">
                Admin
              </span>
            </div>
          </div>

          {/* Platform notice */}
          <div
            className="mx-4 mt-4 px-3 py-2 rounded-lg"
            style={{ backgroundColor: "#f8f7fb", border: "1px solid #ebebeb" }}
          >
            <p style={{ fontSize: 12, fontWeight: 600, color: "#222222", marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
              <Building className="w-3 h-3" style={{ color: "#7c3aed" }} /> Control Console
            </p>
            <p style={{ fontSize: 11, fontWeight: 400, color: "#6a6a6a", lineHeight: 1.4 }}>
              Operations &amp; developer console. Property owners use the mobile app.
            </p>
          </div>

          {/* PII toggle */}
          <div
            className="mx-4 mt-3 px-3 py-2.5 rounded-lg flex items-center justify-between"
            style={{ backgroundColor: "#f8f7fb", border: "1px solid #ebebeb" }}
          >
            <div className="flex items-center gap-2">
              {maskPii
                ? <EyeOff className="w-4 h-4" style={{ color: "#222222" }} />
                : <Eye className="w-4 h-4" style={{ color: "#7c3aed" }} />
              }
              <span style={{ fontSize: 12, fontWeight: 600, color: "#222222" }}>PII Privacy</span>
            </div>
            <button
              onClick={() => setMaskPii(!maskPii)}
              style={{
                fontSize: 10, fontWeight: 700,
                paddingInline: 10, paddingBlock: 4,
                borderRadius: 9999,
                backgroundColor: maskPii ? "#f8f7fb" : "#ede9fe",
                color: maskPii ? "#6a6a6a" : "#7c3aed",
                border: `1px solid ${maskPii ? "#dddddd" : "#7c3aed"}`,
                cursor: "pointer",
              }}
            >
              {maskPii ? "PROTECTED" : "VISIBLE"}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    paddingInline: 12,
                    paddingBlock: 10,
                    borderRadius: 8,
                    textDecoration: "none",
                    borderLeft: isActive ? "2px solid #7c3aed" : "2px solid transparent",
                    backgroundColor: isActive ? "#ede9fe" : "transparent",
                    color: isActive ? "#7c3aed" : "#6a6a6a",
                    fontWeight: isActive ? 700 : 500,
                    fontSize: 14,
                    transition: "all 0.1s",
                  }}
                  className="hover:bg-[#f8f7fb] hover:text-[#222222] transition-colors"
                >
                  <Icon
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: isActive ? "#7c3aed" : "#6a6a6a" }}
                  />
                  <span>{item.label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto" style={{ color: "#7c3aed" }} />}
                </Link>
              );
            })}
          </nav>

          {/* Session footer */}
          <div
            className="p-4 flex items-center justify-between"
            style={{ borderTop: "1px solid #dddddd" }}
          >
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#222222" }}>Super Admin</p>
              <p style={{ fontSize: 12, fontWeight: 400, color: "#6a6a6a", fontFamily: "monospace" }}>
                dev@company.com
              </p>
            </div>
            <Link
              href="/login"
              className="p-2 rounded-full hover:bg-[#f8f7fb] transition-colors"
              style={{ color: "#6a6a6a" }}
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </Link>
          </div>
        </aside>

        {/* ════════════════════════════════════════
            MAIN — top-nav + content
            ════════════════════════════════════════ */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">

          {/* Top bar — top-nav: 80px, white, hairline bottom */}
          <header
            className="flex items-center justify-between px-8 sticky top-0 z-10"
            style={{
              height: 80,
              backgroundColor: "#ffffff",
              borderBottom: "1px solid #dddddd",
            }}
          >
            {/* Left */}
            <div className="flex items-center gap-3">
              <span
                style={{
                  fontSize: 11, fontWeight: 700,
                  color: "#6a6a6a", letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Developer · Admin Console
              </span>

              {/* Live sync */}
              <button
                onClick={refreshData}
                disabled={isSyncing}
                className="flex items-center gap-1.5 hover:bg-[#f8f7fb] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                style={{ fontSize: 12, fontWeight: 500, color: "#6a6a6a" }}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`}
                  style={{ color: isSyncing ? "#7c3aed" : "#dddddd" }}
                />
                <span>{isSyncing ? "Syncing…" : "Live Sync"}</span>
              </button>
            </div>

            {/* Right */}
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-full hover:bg-[#f8f7fb] transition-colors relative cursor-pointer"
                  style={{ color: "#6a6a6a" }}
                  title="Inactivity Alerts & Notifications"
                >
                  <Bell className="w-5 h-5 text-slate-700" />
                  {dormantProperties.length > 0 ? (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center shadow-sm animate-pulse">
                      {dormantProperties.length}
                    </span>
                  ) : (
                    <span
                      className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                      style={{ backgroundColor: "#7c3aed" }}
                    />
                  )}
                </button>

                {showNotifications && (
                  <div
                    className="absolute right-0 mt-2 w-96 p-4 z-40 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-[480px] overflow-y-auto"
                  >
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">Inactivity Alerts & Monitor</h4>
                        {dormantProperties.length > 0 && (
                          <span className="text-[10px] font-extrabold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                            {dormantProperties.length} DORMANT
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="text-slate-400 hover:text-slate-700 text-xs font-bold"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Dormant Properties Alerts */}
                    {dormantProperties.length > 0 ? (
                      <div className="space-y-3 mb-3">
                        <div className="p-2.5 rounded-xl bg-rose-50/80 border border-rose-200/80 flex items-start gap-2 text-xs text-rose-900 font-medium">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="font-bold block text-rose-950">
                              {dormantProperties.length} {dormantProperties.length === 1 ? 'Property' : 'Properties'} Offline &gt; 1 Week
                            </strong>
                            Homestays with no active check-in or app interaction in the last 7+ days.
                          </div>
                        </div>

                        {dormantProperties.map((p) => (
                          <div
                            key={p.id}
                            className="p-3 rounded-xl border border-slate-200 hover:border-violet-300 bg-slate-50/60 transition-all space-y-2"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="font-mono text-[10px] font-bold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">
                                  {p.id}
                                </span>
                                <h5 className="text-xs font-bold text-slate-900 mt-1">
                                  {p.name}
                                </h5>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  Owner: <strong className="text-slate-700">{p.ownerName || 'Host'}</strong> · {p.ownerPhone || p.phone}
                                </p>
                              </div>
                              <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md shrink-0">
                                {p.daysOffline || 8}d Inactive
                              </span>
                            </div>

                            <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                              <a
                                href={`tel:${(p.ownerPhone || p.phone || '').replace(/[^0-9+]/g, '')}`}
                                className="inline-flex items-center gap-1 text-[11px] font-bold bg-white hover:bg-violet-50 text-slate-800 hover:text-violet-700 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors"
                              >
                                <Phone className="w-3 h-3 text-violet-600" />
                                <span>Call</span>
                              </a>
                              <a
                                href={`https://wa.me/${(p.ownerPhone || p.phone || '').replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold bg-white hover:bg-emerald-50 text-slate-800 hover:text-emerald-700 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors"
                              >
                                <MessageCircle className="w-3 h-3 text-emerald-600" />
                                <span>WhatsApp</span>
                              </a>
                              <Link
                                href="/properties"
                                onClick={() => setShowNotifications(false)}
                                className="ml-auto text-[11px] font-bold text-violet-600 hover:underline"
                              >
                                View →
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-4 text-center text-xs text-slate-500">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                        <p className="font-bold text-slate-800">All properties are active</p>
                        <p className="text-[11px] mt-0.5">No homestay has been offline for over 7 days.</p>
                      </div>
                    )}

                    <div className="pt-2.5 border-t border-slate-100 text-center">
                      <p className="text-[10px] text-slate-400 font-medium">
                        StayMate Live Heartbeat Monitor &bull; Auto-scans every 60s
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Operational status — guest-favorite-badge style */}
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#15803d" }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#15803d" }}>
                  SaaS Backend Operational
                </span>
              </div>
            </div>
          </header>

          {/* Page content */}
          <div className="p-8 max-w-7xl w-full mx-auto">{children}</div>
        </main>
      </div>
    </AdminContext.Provider>
  );
}
