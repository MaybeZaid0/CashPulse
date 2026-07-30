"use client";

import React from "react";
import { Building2, Shield, Lock } from "lucide-react";

export default function RMHeader() {
  return (
    <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-50 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Building2 className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-white font-sans">
                  UBL <span className="text-amber-400">Risk Admin</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
                  RM Portal
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Relationship Manager Loan Origination & Credit Pipeline
              </p>
            </div>
          </div>

          {/* Right Security & Officer Info */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-900 rounded-xl border border-slate-800">
              <Shield className="w-4 h-4 text-amber-400" />
              <div className="text-left hidden sm:block">
                <span className="block text-xs font-bold text-white leading-tight">UBL RM Officer</span>
                <span className="block text-[10px] text-slate-400">Karachi Commercial Branch</span>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-[11px] font-semibold">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Internal Bank Access</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
