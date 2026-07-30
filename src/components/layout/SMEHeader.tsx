"use client";

import React from "react";
import { Activity, ShieldCheck, User, LogOut } from "lucide-react";

export default function SMEHeader() {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-white font-sans">
                  Cash<span className="text-sky-400">Pulse</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full">
                  SME Portal
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                UBL Working Capital Financing & Cashflow Dashboard
              </p>
            </div>
          </div>

          {/* Right Profile Actions */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800 rounded-xl border border-slate-700">
              <div className="w-7 h-7 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
                <User className="w-4 h-4" />
              </div>
              <div className="text-left hidden sm:block">
                <span className="block text-xs font-bold text-white leading-tight">My SME Account</span>
                <span className="block text-[10px] text-slate-400">UBL Digital Banking</span>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[11px] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Zero-Interest Model</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
