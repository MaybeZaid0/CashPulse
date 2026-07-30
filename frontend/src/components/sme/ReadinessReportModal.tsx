"use client";

import React from "react";
import { SMEProfile, AssessmentResult, LoanApplication } from "@/types";
import { addApplication } from "@/lib/store";
import { X, Send, ShieldCheck, Award, Layers } from "lucide-react";

interface ReadinessReportModalProps {
  sme: SMEProfile;
  requestedAmount: number;
  tenureMonths: number;
  purpose: string;
  assessment: AssessmentResult;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

export default function ReadinessReportModal({
  sme,
  requestedAmount,
  tenureMonths,
  purpose,
  assessment,
  onClose,
  onSubmitSuccess,
}: ReadinessReportModalProps) {
  const { readinessScore, pillarEvidences, eligibility, recommendation } = assessment;

  const handleSubmit = () => {
    const newApp: LoanApplication = {
      id: `REQ-${Date.now().toString().slice(-6)}`,
      smeId: String(sme.id),
      smeName: sme.name,
      sector: sme.sector,
      city: sme.city,
      requestedAmount,
      tenureMonths,
      purpose,
      status: "PENDING",
      submittedAt: new Date().toISOString(),
      assessment,
    };

    addApplication(newApp);
    onSubmitSuccess();
  };

  const getScoreBand = (score: number) => {
    if (score >= 80) return { label: "STRONG", stroke: "#1E9E5A", bg: "bg-[#1E9E5A]/10 text-[#1E9E5A] border-[#1E9E5A]/30" };
    if (score >= 60) return { label: "REVIEW", stroke: "#E8A33D", bg: "bg-[#E8A33D]/10 text-[#E8A33D] border-[#E8A33D]/30" };
    return { label: "HIGH RISK", stroke: "#D6455B", bg: "bg-[#D6455B]/10 text-[#D6455B] border-[#D6455B]/30" };
  };

  const band = getScoreBand(readinessScore);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#F4F7FB] w-full max-w-4xl rounded-3xl shadow-2xl border border-[#E4EBF2] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-[#012A4A] text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#0083CA]/20 border border-[#0083CA]/30 flex items-center justify-center font-bold text-[#00B7E4] text-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-white text-base">
                Loan Eligibility Report
              </h2>
              <p className="text-xs text-slate-300">
                Calculated from your UBL Account History
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Score Ring */}
            <div className="bg-white rounded-2xl p-6 border border-[#E4EBF2] shadow-sm flex flex-col items-center justify-center text-center space-y-3">
              <div className="flex items-center space-x-2 text-[#0E1B2A] font-bold text-sm">
                <Award className="w-5 h-5 text-[#0083CA]" />
                <span>Eligibility Score</span>
              </div>

              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="transition-all duration-1000 ease-out"
                    strokeWidth="3.5"
                    strokeDasharray={`${readinessScore}, 100`}
                    stroke={band.stroke}
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-extrabold text-[#0E1B2A] font-sans">
                    {readinessScore}
                  </span>
                  <span className="text-[10px] font-bold text-[#5B6B7C]">Out of 100</span>
                </div>
              </div>

              <div className={`px-3 py-1 rounded-full text-xs font-bold border ${band.bg}`}>
                {band.label} ({readinessScore}/100)
              </div>
            </div>

            {/* Recommendation & Summary */}
            <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-[#E4EBF2] shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <span
                  className={`inline-block px-3 py-1 rounded-xl text-xs font-extrabold tracking-wide uppercase ${
                    recommendation.type === "APPROVE"
                      ? "bg-[#1E9E5A] text-white"
                      : recommendation.type === "COUNTER_OFFER"
                      ? "bg-[#E8A33D] text-white"
                      : "bg-[#D6455B] text-white"
                  }`}
                >
                  {recommendation.type.replace("_", " ")}
                </span>
                <p className="text-xs font-semibold text-[#0E1B2A] mt-2">
                  {recommendation.reason}
                </p>

                <div className="mt-3 space-y-1 bg-[#F4F7FB] p-3 rounded-xl border border-[#E4EBF2] text-xs">
                  {recommendation.evidence.map((ev, i) => (
                    <p key={i} className="text-[#5B6B7C]">
                      • {ev}
                    </p>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E4EBF2] text-xs">
                <div>
                  <span className="text-[#5B6B7C] block text-[11px]">Requested Loan:</span>
                  <span className="font-bold text-[#0E1B2A]">
                    PKR {requestedAmount.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[#5B6B7C] block text-[11px]">Recommended Limit:</span>
                  <span className="font-extrabold text-[#0083CA]">
                    PKR {eligibility.recommendedAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 5 Pillars Evidence Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Layers className="w-5 h-5 text-[#0083CA]" />
              <h3 className="font-bold text-[#0E1B2A] text-sm">
                Score Breakdown & Details
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {pillarEvidences.map((p, idx) => {
                const simplePillarName =
                  p.pillarName === "Cashflow Stability" ? "Income Consistency" :
                  p.pillarName === "Repayment Capacity" ? "Ability to Pay Back" :
                  p.pillarName === "Liquidity" ? "Available Savings" :
                  p.pillarName === "Business Behaviour" ? "Payment Track Record" :
                  "Sales Growth";

                return (
                  <div key={idx} className="bg-white p-3.5 rounded-2xl border border-[#E4EBF2] shadow-sm space-y-2">
                    <div className="flex justify-between text-xs font-bold text-[#0E1B2A]">
                      <span>{simplePillarName}</span>
                      <span className="text-[#0083CA]">{p.score}/{p.maxScore}</span>
                    </div>
                    <div className="w-full bg-[#F4F7FB] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#0083CA] h-full" style={{ width: `${(p.score / p.maxScore) * 100}%` }} />
                    </div>
                    <div className="text-[10px] text-[#5B6B7C] space-y-0.5 pt-1">
                      {p.evidenceLines.slice(0, 2).map((l, i) => (
                        <p key={i}>{l}</p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="bg-white p-4 border-t border-[#E4EBF2] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#F4F7FB] hover:bg-[#E4EBF2] text-[#0E1B2A] font-bold text-xs rounded-xl transition-all"
          >
            Close Report
          </button>

          <button
            onClick={handleSubmit}
            className="px-5 py-2.5 bg-[#0083CA] hover:bg-[#005B8F] text-white font-extrabold text-xs rounded-xl flex items-center space-x-2 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Submit Application</span>
          </button>
        </div>
      </div>
    </div>
  );
}
