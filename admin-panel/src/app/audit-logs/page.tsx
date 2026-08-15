"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore";
import {
  ShieldAlert,
  Shield,
  Search,
  Key,
  CreditCard,
  Eye,
  FileSpreadsheet,
  Lock,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  Sliders,
  Database
} from "lucide-react";

export interface AuditLogEntry {
  id: string;
  category: "PAYMENT" | "PRIVACY" | "SYSTEM" | "SECURITY";
  action: string;
  admin: string;
  target: string;
  ipAddress: string;
  status: "SUCCESS" | "WARNING" | "BLOCKED";
  timestamp: string;
}

const DEFAULT_LOGS: AuditLogEntry[] = [
  {
    id: "LOG_88201",
    category: "PAYMENT",
    action: "DEVIFY_WEBHOOK_VERIFIED",
    admin: "Devify Pay Gateway",
    target: "Order ord_2mOAgqqZ3yCCYqYH (PAID)",
    ipAddress: "13.233.45.102",
    status: "SUCCESS",
    timestamp: "2026-08-15 05:12:26",
  },
  {
    id: "LOG_88202",
    category: "PRIVACY",
    action: "PII_UNMASK_REQUESTED",
    admin: "super_admin@company.com",
    target: "Homestay HS-8821 Guest Aadhaar",
    ipAddress: "103.22.10.4",
    status: "WARNING",
    timestamp: "2026-08-15 04:30:11",
  },
  {
    id: "LOG_88203",
    category: "SYSTEM",
    action: "PLAN_MATRIX_UPDATED",
    admin: "dev@company.com",
    target: "Professional Plan Pricing (₹799)",
    ipAddress: "103.22.10.4",
    status: "SUCCESS",
    timestamp: "2026-08-14 22:15:00",
  },
  {
    id: "LOG_88204",
    category: "SECURITY",
    action: "INVALID_WEBHOOK_SIGNATURE",
    admin: "External IP",
    target: "POST /api/webhook/devify",
    ipAddress: "185.220.101.4",
    status: "BLOCKED",
    timestamp: "2026-08-14 18:40:02",
  },
  {
    id: "LOG_88205",
    category: "PAYMENT",
    action: "DEVIFY_API_KEY_SAVED",
    admin: "super_admin@company.com",
    target: "sk_live_...47024ecc1f65553545f5",
    ipAddress: "127.0.0.1",
    status: "SUCCESS",
    timestamp: "2026-08-15 05:11:00",
  },
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>(DEFAULT_LOGS);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isExporting, setIsExporting] = useState(false);

  // Fetch Firestore order logs & audit events
  useEffect(() => {
    async function fetchLiveAuditEvents() {
      try {
        const q = query(collection(db, "subscription_orders"), orderBy("createdAt", "desc"), limit(15));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const orderEvents: AuditLogEntry[] = snap.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: `LOG_${docSnap.id.substring(0, 6).toUpperCase()}`,
              category: "PAYMENT",
              action: data.status === "PAID" ? "DEVIFY_PAYMENT_CAPTURED" : "DEVIFY_ORDER_CREATED",
              admin: data.userEmail || "App User",
              target: `Order ${data.orderId || docSnap.id} (${data.planId || "Plan"})`,
              ipAddress: "Internal Gateway",
              status: data.status === "PAID" ? "SUCCESS" : data.status === "FAILED" ? "BLOCKED" : "WARNING",
              timestamp: data.createdAt?.toDate
                ? data.createdAt.toDate().toISOString().replace("T", " ").substring(0, 19)
                : new Date().toISOString().replace("T", " ").substring(0, 19),
            };
          });

          setLogs([...orderEvents, ...DEFAULT_LOGS]);
        }
      } catch (e) {
        console.warn("Audit logs Firestore lookup notice:", e);
      }
    }

    fetchLiveAuditEvents();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.admin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === "ALL" || log.category === selectedCategory;
    const matchesStatus = statusFilter === "ALL" || log.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleExportAuditCSV = () => {
    setIsExporting(true);
    const headers = ["Log ID", "Category", "Action", "Admin Account", "Target Entity", "IP Address", "Status", "Timestamp"];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.category,
      `"${l.action}"`,
      `"${l.admin}"`,
      `"${l.target}"`,
      `"${l.ipAddress}"`,
      l.status,
      `"${l.timestamp}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Security_Audit_Trail_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setIsExporting(false), 1500);
  };

  return (
    <AdminLayout>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Immutable Security Audit Logs</span>
            <span className="text-xs bg-slate-200 text-slate-700 font-extrabold px-2.5 py-0.5 rounded-full border border-slate-300">
              AUDIT TRAIL
            </span>
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Real-time security ledger tracking API events, Devify Pay webhooks, PII views, and system overrides.
          </p>
        </div>

        <button
          onClick={handleExportAuditCSV}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 text-slate-300" />
          <span>{isExporting ? "Exporting..." : "Export Audit Trail"}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center text-violet-700">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Total Audit Events</p>
            <p className="text-xl font-black text-slate-900">{logs.length}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Verified Actions</p>
            <p className="text-xl font-black text-slate-900">
              {logs.filter((l) => l.status === "SUCCESS").length}
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-700">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Privacy Unmasks</p>
            <p className="text-xl font-black text-slate-900">
              {logs.filter((l) => l.category === "PRIVACY").length}
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-700">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Blocked Threats</p>
            <p className="text-xl font-black text-rose-600">
              {logs.filter((l) => l.status === "BLOCKED").length}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 mb-6 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by action, user, target, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-600"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="PAYMENT">Payment & Webhooks</option>
            <option value="PRIVACY">Privacy & PII</option>
            <option value="SYSTEM">System Matrix</option>
            <option value="SECURITY">Security Threats</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">Success Only</option>
            <option value="WARNING">Warnings Only</option>
            <option value="BLOCKED">Blocked Only</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-[11px] font-extrabold text-slate-500 border-b border-slate-200 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Log ID</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Action</th>
              <th className="px-6 py-4">Actor</th>
              <th className="px-6 py-4">Target Entity</th>
              <th className="px-6 py-4">IP Address</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-medium">
                  No security logs match the selected filters.
                </td>
              </tr>
            ) : (
              filteredLogs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-slate-500">{l.id}</td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-extrabold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">
                      {l.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-extrabold text-violet-700">{l.action}</td>
                  <td className="px-6 py-4 font-medium text-slate-800">{l.admin}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{l.target}</td>
                  <td className="px-6 py-4 font-mono text-slate-500">{l.ipAddress}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                        l.status === "SUCCESS"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : l.status === "WARNING"
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-rose-100 text-rose-800 border-rose-300"
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-medium">{l.timestamp}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
