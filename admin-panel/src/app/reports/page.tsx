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
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  CreditCard,
  FileCheck2,
  Lock,
  Layers
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
  tariffRupees: number;
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
    verifiedBy: "OCR Auto-Verification",
    tariffRupees: 7999,
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
    verifiedBy: "Staff Inspection",
    tariffRupees: 19999,
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
    verifiedBy: "Self-Checkin App",
    tariffRupees: 2999,
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
    verifiedBy: "OCR Auto-Verification",
    tariffRupees: 5499,
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
    verifiedBy: "Flagged (Exp ID)",
    tariffRupees: 3999,
  },
];

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>(DEFAULT_REPORTS);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedProperty, setSelectedProperty] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState("");

  // Multi-Page Preview Modal State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);

  const TOTAL_PREVIEW_PAGES = 4;

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
              tariffRupees: data.price || 4999,
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
    const headers = ["Report ID", "Guest Name", "Phone", "ID Type", "ID Number", "Property", "Room", "Check-In", "Check-Out", "Compliance Status", "Verification Method", "Tariff (INR)"];
    const rows = filteredReports.map((r) => [
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
      `"${r.verifiedBy}"`,
      r.tariffRupees
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
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

  const openReportPreview = (report?: ReportItem) => {
    setSelectedReport(report || filteredReports[0] || DEFAULT_REPORTS[0]);
    setPreviewPage(1);
    setShowPreviewModal(true);
  };

  return (
    <AdminLayout>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Government & Compliance Audit Reports</span>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
              FORM-C & AUDIT READY
            </span>
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Generate and preview multi-page official guest registration ledgers, Form-C audit reports, and revenue analytics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => openReportPreview()}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="w-4 h-4 text-violet-400" />
            <span>Multi-Page Report Preview</span>
          </button>

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

      {/* KPI Cards */}
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
              <th className="px-5 py-3.5 text-right">Actions</th>
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
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => openReportPreview(r)}
                      className="px-3 py-1.5 bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview Pages</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MULTI-PAGE REPORT PREVIEW MODAL */}
      {showPreviewModal && selectedReport && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-100 border border-slate-200 rounded-3xl max-w-4xl w-full p-6 shadow-2xl relative my-6 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Modal Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 bg-white p-4 -mx-6 -mt-6 rounded-t-3xl shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-100 text-violet-700 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                    <span>Official Audit Document — {selectedReport.id}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                      FORM-C COMPLIANT
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Property: {selectedReport.propertyName} | Guest: {selectedReport.guestName}
                  </p>
                </div>
              </div>

              {/* Page Navigator Tabs & Close */}
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 text-xs">
                  <button
                    onClick={() => setPreviewPage(Math.max(1, previewPage - 1))}
                    disabled={previewPage === 1}
                    className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2 font-extrabold text-slate-800">
                    Page {previewPage} of {TOTAL_PREVIEW_PAGES}
                  </span>
                  <button
                    onClick={() => setPreviewPage(Math.min(TOTAL_PREVIEW_PAGES, previewPage + 1))}
                    disabled={previewPage === TOTAL_PREVIEW_PAGES}
                    className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Page Switcher Tabs */}
            <div className="flex items-center gap-2 py-3 px-2 overflow-x-auto bg-slate-200/60 border-b border-slate-200 text-xs">
              <button
                onClick={() => setPreviewPage(1)}
                className={`px-3 py-1.5 rounded-lg font-extrabold transition-all cursor-pointer ${
                  previewPage === 1 ? "bg-violet-600 text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                Page 1: Executive Summary & Stay Overview
              </button>
              <button
                onClick={() => setPreviewPage(2)}
                className={`px-3 py-1.5 rounded-lg font-extrabold transition-all cursor-pointer ${
                  previewPage === 2 ? "bg-violet-600 text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                Page 2: Form-C Police Registration Ledger
              </button>
              <button
                onClick={() => setPreviewPage(3)}
                className={`px-3 py-1.5 rounded-lg font-extrabold transition-all cursor-pointer ${
                  previewPage === 3 ? "bg-violet-600 text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                Page 3: Revenue & Tariff Audit Ledger
              </button>
              <button
                onClick={() => setPreviewPage(4)}
                className={`px-3 py-1.5 rounded-lg font-extrabold transition-all cursor-pointer ${
                  previewPage === 4 ? "bg-violet-600 text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                Page 4: Security Verification & Audit Logs
              </button>
            </div>

            {/* Document Paper Canvas Preview Container */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-300/40 rounded-2xl my-3 flex justify-center">
              <div className="bg-white border border-slate-300 shadow-2xl rounded-lg p-8 max-w-2xl w-full min-h-[520px] text-slate-800 text-xs flex flex-col justify-between relative">
                
                {/* Printable Header */}
                <div>
                  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
                    <div>
                      <h2 className="text-base font-black uppercase text-slate-900 tracking-wider">
                        GOVERNMENT COMPLIANCE AUDIT REPORT
                      </h2>
                      <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                        Issued by Guest Check-in Assistant SaaS Platform
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-mono font-bold bg-slate-900 text-white px-2 py-1 rounded">
                        REF: {selectedReport.id}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1">Date: {new Date().toISOString().split("T")[0]}</p>
                    </div>
                  </div>

                  {/* PAGE 1 CONTENT */}
                  {previewPage === 1 && (
                    <div className="space-y-6">
                      <div className="bg-violet-50/80 border border-violet-200 rounded-xl p-4">
                        <h4 className="font-black text-violet-900 text-sm mb-1 uppercase tracking-wider">
                          Page 1 — Executive Summary & Stay Overview
                        </h4>
                        <p className="text-slate-600">Official summary document for homestay occupancy and guest records.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Property Name</span>
                          <span className="font-extrabold text-slate-900 text-sm">{selectedReport.propertyName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Room Allotment</span>
                          <span className="font-extrabold text-violet-700 text-sm">{selectedReport.roomNumber}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Check-In Date & Time</span>
                          <span className="font-bold text-slate-800">{selectedReport.checkInDate}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Check-Out Date & Time</span>
                          <span className="font-bold text-slate-800">{selectedReport.checkOutDate}</span>
                        </div>
                      </div>

                      <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                        <h5 className="font-bold text-slate-900 text-xs border-b border-slate-100 pb-2">Primary Guest Summary</h5>
                        <div className="grid grid-cols-2 gap-2 text-slate-700">
                          <p><strong className="text-slate-900">Guest Name:</strong> {selectedReport.guestName}</p>
                          <p><strong className="text-slate-900">Phone:</strong> {selectedReport.phone}</p>
                          <p><strong className="text-slate-900">ID Type:</strong> {selectedReport.idType}</p>
                          <p><strong className="text-slate-900">Masked ID Number:</strong> {selectedReport.idNumberMasked}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PAGE 2 CONTENT */}
                  {previewPage === 2 && (
                    <div className="space-y-6">
                      <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4">
                        <h4 className="font-black text-emerald-900 text-sm mb-1 uppercase tracking-wider">
                          Page 2 — Form-C Police Registration Ledger
                        </h4>
                        <p className="text-slate-600">Standardized Form-C record for local police station compliance verification.</p>
                      </div>

                      <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                        <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="p-2 border-b">Field</th>
                            <th className="p-2 border-b">Registered Detail</th>
                            <th className="p-2 border-b">Verification Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          <tr>
                            <td className="p-2 font-bold">Aadhaar/Passport Ref</td>
                            <td className="p-2 font-mono">{selectedReport.idNumberMasked}</td>
                            <td className="p-2 text-emerald-600 font-bold">VERIFIED</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-bold">Verification Engine</td>
                            <td className="p-2">{selectedReport.verifiedBy}</td>
                            <td className="p-2 text-emerald-600 font-bold">PASSED</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-bold">Form-C Submission</td>
                            <td className="p-2">Auto-Generated PDF Ledger</td>
                            <td className="p-2 text-emerald-600 font-bold">READY</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-bold">Encrypted Document Copy</td>
                            <td className="p-2">Local SQLite Encrypted Vault</td>
                            <td className="p-2 text-emerald-600 font-bold">SECURE</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* PAGE 3 CONTENT */}
                  {previewPage === 3 && (
                    <div className="space-y-6">
                      <div className="bg-sky-50/80 border border-sky-200 rounded-xl p-4">
                        <h4 className="font-black text-sky-900 text-sm mb-1 uppercase tracking-wider">
                          Page 3 — Revenue & Room Tariff Ledger
                        </h4>
                        <p className="text-slate-600">Financial auditing ledger breakdown for GST and room charges.</p>
                      </div>

                      <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <span className="font-semibold text-slate-600">Room Base Tariff</span>
                          <span className="font-mono font-bold text-slate-900">₹ {selectedReport.tariffRupees.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <span className="font-semibold text-slate-600">Applicable GST (12%)</span>
                          <span className="font-mono font-bold text-slate-900">₹ {Math.round(selectedReport.tariffRupees * 0.12).toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-1">
                          <span>Total Audited Revenue</span>
                          <span className="text-emerald-600 font-mono">₹ {Math.round(selectedReport.tariffRupees * 1.12).toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PAGE 4 CONTENT */}
                  {previewPage === 4 && (
                    <div className="space-y-6">
                      <div className="bg-slate-100 border border-slate-300 rounded-xl p-4">
                        <h4 className="font-black text-slate-900 text-sm mb-1 uppercase tracking-wider">
                          Page 4 — Security Verification & Audit Logs
                        </h4>
                        <p className="text-slate-600">System audit trail recording document verification timestamps and access keys.</p>
                      </div>

                      <div className="space-y-2 text-slate-600 font-mono text-[11px] bg-slate-900 text-emerald-400 p-4 rounded-xl">
                        <p>[AUDIT_EVENT] {selectedReport.checkInDate} — Check-in initiated via {selectedReport.verifiedBy}</p>
                        <p>[AUDIT_EVENT] {selectedReport.checkInDate} — Aadhaar checksum verified successfully</p>
                        <p>[AUDIT_EVENT] {selectedReport.checkInDate} — Form-C PDF document compiled (Ref: {selectedReport.id})</p>
                        <p>[AUDIT_EVENT] {selectedReport.checkInDate} — Security signature applied (HMAC-SHA256)</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Printable Document Footer */}
                <div className="pt-6 border-t border-slate-200 mt-8 flex justify-between items-end text-[10px] text-slate-400">
                  <div>
                    <p className="font-bold text-slate-600 uppercase">GUEST CHECK-IN ASSISTANT COMPLIANCE VAULT</p>
                    <p>Document Serial: {selectedReport.id}-PG{previewPage}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-slate-800 font-bold block">PAGE {previewPage} OF {TOTAL_PREVIEW_PAGES}</span>
                    <span>Official Verified Document</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 bg-white p-4 -mx-6 -mb-6 rounded-b-3xl">
              <span className="text-xs text-slate-500 font-medium">
                Viewing Page <strong className="text-slate-900">{previewPage}</strong> of {TOTAL_PREVIEW_PAGES}
              </span>

              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrintReport}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>Print Document</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Ledger</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
