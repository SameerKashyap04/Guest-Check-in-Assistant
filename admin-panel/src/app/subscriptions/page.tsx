"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Shield, Crown, RefreshCcw, Calendar, CheckCircle2, AlertTriangle, Search, Filter, X, Check, Loader2 } from "lucide-react";

interface SubRecord {
  id: string;
  property: string;
  plan: string;
  cycle: string;
  amount: string;
  status: "active" | "trialing" | "past_due" | "cancelled";
  renewalDate: string;
  provider: string;
  rawStatus?: string;
}

const DEFAULT_SUBSCRIPTIONS: SubRecord[] = [
  {
    id: "sub_901",
    property: "Coorg Hilltop Homestay",
    plan: "PROFESSIONAL",
    cycle: "yearly",
    amount: "₹ 7,999",
    status: "active",
    renewalDate: "2027-01-15",
    provider: "Devify Pay",
  },
  {
    id: "sub_902",
    property: "Manali Pine Resort",
    plan: "STARTER",
    cycle: "monthly",
    amount: "₹ 299",
    status: "active",
    renewalDate: "2026-04-01",
    provider: "Devify Pay",
  },
  {
    id: "sub_903",
    property: "Wayanad Forest Lodge",
    plan: "PROFESSIONAL",
    cycle: "monthly",
    amount: "₹ 799",
    status: "trialing",
    renewalDate: "2026-04-04 (Trial end)",
    provider: "Direct Trial",
  },
  {
    id: "sub_904",
    property: "Goa Beachside Lodge",
    plan: "STARTER",
    cycle: "monthly",
    amount: "₹ 299",
    status: "past_due",
    renewalDate: "2026-03-10 (Past due)",
    provider: "Devify Pay",
  },
];

export default function SubscriptionsPage() {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSub, setSelectedSub] = useState<SubRecord | null>(null);
  const [actionMsg, setActionMsg] = useState("");
  const [subscriptions, setSubscriptions] = useState<SubRecord[]>(DEFAULT_SUBSCRIPTIONS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "subscription_orders"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const fetched: SubRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        let renewalDate = "Recent";
        if (data.createdAt?.toDate) {
          renewalDate = data.createdAt.toDate().toISOString().substring(0, 10);
        } else if (data.createdAt) {
          renewalDate = new Date(data.createdAt).toISOString().substring(0, 10);
        }

        const rawStatus = data.status || "PENDING";
        let mappedStatus: SubRecord["status"] = "active";
        if (rawStatus === "PAID" || rawStatus === "active") {
          mappedStatus = "active";
        } else if (rawStatus === "PENDING" || rawStatus === "trialing") {
          mappedStatus = "trialing";
        } else {
          mappedStatus = "cancelled";
        }

        return {
          id: data.orderId || d.id,
          property: data.userEmail ? `${data.userEmail}` : data.userId || "Property Owner",
          plan: data.planId || "PROFESSIONAL",
          cycle: data.billingCycle || "monthly",
          amount: data.amountPaise ? `₹ ${(data.amountPaise / 100).toLocaleString("en-IN")}` : "₹ 0",
          status: mappedStatus,
          renewalDate,
          provider: data.isSandbox ? "Devify Pay (Sandbox)" : "Devify Pay",
          rawStatus,
        };
      });

      if (fetched.length > 0) {
        // Prepend live subscriptions to defaults
        const combined = [...fetched, ...DEFAULT_SUBSCRIPTIONS];
        setSubscriptions(combined);
      }
    } catch (e) {
      console.warn("Could not load live subscriptions from Firestore:", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubs = subscriptions.filter((s) => {
    const matchesSearch =
      s.property.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.plan.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || s.status.toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (newStatus: SubRecord["status"]) => {
    if (!selectedSub) return;

    const firestoreStatusMap: Record<string, string> = {
      active: "PAID",
      trialing: "PENDING",
      past_due: "FAILED",
      cancelled: "FAILED",
    };

    const newFsStatus = firestoreStatusMap[newStatus] || "PAID";

    // Update state locally
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === selectedSub.id ? { ...s, status: newStatus, rawStatus: newFsStatus } : s))
    );
    setSelectedSub({ ...selectedSub, status: newStatus, rawStatus: newFsStatus });

    // Persist to Firestore
    try {
      const docRef = doc(db, "subscription_orders", selectedSub.id);
      await updateDoc(docRef, {
        status: newFsStatus,
        updatedAt: serverTimestamp(),
        paidAt: newFsStatus === "PAID" ? serverTimestamp() : null,
      });
      setActionMsg(`Subscription ${selectedSub.id} updated to ${newStatus.toUpperCase()} (${newFsStatus})!`);
    } catch (e) {
      console.warn("Firestore status update notice:", e);
      setActionMsg(`Updated locally: ${newStatus.toUpperCase()}`);
    }

    setTimeout(() => setActionMsg(""), 3000);
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Subscriptions Ledger</span>
            {loading && <Loader2 className="w-4 h-4 text-violet-600 animate-spin" />}
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Monitor live user subscriptions, pending approvals, and billing cycles in real time.
          </p>
        </div>

        <button
          onClick={fetchSubscriptions}
          className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search property name, user email, or subscription ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-600 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
          {["ALL", "ACTIVE", "TRIALING", "PAST_DUE"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === status
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-xs font-bold text-slate-500 border-b border-slate-200 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Subscription ID</th>
              <th className="px-6 py-4">Property / User</th>
              <th className="px-6 py-4">Plan & Cycle</th>
              <th className="px-6 py-4">Billing Amount</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Gateway</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSubs.map((sub) => (
              <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">
                  {sub.id}
                </td>
                <td className="px-6 py-4 font-extrabold text-slate-900">{sub.property}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">{sub.plan}</span>
                    <span className="text-[10px] text-slate-600 uppercase bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-bold">
                      {sub.cycle}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 font-extrabold text-emerald-600">{sub.amount}</td>
                <td className="px-6 py-4">
                  <span
                    className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                      sub.status === "active"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : sub.status === "trialing"
                        ? "bg-sky-100 text-sky-800 border-sky-200"
                        : "bg-rose-100 text-rose-800 border-rose-200"
                    }`}
                  >
                    {sub.status === "active" ? "ACTIVE (PAID)" : sub.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs font-semibold text-slate-500">{sub.provider}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => setSelectedSub(sub)}
                    className="px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-bold rounded-lg transition-colors border border-violet-200 cursor-pointer"
                  >
                    Approve / Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dynamic Sub Override / Approval Modal */}
      {selectedSub && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">
                Subscription Approval ({selectedSub.id})
              </h3>
              <button
                onClick={() => setSelectedSub(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionMsg && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{actionMsg}</span>
              </div>
            )}

            <div className="space-y-4 mb-6">
              <p className="text-xs text-slate-600 font-medium">
                User / Email: <strong className="text-slate-900">{selectedSub.property}</strong>
              </p>
              <p className="text-xs text-slate-600 font-medium">
                Target Plan: <strong className="text-slate-900">{selectedSub.plan} ({selectedSub.cycle})</strong>
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Update & Approve Subscription Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["active", "trialing", "past_due", "cancelled"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(st)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                        selectedSub.status === st
                          ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {st === "active" ? "ACTIVE (APPROVE)" : st.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedSub(null)}
              className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
