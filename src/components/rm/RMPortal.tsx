"use client";

import React, { useState } from "react";
import { LoanApplication } from "@/types";
import PortfolioList from "./PortfolioList";
import AssessmentDashboard from "./AssessmentDashboard";
import { Building2, Shield, LogOut, KeyRound } from "lucide-react";

export default function RMPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("rm@ubl.com");
  const [password, setPassword] = useState("cashpulse2026");
  const [selectedApp, setSelectedApp] = useState<LoanApplication | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === "rm@ubl.com" && password === "cashpulse2026") {
      setIsAuthenticated(true);
    } else {
      alert("Invalid credentials. Demo: rm@ubl.com / cashpulse2026");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#081921] flex flex-col items-center justify-center p-4 font-sans text-white">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-xl bg-[#2F96B4] flex items-center justify-center mx-auto text-white shadow-lg shadow-[#2F96B4]/20">
              <Building2 className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              UBL Risk Admin Portal
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Relationship Manager Authorization Gate
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Official UBL Staff Email:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-medium text-white focus:outline-none focus:border-[#2F96B4] focus:ring-2 focus:ring-[#2F96B4]/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password:
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-medium text-white focus:outline-none focus:border-[#2F96B4] focus:ring-2 focus:ring-[#2F96B4]/20 transition-all"
              />
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-[#E0A63B] font-mono space-y-0.5">
              <p className="font-bold">Staff Login Credentials:</p>
              <p>Email: rm@ubl.com</p>
              <p>Password: cashpulse2026</p>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#2F96B4] hover:bg-[#257A93] text-white font-semibold text-xs rounded-lg flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md"
            >
              <KeyRound className="w-4 h-4" />
              <span>Access RM Portal</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F6F6] flex flex-col font-sans text-[#081921]">
      {/* RM Portal Header (#081921 & #2F96B4) */}
      <header className="bg-[#081921] text-white border-b border-slate-800 sticky top-0 z-50 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#2F96B4] flex items-center justify-center text-white shadow-md shadow-[#2F96B4]/30">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xl tracking-tight text-white font-sans">
                    UBL <span className="text-[#2F96B4]">Risk Admin</span>
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-[#2F96B4]/20 text-[#2F96B4] border border-[#2F96B4]/30 rounded-full">
                    RM Portal
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  Relationship Manager Loan Origination & Credit Pipeline
                </p>
              </div>
            </div>

            {/* Right Officer Info & Logout */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-slate-900/90 rounded-xl border border-slate-800">
                <Shield className="w-4 h-4 text-[#2F96B4]" />
                <div className="text-left">
                  <span className="block text-xs font-bold text-white leading-tight">
                    UBL Senior RM
                  </span>
                  <span className="block text-[10px] text-slate-400">Karachi Commercial</span>
                </div>
              </div>

              <button
                onClick={() => setIsAuthenticated(false)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-rose-950/40 text-slate-300 hover:text-[#D9534F] border border-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {selectedApp ? (
          <AssessmentDashboard
            application={selectedApp}
            onBack={() => setSelectedApp(null)}
          />
        ) : (
          <PortfolioList onSelectApplication={(app) => setSelectedApp(app)} />
        )}
      </main>
    </div>
  );
}
