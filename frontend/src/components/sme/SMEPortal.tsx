"use client";

import React, { useState } from "react";
import { DEMO_SME_PROFILES } from "@/lib/sme-data";
import { SMEProfile } from "@/types";
import AccountOverview from "./AccountOverview";
import LoanApplicationForm from "./LoanApplicationForm";
import ApplicationStatusView from "./ApplicationStatusView";
import { Activity, ShieldCheck, User, Layers, History, CreditCard, Clock } from "lucide-react";

export default function SMEPortal() {
  const [selectedSme, setSelectedSme] = useState<SMEProfile>(DEMO_SME_PROFILES[0]);
  const [activeTab, setActiveTab] = useState<"ACCOUNT" | "APPLY" | "STATUS">("ACCOUNT");

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col font-sans">
      {/* SME Portal Header (Canonical UBL Blue #0083CA) */}
      <header className="bg-[#012A4A] text-white border-b border-slate-800 sticky top-0 z-50 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#0083CA] flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-xl tracking-tight text-white font-sans">
                    Cash<span className="text-[#00B7E4]">Pulse</span>
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-[#0083CA]/20 text-[#00B7E4] border border-[#0083CA]/30 rounded-full">
                    SME Portal
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  UBL SME Business Account & Loan Portal
                </p>
              </div>
            </div>

            {/* Persona Switcher Dropdown & Badges */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                <Layers className="w-3.5 h-3.5 text-[#00B7E4]" />
                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Demo Account:</span>
                <select
                  value={selectedSme.id}
                  onChange={(e) => {
                    const found = DEMO_SME_PROFILES.find((s) => s.id === e.target.value);
                    if (found) setSelectedSme(found);
                  }}
                  className="bg-transparent text-xs font-bold text-[#00B7E4] focus:outline-none cursor-pointer"
                >
                  {DEMO_SME_PROFILES.map((sme) => (
                    <option key={sme.id} value={sme.id} className="bg-slate-900 text-white">
                      {sme.name} ({sme.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#1E9E5A]/10 text-[#1E9E5A] border border-[#1E9E5A]/30 rounded-lg text-[11px] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>0% Interest Loan</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 bg-white p-2 rounded-2xl border border-[#E4EBF2] shadow-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab("ACCOUNT")}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "ACCOUNT"
                ? "bg-[#0083CA] text-white shadow-md shadow-[#0083CA]/20"
                : "text-[#0E1B2A] hover:bg-[#F4F7FB]"
            }`}
          >
            <History className="w-4 h-4" />
            <span>1. Account & Money History</span>
          </button>

          <button
            onClick={() => setActiveTab("APPLY")}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "APPLY"
                ? "bg-[#0083CA] text-white shadow-md shadow-[#0083CA]/20"
                : "text-[#0E1B2A] hover:bg-[#F4F7FB]"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>2. Request Business Loan</span>
          </button>

          <button
            onClick={() => setActiveTab("STATUS")}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "STATUS"
                ? "bg-[#0083CA] text-white shadow-md shadow-[#0083CA]/20"
                : "text-[#0E1B2A] hover:bg-[#F4F7FB]"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>3. Loan Request Status</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "ACCOUNT" && <AccountOverview sme={selectedSme} />}
        {activeTab === "APPLY" && (
          <LoanApplicationForm
            sme={selectedSme}
            onSubmitSuccess={() => setActiveTab("STATUS")}
          />
        )}
        {activeTab === "STATUS" && <ApplicationStatusView sme={selectedSme} />}
      </main>
    </div>
  );
}
