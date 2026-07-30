"use client";

import React, { useState, useEffect } from "react";
import { LoanApplication } from "@/types";
import { DEMO_SME_PROFILES } from "@/lib/sme-data";
import { apiGetAssessments, apiGetSMEs } from "@/lib/api-client";
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

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const [smesRes, appsRes] = await Promise.all([
        apiGetSMEs(),
        apiGetAssessments()
      ]);

      if (!appsRes.error && appsRes.data) {
        // Map backend assessments to LoanApplication format
        const smes = smesRes.data || [];
        
        const mapped = appsRes.data.map((assessment: any) => {
          const sme = smes.find((s: any) => String(s.id) === String(assessment.smeId)) 
            || DEMO_SME_PROFILES.find((s) => String(s.id) === String(assessment.smeId)) 
            || { name: "Unknown SME", sector: "Unknown" };
            
          return {
            id: assessment.id,
            smeId: assessment.smeId,
            smeName: sme.name || "Unknown SME",
            sector: sme.sector || "Unknown",
            requestedAmount: assessment.requestedLoan || 0,
            tenureMonths: assessment.requestedTenure || 0,
            status: assessment.decision || "PENDING",
            assessment: assessment.readiness ? {
              readinessScore: Math.round(assessment.readiness)
            } : undefined
          };
        });
        setApplications(mapped);
      }
      setIsLoading(false);
    }
    loadData();
  }, []);

  const handleAssess = (app: LoanApplication) => {
    onSelectApplication(app);
  };

  const filteredApps = applications.filter(
    (app) =>
      app.smeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.sector.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPipeline = applications.reduce((sum, a) => sum + a.requestedAmount, 0);
  const pendingCount = applications.filter((a) => a.status === "PENDING").length;
  const approvedCount = applications.filter((a) => a.status === "APPROVED").length;

  return (
    <div className="space-y-6 pb-12">
      {/* Portfolio Header Stats (UBL Canonical Navy #012A4A) */}
      <div className="bg-[#012A4A] text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[#00B7E4] font-bold text-xs uppercase tracking-wider">
              <Shield className="w-4 h-4" />
              <span>United Bank Limited (UBL) RM Risk Admin Portal</span>
            </div>
            <h1 className="text-xl font-bold text-white mt-1">
              SME Working Capital Application Portfolio (PRD F-2)
            </h1>
            <p className="text-xs text-slate-300">
              Evaluated via CashPulse 5-Pillar Credit Engine with Real-Time Cross-Tab Sync
            </p>
          </div>

          <div className="bg-slate-900/80 px-4 py-2.5 rounded-xl border border-slate-800 text-right">
            <span className="text-[11px] text-slate-400 font-medium block">Total Pipeline</span>
            <span className="text-base font-extrabold text-[#F2A900]">
              PKR {totalPipeline.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 4 Quick Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Total Received</span>
            <span className="text-lg font-bold text-white">{applications.length}</span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Pending Assessment</span>
            <span className="text-lg font-bold text-[#00B7E4]">{pendingCount}</span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Approved Loans</span>
            <span className="text-lg font-bold text-[#1E9E5A]">{approvedCount}</span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Avg Turnaround Time</span>
            <span className="text-lg font-bold text-[#F2A900]">&lt; 48 Hours</span>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-[#E4EBF2] shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-[#0E1B2A] text-base">
              Application Pipeline ({filteredApps.length})
            </h3>
            <p className="text-xs text-[#5B6B7C]">
              Live updates broadcasted from the SME Portal
            </p>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-[#5B6B7C] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search SME or sector..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#E4EBF2] focus:outline-none focus:border-[#0083CA]"
            />
          </div>
        </div>

        {filteredApps.length === 0 ? (
          <div className="text-center py-12 bg-[#F4F7FB] rounded-xl border border-[#E4EBF2] border-dashed space-y-3">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-bold text-sm text-[#0E1B2A]">No Applications Received Yet</h4>
            <p className="text-xs text-[#5B6B7C] max-w-md mx-auto leading-relaxed">
              Open the SME Owner Portal at <strong>http://localhost:3000</strong> in another tab/window, submit a working capital request, and it will appear here instantly!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#012A4A] text-slate-200 font-bold uppercase text-[10px] tracking-wider">
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
              <tbody className="divide-y divide-[#E4EBF2] font-medium text-[#0E1B2A]">
                {filteredApps.map((app) => (
                  <tr
                    key={app.id}
                    onClick={() => handleAssess(app)}
                    className="hover:bg-[#F4F7FB] cursor-pointer transition-all"
                  >
                    <td className="p-3 font-mono font-bold text-[#0083CA]">{app.id}</td>
                    <td className="p-3 font-bold text-[#0E1B2A]">{app.smeName}</td>
                    <td className="p-3 text-[#5B6B7C]">{app.sector}</td>
                    <td className="p-3">
                      {app.assessment ? (
                        <span className="font-extrabold text-[#1E9E5A] bg-[#1E9E5A]/10 px-2 py-0.5 rounded border border-[#1E9E5A]/20">
                          {app.assessment.readinessScore}/100
                        </span>
                      ) : (
                        <span className="text-[#5B6B7C] italic">Unassessed</span>
                      )}
                    </td>
                    <td className="p-3 font-bold text-[#0E1B2A]">
                      PKR {app.requestedAmount.toLocaleString()}
                    </td>
                    <td className="p-3">{app.tenureMonths} Mo</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          app.status === "APPROVED"
                            ? "bg-[#1E9E5A]/10 text-[#1E9E5A]"
                            : app.status === "COUNTER_OFFER"
                            ? "bg-[#E8A33D]/10 text-[#E8A33D]"
                            : app.status === "MANUAL_REVIEW"
                            ? "bg-[#D6455B]/10 text-[#D6455B]"
                            : app.status === "REJECTED"
                            ? "bg-slate-900 text-slate-100"
                            : "bg-[#0083CA]/10 text-[#0083CA]"
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
                        className="px-3 py-1 bg-[#0083CA] hover:bg-[#005B8F] text-white font-extrabold text-[11px] rounded-lg transition-all inline-flex items-center space-x-1"
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
