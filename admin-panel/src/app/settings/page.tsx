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
  ShieldAlert,
  Plus,
  Trash2,
  Database
} from "lucide-react";
import { adminDataService, AdminAppConfig, AdminAuthConfig } from "@/lib/adminDataService";
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

  // Authorized Google Accounts
  const [googleEmails, setGoogleEmails] = useState<string[]>([
    "dev@company.com",
    "sameerkashyap04@gmail.com",
    "admin@staymate.co",
  ]);
  const [newGoogleEmail, setNewGoogleEmail] = useState("");

  // App & Security Config
  const [config, setConfig] = useState<AdminAppConfig>({
    freeTierDisabled: false,
    maintenanceMode: false,
    defaultPiiMasking: false,
    require2fa: true,
    adminUsername: "superadmin",
    adminEmail: "dev@company.com",
  });

  const [authConfig, setAuthConfig] = useState<AdminAuthConfig>({
    adminEmail: "dev@company.com",
    adminUsername: "superadmin",
    adminPassword: "StayMateAdmin2026!",
    allowedGoogleEmails: ["dev@company.com", "sameerkashyap04@gmail.com", "admin@staymate.co"],
    masterOtp: "784144",
    require2fa: true,
  });
  const [masterOtpInput, setMasterOtpInput] = useState("784144");

  useEffect(() => {
    // Load both app config and auth config from Firestore
    adminDataService.getAppConfig().then((cfg) => {
      setConfig(cfg);
      if (cfg.adminUsername) setUsername(cfg.adminUsername);
      if (cfg.adminEmail) setEmail(cfg.adminEmail);
    });

    adminDataService.getAdminAuth().then((authCfg) => {
      setAuthConfig(authCfg);
      if (authCfg.adminUsername) setUsername(authCfg.adminUsername);
      if (authCfg.adminEmail) setEmail(authCfg.adminEmail);
      if (authCfg.allowedGoogleEmails) setGoogleEmails(authCfg.allowedGoogleEmails);
      if (authCfg.masterOtp) setMasterOtpInput(authCfg.masterOtp);
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
      await adminDataService.saveAdminAuth({
        adminUsername: username,
        adminEmail: email,
      });

      await adminDataService.saveAppConfig({
        adminUsername: username,
        adminEmail: email,
      });

      await addDoc(collection(db, "audit_logs"), {
        actor: "Super Admin",
        action: "ADMIN_PROFILE_UPDATED",
        target: username,
        details: `Updated Super Admin profile in Firestore (Email: ${email})`,
        timestamp: new Date().toISOString(),
        category: "SECURITY",
      });

      notifySuccess("Super Admin profile saved to Firestore successfully!");
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
      await adminDataService.saveAdminAuth({
        adminPassword: newPassword,
      });

      await addDoc(collection(db, "audit_logs"), {
        actor: "Super Admin",
        action: "ADMIN_PASSWORD_CHANGED",
        target: username,
        details: `Super Admin master password changed in Firestore`,
        timestamp: new Date().toISOString(),
        category: "SECURITY",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      notifySuccess("Master password updated in Firestore successfully!");
    } catch (e: any) {
      console.warn("Change password error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddGoogleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newGoogleEmail.trim().toLowerCase();
    if (!clean || !clean.includes("@")) return;

    if (googleEmails.includes(clean)) {
      alert("This Google account is already authorized.");
      return;
    }

    const updated = [...googleEmails, clean];
    setGoogleEmails(updated);
    setNewGoogleEmail("");

    await adminDataService.saveAdminAuth({
      allowedGoogleEmails: updated,
    });

    notifySuccess(`Added ${clean} to authorized Super Admins!`);
  };

  const handleRemoveGoogleEmail = async (emailToRemove: string) => {
    const updated = googleEmails.filter((e) => e !== emailToRemove);
    setGoogleEmails(updated);

    await adminDataService.saveAdminAuth({
      allowedGoogleEmails: updated,
    });

    notifySuccess(`Removed ${emailToRemove} from authorized Super Admins.`);
  };

  const handleToggleFreeTier = async () => {
    const nextState = !config.freeTierDisabled;
    const updated = { ...config, freeTierDisabled: nextState };
    setConfig(updated);

    try {
      await adminDataService.saveAppConfig({ freeTierDisabled: nextState });

      // Mirror to plan_matrix in Firestore so mobile app updates immediately
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
    const nextState = !authConfig.require2fa;
    setAuthConfig((prev) => ({ ...prev, require2fa: nextState }));
    await adminDataService.saveAdminAuth({ require2fa: nextState });
    await adminDataService.saveAppConfig({ require2fa: nextState });
    notifySuccess(`Two-Factor Authentication ${nextState ? "Enabled" : "Disabled"}`);
  };

  const handleSaveMasterOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = masterOtpInput.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      alert("Master OTP must be at least 6 digits.");
      return;
    }

    setAuthConfig((prev) => ({ ...prev, masterOtp: cleanOtp }));
    await adminDataService.saveAdminAuth({ masterOtp: cleanOtp });
    notifySuccess(`Master OTP updated to ${cleanOtp} in Firestore!`);
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
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full border border-violet-300 flex items-center gap-1">
              <Database className="w-3 h-3" /> Firestore Backed
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">System &amp; Admin Settings</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Configure Super Admin credentials, password, authorized Google accounts, and app-wide subscription gating in Firestore.
          </p>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 mb-8 pb-3">
        {[
          { key: "GENERAL", label: "Super Admin Profile", icon: User },
          { key: "SECURITY", label: "Firestore Auth, Password & Google", icon: ShieldCheck },
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
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900">Super Admin Account Details</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Saved directly to Firestore (<code className="font-mono text-violet-700 bg-violet-50 px-1 rounded">system_config/admin_auth</code>).
              </p>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Live Synced
            </span>
          </div>

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
                2FA OTP security codes and platform notifications will be dispatched here.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={isLoading}
                className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Profile to Firestore</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: SECURITY & FIRESTORE AUTH */}
      {activeTab === "SECURITY" && (
        <div className="space-y-6 max-w-2xl">
          {/* Change Password Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
            <h2 className="text-base font-black text-slate-900 mb-1 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-violet-600" />
              <span>Change Master Password (Firestore)</span>
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Update the master authentication password stored in Firestore (<code className="font-mono text-violet-700 bg-violet-50 px-1 rounded">system_config/admin_auth</code>).
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
                  <span>Update Password in Firestore</span>
                </button>
              </div>
            </form>
          </div>

          {/* Authorized Google Accounts */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
            <h2 className="text-base font-black text-slate-900 mb-1 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Authorized Google Sign-In Accounts (Firestore)</span>
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Google accounts permitted to authenticate into the Super-Admin portal via 1-click Google Sign-In.
            </p>

            <div className="space-y-2 mb-4">
              {googleEmails.map((gEmail) => (
                <div
                  key={gEmail}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                >
                  <span className="font-mono">{gEmail}</span>
                  {googleEmails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveGoogleEmail(gEmail)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      title="Remove account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleAddGoogleEmail} className="flex gap-2">
              <input
                type="email"
                placeholder="Add new Google email (e.g. admin@gmail.com)..."
                value={newGoogleEmail}
                onChange={(e) => setNewGoogleEmail(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-violet-600 focus:bg-white"
              />
              <button
                type="submit"
                className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Account</span>
              </button>
            </form>
          </div>

          {/* 2FA Security Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-5">
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
                  authConfig.require2fa
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-slate-100 text-slate-600 border border-slate-300"
                }`}
              >
                {authConfig.require2fa ? "✓ 2FA ENABLED" : "2FA DISABLED"}
              </button>
            </div>

            {/* Master Bypass OTP */}
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Master Security Bypass OTP (Firestore)
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Emergency 6-digit bypass code for Super-Admin access without email delays.
              </p>
              <form onSubmit={handleSaveMasterOtp} className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={masterOtpInput}
                  onChange={(e) => setMasterOtpInput(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="784144"
                  className="w-40 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-mono text-sm font-bold text-slate-900 focus:outline-none focus:border-violet-600 focus:bg-white"
                />
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Master OTP</span>
                </button>
              </form>
            </div>
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
