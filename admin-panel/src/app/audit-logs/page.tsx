"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { ShieldAlert, Shield, Search } from "lucide-react";
import { adminDataService } from "@/lib/adminDataService";

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [logs, setLogs] = useState([
    { id: "log_991", action: "PLAN_UPGRADE", admin: "admin@homestay.com", target: "HS-8821 (Coorg Hilltop)", timestamp: "2026-03-08 14:10:02" },
    { id: "log_992", action: "PII_UNMASK_VIEW", admin: "support_lead@homestay.com", target: "HS-4492 (Manali Pine)", timestamp: "2026-03-08 11:25:44" },
    { id: "log_993", action: "TRIAL_EXTENDED", admin: "admin@homestay.com", target: "HS-3109 (Wayanad Forest)", timestamp: "2026-03-07 09:14:18" },
    { id: "log_994", action: "STATUS_OVERRIDE", admin: "admin@homestay.com", target: "HS-7734 (Goa Beachside)", timestamp: "2026-03-06 16:30:11" },
  ]);

  useEffect(() => {
    const unsub = adminDataService.subscribeAuditLogs((adminLogs) => {
      if (adminLogs.length > 0) {
        setLogs(adminLogs.map(l => ({
          id: l.id,
          action: l.action,
          admin: l.actor || 'admin@homestay.com',
          target: l.target || l.details,
          timestamp: l.timestamp,
        })));
      }
    });
    return () => unsub();
  }, []);

  const filteredLogs = logs.filter((l) => {
    return (
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.admin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.target.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Admin Action Audit Logs</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Immutable security log of administrative overrides and PII views.</p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          placeholder="Search by action, admin email, or target property..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-600 shadow-sm"
        />
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-xs font-bold text-slate-500 border-b border-slate-200 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Log ID</th>
              <th className="px-6 py-4">Action</th>
              <th className="px-6 py-4">Admin Account</th>
              <th className="px-6 py-4">Target Entity</th>
              <th className="px-6 py-4">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">{l.id}</td>
                <td className="px-6 py-4 font-extrabold text-violet-700">{l.action}</td>
                <td className="px-6 py-4 font-medium text-slate-800">{l.admin}</td>
                <td className="px-6 py-4 font-extrabold text-slate-900">{l.target}</td>
                <td className="px-6 py-4 text-xs font-semibold text-slate-500">{l.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
