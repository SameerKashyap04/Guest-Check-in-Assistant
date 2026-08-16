"use client";

import React, { useState, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  CreditCard,
  TrendingUp,
  BarChart3,
  Sliders,
  ShieldAlert,
  Shield,
  Eye,
  EyeOff,
  LogOut,
  ChevronRight,
  Sparkles,
  Search,
  Bell,
  CheckCircle2,
  RefreshCw,
  Building,
} from "lucide-react";

// PII & Privacy Context for dynamic unmasking across all admin screens
interface AdminContextType {
  maskPii: boolean;
  setMaskPii: (value: boolean) => void;
  isSyncing: boolean;
  refreshData: () => void;
}

const AdminContext = createContext<AdminContextType>({
  maskPii: true,
  setMaskPii: () => {},
  isSyncing: false,
  refreshData: () => {},
});

export const useAdminContext = () => useContext(AdminContext);

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const [maskPii, setMaskPii] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const refreshData = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 800);
  };

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Property Owners", href: "/users", icon: Users },
    { label: "Properties", href: "/properties", icon: Building2 },
    { label: "Subscriptions", href: "/subscriptions", icon: Shield },
    { label: "Payments", href: "/payments", icon: CreditCard },
    { label: "Revenue Analytics", href: "/revenue", icon: TrendingUp },
    { label: "Usage Analytics", href: "/analytics", icon: BarChart3 },
    { label: "Plan Matrix", href: "/plans", icon: Sliders },
    { label: "Audit Logs", href: "/audit-logs", icon: ShieldAlert },
  ];

  return (
    <AdminContext.Provider value={{ maskPii, setMaskPii, isSyncing, refreshData }}>
      <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col flex-shrink-0 shadow-sm z-20">
          {/* Brand Logo Header */}
          <div className="p-5 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-md shadow-violet-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-base text-slate-900 leading-tight">
                StayMate
              </h1>
              <p className="text-[10px] text-violet-700 font-black tracking-wider uppercase bg-violet-100 px-2 py-0.5 rounded border border-violet-200 mt-0.5 inline-block">
                Platform Admin
              </p>
            </div>
          </div>

          {/* Developer Access Notice */}
          <div className="mx-3 mt-3 p-2.5 bg-slate-100/90 rounded-xl border border-slate-200 text-[11px] text-slate-600 font-medium leading-tight">
            <strong className="text-slate-900 font-extrabold block mb-0.5 flex items-center gap-1">
              <Building className="w-3 h-3 text-violet-600" />
              Central Control Console
            </strong>
            StayMate operations & developer console. Property owners check in guests via mobile app.
          </div>

          {/* Dynamic PII Privacy Toggle */}
          <div className="px-4 py-3 mx-3 my-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {maskPii ? (
                <EyeOff className="w-4 h-4 text-emerald-600" />
              ) : (
                <Eye className="w-4 h-4 text-amber-600" />
              )}
              <span className="text-xs font-bold text-slate-700">PII Privacy</span>
            </div>
            <button
              onClick={() => setMaskPii(!maskPii)}
              className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md transition-all active:scale-95 cursor-pointer ${
                maskPii
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-amber-100 text-amber-800 border border-amber-300 animate-pulse"
              }`}
              title="Toggle Aadhaar & Guest Document Privacy"
            >
              {maskPii ? "PROTECTED" : "UNMASKED"}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-violet-600 text-white shadow-md shadow-violet-500/25"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                  <span>{item.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto opacity-80" />}
                </Link>
              );
            })}
          </nav>

          {/* User Session Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Company Super Admin</p>
                <p className="text-[11px] text-slate-500 font-mono">dev@company.com</p>
              </div>
              <Link
                href="/login"
                className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-200/60 transition-colors"
                title="Log Out Session"
              >
                <LogOut className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-y-auto">
          {/* Top Bar Header */}
          <header className="h-16 border-b border-slate-200/80 bg-white/80 px-8 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-violet-700 bg-violet-100 px-3 py-1 rounded-full border border-violet-200 tracking-wider">
                DEVELOPER COMPANY ADMIN CONSOLE
              </span>

              {/* Dynamic Live Sync Refresh Button */}
              <button
                onClick={refreshData}
                disabled={isSyncing}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-violet-600" : "text-slate-400"}`} />
                <span>{isSyncing ? "Syncing..." : "Live Firestore Sync"}</span>
              </button>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl relative transition-colors cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-violet-600"></span>
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-30">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                      <h4 className="font-bold text-xs text-slate-900">Platform Notifications</h4>
                      <span className="text-[10px] bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full">
                        2 NEW
                      </span>
                    </div>
                    <div className="space-y-3 text-xs">
                      <div className="p-2.5 bg-violet-50/60 rounded-xl border border-violet-100">
                        <p className="font-bold text-violet-900">New Subscription Upgrade</p>
                        <p className="text-slate-600 mt-0.5">Coorg Hilltop upgraded to Professional Annual (₹7,999)</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">5 mins ago</span>
                      </div>
                      <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                        <p className="font-bold text-emerald-900">New Homestay Onboarded</p>
                        <p className="text-slate-600 mt-0.5">Manali Pine Resort joined platform (12 rooms)</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">30 mins ago</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>SaaS Backend Operational</span>
              </div>
            </div>
          </header>

          {/* Page Content Holder */}
          <div className="p-8 max-w-7xl w-full mx-auto">{children}</div>
        </main>
      </div>
    </AdminContext.Provider>
  );
}

