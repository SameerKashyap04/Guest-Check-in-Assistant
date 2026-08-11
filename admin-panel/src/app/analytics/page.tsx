"use client";

import React, { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { BarChart3, ScanLine, FileText, CheckCircle, ArrowUpRight } from "lucide-react";

export default function AnalyticsPage() {
  const [selectedRange, setSelectedRange] = useState("30D");

  const usageStats = [
    { metric: "Total Check-ins Processed", count: selectedRange === "7D" ? "3,120" : "12,480", growth: "+14.2%" },
    { metric: "OCR Scans Executed", count: selectedRange === "7D" ? "2,180" : "8,920", growth: "+21.5%" },
    { metric: "Reports Generated (PDF & CSV)", count: selectedRange === "7D" ? "790" : "3,150", growth: "+8.9%" },
    { metric: "QR Self-check-ins Submitted", count: selectedRange === "7D" ? "1,210" : "4,810", growth: "+35.0%" },
  ];

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Product Usage Analytics</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Aggregated, privacy-compliant usage metrics across all homestays.</p>
        </div>

        <div className="bg-white border border-slate-200 p-1 rounded-xl flex items-center shadow-sm">
          {["7D", "30D", "90D"].map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                selectedRange === r
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {usageStats.map((u, i) => (
          <div key={i} className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{u.metric}</p>
            <p className="text-2xl font-black text-slate-900 mt-2 mb-1">{u.count}</p>
            <p className="text-xs text-emerald-600 font-extrabold flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{u.growth} MoM</span>
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-extrabold text-slate-900 mb-4 border-b border-slate-100 pb-3">
          ID Document Distribution (OCR vs Manual)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            <p className="text-xs text-slate-500 font-bold">Aadhaar Cards</p>
            <p className="text-2xl font-black text-slate-900 mt-1">68.4%</p>
            <span className="text-[11px] text-slate-400 font-medium">8,536 scans</span>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            <p className="text-xs text-slate-500 font-bold">Driving Licence & PAN</p>
            <p className="text-2xl font-black text-slate-900 mt-1">21.2%</p>
            <span className="text-[11px] text-slate-400 font-medium">2,645 scans</span>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            <p className="text-xs text-slate-500 font-bold">Passport / Foreign IDs</p>
            <p className="text-2xl font-black text-slate-900 mt-1">10.4%</p>
            <span className="text-[11px] text-slate-400 font-medium">1,299 scans</span>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
