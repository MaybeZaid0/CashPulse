"use client";

import React, { useState, useEffect } from "react";
import { LoanApplication } from "@/types";
import { DEMO_SME_PROFILES } from "@/lib/sme-data";
import { runAssessment } from "@/lib/scoring";
import { loadApplications, updateApplication, subscribe } from "@/lib/store";
import {
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Eye,
  Shield,
  Layers,
} from "lucide-react";

interface PortfolioListProps {
  onSelectApplication: (app: LoanApplication) => void;
}

export default function PortfolioList({ onSelectApplication }: PortfolioListProps) {
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setApplications(loadApplications());
    const unsubscribe = subscribe((updatedApps) => {
      setApplications(updatedApps);
    });
    return () => unsubscribe();
  }, []);

  const handleAssess = (app: LoanApplication) => {
    if (!app.assessment) {
      const sme = DEMO_SME_PROFILES.find((s) => s.id === app.smeId) || DEMO_SME_PROFILES[0];
      const assessmentResult = runAssessment(sme, app.requestedAmount, app.tenureMonths);

      const updated = updateApplication(app.id, {
        status: "ASSESSED",
        assessment: assessmentResult,
        assessedAt: new Date().toISOString(),
      });
      const found = updated.find((a) => a.id === app.id);
      onSelectApplication(found || app);
    } else {
      onSelectApplication(app);
    }
  };

  const filteredApps = applications.filter(
    (app) =>
      app.smeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.sector.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPipeline = applications.reduce((sum, a) => sum + a.requestedAmount, 0);
  const pendingCount = applications.filter((a) => a.status === "PENDING").length;
  const approvedCount = applications.filter(
    (a) =>
      a.status === "APPROVED" ||
      a.status === "APPROVED_DISBURSED" ||
      a.status === "COUNTER_OFFER" ||
      a.status === "COUNTER_OFFER_ISSUED" ||
      a.status === "ASSESSED"
  ).length;

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Portfolio Header Banner (Design Spec v1 #081921 & #2F96B4) */}
      <div className="bg-[#081921] text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[#2F96B4] font-bold text-xs uppercase tracking-wider">
              <Shield className="w-4 h-4" />
              <span>United Bank Limited (UBL) RM Risk Admin</span>
            </div>
            <h1 className="text-xl font-bold text-white mt-1">
              SME Working Capital Application Portfolio
            </h1>
            <p className="text-xs text-slate-300">
              Evaluated via UBL Credit Assessment Engine
            </p>
          </div>

          <div className="bg-slate-900/90 px-4 py-2.5 rounded-xl border border-slate-800 text-right">
            <span className="text-[11px] text-slate-400 font-medium block">Total Pipeline Value</span>
            <span className="text-base font-extrabold text-[#2F96B4]">
              PKR {totalPipeline.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 4 Stat Cards Row (Design Spec Section 3.3) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Total Pipeline Value</span>
            <span className="text-lg font-extrabold text-white">
              PKR {(totalPipeline / 1000000).toFixed(1)}M
            </span>
          </div>

          <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Pending Reviews</span>
            <span className="text-lg font-bold text-[#E0A63B]">{pendingCount}</span>
          </div>

          <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Assessed & Approved</span>
            <span className="text-lg font-bold text-[#2F9E5E]">{approvedCount}</span>
          </div>

          <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Avg Approval Time</span>
            <span className="text-lg font-bold text-[#2F96B4]">&lt; 48 Hours</span>
          </div>
        </div>
      </div>

      {/* Application Table */}
      <div className="bg-white rounded-2xl border border-[#E2E6E7] shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-[#081921] text-base">
              Application Pipeline ({filteredApps.length})
            </h3>
            <p className="text-xs text-[#5C6B70]">
              Real-time loan requests submitted by SME account holders
            </p>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-[#5C6B70] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search SME or sector..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#E2E6E7] focus:outline-none focus:border-[#2F96B4] focus:ring-2 focus:ring-[#2F96B4]/15"
            />
          </div>
        </div>

        {filteredApps.length === 0 ? (
          <div className="text-center py-12 bg-[#F6F6F6] rounded-xl border border-[#E2E6E7] border-dashed space-y-3">
            <Building2 className="w-10 h-10 text-[#5C6B70] mx-auto" />
            <h4 className="font-bold text-sm text-[#081921]">No Applications Received Yet</h4>
            <p className="text-xs text-[#5C6B70] max-w-md mx-auto leading-relaxed">
              When an SME owner submits a loan request, it will automatically sync and appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#081921] text-slate-200 font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="p-3">Req ID</th>
                  <th className="p-3">SME Name</th>
                  <th className="p-3">Sector</th>
                  <th className="p-3">Readiness Score</th>
                  <th className="p-3">Requested Loan</th>
                  <th className="p-3">Tenure</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6E7] font-medium text-[#081921]">
                {filteredApps.map((app) => (
                  <tr
                    key={app.id}
                    onClick={() => handleAssess(app)}
                    className="hover:bg-[#F6F6F6] cursor-pointer transition-all"
                  >
                    <td className="p-3 font-mono font-bold text-[#2F96B4]">{app.id}</td>
                    <td className="p-3 font-semibold text-[#081921]">{app.smeName}</td>
                    <td className="p-3 text-[#5C6B70]">{app.sector}</td>
                    <td className="p-3">
                      {app.assessment ? (
                        <span className="font-bold text-[#2F9E5E] bg-[#2F9E5E]/15 px-2 py-0.5 rounded border border-[#2F9E5E]/30">
                          {app.assessment.readinessScore}/100
                        </span>
                      ) : (
                        <span className="text-[#5C6B70] italic">Unassessed</span>
                      )}
                    </td>
                    <td className="p-3 font-bold text-[#081921]">
                      PKR {app.requestedAmount.toLocaleString()}
                    </td>
                    <td className="p-3">{app.tenureMonths} Mo</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          app.status === "APPROVED" || app.status === "APPROVED_DISBURSED"
                            ? "bg-[#2F9E5E]/15 text-[#2F9E5E] border-[#2F9E5E]/30"
                            : app.status === "COUNTER_OFFER" || app.status === "COUNTER_OFFER_ISSUED"
                            ? "bg-[#E0A63B]/25 text-[#081921] border-[#E0A63B]/40"
                            : app.status === "MANUAL_REVIEW"
                            ? "bg-[#D9534F]/15 text-[#D9534F] border-[#D9534F]/30"
                            : app.status === "REJECTED"
                            ? "bg-[#D9534F]/15 text-[#D9534F] border-[#D9534F]/30"
                            : "bg-[#E0A63B]/15 text-[#E0A63B] border-[#E0A63B]/30"
                        }`}
                      >
                        <span>{app.status.replace("_", " ")}</span>
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAssess(app);
                        }}
                        className="px-3 py-1.5 bg-[#2F96B4] hover:bg-[#257A93] text-white font-semibold text-[11px] rounded-lg transition-all inline-flex items-center space-x-1 shadow-sm cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Assess & Review</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
