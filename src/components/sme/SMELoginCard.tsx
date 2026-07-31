"use client";

import React, { useState } from "react";
import { SMEProfile } from "@/types";
import { DEMO_SME_PROFILES } from "@/lib/sme-data";
import { loginSME } from "@/lib/api";
import { Activity, ShieldCheck, KeyRound, Mail, CreditCard, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";

interface SMELoginCardProps {
  onLoginSuccess: (sme: SMEProfile) => void;
}

export default function SMELoginCard({ onLoginSuccess }: SMELoginCardProps) {
  const [cnic, setCnic] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!cnic.trim() || !email.trim() || !password.trim()) {
      setError("Please provide CNIC, Email, and Password.");
      return;
    }

    setLoading(true);
    try {
      const loggedSme = await loginSME(cnic, email, password);
      onLoginSuccess(loggedSme);
    } catch (err: any) {
      setError(err.message || "Invalid CNIC, Email, or Password.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (profile: SMEProfile) => {
    setCnic(profile.cnic || "");
    setEmail(profile.email || "");
    setPassword(profile.password || "password123");
    setError(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 font-sans">
      <div className="bg-white rounded-2xl border border-[#E2E6E7] shadow-lg overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        
        {/* Left Column: Brand Overview & Info (#081921 & #2F96B4 per Design Spec v1) */}
        <div className="lg:col-span-5 bg-[#081921] p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-6 relative z-10">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-xl bg-[#2F96B4] flex items-center justify-center shadow-md shadow-[#2F96B4]/30">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="font-bold text-2xl tracking-tight text-white">
                  Cash<span className="text-[#2F96B4]">Pulse</span>
                </span>
                <p className="text-xs text-slate-300 font-medium">UBL Digital SME Portal</p>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <h2 className="text-xl font-bold leading-snug">
                Welcome to UBL SME Business & Financing Portal
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Log in using your registered business CNIC, Email address, and Password to view real-time account cashflow, assessment metrics, and request working capital loans.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <div className="flex items-center space-x-2.5 text-xs text-slate-200 font-medium">
                <CheckCircle2 className="w-4 h-4 text-[#2F96B4]" />
                <span>Verified Business Account Access</span>
              </div>
              <div className="flex items-center space-x-2.5 text-xs text-slate-200 font-medium">
                <CheckCircle2 className="w-4 h-4 text-[#2F96B4]" />
                <span>Real-Time Cashflow & Credit Metrics</span>
              </div>
              <div className="flex items-center space-x-2.5 text-xs text-slate-200 font-medium">
                <CheckCircle2 className="w-4 h-4 text-[#2F96B4]" />
                <span>Fast Digital Loan Applications</span>
              </div>
            </div>
          </div>

          <div className="pt-8 relative z-10">
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center space-x-3 text-slate-200">
              <ShieldCheck className="w-5 h-5 flex-shrink-0 text-[#2F96B4]" />
              <p className="text-[11px] font-medium leading-tight">
                Protected by UBL Enterprise Banking Security
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Login Form & Quick Fill */}
        <div className="lg:col-span-7 p-8 flex flex-col justify-between space-y-6 bg-white">
          <div>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-[#081921]">SME Portal Sign In</h3>
              <p className="text-xs text-[#5C6B70] font-medium mt-1">
                Enter your credentials to access your business account
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3 text-[#D9534F] text-xs">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#D9534F]" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5C6B70] mb-1.5">
                  Business CNIC Number:
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-[#5C6B70] absolute left-3 top-3" />
                  <input
                    type="text"
                    value={cnic}
                    onChange={(e) => setCnic(e.target.value)}
                    placeholder="e.g. 42101-1234567-1"
                    required
                    className="w-full pl-9 pr-4 py-2 rounded-lg bg-white border border-[#E2E6E7] text-xs font-medium text-[#081921] focus:outline-none focus:border-[#2F96B4] focus:ring-2 focus:ring-[#2F96B4]/15 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C6B70] mb-1.5">
                  Registered Email Address:
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#5C6B70] absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. ahmed@fmcg.com"
                    required
                    className="w-full pl-9 pr-4 py-2 rounded-lg bg-white border border-[#E2E6E7] text-xs font-medium text-[#081921] focus:outline-none focus:border-[#2F96B4] focus:ring-2 focus:ring-[#2F96B4]/15 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C6B70] mb-1.5">
                  Account Password:
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#5C6B70] absolute left-3 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-9 pr-4 py-2 rounded-lg bg-white border border-[#E2E6E7] text-xs font-medium text-[#081921] focus:outline-none focus:border-[#2F96B4] focus:ring-2 focus:ring-[#2F96B4]/15 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#2F96B4] hover:bg-[#257A93] text-white font-semibold text-sm rounded-lg flex items-center justify-center space-x-2 transition-all disabled:opacity-50 mt-2 cursor-pointer shadow-md"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In & Load SME Profile</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick-fill Demo Accounts */}
          <div className="pt-4 border-t border-[#E2E6E7]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-[#5C6B70] uppercase tracking-wider">
                Select Demo Account Credentials:
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DEMO_SME_PROFILES.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => handleQuickFill(profile)}
                  className="p-2 rounded-lg bg-[#F6F6F6] hover:bg-[#2F96B4]/10 hover:border-[#2F96B4]/30 border border-[#E2E6E7] text-left transition-all group cursor-pointer"
                >
                  <p className="text-[11px] font-bold text-[#081921] truncate group-hover:text-[#2F96B4]">
                    {profile.name}
                  </p>
                  <p className="text-[10px] text-[#5C6B70] truncate">{profile.city}</p>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
