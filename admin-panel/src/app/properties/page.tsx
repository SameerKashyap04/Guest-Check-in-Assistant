"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Building2, BedDouble, ScanLine, Search, Plus, Filter, MapPin } from "lucide-react";
import { adminDataService, AdminProperty } from "@/lib/adminDataService";

export default function PropertiesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [properties, setProperties] = useState<AdminProperty[]>([]);

  useEffect(() => {
    const unsub = adminDataService.subscribeProperties(setProperties);
    return () => unsub();
  }, []);

  const filtered = properties.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || p.status.toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Properties Directory</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Manage homestays, lodges, and guesthouses on the platform.</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search property name, ID, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-600 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
          {["ALL", "ACTIVE", "TRIALING"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === s
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-xs font-bold text-slate-500 border-b border-slate-200 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Property ID</th>
              <th className="px-6 py-4">Property Name</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Rooms</th>
              <th className="px-6 py-4">Check-ins</th>
              <th className="px-6 py-4">Plan & Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                  <p className="font-semibold text-slate-800 text-sm mb-1">No properties registered yet</p>
                  <p className="text-xs text-slate-400">Properties created in the StayMate mobile app will sync here in real-time.</p>
                </td>
              </tr>
            ) : filtered.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-4 font-mono text-xs font-bold text-violet-700">{p.id}</td>
                <td className="px-6 py-4 font-extrabold text-slate-900">{p.name}</td>
                <td className="px-6 py-4 text-xs font-medium text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{p.location}</span>
                </td>
                <td className="px-6 py-4 font-extrabold text-slate-900">{p.rooms}</td>
                <td className="px-6 py-4 font-bold text-emerald-600">{p.checkIns}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200">
                      {p.plan}
                    </span>
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-200">
                      {p.status}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
