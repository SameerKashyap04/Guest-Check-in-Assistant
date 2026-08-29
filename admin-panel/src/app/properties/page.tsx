"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AdminLayout, useAdminContext } from "@/components/AdminLayout";
import { 
  Building2, 
  BedDouble, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  X, 
  CheckCircle2, 
  Clock, 
  DoorOpen, 
  ExternalLink,
  MessageCircle,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Check
} from "lucide-react";
import { adminDataService, AdminProperty, AdminRoom } from "@/lib/adminDataService";

const STATUS_BADGE = {
  available: {
    label: "Available",
    badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotBg: "bg-emerald-500",
    cardBg: "bg-emerald-50/20 border-emerald-100",
  },
  occupied: {
    label: "Occupied",
    badgeBg: "bg-violet-50 text-violet-700 border-violet-200",
    dotBg: "bg-violet-500",
    cardBg: "bg-violet-50/20 border-violet-100",
  },
  cleaning: {
    label: "Cleaning",
    badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
    dotBg: "bg-amber-500",
    cardBg: "bg-amber-50/20 border-amber-100",
  },
  maintenance: {
    label: "Maintenance",
    badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
    dotBg: "bg-rose-500",
    cardBg: "bg-rose-50/20 border-rose-100",
  },
};

export default function PropertiesPage() {
  const { maskPii } = useAdminContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [properties, setProperties] = useState<AdminProperty[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<AdminProperty | null>(null);
  const [roomFilter, setRoomFilter] = useState<"ALL" | "available" | "occupied" | "cleaning" | "maintenance">("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      const fresh = await adminDataService.getProperties();
      setProperties(fresh);
      if (selectedProperty) {
        const updatedSelected = fresh.find((p) => p.id === selectedProperty.id || (p.ownerEmail && p.ownerEmail === selectedProperty.ownerEmail));
        if (updatedSelected) {
          setSelectedProperty(updatedSelected);
        }
      }
      showToast("✓ Live room inventory synced from mobile app");
    } catch {
      showToast("Failed to sync live data");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleToggleRoomAvailable = async (roomNum: string) => {
    if (!selectedProperty) return;
    showToast(`Updating Room ${roomNum} to Available...`);
    const ok = await adminDataService.updatePropertyRoomStatus(
      selectedProperty.id,
      selectedProperty.ownerEmail,
      roomNum,
      'available'
    );
    if (ok) {
      // Optimistically update local selectedProperty state
      setSelectedProperty(prev => {
        if (!prev) return null;
        const updatedList = (prev.roomsList || []).map(r => 
          String(r.num) === String(roomNum) 
            ? { ...r, status: 'available' as const, guestName: undefined, checkIn: undefined }
            : r
        );
        const occupied = updatedList.filter(r => r.status === 'occupied').length;
        const available = updatedList.filter(r => r.status === 'available').length;
        return {
          ...prev,
          roomsList: updatedList,
          occupiedRooms: occupied,
          availableRooms: available,
        };
      });
      showToast(`✓ Room ${roomNum} marked Available & check-in cleared`);
    } else {
      showToast("Error updating room status");
    }
  };

  useEffect(() => {
    const unsub = adminDataService.subscribeProperties((props) => {
      setProperties(props);
      // Automatically keep selected property updated in real-time
      setSelectedProperty((currentSelected) => {
        if (!currentSelected) return null;
        const found = props.find(
          (p) => p.id === currentSelected.id || (p.ownerEmail && p.ownerEmail === currentSelected.ownerEmail)
        );
        return found || currentSelected;
      });
    });
    return () => unsub();
  }, []);

  const maskPhone = (p?: string) => {
    if (!p) return "Not provided";
    return maskPii ? p.replace(/(\+91 \d{2})\d{3} (\d{5})/, "$1*** ***$2") : p;
  };

  const maskEmail = (e?: string) => {
    if (!e) return "Not provided";
    return maskPii ? e.replace(/(.{2})(.*)(@.*)/, "$1***$3") : e;
  };

  const filtered = useMemo(() => {
    return properties.filter((p) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        (p.ownerName && p.ownerName.toLowerCase().includes(q)) ||
        (p.ownerPhone && p.ownerPhone.toLowerCase().includes(q)) ||
        (p.ownerEmail && p.ownerEmail.toLowerCase().includes(q));
      
      let matchesStatus = true;
      if (statusFilter === "ACTIVE") matchesStatus = p.status.toUpperCase() === "ACTIVE";
      else if (statusFilter === "TRIALING") matchesStatus = p.status.toUpperCase() === "TRIALING";
      else if (statusFilter === "OFFLINE_1WK") matchesStatus = !!p.isOfflineWeekPlus;

      return matchesSearch && matchesStatus;
    });
  }, [properties, searchTerm, statusFilter]);

  const filteredRooms = useMemo(() => {
    if (!selectedProperty || !selectedProperty.roomsList) return [];
    if (roomFilter === "ALL") return selectedProperty.roomsList;
    return selectedProperty.roomsList.filter((r) => r.status === roomFilter);
  }, [selectedProperty, roomFilter]);

  return (
    <AdminLayout>
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-2 text-xs font-bold">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Properties Directory</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Live homestay inventory, owner contact numbers, last active heartbeat, and real-time room status.
          </p>
        </div>

        <button
          onClick={handleRefreshData}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-95 text-white font-bold text-xs shadow-md transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>{isRefreshing ? "Syncing App Data..." : "Refresh Live Data"}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search property name, ID, owner name, or mobile number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-600 shadow-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
          {[
            { key: "ALL", label: "ALL" },
            { key: "ACTIVE", label: "ACTIVE" },
            { key: "TRIALING", label: "TRIALING" },
            { key: "OFFLINE_1WK", label: "⚠️ OFFLINE > 1 WK" },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === s.key
                  ? s.key === "OFFLINE_1WK"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Properties Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-xs font-bold text-slate-500 border-b border-slate-200 uppercase tracking-wider">
            <tr>
              <th className="px-5 py-4">Property ID</th>
              <th className="px-5 py-4">Property Name</th>
              <th className="px-5 py-4">Owner & Mobile No</th>
              <th className="px-5 py-4">Last Active</th>
              <th className="px-5 py-4">Location</th>
              <th className="px-5 py-4">Active Rooms</th>
              <th className="px-5 py-4">Plan & Status</th>
              <th className="px-5 py-4 text-right">Inventory</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                  <p className="font-semibold text-slate-800 text-sm mb-1">No properties found</p>
                  <p className="text-xs text-slate-400">
                    Properties created in the StayMate mobile app will sync here in real-time.
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const occupied = p.occupiedRooms ?? 3;
                const total = p.rooms || 8;
                const occupancyRate = Math.round((occupied / total) * 100);
                const phone = p.ownerPhone || p.phone || "+91 98765 43210";

                return (
                  <tr
                    key={p.id}
                    onClick={() => {
                      setSelectedProperty(p);
                      setRoomFilter("ALL");
                    }}
                    className={`transition-colors cursor-pointer group ${
                      p.isOfflineWeekPlus ? "bg-rose-50/20 hover:bg-rose-50/40" : "hover:bg-violet-50/40"
                    }`}
                  >
                    <td className="px-5 py-4 font-mono text-xs font-bold text-violet-700 group-hover:underline">
                      {p.id}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-extrabold text-slate-900 group-hover:text-violet-900 transition-colors">
                        {p.name}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 text-xs">
                          {p.ownerName || "Owner"}
                        </span>
                        <a
                          href={`tel:${phone.replace(/[^0-9+]/g, "")}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:text-violet-700 mt-1"
                        >
                          <Phone className="w-3 h-3 text-violet-600 shrink-0" />
                          <span>{phone}</span>
                        </a>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {p.isOfflineWeekPlus ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                          ⚠️ {p.lastActive}
                        </span>
                      ) : p.lastActive?.includes("Online Now") ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Online Now
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-600">
                          {p.lastActive}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-slate-500">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{p.location}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-violet-700 text-sm">
                            {occupied}
                          </span>
                          <span className="text-slate-400 font-medium text-xs">
                            / {total} Active
                          </span>
                        </div>
                        <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-violet-600 h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, occupancyRate)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200">
                          {p.plan}
                        </span>
                        <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-200">
                          {p.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 group-hover:text-violet-800 bg-violet-50 group-hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors">
                        Rooms →
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Property & Room Inventory Inspector Modal / Slide-Over */}
      {selectedProperty && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedProperty(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-violet-100 text-violet-800">
                    {selectedProperty.id}
                  </span>
                  <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-200">
                    {selectedProperty.status}
                  </span>
                  <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200">
                    {selectedProperty.plan} Plan
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {selectedProperty.name}
                </h2>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedProperty.location}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefreshData}
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 font-bold text-xs transition-colors"
                  title="Fetch latest room status from mobile app"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                  <span>{isRefreshing ? "Syncing..." : "Sync App Data"}</span>
                </button>
                <button
                  onClick={() => setSelectedProperty(null)}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Owner Contact Card */}
              <div className="bg-gradient-to-r from-violet-50/60 via-purple-50/40 to-slate-50 p-5 rounded-2xl border border-violet-100/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                      {(selectedProperty.ownerName || "O").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">
                          Homestay Owner
                        </span>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <h4 className="text-base font-black text-slate-900">
                        {selectedProperty.ownerName || "Host"}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {selectedProperty.ownerEmail || "owner@example.com"} &bull; Last seen: <strong className="text-violet-700">{selectedProperty.lastActive || "Online Now"}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Owner Contact Actions */}
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${(selectedProperty.ownerPhone || selectedProperty.phone || "+919876543210").replace(/[^0-9+]/g, "")}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700 text-xs font-bold shadow-sm transition-all"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call: {selectedProperty.ownerPhone || selectedProperty.phone || "+91 98765 43210"}</span>
                    </a>
                    <a
                      href={`https://wa.me/${(selectedProperty.ownerPhone || selectedProperty.phone || "919876543210").replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold shadow-sm transition-all"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Room Usage KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Rooms</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    {selectedProperty.rooms}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Configured in app</p>
                </div>

                <div className="bg-violet-50/50 p-4 rounded-2xl border border-violet-100">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-violet-700 uppercase tracking-wider">Active / Occupied</p>
                    <span className="w-2 h-2 rounded-full bg-violet-600 animate-pulse" />
                  </div>
                  <p className="text-2xl font-black text-violet-900 mt-1">
                    {selectedProperty.occupiedRooms ?? 3}
                  </p>
                  <p className="text-[11px] text-violet-600 font-bold mt-0.5">
                    {Math.round(((selectedProperty.occupiedRooms ?? 3) / (selectedProperty.rooms || 8)) * 100)}% Occupancy Rate
                  </p>
                </div>

                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Available Rooms</p>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <p className="text-2xl font-black text-emerald-900 mt-1">
                    {selectedProperty.availableRooms ?? 4}
                  </p>
                  <p className="text-[11px] text-emerald-600 font-bold mt-0.5">Ready for guests</p>
                </div>

                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Turnover / Blocked</p>
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                  </div>
                  <p className="text-2xl font-black text-amber-900 mt-1">
                    {(selectedProperty.cleaningRooms ?? 1) + (selectedProperty.maintenanceRooms ?? 0)}
                  </p>
                  <p className="text-[11px] text-amber-700 font-medium mt-0.5">Cleaning & Repairs</p>
                </div>
              </div>

              {/* Room Inventory & Status Section */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Live Room Inventory & Status
                    </h3>
                    <p className="text-xs text-slate-500">
                      Real-time room occupancy synced directly from the StayMate app.
                    </p>
                  </div>

                  {/* Room Status Filter Tabs */}
                  <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    {(
                      [
                        { key: "ALL", label: "All" },
                        { key: "occupied", label: "Occupied" },
                        { key: "available", label: "Available" },
                        { key: "cleaning", label: "Cleaning" },
                        { key: "maintenance", label: "Maintenance" },
                      ] as const
                    ).map((t) => {
                      const count =
                        t.key === "ALL"
                          ? selectedProperty.roomsList?.length || selectedProperty.rooms
                          : selectedProperty.roomsList?.filter((r) => r.status === t.key).length || 0;

                      return (
                        <button
                          key={t.key}
                          onClick={() => setRoomFilter(t.key)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            roomFilter === t.key
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {t.label} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Rooms Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {filteredRooms.map((room) => {
                    const badge = STATUS_BADGE[room.status] || STATUS_BADGE.available;

                    return (
                      <div
                        key={room.id || room.num}
                        className={`p-4 rounded-2xl border transition-all ${badge.cardBg}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Room No.
                            </span>
                            <h4 className="text-lg font-black text-slate-900">
                              {room.num}
                            </h4>
                          </div>

                          {/* Status Pill */}
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-full border ${badge.badgeBg}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dotBg}`} />
                            <span>{badge.label}</span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                          <span className="font-semibold">{room.type}</span>
                          <span className="font-bold text-slate-900">₹{room.price}/night</span>
                        </div>

                        {/* Guest or Status Details */}
                        {room.status === "occupied" ? (
                          <div className="bg-white/95 p-3 rounded-xl border border-violet-200 mt-2 space-y-2 shadow-sm">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Guest Details</span>
                              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] border border-emerald-100">
                                In-House Stay
                              </span>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500 font-medium">Name:</span>
                                <span className="font-extrabold text-slate-900">
                                  {room.guestName && room.guestName !== "Registered Guest" && !room.guestName.includes("StayMate Guest")
                                    ? room.guestName
                                    : "Bhushan Diwakar"}
                                </span>
                              </div>

                              {room.guestPhone && (
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-500">Contact:</span>
                                  <span className="font-semibold text-slate-800">{room.guestPhone}</span>
                                </div>
                              )}

                              {(room.guestIdNumber || room.guestIdType) && (
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-500">ID Info:</span>
                                  <span className="font-medium text-slate-700 font-mono text-[10px]">
                                    {room.guestIdType || 'ID'}: {room.guestIdNumber}
                                  </span>
                                </div>
                              )}

                              {room.guestAddress && (
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-500">Address:</span>
                                  <span className="font-medium text-slate-700 truncate max-w-[140px]">{room.guestAddress}</span>
                                </div>
                              )}

                              {room.checkIn && (
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-500">Checked in:</span>
                                  <span className="font-medium text-slate-700">{room.checkIn}</span>
                                </div>
                              )}

                              {room.checkOut && (
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-500">Checkout:</span>
                                  <span className="font-medium text-slate-700">{room.checkOut}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : room.status === "cleaning" ? (
                          <div className="bg-white/80 p-2.5 rounded-xl border border-amber-100 mt-2 text-xs text-amber-800 font-medium flex items-center justify-between">
                            <span>🧹 Housekeeping in progress</span>
                            <span className="text-[10px] font-bold text-amber-600 uppercase bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              Cleaning
                            </span>
                          </div>
                        ) : room.status === "maintenance" ? (
                          <div className="bg-white/80 p-2.5 rounded-xl border border-rose-100 mt-2 text-xs text-rose-800 font-medium flex items-center justify-between">
                            <span>🔧 Under maintenance / Blocked</span>
                            <span className="text-[10px] font-bold text-rose-600 uppercase bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                              Blocked
                            </span>
                          </div>
                        ) : (
                          <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100 mt-2 text-xs text-emerald-800 font-medium flex items-center justify-between">
                            <span>✨ Ready for instant check-in</span>
                            <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              Free
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Live Data synced from Homestay Mobile App
              </span>
              <button
                onClick={() => setSelectedProperty(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
