"use client";

import React, { useState } from "react";
import { LoanApplication } from "@/types";
import PortfolioList from "./PortfolioList";
import AssessmentDashboard from "./AssessmentDashboard";
import { Building2, Shield, LogOut, KeyRound } from "lucide-react";
import { apiLogin, clearAuthToken } from "@/lib/api-client";

export default function RMPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [email, setEmail] = useState("rm@ubl.com");
  const [password, setPassword] = useState("cashpulse2026");
  const [selectedApp, setSelectedApp] = useState<LoanApplication | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    
    const { data, error } = await apiLogin(email, password);
    
    if (error) {
      setErrorMsg(error);
      setIsLoading(false);
    } else {
      setIsAuthenticated(true);
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#012A4A] flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 text-white">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-[#0083CA]/20 border border-[#0083CA]/30 flex items-center justify-center mx-auto text-[#00B7E4] shadow-lg shadow-[#0083CA]/10">
              <Building2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white font-sans">
              UBL Risk Admin Portal
            </h1>
            <p className="text-xs text-slate-300 font-medium">
              PRD F-1: Relationship Manager Login Gate
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Official UBL Staff Email:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-white focus:outline-none focus:border-[#0083CA]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Password:
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-white focus:outline-none focus:border-[#0083CA]"
              />
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-[#F2A900] font-mono space-y-0.5">
              <p className="font-bold">Demo Login Credentials:</p>
              <p>Email: rm@ubl.com</p>
              <p>Password: cashpulse2026</p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/50 border border-red-900 rounded-xl text-xs text-red-200">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 bg-[#0083CA] hover:bg-[#005B8F] text-white font-extrabold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <KeyRound className="w-4 h-4" />
              <span>{isLoading ? "Authenticating..." : "Access RM Portal"}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col font-sans">
      {/* Header */}
      <header className="bg-[#012A4A] text-white border-b border-slate-800 sticky top-0 z-50 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#0083CA] flex items-center justify-center text-white font-bold">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-xl tracking-tight text-white font-sans">
                    UBL <span className="text-[#F2A900]">Risk Admin</span>
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-[#F2A900]/10 text-[#F2A900] border border-[#F2A900]/20 rounded-full">
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
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-slate-900 rounded-xl border border-slate-800">
                <Shield className="w-4 h-4 text-[#F2A900]" />
                <div className="text-left">
                  <span className="block text-xs font-bold text-white leading-tight">
                    UBL Senior RM
                  </span>
                  <span className="block text-[10px] text-slate-400">Karachi Commercial</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs font-bold transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
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
