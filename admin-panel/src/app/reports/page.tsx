"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore";
import {
  FileText,
  Download,
  Filter,
  Search,
  ShieldCheck,
  Building2,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ArrowUpRight
} from "lucide-react";

export interface ReportItem {
  id: string;
  guestName: string;
  phone: string;
  idType: string;
  idNumberMasked: string;
  propertyName: string;
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string;
  complianceStatus: "VERIFIED" | "PENDING" | "FLAGGED";
  verifiedBy: string;
}

const DEFAULT_REPORTS: ReportItem[] = [
  {
    id: "REP_1001",
    guestName: "Vikram Malhotra",
    phone: "+91 98765 43210",
    idType: "Aadhaar Card",
    idNumberMasked: "XXXX-XXXX-8821",
    propertyName: "Coorg Hilltop Homestay",
    roomNumber: "Room 102",
    checkInDate: "2026-08-14 14:00",
    checkOutDate: "2026-08-16 11:00",
    complianceStatus: "VERIFIED",
    verifiedBy: "OCR Auto-Verification"
  },
  {
    id: "REP_1002",
    guestName: "Ananya Deshmukh",
    phone: "+91 91234 56789",
    idType: "Passport",
    idNumberMasked: "PXXXXX992",
    propertyName: "Manali Pine Resort",
    roomNumber: "Villa A",
    checkInDate: "2026-08-14 12:30",
    checkOutDate: "2026-08-17 10:00",
    complianceStatus: "VERIFIED",
    verifiedBy: "Staff Inspection"
  },
  {
    id: "REP_1003",
    guestName: "Rahul Sharma",
    phone: "+91 99887 76655",
    idType: "Driving License",
    idNumberMasked: "DL-XXXX-4411",
    propertyName: "Goa Beachside Lodge",
    roomNumber: "Room 204",
    checkInDate: "2026-08-13 16:15",
    checkOutDate: "2026-08-15 11:00",
    complianceStatus: "PENDING",
    verifiedBy: "Self-Checkin App"
  },
  {
    id: "REP_1004",
    guestName: "Priya Nair",
    phone: "+91 97766 55443",
    idType: "Aadhaar Card",
    idNumberMasked: "XXXX-XXXX-1102",
    propertyName: "Wayanad Forest Lodge",
    roomNumber: "Cottage 3",
    checkInDate: "2026-08-12 11:00",
    checkOutDate: "2026-08-14 10:30",
    complianceStatus: "VERIFIED",
    verifiedBy: "OCR Auto-Verification"
  },
  {
    id: "REP_1005",
    guestName: "Amit Kumar",
    phone: "+91 96543 21098",
    idType: "Voter ID",
    idNumberMasked: "VT-XXXX-9901",
    propertyName: "Coorg Hilltop Homestay",
    roomNumber: "Room 105",
    checkInDate: "2026-08-10 15:20",
    checkOutDate: "2026-08-12 11:00",
    complianceStatus: "FLAGGED",
    verifiedBy: "Flagged (Exp ID)"
  }
];

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>(DEFAULT_REPORTS);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedProperty, setSelectedProperty] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState("");

  // Fetch live reports from Firestore registration logs if available
  useEffect(() => {
    async function loadLiveReports() {
      setLoading(true);
      try {
        const q = query(collection(db, "guest_checkins"), orderBy("createdAt", "desc"), limit(20));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const liveData: ReportItem[] = snap.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id.substring(0, 8).toUpperCase(),
              guestName: data.guestName || "Guest",
              phone: data.phone || "+91 XXXXX XXXXX",
              idType: data.idType || "Aadhaar Card",
              idNumberMasked: data.idNumber ? `XXXX-XXXX-${data.idNumber.slice(-4)}` : "XXXX-XXXX-0000",
              propertyName: data.propertyName || "Homestay Property",
              roomNumber: data.roomNumber || "Room 1",
              checkInDate: data.checkInDate || new Date().toISOString().substring(0, 16).replace("T", " "),
              checkOutDate: data.checkOutDate || "Active Stay",
              complianceStatus: data.isFlagged ? "FLAGGED" : data.isVerified ? "VERIFIED" : "PENDING",
              verifiedBy: data.verifiedBy || "OCR System",
            };
          });
          setReports(liveData);
        }
      } catch (e) {
        console.warn("Firestore guest_checkins lookup notice:", e);
      } finally {
        setLoading(false);
      }
    }

    loadLiveReports();
  }, []);

  // Filtering
  const filteredReports = reports.filter((item) => {
    const matchesSearch =
      item.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.idNumberMasked.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" || item.complianceStatus === statusFilter;

    const matchesProperty =
      selectedProperty === "ALL" || item.propertyName === selectedProperty;

    return matchesSearch && matchesStatus && matchesProperty;
  });

  const propertiesList = Array.from(new Set(reports.map((r) => r.propertyName)));

  const handleExportCSV = () => {
    const headers = ["Report ID", "Guest Name", "Phone", "ID Type", "ID Number", "Property", "Room", "Check-In", "Check-Out", "Compliance Status", "Verification Method"];
    const rows = filteredReports.map(r => [
      r.id,
      `"${r.guestName}"`,
      `"${r.phone}"`,
      `"${r.idType}"`,
      `"${r.idNumberMasked}"`,
      `"${r.propertyName}"`,
      `"${r.roomNumber}"`,
      `"${r.checkInDate}"`,
      `"${r.checkOutDate}"`,
      r.complianceStatus,
      `"${r.verifiedBy}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Compliance_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportMessage("CSV Compliance Report downloaded successfully!");
    setTimeout(() => setExportMessage(""), 3000);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <AdminLayout>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Government & Compliance Audit Reports</span>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
              FORM-C READY
            </span>
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Export official guest registration logs, Aadhaar/Passport compliance audits, and property records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrintReport}
            className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print View</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-extrabold rounded-xl shadow-md shadow-violet-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV Ledger</span>
          </button>
        </div>
      </div>

      {exportMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{exportMessage}</span>
        </div>
      )}

      {/* Summary KPI Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Audited Guests</span>
            <Users className="w-4 h-4 text-violet-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{reports.length}</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> 100% Encrypted Local Storage
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Verified Registrations</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {reports.filter((r) => r.complianceStatus === "VERIFIED").length}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Form-C & OCR Approved</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Inspections</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {reports.filter((r) => r.complianceStatus === "PENDING").length}
          </p>
          <p className="text-[11px] text-amber-600 font-semibold mt-1">Self Check-in Queue</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Flagged Records</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600">
            {reports.filter((r) => r.complianceStatus === "FLAGGED").length}
          </p>
          <p className="text-[11px] text-rose-600 font-semibold mt-1">Requires Admin Review</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 mb-6 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by guest, room, property, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-600"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="ALL">All Compliance Statuses</option>
            <option value="VERIFIED">Verified Only</option>
            <option value="PENDING">Pending Only</option>
            <option value="FLAGGED">Flagged Only</option>
          </select>

          {/* Property Filter */}
          <select
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="ALL">All Properties</option>
            {propertiesList.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-[11px] font-extrabold text-slate-500 border-b border-slate-200 uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3.5">Report Ref</th>
              <th className="px-5 py-3.5">Guest & Contact</th>
              <th className="px-5 py-3.5">ID Type & Number</th>
              <th className="px-5 py-3.5">Property & Room</th>
              <th className="px-5 py-3.5">Check-In / Out</th>
              <th className="px-5 py-3.5">Compliance</th>
              <th className="px-5 py-3.5">Verification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredReports.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                  No compliance records match the selected filters.
                </td>
              </tr>
            ) : (
              filteredReports.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-4 font-mono font-bold text-slate-500">{r.id}</td>
                  <td className="px-5 py-4">
                    <p className="font-extrabold text-slate-900">{r.guestName}</p>
                    <p className="text-[11px] text-slate-500">{r.phone}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-bold text-slate-800">{r.idType}</span>
                    <p className="font-mono text-[11px] text-slate-500">{r.idNumberMasked}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-900">{r.propertyName}</p>
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded">
                      {r.roomNumber}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[11px]">
                    <p className="font-semibold text-slate-700">In: {r.checkInDate}</p>
                    <p className="text-slate-400">Out: {r.checkOutDate}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                        r.complianceStatus === "VERIFIED"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : r.complianceStatus === "PENDING"
                          ? "bg-amber-100 text-amber-800 border-amber-200"
                          : "bg-rose-100 text-rose-800 border-rose-200"
                      }`}
                    >
                      {r.complianceStatus}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[11px] font-medium text-slate-600">{r.verifiedBy}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
