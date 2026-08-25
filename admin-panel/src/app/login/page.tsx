"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Lock, 
  Mail, 
  KeyRound, 
  ArrowRight, 
  RefreshCw, 
  AlertCircle
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("dev@company.com");
  const [password, setPassword] = useState("••••••••");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "LOGIN",
          email,
          password,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "staymate_super_admin_session",
            JSON.stringify({
              authenticated: true,
              email: data.email || email,
              username: data.username || "superadmin",
              role: "SUPER_ADMIN",
              token: data.token,
              loginTime: new Date().toISOString(),
            })
          );
        }
        router.push("/");
      } else {
        setIsLoading(false);
        setErrorMsg(data.error || "Invalid Super Admin credentials.");
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg("Failed to connect to authentication server. Please check your network.");
    }
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
            Super-Admin Console
          </span>
          <h1 className="text-xl font-black text-slate-900">
            Super-Admin Sign In
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Internal Operations, System Config &amp; Developer Portal
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs font-semibold text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Super-Admin Email or Username
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dev@company.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-violet-600 focus:bg-white transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Super-Admin Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-violet-600 focus:bg-white transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-violet-600 hover:bg-violet-700 active:scale-95 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-md shadow-violet-500/20 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Signing In…</span>
              </>
            ) : (
              <>
                <span>Sign In to Super-Admin</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 font-medium">
            StayMate SaaS Platform &copy; 2026 Developer Operations
          </p>
        </div>
      </div>
    </div>
  );
}
