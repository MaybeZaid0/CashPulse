"use client";

import React, { useState } from "react";
import { SMEProfile } from "@/types";
import AccountOverview from "./AccountOverview";
import LoanApplicationForm from "./LoanApplicationForm";
import ApplicationStatusView from "./ApplicationStatusView";
import SMELoginCard from "./SMELoginCard";
import { Activity, ShieldCheck, User, History, CreditCard, Clock, LogOut, Menu, X } from "lucide-react";

export default function SMEPortal() {
  const [selectedSme, setSelectedSme] = useState<SMEProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"ACCOUNT" | "APPLY" | "STATUS">("ACCOUNT");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const handleTabChange = (tab: "ACCOUNT" | "APPLY" | "STATUS") => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F6F6F6] flex flex-col font-sans">
      {/* SME Portal Header (#081921 & #2F96B4 per Design Spec v1) */}
      <header className="bg-[#081921] text-white border-b border-slate-800 sticky top-0 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left: Mobile Hamburger Button & Brand Logo */}
            <div className="flex items-center space-x-3">
              {selectedSme && (
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="md:hidden p-2 rounded-lg text-[#2F96B4] hover:bg-slate-800 transition-all cursor-pointer focus:outline-none"
                  aria-label="Open Mobile Navigation Menu"
                >
                  <Menu className="w-6 h-6" />
                </button>
              )}

              <div className="w-10 h-10 rounded-xl bg-[#2F96B4] flex items-center justify-center shadow-md shadow-[#2F96B4]/30">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xl tracking-tight text-white font-sans">
                    Cash<span className="text-[#2F96B4]">Pulse</span>
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-[#2F96B4]/20 text-[#2F96B4] border border-[#2F96B4]/30 rounded-full">
                    SME Portal
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium hidden sm:block">
                  UBL SME Business Account & Loan Portal
                </p>
              </div>
            </div>

            {/* Right: Logged in SME status info & Logout action */}
            <div className="flex items-center space-x-4">
              {selectedSme ? (
                <>
                  <div className="hidden sm:flex items-center space-x-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
                    <User className="w-4 h-4 text-[#2F96B4]" />
                    <div className="text-left">
                      <span className="block text-xs font-bold text-white leading-tight">
                        {selectedSme.name}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        CNIC: {selectedSme.cnic || "Verified"} | {selectedSme.city}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedSme(null);
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-rose-950/40 text-slate-300 hover:text-[#D9534F] border border-slate-800 hover:border-[#D9534F]/50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </>
              ) : (
                <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#2F9E5E]/10 text-[#2F9E5E] border border-[#2F9E5E]/30 rounded-lg text-[11px] font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>0% Interest Loan</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Left Navigation Drawer (Design Spec v1 Section 3.1) */}
      {selectedSme && isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Dark Backdrop Overlay */}
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-[#081921]/70 backdrop-blur-xs transition-opacity"
          />

          {/* Left Slide-Over Drawer Content */}
          <div className="fixed inset-y-0 left-0 w-72 bg-[#081921] text-white p-6 shadow-2xl flex flex-col justify-between z-50 border-r border-slate-800 animate-in slide-in-from-left duration-200">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#2F96B4] flex items-center justify-center shadow-md">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="font-bold text-lg text-white">
                      Cash<span className="text-[#2F96B4]">Pulse</span>
                    </span>
                    <p className="text-[10px] text-slate-400">Navigation Menu</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* SME Profile Snapshot */}
              <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-[#2F96B4]/20 text-[#2F96B4] flex items-center justify-center font-bold text-sm">
                  {selectedSme.name.charAt(0)}
                </div>
                <div className="text-left overflow-hidden">
                  <span className="block text-xs font-bold text-white truncate">
                    {selectedSme.name}
                  </span>
                  <span className="block text-[10px] text-slate-400 truncate">
                    {selectedSme.city}, Pakistan
                  </span>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleTabChange("ACCOUNT")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${
                    activeTab === "ACCOUNT"
                      ? "bg-[#2F96B4] text-white shadow-md shadow-[#2F96B4]/20"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>1. Account & Money History</span>
                </button>

                <button
                  onClick={() => handleTabChange("APPLY")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${
                    activeTab === "APPLY"
                      ? "bg-[#2F96B4] text-white shadow-md shadow-[#2F96B4]/20"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>2. Request Business Loan</span>
                </button>

                <button
                  onClick={() => handleTabChange("STATUS")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${
                    activeTab === "STATUS"
                      ? "bg-[#2F96B4] text-white shadow-md shadow-[#2F96B4]/20"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>3. Loan Request Status</span>
                </button>
              </div>
            </div>

            {/* Drawer Bottom Logout Action */}
            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  setSelectedSme(null);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-rose-950/40 text-slate-300 hover:text-[#D9534F] border border-slate-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout SME Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 space-y-6">
        {!selectedSme ? (
          <SMELoginCard onLoginSuccess={(sme) => setSelectedSme(sme)} />
        ) : (
          <>
            {/* Desktop Navigation Tabs (hidden on mobile, drawer used instead) */}
            <div className="hidden md:flex items-center space-x-2 bg-white p-2 rounded-2xl border border-[#E2E6E7] shadow-sm">
              <button
                onClick={() => setActiveTab("ACCOUNT")}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "ACCOUNT"
                    ? "bg-[#2F96B4] text-white shadow-md shadow-[#2F96B4]/20"
                    : "text-[#081921] hover:bg-[#F6F6F6]"
                }`}
              >
                <History className="w-4 h-4" />
                <span>1. Account & Money History</span>
              </button>

              <button
                onClick={() => setActiveTab("APPLY")}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "APPLY"
                    ? "bg-[#2F96B4] text-white shadow-md shadow-[#2F96B4]/20"
                    : "text-[#081921] hover:bg-[#F6F6F6]"
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>2. Request Business Loan</span>
              </button>

              <button
                onClick={() => setActiveTab("STATUS")}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "STATUS"
                    ? "bg-[#2F96B4] text-white shadow-md shadow-[#2F96B4]/20"
                    : "text-[#081921] hover:bg-[#F6F6F6]"
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
          </>
        )}
      </main>
    </div>
  );
}
