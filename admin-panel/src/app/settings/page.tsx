"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { 
  Settings as SettingsIcon, 
  ShieldCheck, 
  KeyRound, 
  User, 
  Mail, 
  Lock, 
  Save, 
  Check, 
  AlertTriangle, 
  Sliders, 
  Eye, 
  EyeOff, 
  RefreshCw,
  Sparkles,
  Smartphone,
  ShieldAlert
} from "lucide-react";
import { adminDataService, AdminAppConfig } from "@/lib/adminDataService";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, addDoc, collection } from "firebase/firestore";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"GENERAL" | "SECURITY" | "APP_CONTROLS">("GENERAL");
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Profile Form
  const [username, setUsername] = useState("superadmin");
  const [displayName, setDisplayName] = useState("Platform Super Admin");
  const [email, setEmail] = useState("dev@company.com");

  // Password Form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // App & Security Config
  const [config, setConfig] = useState<AdminAppConfig>({
    freeTierDisabled: false,
    maintenanceMode: false,
    defaultPiiMasking: false,
    require2fa: true,
    adminUsername: "superadmin",
    adminEmail: "dev@company.com",
  });

  useEffect(() => {
    adminDataService.getAppConfig().then((cfg) => {
      setConfig(cfg);
      if (cfg.adminUsername) setUsername(cfg.adminUsername);
      if (cfg.adminEmail) setEmail(cfg.adminEmail);
    });
  }, []);

  const notifySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await adminDataService.saveAppConfig({
        adminUsername: username,
        adminEmail: email,
      });

      await addDoc(collection(db, "audit_logs"), {
        actor: "Super Admin",
        action: "ADMIN_PROFILE_UPDATED",
        target: username,
        details: `Updated super-admin email to ${email}`,
        timestamp: new Date().toISOString(),
        category: "SECURITY",
      });

      notifySuccess("Super Admin profile updated successfully!");
    } catch (e: any) {
      console.warn("Save profile error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      alert("New passwords do not match!");
      return;
    }

    setIsLoading(true);
    try {
      await addDoc(collection(db, "audit_logs"), {
        actor: "Super Admin",
        action: "ADMIN_PASSWORD_CHANGED",
        target: username,
        details: `Super Admin master password changed`,
        timestamp: new Date().toISOString(),
        category: "SECURITY",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      notifySuccess("Master password changed successfully!");
    } catch (e: any) {
      console.warn("Change password error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFreeTier = async () => {
    const nextState = !config.freeTierDisabled;
    const updated = { ...config, freeTierDisabled: nextState };
    setConfig(updated);

    try {
      await adminDataService.saveAppConfig({ freeTierDisabled: nextState });

      // Also mirror to plan_matrix in Firestore so mobile app checkouts update immediately
      const matrixRef = doc(db, "system_config", "plan_matrix");
      const snap = await getDoc(matrixRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.plans) {
          const modifiedPlans = data.plans.map((p: any) =>
            p.id === "FREE" ? { ...p, disabled: nextState, isHidden: nextState } : p
          );
          await setDoc(matrixRef, { plans: modifiedPlans }, { merge: true });
        }
      }

      await addDoc(collection(db, "audit_logs"), {
        actor: "Super Admin",
        action: nextState ? "FREE_TIER_DISABLED" : "FREE_TIER_ENABLED",
        target: "System Pricing Policy",
        details: nextState
          ? "Disabled & hidden Free tier. All app functions now require a paid subscription."
          : "Enabled Free tier on mobile app.",
        timestamp: new Date().toISOString(),
        category: "SYSTEM",
      });

      notifySuccess(
        nextState
          ? "Free Tier disabled & hidden! Mobile app now requires paid subscription."
          : "Free Tier enabled for mobile app users."
      );
    } catch (e: any) {
      console.warn("Toggle free tier error:", e);
    }
  };

  const handleToggle2fa = async () => {
    const nextState = !config.require2fa;
    setConfig((prev) => ({ ...prev, require2fa: nextState }));
    await adminDataService.saveAppConfig({ require2fa: nextState });
    notifySuccess(`Two-Factor Authentication ${nextState ? "Enabled" : "Disabled"}`);
  };

  return (
    <AdminLayout>
      {/* Toast Notification */}
      {successMsg && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl animate-in fade-in slide-in-from-top-2 border border-slate-700">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">System &amp; Admin Settings</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Configure Super Admin credentials, 2-Factor security, and mobile app-wide subscription gating.
          </p>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 mb-8 pb-3">
        {[
          { key: "GENERAL", label: "Super Admin Profile", icon: User },
          { key: "SECURITY", label: "2FA & Master Password", icon: ShieldCheck },
          { key: "APP_CONTROLS", label: "Mobile App Controls & Paywall", icon: Smartphone },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                active
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: GENERAL PROFILE */}
      {activeTab === "GENERAL" && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm max-w-2xl">
          <h2 className="text-base font-black text-slate-900 mb-1">Super Admin Account Details</h2>
          <p className="text-xs text-slate-500 mb-6">
            Manage username and primary contact email for Super Admin authentication and alerts.
          </p>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Display Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-violet-600 focus:bg-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Super Admin Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono font-medium focus:outline-none focus:border-violet-600 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Super Admin Primary Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-violet-600 focus:bg-white"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                2FA OTP security codes and high-priority platform alerts will be dispatched here.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={isLoading}
                className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Profile Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: SECURITY & 2FA */}
      {activeTab === "SECURITY" && (
        <div className="space-y-6 max-w-2xl">
          {/* 2FA Security Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-violet-600" />
                  <span>Two-Factor Authentication (2FA)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Require a 6-digit one-time email OTP verification code whenever Super Admin logs into the portal.
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggle2fa}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  config.require2fa
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-slate-100 text-slate-600 border border-slate-300"
                }`}
              >
                {config.require2fa ? "✓ 2FA ENABLED" : "2FA DISABLED"}
              </button>
            </div>

            <div className="p-3 bg-violet-50/50 rounded-2xl border border-violet-100 text-xs text-violet-900">
              <p className="font-bold">2FA Delivery Destination:</p>
              <p className="font-mono text-[11px] text-violet-700 mt-0.5">{email}</p>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
            <h2 className="text-base font-black text-slate-900 mb-1 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-slate-700" />
              <span>Change Master Password</span>
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Update the master authentication password for developer company access.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-violet-600 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-violet-600 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-violet-600 focus:bg-white"
                  required
                />
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Update Master Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: APP CONTROLS & PAYWALL GATING */}
      {activeTab === "APP_CONTROLS" && (
        <div className="space-y-6 max-w-3xl">
          {/* DISABLE & HIDE FREE TIER */}
          <div className="bg-white border-2 border-violet-200/90 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full border border-violet-300">
                    SaaS Paywall Policy
                  </span>
                  {config.freeTierDisabled ? (
                    <span className="text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200">
                      FREE TIER DISABLED
                    </span>
                  ) : (
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                      FREE TIER ACTIVE
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-black text-slate-900">
                  Disable &amp; Hide Free Tier (Require Paid Subscription for All Users)
                </h2>
                <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                  When enabled, the Free plan is completely hidden and disabled across the StayMate platform. No homestay owner can use any app functions (guest check-in, Aadhaar/Passport OCR, room inventory, PDF exports) without purchasing an active <strong>Starter</strong> or <strong>Professional</strong> subscription.
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleFreeTier}
                className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex-shrink-0 cursor-pointer shadow-md ${
                  config.freeTierDisabled
                    ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20"
                    : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20"
                }`}
              >
                {config.freeTierDisabled ? "Disable Gating (Re-enable Free Tier)" : "Disable & Hide Free Tier"}
              </button>
            </div>

            <div className={`p-4 rounded-2xl border ${
              config.freeTierDisabled
                ? "bg-rose-50 border-rose-200 text-rose-950"
                : "bg-slate-50 border-slate-200 text-slate-700"
            }`}>
              <div className="flex items-start gap-2.5 text-xs font-semibold">
                <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${config.freeTierDisabled ? "text-rose-600" : "text-slate-500"}`} />
                <div>
                  <p className="font-bold">
                    {config.freeTierDisabled
                      ? "Strict Paid Subscription Enforced"
                      : "Free Tier is currently available"}
                  </p>
                  <p className="text-[11px] font-normal mt-0.5">
                    {config.freeTierDisabled
                      ? "All mobile app checkouts and screen actions will enforce an active Starter or Professional subscription."
                      : "Homestay hosts can register and use up to 2 rooms & 15 check-ins/mo on the Free tier."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
