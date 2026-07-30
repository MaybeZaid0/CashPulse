"use client";

import React, { useState } from "react";
import { SMEProfile } from "@/types";
import { DEMO_SME_PROFILES } from "@/lib/sme-data";
import { loginSME } from "@/lib/api";
import { Activity, ShieldCheck, KeyRound, User, Mail, CreditCard, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";

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
      <div className="bg-white rounded-3xl border border-[#E4EBF2] shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        
        {/* Left Column: Brand Overview & Info */}
        <div className="lg:col-span-5 bg-[#012A4A] p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-[#0083CA]/20 blur-3xl pointer-events-none" />
          
          <div className="space-y-6 relative z-10">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-[#0083CA] flex items-center justify-center shadow-lg shadow-[#0083CA]/30">
                <Activity className="w-7 h-7 text-white" />
              </div>
              <div>
                <span className="font-extrabold text-2xl tracking-tight text-white">
                  Cash<span className="text-[#00B7E4]">Pulse</span>
                </span>
                <p className="text-xs text-slate-300 font-medium">UBL Digital SME Portal</p>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <h2 className="text-xl font-bold leading-snug">
                Welcome to UBL SME Business & Financing Portal
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Log in using your registered business CNIC, Email address, and Password to view real-time account cashflow, assessment metrics, and request 0%-interest working capital loans.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center space-x-2.5 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-[#00B7E4]" />
                <span>MongoDB Verified SME Dummy Accounts</span>
              </div>
              <div className="flex items-center space-x-2.5 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-[#00B7E4]" />
                <span>Real-time CashPulse Readiness Assessment</span>
              </div>
              <div className="flex items-center space-x-2.5 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-[#00B7E4]" />
                <span>Direct Digital Loan Application</span>
              </div>
            </div>
          </div>

          <div className="pt-8 relative z-10">
            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 flex items-center space-x-3 text-emerald-400">
              <ShieldCheck className="w-5 h-5 flex-shrink-0" />
              <p className="text-[11px] font-semibold leading-tight">
                Protected by UBL Digital Banking Enterprise Security & Encryption
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Login Form & Quick Fill */}
        <div className="lg:col-span-7 p-8 flex flex-col justify-between space-y-6">
          <div>
            <div className="mb-6">
              <h3 className="text-xl font-extrabold text-[#0E1B2A]">SME Portal Sign In</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Enter your credentials to load your SME financial profile data
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-3 text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0E1B2A] mb-1.5">
                  Business CNIC Number:
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={cnic}
                    onChange={(e) => setCnic(e.target.value)}
                    placeholder="e.g. 42101-1234567-1"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-[#0083CA] focus:ring-2 focus:ring-[#0083CA]/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0E1B2A] mb-1.5">
                  Registered Email Address:
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. ahmed@fmcg.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-[#0083CA] focus:ring-2 focus:ring-[#0083CA]/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0E1B2A] mb-1.5">
                  Account Password:
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-[#0083CA] focus:ring-2 focus:ring-[#0083CA]/10 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#0083CA] hover:bg-[#005B8F] text-white font-extrabold text-xs rounded-xl flex items-center justify-center space-x-2 shadow-md shadow-[#0083CA]/20 transition-all disabled:opacity-50 mt-2 cursor-pointer"
              >
                {loading ? (
                  <span>Querying & Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In & Load SME Profile</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick-fill Dummy Account Helper */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Select Demo Account Credentials (1-Click Fill):
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DEMO_SME_PROFILES.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => handleQuickFill(profile)}
                  className="p-2 rounded-xl bg-slate-50 hover:bg-[#0083CA]/10 hover:border-[#0083CA]/30 border border-slate-200 text-left transition-all group"
                >
                  <p className="text-[11px] font-bold text-[#0E1B2A] truncate group-hover:text-[#0083CA]">
                    {profile.name}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">{profile.city}</p>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
