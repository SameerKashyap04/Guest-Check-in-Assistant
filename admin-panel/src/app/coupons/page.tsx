"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Tag, Plus, Search, CheckCircle2, XCircle, Trash2, Edit3,
  Calendar, Percent, DollarSign, ShieldCheck, AlertCircle, Copy, Check
} from "lucide-react";
import { adminDataService } from "@/lib/adminDataService";

const C = {
  primary: "#ff385c",
  ink: "#222222",
  body: "#3f3f3f",
  muted: "#6a6a6a",
  canvas: "#ffffff",
  soft: "#f7f7f7",
  hairline: "#dddddd",
  hairlineSoft: "#ebebeb",
};

interface CouponItem {
  id?: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  minimum_amount: number;
  maximum_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  valid_until?: string;
  description?: string;
  applicable_plan?: string[];
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState("");

  // Form State
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState(20);
  const [minAmount, setMinAmount] = useState(0);
  const [maxDiscount, setMaxDiscount] = useState<number | "">(500);
  const [usageLimit, setUsageLimit] = useState<number | "">(100);
  const [validUntil, setValidUntil] = useState("2026-12-31");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsub = adminDataService.subscribeCoupons((data) => {
      setCoupons(data);
    });
    return () => unsub();
  }, []);

  const filteredCoupons = coupons.filter((c) =>
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const handleCopy = (couponCode: string) => {
    navigator.clipboard.writeText(couponCode);
    setCopiedCode(couponCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggle = async (couponCode: string, currentStatus: boolean) => {
    try {
      await adminDataService.toggleCoupon(couponCode, !currentStatus);
      showToast(`Coupon ${couponCode} ${!currentStatus ? "activated" : "deactivated"}`);
      await adminDataService.logAudit({
        actor: "Admin (Sameer)",
        action: !currentStatus ? "COUPON_ACTIVATED" : "COUPON_DEACTIVATED",
        target: couponCode,
        details: `Toggled coupon status to ${!currentStatus ? "Active" : "Inactive"}`,
        category: "SYSTEM",
      });
    } catch (e: any) {
      alert(`Error updating coupon: ${e.message}`);
    }
  };

  const handleDelete = async (couponCode: string) => {
    if (!confirm(`Are you sure you want to delete coupon ${couponCode}?`)) return;
    try {
      await adminDataService.deleteCoupon(couponCode);
      showToast(`Coupon ${couponCode} deleted`);
      await adminDataService.logAudit({
        actor: "Admin (Sameer)",
        action: "COUPON_DELETED",
        target: couponCode,
        details: `Deleted coupon ${couponCode}`,
        category: "SYSTEM",
      });
    } catch (e: any) {
      alert(`Error deleting coupon: ${e.message}`);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      alert("Please enter a coupon code");
      return;
    }

    setIsSubmitting(true);
    try {
      const newCoupon = {
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: Number(discountValue),
        minimum_amount: Number(minAmount) || 0,
        maximum_discount: maxDiscount ? Number(maxDiscount) : null,
        usage_limit: usageLimit ? Number(usageLimit) : null,
        used_count: 0,
        valid_from: new Date().toISOString(),
        valid_until: new Date(validUntil || "2026-12-31").toISOString(),
        per_user_limit: 1,
        is_active: true,
        description: description.trim() || `Special discount coupon ${code.toUpperCase()}`,
        applicable_plan: ["STARTER", "PROFESSIONAL", "MULTI_PROPERTY"],
      };

      await adminDataService.createCoupon(newCoupon);
      await adminDataService.logAudit({
        actor: "Admin (Sameer)",
        action: "COUPON_CREATED",
        target: newCoupon.code,
        details: `Created coupon ${newCoupon.code} (${discountValue}${discountType === "percentage" ? "%" : "₹"} OFF)`,
        category: "SYSTEM",
      });

      showToast(`Coupon ${newCoupon.code} created successfully!`);
      setShowCreateModal(false);
      // Reset form
      setCode("");
      setDescription("");
    } catch (e: any) {
      alert(`Error creating coupon: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter(c => c.is_active).length;
  const totalRedemptions = coupons.reduce((acc, c) => acc + (c.used_count || 0), 0);

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
            <Tag className="w-6 h-6 text-violet-600" />
            <span>Coupons & Promo Codes</span>
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Create discount codes, set usage limits, and monitor redemptions in real-time.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Coupon</span>
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Coupons</p>
          <p className="text-2xl font-black text-slate-900 mt-2">{totalCoupons}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">{activeCoupons} currently active</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Redemptions</p>
          <p className="text-2xl font-black text-emerald-600 mt-2">{totalRedemptions}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">Used during checkout by hosts</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">API Validation Status</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <p className="text-sm font-bold text-slate-900">/api/coupons/validate Active</p>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">Directly integrated with mobile app checkout</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search coupon code or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-600 shadow-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500 border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Coupon Code</th>
                <th className="px-6 py-4">Discount</th>
                <th className="px-6 py-4">Min. Spend</th>
                <th className="px-6 py-4">Redemptions</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <Tag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-800 text-sm mb-1">No coupons found</p>
                    <p className="text-xs text-slate-400">Click &quot;Create New Coupon&quot; to offer promo codes to property owners.</p>
                  </td>
                </tr>
              ) : (
                filteredCoupons.map((coupon) => (
                  <tr key={coupon.code} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-slate-900 bg-violet-50 text-violet-700 px-2.5 py-1 rounded-lg border border-violet-200 text-xs">
                          {coupon.code}
                        </span>
                        <button
                          onClick={() => handleCopy(coupon.code)}
                          title="Copy Code"
                          className="text-slate-400 hover:text-slate-700 p-1"
                        >
                          {copiedCode === coupon.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      {coupon.description && (
                        <p className="text-xs text-slate-500 mt-1">{coupon.description}</p>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900">
                        {coupon.discount_type === "percentage"
                          ? `${coupon.discount_value}% OFF`
                          : `₹ ${coupon.discount_value} FLAT OFF`}
                      </span>
                      {coupon.maximum_discount && coupon.discount_type === "percentage" && (
                        <p className="text-[11px] text-slate-400">Max ₹{coupon.maximum_discount}</p>
                      )}
                    </td>

                    <td className="px-6 py-4 font-medium text-slate-600">
                      {coupon.minimum_amount > 0 ? `₹ ${coupon.minimum_amount}` : "No minimum"}
                    </td>

                    <td className="px-6 py-4">
                      <span className="font-extrabold text-emerald-600">{coupon.used_count || 0}</span>
                      <span className="text-slate-400 text-xs font-normal">
                        {" "}
                        / {coupon.usage_limit ? coupon.usage_limit : "∞"}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                          coupon.is_active
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {coupon.is_active ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggle(coupon.code, coupon.is_active)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            coupon.is_active
                              ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {coupon.is_active ? "Disable" : "Enable"}
                        </button>

                        <button
                          onClick={() => handleDelete(coupon.code)}
                          title="Delete Coupon"
                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE NEW COUPON MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Tag className="w-5 h-5 text-violet-600" />
                <span>Create New Coupon</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Coupon Code (Uppercase)</label>
                <input
                  type="text"
                  placeholder="e.g. WELCOME50, HOMESTAY20"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                  className="w-full font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-violet-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e: any) => setDiscountType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-violet-600 font-semibold"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Flat Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Discount Value</label>
                  <input
                    type="number"
                    min="1"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-violet-600 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Min. Spend (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 for none"
                    value={minAmount}
                    onChange={(e) => setMinAmount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-violet-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max Discount (₹)</label>
                  <input
                    type="number"
                    placeholder="Leave empty for uncapped"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-violet-600 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Usage Limit (Max Uses)</label>
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-violet-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-violet-600 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description / Campaign Note</label>
                <input
                  type="text"
                  placeholder="e.g. Early adopter 20% discount on Professional annual"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-violet-600 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all"
                >
                  {isSubmitting ? "Creating..." : "Create Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
