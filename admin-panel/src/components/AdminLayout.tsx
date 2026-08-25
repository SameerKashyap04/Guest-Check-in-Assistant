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

import React, { useState, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Building2, CreditCard, TrendingUp,
  BarChart3, Sliders, ShieldAlert, Shield, Eye, EyeOff, LogOut,
  ChevronRight, RefreshCw, Bell, CheckCircle2, Building, Tag, Gift,
} from "lucide-react";

interface AdminContextType {
  maskPii: boolean;
  setMaskPii: (v: boolean) => void;
  isSyncing: boolean;
  refreshData: () => void;
}

const AdminContext = createContext<AdminContextType>({
  maskPii: true, setMaskPii: () => {},
  isSyncing: false, refreshData: () => {},
});

export const useAdminContext = () => useContext(AdminContext);

interface AdminLayoutProps { children: React.ReactNode; }

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const [maskPii, setMaskPii]               = useState(true);
  const [isSyncing, setIsSyncing]           = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

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
  ];

  return (
    <AdminContext.Provider value={{ maskPii, setMaskPii, isSyncing, refreshData }}>
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
            className="flex items-center justify-between px-4"
            style={{
              height: 80,
              borderBottom: "1px solid #dddddd",
            }}
          >
            {/* StayMate Logo with Text */}
            <div className="flex items-center gap-2">
              <img
                src="/logo-with-text.png"
                alt="StayMate"
                className="h-12 w-auto max-w-[170px] object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span className="text-[10px] font-black uppercase tracking-wider bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full border border-violet-300 flex-shrink-0">
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
                >
                  <Bell className="w-4 h-4" />
                  <span
                    className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                    style={{ backgroundColor: "#7c3aed" }}
                  />
                </button>

                {showNotifications && (
                  <div
                    className="absolute right-0 mt-2 w-80 p-4 z-30"
                    style={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #dddddd",
                      borderRadius: 14,
                      boxShadow: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.10) 0 4px 8px",
                    }}
                  >
                    <div className="flex items-center justify-between mb-3 pb-2" style={{ borderBottom: "1px solid #ebebeb" }}>
                      <h4 style={{ fontSize: 14, fontWeight: 600, color: "#222222" }}>Notifications</h4>
                      <span
                        style={{
                          fontSize: 10, fontWeight: 700, color: "#15803d",
                          backgroundColor: "#f0fdf4", paddingInline: 8, paddingBlock: 3,
                          borderRadius: 9999,
                        }}
                      >
                        LIVE
                      </span>
                    </div>
                    <div className="py-4 text-center text-xs" style={{ color: "#6a6a6a" }}>
                      <p style={{ fontWeight: 600, color: "#222222" }}>All systems operational</p>
                      <p style={{ marginTop: 2 }}>Real-time alerts will appear here as users sign up and upgrade.</p>
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
