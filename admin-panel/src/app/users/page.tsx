"use client";

import React, { useState } from "react";
import { AdminLayout, useAdminContext } from "@/components/AdminLayout";
import { Search, Filter, Mail, Phone, Building2, Crown, Shield, Eye, EyeOff, Edit, Check, Sparkles, X } from "lucide-react";

interface OwnerUser {
  id: string;
  name: string;
  businessName: string;
  email: string;
  phone: string;
  propertyId: string;
  plan: "FREE" | "STARTER" | "PROFESSIONAL" | "MULTI_PROPERTY";
  status: "active" | "trialing" | "past_due" | "cancelled";
  rooms: number;
  checkInsThisMonth: number;
  createdAt: string;
}

export default function UsersPage() {
  const { maskPii } = useAdminContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlanFilter, setSelectedPlanFilter] = useState("ALL");
  const [selectedUser, setSelectedUser] = useState<OwnerUser | null>(null);
  const [updateMsg, setUpdateMsg] = useState("");

  const [users, setUsers] = useState<OwnerUser[]>([
    {
      id: "usr_101",
      name: "Ramesh Hegde",
      businessName: "Coorg Hilltop Homestay",
      email: "ramesh.hegde@coorgstay.com",
      phone: "+91 98450 12345",
      propertyId: "HS-8821",
      plan: "PROFESSIONAL",
      status: "active",
      rooms: 18,
      checkInsThisMonth: 142,
      createdAt: "2026-01-15",
    },
    {
      id: "usr_102",
      name: "Anil Sharma",
      businessName: "Manali Pine Resort",
      email: "anil.sharma@manaliresort.in",
      phone: "+91 98160 54321",
      propertyId: "HS-4492",
      plan: "STARTER",
      status: "active",
      rooms: 12,
      checkInsThisMonth: 86,
      createdAt: "2026-02-01",
    },
    {
      id: "usr_103",
      name: "Vikram Menon",
      businessName: "Wayanad Forest Lodge",
      email: "v.menon@wayanadlodge.com",
      phone: "+91 94470 99887",
      propertyId: "HS-3109",
      plan: "PROFESSIONAL",
      status: "trialing",
      rooms: 24,
      checkInsThisMonth: 65,
      createdAt: "2026-03-04",
    },
    {
      id: "usr_104",
      name: "Priya Nair",
      businessName: "Munnar Tea Valley Guesthouse",
      email: "priya@teavalleyguesthouse.in",
      phone: "+91 97440 11223",
      propertyId: "HS-9012",
      plan: "FREE",
      status: "active",
      rooms: 8,
      checkInsThisMonth: 18,
      createdAt: "2026-02-18",
    },
    {
      id: "usr_105",
      name: "Sunil D'Souza",
      businessName: "Goa Beachside Lodge",
      email: "sunil@goabeachside.com",
      phone: "+91 98221 33445",
      propertyId: "HS-7734",
      plan: "STARTER",
      status: "active",
      rooms: 15,
      checkInsThisMonth: 195,
      createdAt: "2026-01-10",
    },
  ]);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.propertyId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = selectedPlanFilter === "ALL" || u.plan === selectedPlanFilter;
    return matchesSearch && matchesPlan;
  });

  const handleUpdatePlan = (newPlan: OwnerUser["plan"]) => {
    if (!selectedUser) return;
    setUsers((prev) =>
      prev.map((u) => (u.id === selectedUser.id ? { ...u, plan: newPlan } : u))
    );
    setSelectedUser({ ...selectedUser, plan: newPlan });
    setUpdateMsg(`Updated ${selectedUser.businessName} to ${newPlan}`);
    setTimeout(() => setUpdateMsg(""), 2000);
  };

  const maskPhone = (phone: string) => {
    if (!maskPii) return phone;
    return phone.replace(/(\+91 \d{5}) \d{5}/, "$1 *****");
  };

  return (
    <AdminLayout>
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Property Owners
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Manage homestay accounts, check-in quotas, and subscription tiers.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search by owner name, business, or property ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-600 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-xl shadow-sm overflow-x-auto">
          {["ALL", "FREE", "STARTER", "PROFESSIONAL"].map((plan) => (
            <button
              key={plan}
              onClick={() => setSelectedPlanFilter(plan)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                selectedPlanFilter === plan
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {plan}
            </button>
          ))}
        </div>
      </div>

      {/* Table (Light Mode) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500 border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Property & Owner</th>
                <th className="px-6 py-4">Property ID</th>
                <th className="px-6 py-4">Plan & Status</th>
                <th className="px-6 py-4">Rooms</th>
                <th className="px-6 py-4">Monthly Check-ins</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-extrabold text-slate-900">{user.businessName}</p>
                      <p className="text-xs text-slate-500 font-medium">
                        {user.name} • {maskPhone(user.phone)}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs font-bold text-violet-700">
                    {user.propertyId}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                          user.plan === "PROFESSIONAL"
                            ? "bg-violet-100 text-violet-800 border-violet-200"
                            : user.plan === "STARTER"
                            ? "bg-amber-100 text-amber-800 border-amber-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {user.plan}
                      </span>
                      {user.status === "trialing" && (
                        <span className="text-[10px] font-extrabold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full border border-sky-200">
                          TRIAL
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-extrabold text-slate-900">{user.rooms}</td>
                  <td className="px-6 py-4 font-bold text-emerald-600">
                    {user.checkInsThisMonth} check-ins
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors border border-slate-200"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Manage User Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  {selectedUser.businessName}
                </h3>
                <p className="text-xs text-slate-500">ID: {selectedUser.propertyId}</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {updateMsg && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{updateMsg}</span>
              </div>
            )}

            <div className="space-y-4 mb-6 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-slate-400 font-semibold block">Owner Name</span>
                  <span className="font-bold text-slate-900">{selectedUser.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Phone</span>
                  <span className="font-mono font-bold text-slate-900">
                    {maskPhone(selectedUser.phone)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Email</span>
                  <span className="font-bold text-slate-900">{selectedUser.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Joined Date</span>
                  <span className="font-bold text-slate-900">{selectedUser.createdAt}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Change Plan Tier Dynamically
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["FREE", "STARTER", "PROFESSIONAL"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => handleUpdatePlan(p)}
                      className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition-all ${
                        selectedUser.plan === p
                          ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedUser(null)}
              className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
