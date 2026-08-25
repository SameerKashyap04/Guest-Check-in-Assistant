"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Search,
  Settings,
  Copy,
  Check,
  Eye,
  EyeOff,
  Globe,
  Key,
  ShieldCheck,
  Zap,
  X,
  RefreshCw,
  ExternalLink,
  Save,
  Server
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

export default function PaymentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showSettings, setShowSettings] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Devify Pay Settings State
  const [apiUrl, setApiUrl] = useState("https://devifypay.site");
  const [apiKey, setApiKey] = useState("sk_test_xxx");
  const [webhookSecret, setWebhookSecret] = useState("whsec_xxx");
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Real transactions from Firestore
  const [realTransactions, setRealTransactions] = useState<any[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  // Load saved settings & live transactions
  useEffect(() => {
    // 1. Fetch current config directly from server .env.local & Firestore
    fetch("/api/config/devify")
      .then((res) => res.json())
      .then((data) => {
        if (data.apiUrl) setApiUrl(data.apiUrl);
        if (data.apiKey) setApiKey(data.apiKey);
        if (data.webhookSecret) setWebhookSecret(data.webhookSecret);
      })
      .catch((e) => {
        console.warn("Could not fetch server .env.local config:", e);
        if (typeof window !== "undefined") {
          const savedUrl = localStorage.getItem("DEVIFY_API_URL");
          const savedKey = localStorage.getItem("DEVIFY_API_KEY");
          const savedSecret = localStorage.getItem("DEVIFY_WEBHOOK_SECRET");
          if (savedUrl) setApiUrl(savedUrl);
          if (savedKey) setApiKey(savedKey);
          if (savedSecret) setWebhookSecret(savedSecret);
        }
      });

    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoadingTx(true);
    try {
      const q = query(collection(db, "subscription_orders"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map((doc) => {
        const data = doc.data();
        let formattedDate = "Recent";
        if (data.createdAt?.toDate) {
          formattedDate = data.createdAt.toDate().toISOString().replace("T", " ").substring(0, 16);
        } else if (data.createdAt) {
          formattedDate = new Date(data.createdAt).toISOString().replace("T", " ").substring(0, 16);
        }

        return {
          txId: data.paymentId || data.orderId || doc.id,
          property: data.userEmail ? `${data.userEmail}` : "Property Owner",
          amount: data.amountPaise ? `₹ ${(data.amountPaise / 100).toLocaleString("en-IN")}` : "₹ 0",
          plan: `${data.planId || "Starter"} (${data.billingCycle || "monthly"})`,
          status:
            data.status === "PAID"
              ? "Captured"
              : data.status === "FAILED"
              ? "Failed"
              : data.status === "PENDING_VERIFICATION" || (data.status === "PENDING" && (data.transactionRef || data.paymentId))
              ? "Pending"
              : "Created",
          date: formattedDate,
        };
      });

      setRealTransactions(fetched);
    } catch (e) {
      console.warn("Could not load live transactions from Firestore:", e);
      setRealTransactions([]);
    } finally {
      setLoadingTx(false);
    }
  };

  const allTx = realTransactions;

  const filteredTx = allTx.filter((tx) => {
    const matchesSearch =
      tx.property.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.txId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.plan.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "CAPTURED" && tx.status === "Captured") ||
      (statusFilter === "FAILED" && tx.status === "Failed") ||
      (statusFilter === "PENDING" && tx.status === "Pending");
    return matchesSearch && matchesStatus;
  });

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveSettings = async () => {
    // 1. Write directly to server .env.local file & Firestore via API
    try {
      const res = await fetch("/api/config/devify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiUrl, apiKey, webhookSecret }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Failed to save configuration: ${data.error || "Unknown error"}`);
        return;
      }
    } catch (e: any) {
      console.error("Failed to save configuration:", e);
    }

    // 2. Also save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("DEVIFY_API_URL", apiUrl);
      localStorage.setItem("DEVIFY_API_KEY", apiKey);
      localStorage.setItem("DEVIFY_WEBHOOK_SECRET", webhookSecret);
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const originUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  return (
    <AdminLayout>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Payments & Gateway Ledger</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Transaction logs, active payment gateways, and Devify Pay integration settings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTransactions}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-sm transition-all flex items-center gap-2 text-xs font-bold"
            title="Refresh Transactions"
          >
            <RefreshCw className={`w-4 h-4 ${loadingTx ? "animate-spin text-violet-600" : ""}`} />
            <span className="hidden sm:inline">Sync Data</span>
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span>Devify Gateway Settings</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search by transaction ID, property, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-600 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
          {["ALL", "CAPTURED", "PENDING", "FAILED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === st
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-xs font-bold text-slate-500 border-b border-slate-200 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Transaction ID</th>
              <th className="px-6 py-4">Property / User</th>
              <th className="px-6 py-4">Plan Tier</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTx.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-medium">
                  No transaction records match your search query.
                </td>
              </tr>
            ) : (
              filteredTx.map((tx, idx) => (
                <tr key={`${tx.txId}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">{tx.txId}</td>
                  <td className="px-6 py-4 font-extrabold text-slate-900">{tx.property}</td>
                  <td className="px-6 py-4 text-xs font-semibold text-slate-700">{tx.plan}</td>
                  <td className="px-6 py-4 font-extrabold text-emerald-600">{tx.amount}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                        tx.status === "Captured"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : tx.status === "Pending"
                          ? "bg-amber-100 text-amber-800 border-amber-200"
                          : "bg-rose-100 text-rose-800 border-rose-200"
                      }`}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-500">{tx.date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* DEVIFY PAY INTEGRATION SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-5 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-100 rounded-2xl flex items-center justify-center text-violet-700">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Devify Pay Integration Settings</h2>
                  <p className="text-xs text-slate-500 font-medium">Configure credentials, webhook signature, and checkout endpoints.</p>
                </div>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {saveSuccess && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span>Devify Pay credentials updated successfully!</span>
              </div>
            )}

            <div className="space-y-6">
              {/* SECTION 1: DEVIFY CREDENTIALS */}
              <div>
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-violet-600" />
                  <span>API Credentials & Server Secrets</span>
                </h3>

                <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  {/* API URL */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      DEVIFY_API_URL
                    </label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={apiUrl}
                        onChange={(e) => setApiUrl(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-10 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-violet-600"
                        placeholder="https://devifypay.site"
                      />
                      <button
                        onClick={() => handleCopy(apiUrl, "DEVIFY_API_URL")}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 p-1"
                        title="Copy"
                      >
                        {copiedField === "DEVIFY_API_URL" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* API KEY */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>DEVIFY_API_KEY</span>
                      <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Server-Side Secret
                      </span>
                    </label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-20 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-violet-600"
                        placeholder="sk_test_xxx"
                      />
                      <div className="absolute right-2.5 top-2 flex items-center gap-1">
                        <button
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="text-slate-400 hover:text-slate-700 p-1"
                          title={showApiKey ? "Hide Key" : "Show Key"}
                        >
                          {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleCopy(apiKey, "DEVIFY_API_KEY")}
                          className="text-slate-400 hover:text-slate-700 p-1"
                          title="Copy Key"
                        >
                          {copiedField === "DEVIFY_API_KEY" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* WEBHOOK SECRET */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>DEVIFY_WEBHOOK_SECRET</span>
                      <span className="text-[10px] text-violet-600 font-semibold bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200">
                        HMAC-SHA256 Secret
                      </span>
                    </label>
                    <div className="relative">
                      <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type={showWebhookSecret ? "text" : "password"}
                        value={webhookSecret}
                        onChange={(e) => setWebhookSecret(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-20 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-violet-600"
                        placeholder="whsec_xxx"
                      />
                      <div className="absolute right-2.5 top-2 flex items-center gap-1">
                        <button
                          onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                          className="text-slate-400 hover:text-slate-700 p-1"
                          title={showWebhookSecret ? "Hide Secret" : "Show Secret"}
                        >
                          {showWebhookSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleCopy(webhookSecret, "DEVIFY_WEBHOOK_SECRET")}
                          className="text-slate-400 hover:text-slate-700 p-1"
                          title="Copy Secret"
                        >
                          {copiedField === "DEVIFY_WEBHOOK_SECRET" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: ENDPOINTS & WEBHOOK URL */}
              <div>
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-violet-600" />
                  <span>Integration Endpoints & Webhook URL</span>
                </h3>

                <div className="space-y-3">
                  {/* Webhook URL */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-extrabold text-slate-500 block uppercase">Webhook Receiver</span>
                      <span className="text-xs font-mono font-bold text-slate-900">{`${originUrl}/api/webhook/devify`}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(`${originUrl}/api/webhook/devify`, "webhook_endpoint")}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                    >
                      {copiedField === "webhook_endpoint" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  </div>

                  {/* Checkout API */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-extrabold text-slate-500 block uppercase">Create Order API</span>
                      <span className="text-xs font-mono font-bold text-slate-900">{`${originUrl}/api/checkout`}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(`${originUrl}/api/checkout`, "checkout_endpoint")}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                    >
                      {copiedField === "checkout_endpoint" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  </div>

                  {/* Status API */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-extrabold text-slate-500 block uppercase">Order Status API</span>
                      <span className="text-xs font-mono font-bold text-slate-900">{`${originUrl}/api/checkout/status?orderId={id}`}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(`${originUrl}/api/checkout/status`, "status_endpoint")}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                    >
                      {copiedField === "status_endpoint" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 3: WEBHOOK PROTOCOL & EVENTS */}
              <div className="bg-violet-50/80 border border-violet-200/80 rounded-2xl p-4">
                <h4 className="text-xs font-extrabold text-violet-900 mb-2 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-violet-600" />
                  <span>Handled Webhook Events & Signature Protocol</span>
                </h4>
                <p className="text-[11px] text-violet-700 leading-relaxed mb-3">
                  Devify Pay sends HMAC-SHA256 signed POST events. The backend automatically verifies signature headers and freshness (&lt; 5 mins) before updating Firestore orders.
                </p>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="bg-white/80 px-2.5 py-1 rounded-lg border border-violet-100 text-violet-900 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                    <span>payment.success</span>
                  </div>
                  <div className="bg-white/80 px-2.5 py-1 rounded-lg border border-violet-100 text-violet-900 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                    <span>payment.failed</span>
                  </div>
                  <div className="bg-white/80 px-2.5 py-1 rounded-lg border border-violet-100 text-violet-900 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                    <span>order.paid</span>
                  </div>
                  <div className="bg-white/80 px-2.5 py-1 rounded-lg border border-violet-100 text-violet-900 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                    <span>order.failed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-6">
              <span className="text-[11px] text-slate-400 font-medium">
                Secrets are stored in <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">admin-panel/.env.local</code>
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Close
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Configuration</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

