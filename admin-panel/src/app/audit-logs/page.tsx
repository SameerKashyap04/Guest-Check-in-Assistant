"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/AdminLayout";
import { 
  ShieldAlert, 
  Search, 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Clock,
  Sparkles
} from "lucide-react";
import { adminDataService, AdminAuditLog, parseAuditTimestamp } from "@/lib/adminDataService";

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);

  useEffect(() => {
    const unsub = adminDataService.subscribeAuditLogs((adminLogs) => {
      setLogs(adminLogs);
    });
    return () => unsub();
  }, []);

  const formatRelativeTime = (timeStr: string) => {
    if (!timeStr) return "Just now";
    try {
      const ts = parseAuditTimestamp(timeStr);
      if (!ts) return timeStr;
      const diffSec = Math.floor((Date.now() - ts) / 1000);
      if (diffSec < 60) return "Just now";
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
      return new Date(ts).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (_) {
      return timeStr;
    }
  };

  const filteredLogs = logs
    .filter((l) => {
      const matchSearch =
        (l.action || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.actor || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.target || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.details || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchCat = categoryFilter === "ALL" || (l.category || "SYSTEM") === categoryFilter;
      return matchSearch && matchCat;
    })
    .sort((a, b) => {
      const timeA = parseAuditTimestamp(a.timestamp || (a as any).createdAt);
      const timeB = parseAuditTimestamp(b.timestamp || (b as any).createdAt);
      return timeB - timeA; // Newest 1st, oldest last
    });

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-800 hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Live Activity &amp; Audit Logs
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Complete history of system changes, subscription updates, and administrative events.
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search by action, admin, property name, or details..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-600 shadow-sm"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
          {["ALL", "SUBSCRIPTION", "SECURITY", "SYSTEM"].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategoryFilter(cat);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                categoryFilter === cat
                  ? "bg-white text-violet-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm mb-4">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-xs font-bold text-slate-500 border-b border-slate-200 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Action</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Details / Target</th>
              <th className="px-6 py-4">Actor</th>
              <th className="px-6 py-4 text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                  <p className="font-bold text-slate-800 text-sm mb-1">No matching activity logs found</p>
                  <p className="text-xs text-slate-400">Try adjusting your search query or filter category.</p>
                </td>
              </tr>
            ) : paginatedLogs.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-4">
                  <span className="font-extrabold text-slate-900 block">{l.action}</span>
                  <span className="font-mono text-[11px] text-slate-400">ID: {l.id.substring(0, 8)}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                    l.category === "SUBSCRIPTION"
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : l.category === "SECURITY"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}>
                    {l.category || "SYSTEM"}
                  </span>
                </td>
                <td className="px-6 py-4 max-w-md">
                  <p className="font-medium text-slate-800 text-xs">{l.details}</p>
                  {l.target && (
                    <p className="text-[11px] text-slate-400 mt-0.5">Target: <strong className="text-slate-600">{l.target}</strong></p>
                  )}
                </td>
                <td className="px-6 py-4 font-medium text-slate-700 text-xs">
                  {l.actor || "Super Admin"}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-bold text-xs text-slate-900 block">
                    {formatRelativeTime(l.timestamp)}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {filteredLogs.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2 py-2">
          <span className="text-xs text-slate-500 font-medium">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredLogs.length)} of {filteredLogs.length} activity records
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                currentPage === 1
                  ? "border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50"
                  : "border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer bg-white"
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            <span className="text-xs font-mono font-bold text-slate-700 px-3 py-1.5 rounded-xl bg-white border border-slate-200">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                currentPage >= totalPages
                  ? "border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50"
                  : "border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer bg-white"
              }`}
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
