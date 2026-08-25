"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Lock, ShieldAlert, Building2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("superadmin@company.com");
  const [password, setPassword] = useState("••••••••");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#f8f7fb] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200/90 rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <div className="items-center text-center mb-6">
          <img
            src="/logo-with-text.png"
            alt="StayMate"
            className="h-12 w-auto max-w-[200px] mx-auto mb-3 object-contain"
          />
          <span className="text-[10px] font-extrabold tracking-widest text-violet-700 bg-violet-50 px-3 py-1 rounded-full uppercase border border-violet-200 inline-block mb-2">
            Developer Operations Only
          </span>
          <h1 className="text-xl font-black text-slate-900">StayMate Super-Admin Portal</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Internal Operations, System Config & Developer Console
          </p>
        </div>

        {/* RESTRICTED ACCESS NOTICE */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200/90 rounded-2xl flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed text-amber-900 font-medium">
            <strong className="font-extrabold block text-amber-950 mb-0.5">Restricted Internal System</strong>
            This console is strictly for the <span className="font-bold underline decoration-amber-400">StayMate Platform Operations Team</span>. Hotel, homestay, resort, and guesthouse operators use the StayMate mobile/web app for guest registrations.
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Developer Super-Admin Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-violet-600 focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Master Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-violet-600 focus:bg-white"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-violet-600 hover:bg-violet-700 active:scale-95 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-md shadow-violet-500/20 cursor-pointer"
          >
            Authenticate Company Session
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 font-medium">
            StayMate SaaS Platform &copy; 2026 Developer Company Operations
          </p>
        </div>
      </div>
    </div>
  );
}

