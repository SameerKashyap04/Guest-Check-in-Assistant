"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  Sliders,
  Crown,
  Check,
  Edit3,
  X,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  Save,
  ShieldCheck,
  Zap,
  Star,
  Building2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Percent,
  Tag,
  Calculator,
} from "lucide-react";
import { adminDataService } from "@/lib/adminDataService";

export interface FullPlanDefinition {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxRooms: string; // e.g., "10", "30", "Unlimited"
  maxCheckIns: string; // e.g., "20 / mo", "Unlimited"
  maxExports: string; // e.g., "5 / mo", "Unlimited"
  maxProperties: string; // e.g., "1", "10", "Unlimited"
  maxStaff: number;
  ocrScanning: boolean;
  cloudSync: boolean;
  backupRestore: boolean;
  prioritySupport: boolean;
  centralizedDashboard: boolean;
  isRecommended: boolean;
  isActive: boolean;
}

export interface BillingPeriodItem {
  months: 1 | 3 | 6 | 12;
  discountPercent: number;
  label: string;
  badgeText: string;
  isActive: boolean;
}

export const DEFAULT_BILLING_PERIODS: BillingPeriodItem[] = [
  { months: 1, discountPercent: 0, label: "1 Month", badgeText: "Standard", isActive: true },
  { months: 3, discountPercent: 5, label: "3 Months", badgeText: "Save 5%", isActive: true },
  { months: 6, discountPercent: 10, label: "6 Months", badgeText: "Save 10%", isActive: true },
  { months: 12, discountPercent: 15, label: "12 Months (Annual)", badgeText: "Best Value · Save 15%", isActive: true },
];

const DEFAULT_PLANS: FullPlanDefinition[] = [
  {
    id: "FREE",
    name: "Free",
    description: "Get started with basic guest management",
    monthlyPrice: 0,
    yearlyPrice: 0,
    maxRooms: "2",
    maxCheckIns: "15 / mo",
    maxExports: "3 / mo",
    maxProperties: "1",
    maxStaff: 0,
    ocrScanning: false,
    cloudSync: false,
    backupRestore: false,
    prioritySupport: false,
    centralizedDashboard: false,
    isRecommended: false,
    isActive: true,
  },
  {
    id: "STARTER",
    name: "Starter",
    description: "For boutique stays with AI OCR scanning",
    monthlyPrice: 349,
    yearlyPrice: 3499,
    maxRooms: "8",
    maxCheckIns: "100 / mo",
    maxExports: "10 / mo",
    maxProperties: "1",
    maxStaff: 0,
    ocrScanning: true,
    cloudSync: false,
    backupRestore: false,
    prioritySupport: false,
    centralizedDashboard: false,
    isRecommended: false,
    isActive: true,
  },
  {
    id: "PROFESSIONAL",
    name: "Professional",
    description: "For hotels & resorts with AI OCR, Cloud Sync & unlimited check-ins",
    monthlyPrice: 799,
    yearlyPrice: 7999,
    maxRooms: "25",
    maxCheckIns: "Unlimited",
    maxExports: "Unlimited",
    maxProperties: "1",
    maxStaff: 5,
    ocrScanning: true,
    cloudSync: true,
    backupRestore: true,
    prioritySupport: true,
    centralizedDashboard: false,
    isRecommended: true,
    isActive: true,
  },
  {
    id: "MULTI_PROPERTY",
    name: "Multi-Property",
    description: "Manage up to 10 properties with central dashboard",
    monthlyPrice: 1999,
    yearlyPrice: 19999,
    maxRooms: "30 / prop",
    maxCheckIns: "Unlimited",
    maxExports: "Unlimited",
    maxProperties: "10",
    maxStaff: 20,
    ocrScanning: true,
    cloudSync: true,
    backupRestore: true,
    prioritySupport: true,
    centralizedDashboard: true,
    isRecommended: false,
    isActive: true,
  },
];

export default function PlansPage() {
  const [plans, setPlans] = useState<FullPlanDefinition[]>(DEFAULT_PLANS);
  const [billingPeriods, setBillingPeriods] = useState<BillingPeriodItem[]>(DEFAULT_BILLING_PERIODS);
  const [editingPlan, setEditingPlan] = useState<FullPlanDefinition | null>(null);
  const [saveMsg, setSaveMsg] = useState("");
  const [periodsSaveMsg, setPeriodsSaveMsg] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncingFirestore, setIsSyncingFirestore] = useState(false);
  const [isSavingPeriods, setIsSavingPeriods] = useState(false);

  // Load from Firestore & fallback to LocalStorage
  useEffect(() => {
    async function loadPlansAndPeriods() {
      setIsSyncingFirestore(true);
      try {
        const docRef = doc(db, "system_config", "plan_matrix");
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data()?.plans) {
          setPlans(snap.data().plans);
        }
      } catch (e) {
        console.warn("Could not fetch plans from Firestore:", e);
      }

      try {
        const bpDocRef = doc(db, "system_config", "billing_periods");
        const bpSnap = await getDoc(bpDocRef);
        if (bpSnap.exists() && Array.isArray(bpSnap.data()?.periods)) {
          setBillingPeriods(bpSnap.data().periods);
        }
      } catch (e) {
        console.warn("Could not fetch billing periods from Firestore:", e);
      }

      // LocalStorage fallback
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("GUEST_CHECKIN_PLAN_MATRIX");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setPlans(parsed);
            }
          } catch (e) {
            console.warn("Failed to parse saved plans", e);
          }
        }
      }
      setIsSyncingFirestore(false);
    }

    loadPlansAndPeriods();
  }, []);

  const handleSaveBillingPeriods = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingPeriods(true);
    try {
      const bpDocRef = doc(db, "system_config", "billing_periods");
      await setDoc(bpDocRef, {
        periods: billingPeriods,
        updatedAt: new Date().toISOString(),
      });

      await adminDataService.logAudit({
        actor: "Admin (Sameer)",
        action: "BILLING_PERIODS_UPDATED",
        target: "system_config/billing_periods",
        details: `Updated duration discounts: 1M (0%), 3M (${billingPeriods.find(p=>p.months===3)?.discountPercent}%), 6M (${billingPeriods.find(p=>p.months===6)?.discountPercent}%), 12M (${billingPeriods.find(p=>p.months===12)?.discountPercent}%)`,
        category: "SYSTEM",
      });

      setPeriodsSaveMsg("Billing period discounts saved & synced live!");
      setTimeout(() => setPeriodsSaveMsg(""), 3500);
    } catch (err: any) {
      alert(`Failed to save billing periods: ${err.message}`);
    } finally {
      setIsSavingPeriods(false);
    }
  };

  // Save to LocalStorage & Firestore
  const persistPlans = async (updatedPlans: FullPlanDefinition[]) => {
    setPlans(updatedPlans);

    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("GUEST_CHECKIN_PLAN_MATRIX", JSON.stringify(updatedPlans));
    }

    // Save to Firestore for live sync with App and APIs
    try {
      const docRef = doc(db, "system_config", "plan_matrix");
      await setDoc(docRef, {
        plans: updatedPlans,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Firestore plan_matrix save notice:", e);
    }
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    let updated: FullPlanDefinition[];
    if (isCreating) {
      updated = [...plans, editingPlan];
    } else {
      updated = plans.map((p) => (p.id === editingPlan.id ? editingPlan : p));
    }

    persistPlans(updated);
    setSaveMsg(`Plan "${editingPlan.name}" saved successfully!`);
    setTimeout(() => {
      setSaveMsg("");
      setEditingPlan(null);
      setIsCreating(false);
    }, 1000);
  };

  const handleDeletePlan = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the "${name}" plan tier?`)) {
      const updated = plans.filter((p) => p.id !== id);
      persistPlans(updated);
    }
  };

  const handleResetDefaults = () => {
    if (confirm("Reset all Plan Matrix tiers to default factory configuration?")) {
      persistPlans(DEFAULT_PLANS);
    }
  };

  const handleAddNewPlan = () => {
    const newId = `CUSTOM_${Date.now()}`;
    const newPlan: FullPlanDefinition = {
      id: newId,
      name: "Enterprise Custom",
      description: "Custom tailored enterprise plan",
      monthlyPrice: 2999,
      yearlyPrice: 29999,
      maxRooms: "Unlimited",
      maxCheckIns: "Unlimited",
      maxExports: "Unlimited",
      maxProperties: "Unlimited",
      maxStaff: 50,
      ocrScanning: true,
      cloudSync: true,
      backupRestore: true,
      prioritySupport: true,
      centralizedDashboard: true,
      isRecommended: false,
      isActive: true,
    };
    setIsCreating(true);
    setEditingPlan(newPlan);
  };

  const toggleFeatureFlag = (planId: string, featureKey: keyof FullPlanDefinition) => {
    const updated = plans.map((p) => {
      if (p.id === planId) {
        return { ...p, [featureKey]: !p[featureKey] };
      }
      return p;
    });
    persistPlans(updated);
  };

  return (
    <AdminLayout>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Plan & Pricing Matrix</span>
            <span className="text-xs bg-violet-50 text-violet-700 px-2.5 py-0.5 rounded-full font-bold border border-violet-200">
              FULLY EDITABLE
            </span>
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Configure subscription tiers, feature flags, limits, and pricing in real time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetDefaults}
            className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            title="Reset to Factory Defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleAddNewPlan}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Tier</span>
          </button>
        </div>
      </div>

      {/* Plan Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {plans.map((p) => (
          <div
            key={p.id}
            className={`bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative ${
              p.isRecommended ? "border-violet-400 ring-2 ring-violet-400/20" : "border-slate-200/90"
            }`}
          >
            <div>
              {/* Badges Header */}
              <div className="flex items-center justify-between gap-2 mb-3">
                {p.isRecommended ? (
                  <button
                    onClick={() => toggleFeatureFlag(p.id, "isRecommended")}
                    title="Click to remove Recommended badge"
                    className="text-[10px] font-black text-white bg-violet-600 hover:bg-violet-700 px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 uppercase tracking-wider cursor-pointer transition-all"
                  >
                    <Star className="w-3 h-3 fill-white" /> Recommended
                  </button>
                ) : (
                  <button
                    onClick={() => toggleFeatureFlag(p.id, "isRecommended")}
                    title="Click to set as Recommended plan"
                    className="text-[10px] font-extrabold text-slate-500 hover:text-violet-700 bg-slate-100 hover:bg-violet-50 px-2 py-0.5 rounded-md uppercase cursor-pointer transition-all flex items-center gap-1"
                  >
                    <Star className="w-3 h-3 text-slate-400" /> Tier
                  </button>
                )}

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleFeatureFlag(p.id, "isActive")}
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border cursor-pointer ${
                      p.isActive
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {p.isActive ? "ACTIVE" : "HIDDEN"}
                  </button>
                  <button
                    onClick={() => handleDeletePlan(p.id, p.name)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                    title="Delete Plan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="text-lg font-black text-slate-900">{p.name}</h3>
              <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{p.description}</p>

              {/* Pricing Display */}
              <div className="my-4 py-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900">
                    {p.monthlyPrice === 0 ? "Free" : `₹${p.monthlyPrice.toLocaleString()}`}
                  </span>
                  {p.monthlyPrice > 0 && <span className="text-xs text-slate-500 font-bold">/ mo</span>}
                </div>
                {p.yearlyPrice > 0 && (
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    ₹{p.yearlyPrice.toLocaleString()} billed yearly (₹{Math.round(p.yearlyPrice / 12)}/mo)
                  </p>
                )}
              </div>

              {/* Limits Matrix */}
              <div className="space-y-2 py-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Max Rooms</span>
                  <span className="font-bold text-slate-900">{p.maxRooms}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Monthly Check-ins</span>
                  <span className="font-bold text-slate-900">{p.maxCheckIns}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Monthly Exports</span>
                  <span className="font-bold text-slate-900">{p.maxExports}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Max Staff Accounts</span>
                  <span className="font-bold text-slate-900">{p.maxStaff === 0 ? "None" : p.maxStaff}</span>
                </div>
              </div>

              {/* Feature Toggles List */}
              <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                <button
                  onClick={() => toggleFeatureFlag(p.id, "ocrScanning")}
                  className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    p.ocrScanning ? "bg-violet-50/80 border-violet-200 text-violet-900" : "bg-slate-50 border-slate-200 text-slate-400"
                  }`}
                >
                  <span className="font-bold text-[11px]">OCR ID Scanning</span>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${p.ocrScanning ? "bg-violet-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                    {p.ocrScanning ? "ON" : "OFF"}
                  </span>
                </button>

                <button
                  onClick={() => toggleFeatureFlag(p.id, "cloudSync")}
                  className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    p.cloudSync ? "bg-violet-50/80 border-violet-200 text-violet-900" : "bg-slate-50 border-slate-200 text-slate-400"
                  }`}
                >
                  <span className="font-bold text-[11px]">Cloud Mode (Sync)</span>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${p.cloudSync ? "bg-violet-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                    {p.cloudSync ? "ON" : "OFF"}
                  </span>
                </button>

                <button
                  onClick={() => toggleFeatureFlag(p.id, "backupRestore")}
                  className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    p.backupRestore ? "bg-violet-50/80 border-violet-200 text-violet-900" : "bg-slate-50 border-slate-200 text-slate-400"
                  }`}
                >
                  <span className="font-bold text-[11px]">Backup & Restore</span>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${p.backupRestore ? "bg-violet-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                    {p.backupRestore ? "ON" : "OFF"}
                  </span>
                </button>

                <button
                  onClick={() => toggleFeatureFlag(p.id, "prioritySupport")}
                  className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    p.prioritySupport ? "bg-violet-50/80 border-violet-200 text-violet-900" : "bg-slate-50 border-slate-200 text-slate-400"
                  }`}
                >
                  <span className="font-bold text-[11px]">Priority Support</span>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${p.prioritySupport ? "bg-violet-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                    {p.prioritySupport ? "ON" : "OFF"}
                  </span>
                </button>
              </div>
            </div>

            {/* Edit Button */}
            <button
              onClick={() => {
                setIsCreating(false);
                setEditingPlan({ ...p });
              }}
              className="mt-6 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit All Fields</span>
            </button>
          </div>
        ))}
      </div>

      {/* BILLING PERIODS & DURATION DISCOUNTS CARD */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm mb-10 relative overflow-hidden">
        {/* Toast confirmation for duration discounts */}
        {periodsSaveMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{periodsSaveMsg}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Billing Periods &amp; Duration Discounts
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Configure upfront discounts (e.g. 3M, 6M, 12M) applied automatically at checkout across all paid tiers.
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveBillingPeriods}
            disabled={isSavingPeriods}
            className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <Save className="w-4 h-4" />
            <span>{isSavingPeriods ? "Saving..." : "Save Duration Discounts"}</span>
          </button>
        </div>

        {/* 4 Duration Discount Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          {billingPeriods.map((bp, idx) => {
            const starterPlan = plans.find((p) => p.id === "STARTER") || DEFAULT_PLANS[1];
            const proPlan = plans.find((p) => p.id === "PROFESSIONAL") || DEFAULT_PLANS[2];
            const starterBase = starterPlan.monthlyPrice * bp.months;
            const starterDiscounted = Math.round(starterBase * (1 - bp.discountPercent / 100));
            const proBase = proPlan.monthlyPrice * bp.months;
            const proDiscounted = Math.round(proBase * (1 - bp.discountPercent / 100));

            return (
              <div
                key={bp.months}
                className={`border rounded-2xl p-5 transition-all flex flex-col justify-between ${
                  bp.isActive
                    ? "bg-slate-50/60 border-slate-200/90 shadow-xs"
                    : "bg-slate-100/50 border-slate-200 opacity-60"
                }`}
              >
                <div>
                  {/* Top Pill / Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-violet-600" /> {bp.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const copy = [...billingPeriods];
                        copy[idx].isActive = !copy[idx].isActive;
                        setBillingPeriods(copy);
                      }}
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full border cursor-pointer ${
                        bp.isActive
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "bg-slate-200 text-slate-600 border-slate-300"
                      }`}
                    >
                      {bp.isActive ? "ACTIVE" : "DISABLED"}
                    </button>
                  </div>

                  {/* Discount Percentage Input */}
                  <div className="mb-3">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Discount Percentage
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="80"
                        disabled={!bp.isActive || bp.months === 1}
                        value={bp.discountPercent}
                        onChange={(e) => {
                          const copy = [...billingPeriods];
                          copy[idx].discountPercent = Math.max(0, Math.min(80, Number(e.target.value)));
                          setBillingPeriods(copy);
                        }}
                        className={`w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-slate-900 pr-8 focus:outline-none focus:border-violet-600 shadow-xs ${
                          bp.months === 1 ? "bg-slate-100 text-slate-400 cursor-not-allowed" : ""
                        }`}
                      />
                      <span className="absolute right-3 top-2.5 font-black text-xs text-slate-400">%</span>
                    </div>
                  </div>

                  {/* Badge Text Input */}
                  <div className="mb-4">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Checkout Badge Tag
                    </label>
                    <input
                      type="text"
                      disabled={!bp.isActive}
                      value={bp.badgeText || ""}
                      onChange={(e) => {
                        const copy = [...billingPeriods];
                        copy[idx].badgeText = e.target.value;
                        setBillingPeriods(copy);
                      }}
                      placeholder="e.g. Save 15%"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-violet-600 shadow-xs"
                    />
                  </div>
                </div>

                {/* Real-Time Live Calculation Preview */}
                <div className="pt-3 border-t border-slate-200/80 text-[11px] space-y-1 bg-white/70 rounded-xl p-2.5">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <Calculator className="w-3 h-3 text-violet-500" /> Live Plan Cost Preview
                  </div>
                  <div className="flex justify-between items-center text-slate-600 font-medium">
                    <span>Starter ({bp.months}M):</span>
                    <span className="font-bold text-slate-900">
                      ₹{starterDiscounted.toLocaleString("en-IN")}
                      {bp.discountPercent > 0 && (
                        <span className="text-[10px] text-slate-400 line-through ml-1">₹{starterBase}</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 font-medium">
                    <span>Pro ({bp.months}M):</span>
                    <span className="font-bold text-slate-900">
                      ₹{proDiscounted.toLocaleString("en-IN")}
                      {bp.discountPercent > 0 && (
                        <span className="text-[10px] text-slate-400 line-through ml-1">₹{proBase}</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-violet-50/80 border border-violet-100 rounded-2xl p-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-violet-900 font-semibold">
            <Sparkles className="w-4 h-4 text-violet-600 shrink-0" />
            <span>Duration discounts update immediately on Devify Pay checkout for both 1-Month, 3-Months, 6-Months, and Annual (12-Months) orders.</span>
          </div>
          <button
            onClick={handleSaveBillingPeriods}
            disabled={isSavingPeriods}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold shadow-xs transition-all cursor-pointer shrink-0 ml-4"
          >
            {isSavingPeriods ? "Saving..." : "Save Now"}
          </button>
        </div>
      </div>

      {/* FULLY EDITABLE MODAL */}
      {editingPlan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center text-violet-700">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {isCreating ? "Create New Subscription Plan" : `Edit "${editingPlan.name}" Tier`}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Modify prices, limits, entitlements, and feature flags.</p>
                </div>
              </div>
              <button
                onClick={() => setEditingPlan(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {saveMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{saveMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleSaveModal} className="space-y-4 text-xs">
                {/* Plan ID & Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Plan Identifier (Key)</label>
                    <input
                      type="text"
                      value={editingPlan.id}
                      onChange={(e) => setEditingPlan({ ...editingPlan, id: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold uppercase"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Plan Display Name</label>
                    <input
                      type="text"
                      value={editingPlan.name}
                      onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold"
                      required
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Plan Description</label>
                  <input
                    type="text"
                    value={editingPlan.description}
                    onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium"
                    required
                  />
                </div>

                {/* Monthly & Yearly Prices */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Monthly Price (₹)</label>
                    <input
                      type="number"
                      value={editingPlan.monthlyPrice}
                      onChange={(e) => setEditingPlan({ ...editingPlan, monthlyPrice: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-extrabold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Yearly Price (₹)</label>
                    <input
                      type="number"
                      value={editingPlan.yearlyPrice}
                      onChange={(e) => setEditingPlan({ ...editingPlan, yearlyPrice: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-extrabold"
                      required
                    />
                  </div>
                </div>

                {/* Room & Check-in Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Max Rooms per Property</label>
                    <input
                      type="text"
                      value={editingPlan.maxRooms}
                      onChange={(e) => setEditingPlan({ ...editingPlan, maxRooms: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold"
                      placeholder="e.g. 10 or Unlimited"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Monthly Check-in Limit</label>
                    <input
                      type="text"
                      value={editingPlan.maxCheckIns}
                      onChange={(e) => setEditingPlan({ ...editingPlan, maxCheckIns: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold"
                      placeholder="e.g. 20 / mo or Unlimited"
                    />
                  </div>
                </div>

                {/* Export & Property Limits */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Max Properties</label>
                    <input
                      type="text"
                      value={editingPlan.maxProperties}
                      onChange={(e) => setEditingPlan({ ...editingPlan, maxProperties: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Max Exports</label>
                    <input
                      type="text"
                      value={editingPlan.maxExports}
                      onChange={(e) => setEditingPlan({ ...editingPlan, maxExports: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Staff Accounts</label>
                    <input
                      type="number"
                      value={editingPlan.maxStaff}
                      onChange={(e) => setEditingPlan({ ...editingPlan, maxStaff: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold"
                    />
                  </div>
                </div>

                {/* Feature Checkboxes & Badges */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <span className="block font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">
                    Features & Tier Badges
                  </span>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingPlan.ocrScanning}
                        onChange={(e) => setEditingPlan({ ...editingPlan, ocrScanning: e.target.checked })}
                        className="rounded text-violet-600 focus:ring-violet-500"
                      />
                      <span className="font-bold text-slate-700">OCR ID Scanning</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingPlan.cloudSync}
                        onChange={(e) => setEditingPlan({ ...editingPlan, cloudSync: e.target.checked })}
                        className="rounded text-violet-600 focus:ring-violet-500"
                      />
                      <span className="font-bold text-slate-700">Cloud Mode (Sync)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingPlan.backupRestore}
                        onChange={(e) => setEditingPlan({ ...editingPlan, backupRestore: e.target.checked })}
                        className="rounded text-violet-600 focus:ring-violet-500"
                      />
                      <span className="font-bold text-slate-700">Backup & Restore</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingPlan.prioritySupport}
                        onChange={(e) => setEditingPlan({ ...editingPlan, prioritySupport: e.target.checked })}
                        className="rounded text-violet-600 focus:ring-violet-500"
                      />
                      <span className="font-bold text-slate-700">Priority Support</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingPlan.centralizedDashboard}
                        onChange={(e) => setEditingPlan({ ...editingPlan, centralizedDashboard: e.target.checked })}
                        className="rounded text-violet-600 focus:ring-violet-500"
                      />
                      <span className="font-bold text-slate-700">Central Dashboard</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-violet-50 border border-violet-200 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingPlan.isRecommended}
                        onChange={(e) => setEditingPlan({ ...editingPlan, isRecommended: e.target.checked })}
                        className="rounded text-violet-600 focus:ring-violet-500"
                      />
                      <span className="font-bold text-violet-900">Recommended Badge</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingPlan.isActive}
                        onChange={(e) => setEditingPlan({ ...editingPlan, isActive: e.target.checked })}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="font-bold text-emerald-900">Active Visibility</span>
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingPlan(null)}
                    className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-violet-600 text-white font-extrabold rounded-xl hover:bg-violet-700 shadow-md shadow-violet-500/20 flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Plan Configuration</span>
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

