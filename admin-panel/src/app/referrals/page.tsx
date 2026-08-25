"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Gift, Users, TrendingUp, CheckCircle2, Clock, DollarSign,
  Share2, Save, Sparkles, Settings, ArrowRight, ShieldCheck
} from "lucide-react";
import { adminDataService } from "@/lib/adminDataService";

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [referrerReward, setReferrerReward] = useState(100);
  const [friendDiscount, setFriendDiscount] = useState(100);
  const [programActive, setProgramActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    // 1. Subscribe to live referrals
    const unsub = adminDataService.subscribeReferrals((data) => {
      setReferrals(data);
    });

    // 2. Load referral program config
    adminDataService.getReferralConfig().then((cfg) => {
      if (cfg) {
        if (cfg.referrerRewardAmount !== undefined) setReferrerReward(cfg.referrerRewardAmount);
        if (cfg.friendDiscountAmount !== undefined) setFriendDiscount(cfg.friendDiscountAmount);
        if (cfg.isActive !== undefined) setProgramActive(cfg.isActive);
      }
    });

    return () => unsub();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await adminDataService.updateReferralConfig({
        referrerRewardAmount: Number(referrerReward),
        friendDiscountAmount: Number(friendDiscount),
        isActive: programActive,
      });

      await adminDataService.logAudit({
        actor: "Admin (Sameer)",
        action: "REFERRAL_CONFIG_UPDATED",
        target: "system_config/referrals",
        details: `Updated referral reward: ₹${referrerReward}, friend discount: ₹${friendDiscount}`,
        category: "SYSTEM",
      });

      showToast("Refer & Earn settings saved successfully!");
    } catch (e: any) {
      alert(`Failed to save settings: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const totalReferrals = referrals.length;
  const successfulReferrals = referrals.filter((r) => r.status === "SUCCESSFUL").length;
  const pendingReferrals = referrals.filter((r) => r.status === "PENDING").length;
  const totalRewardsIssued = successfulReferrals * referrerReward;
  const conversionRate =
    totalReferrals > 0 ? ((successfulReferrals / totalReferrals) * 100).toFixed(1) : "0.0";

  return (
    <AdminLayout>
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Gift className="w-6 h-6 text-violet-600" />
            <span>Refer & Earn Program Management</span>
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Configure host referral rewards, friend signup discounts, and monitor platform viral growth.
          </p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Invites</p>
          <p className="text-2xl font-black text-slate-900 mt-2">{totalReferrals}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">Referral codes applied</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Paid Conversions</p>
          <p className="text-2xl font-black text-emerald-600 mt-2">{successfulReferrals}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">Upgraded to paid subscription</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rewards Distributed</p>
          <p className="text-2xl font-black text-violet-700 mt-2">₹ {totalRewardsIssued.toLocaleString("en-IN")}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">Credited to host wallets</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Conversion Rate</p>
          <p className="text-2xl font-black text-slate-900 mt-2">{conversionRate}%</p>
          <p className="text-xs text-slate-500 font-medium mt-1">{pendingReferrals} invites pending upgrade</p>
        </div>
      </div>

      {/* PROGRAM CONFIGURATION CARD */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm mb-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600 border border-violet-200">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Referral Program Rules & Values</h2>
              <p className="text-xs text-slate-500 font-medium">Set how much credit referrers earn and how much discount referees get.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Program Status:</span>
            <button
              type="button"
              onClick={() => setProgramActive(!programActive)}
              className={`px-3 py-1 rounded-full text-xs font-extrabold transition-all ${
                programActive
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              {programActive ? "ACTIVE" : "PAUSED"}
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Referrer Reward (StayMate Credits)
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Credits awarded to the referrer ONLY when their referee friend purchases a paid subscription plan (Free signups remain Pending with 0 credits).
            </p>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 font-bold text-slate-500">₹</span>
              <input
                type="number"
                min="0"
                value={referrerReward}
                onChange={(e) => setReferrerReward(Number(e.target.value))}
                required
                className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-violet-600 shadow-xs"
              />
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Referee Friend Instant Discount
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Instant discount applied on the newly invited friend&apos;s first paid subscription checkout.
            </p>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 font-bold text-slate-500">₹</span>
              <input
                type="number"
                min="0"
                value={friendDiscount}
                onChange={(e) => setFriendDiscount(Number(e.target.value))}
                required
                className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-violet-600 shadow-xs"
              />
            </div>
          </div>

          <div className="md:col-span-2 flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400 font-medium">
              Synchronized with <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">/api/referrals/apply</code> on mobile app
            </span>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Saving Settings..." : "Save Program Settings"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* REFERRAL NETWORK LEDGER TABLE */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 text-sm">Live Referral Activity Ledger</h3>
          <span className="text-xs text-slate-400 font-medium">Real-time invitations & conversions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500 border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Referral Code</th>
                <th className="px-6 py-4">Referrer User</th>
                <th className="px-6 py-4">Referred Host</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Reward Amount</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {referrals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <Share2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-800 text-sm mb-1">No referrals recorded yet</p>
                    <p className="text-xs text-slate-400">When hosts share their code via the mobile app &quot;Refer & Earn&quot; page, logs appear here.</p>
                  </td>
                </tr>
              ) : (
                referrals.map((r, i) => (
                  <tr key={r.id || i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-violet-700">{r.referralCode || "STAYMATE"}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{r.referrerUserId || "Host"}</td>
                    <td className="px-6 py-4 font-medium text-slate-700">{r.referredUserIdentifier || r.referredUserId || "New Homestay"}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                          r.status === "SUCCESSFUL"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : "bg-amber-100 text-amber-800 border-amber-200"
                        }`}
                      >
                        {r.status || "PENDING"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-extrabold text-emerald-600">
                      ₹ {r.rewardAmount || referrerReward}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB") : "Recent"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
