"use client";

import React, { useState } from "react";
import { LoanApplication } from "@/types";
import { updateApplication } from "@/lib/store";
import { generateQualitativePillarFeedback } from "@/lib/scoring";
import { DEMO_SME_PROFILES } from "@/lib/sme-data";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldAlert,
  TrendingUp,
  Award,
  Lock,
  Layers,
  Printer,
  Info,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

interface AssessmentDashboardProps {
  application: LoanApplication;
  onBack: () => void;
}

export default function AssessmentDashboard({
  application,
  onBack,
}: AssessmentDashboardProps) {
  const [rmNotes, setRmNotes] = useState(application.rmNotes || "");
  const [currentApp, setCurrentApp] = useState<LoanApplication>(application);
  const [expandedPillar, setExpandedPillar] = useState<number | null>(null);
  const [isPrintMode, setIsPrintMode] = useState<boolean>(false);

  const assessment = currentApp.assessment;

  if (!assessment) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-slate-600 font-bold">No assessment data generated yet.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-[#012A4A] text-white text-xs font-bold rounded-xl"
        >
          Return to Portfolio List
        </button>
      </div>
    );
  }

  const { readinessScore, pillarEvidences, eligibility, recommendation, cashflowChartData } = assessment;

  const handleRmDecision = (newStatus: LoanApplication["status"]) => {
    const sme = DEMO_SME_PROFILES.find((s) => s.id === currentApp.smeId) || DEMO_SME_PROFILES[0];
    const qualitativeReasons = generateQualitativePillarFeedback(
      sme,
      currentApp.requestedAmount,
      currentApp.tenureMonths,
      assessment.pillars
    );

    updateApplication(currentApp.id, {
      status: newStatus,
      rmNotes,
      qualitativeReasons,
    });
    onBack();
  };

  const getScoreBand = (score: number) => {
    if (score >= 80) return { label: "STRONG", stroke: "#1E9E5A", bg: "bg-[#1E9E5A]/10 text-[#1E9E5A] border-[#1E9E5A]/30" };
    if (score >= 60) return { label: "REVIEW", stroke: "#E8A33D", bg: "bg-[#E8A33D]/10 text-[#E8A33D] border-[#E8A33D]/30" };
    return { label: "HIGH RISK", stroke: "#D6455B", bg: "bg-[#D6455B]/10 text-[#D6455B] border-[#D6455B]/30" };
  };

  const band = getScoreBand(readinessScore);

  const smeForFeedback = DEMO_SME_PROFILES.find((s) => s.id === currentApp.smeId) || DEMO_SME_PROFILES[0];
  const activeFeedbackReasons = generateQualitativePillarFeedback(
    smeForFeedback,
    currentApp.requestedAmount,
    currentApp.tenureMonths,
    assessment.pillars
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Action Bar & F-12 Report Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-2xl border border-[#E4EBF2] shadow-sm gap-3">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-xs font-bold text-[#0E1B2A] hover:text-[#0083CA] px-3 py-1.5 rounded-xl bg-[#F4F7FB] border border-[#E4EBF2] transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← Back to Portfolio List</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsPrintMode(!isPrintMode)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#F4F7FB] border border-[#E4EBF2] text-[#0083CA] hover:bg-[#0083CA]/10 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isPrintMode ? "Standard Dashboard" : "F-12 Printable Summary View"}</span>
          </button>

          <span className="text-xs text-[#5B6B7C] font-medium">Decision Status:</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
              currentApp.status === "APPROVED"
                ? "bg-[#1E9E5A]/10 text-[#1E9E5A] border-[#1E9E5A]/30"
                : currentApp.status === "COUNTER_OFFER"
                ? "bg-[#E8A33D]/10 text-[#E8A33D] border-[#E8A33D]/30"
                : currentApp.status === "MANUAL_REVIEW"
                ? "bg-[#D6455B]/10 text-[#D6455B] border-[#D6455B]/30"
                : currentApp.status === "REJECTED"
                ? "bg-slate-900 text-slate-100 border-slate-700"
                : "bg-[#0083CA]/10 text-[#0083CA] border-[#0083CA]/30"
            }`}
          >
            {currentApp.status.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* SME Header Info */}
      <div className="bg-[#081921] text-white rounded-2xl p-6 border border-[#0f2e3d]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-[#2F96B4] flex items-center justify-center text-white">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-white">{currentApp.smeName}</h1>
                <span className="text-[11px] font-mono text-[#2F96B4] font-bold bg-[#2F96B4]/10 px-2 py-0.5 rounded-full border border-[#2F96B4]/30">
                  {currentApp.id}
                </span>
              </div>
              <p className="text-xs text-[#9CA9A3] mt-0.5">
                {currentApp.sector} • {currentApp.city} • Verified UBL IBAN Account #{currentApp.smeId}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-[#0f2e3d] p-3 rounded-xl border border-[#1a4457]">
              <span className="text-[#9CA9A3] block text-[11px]">Requested Loan</span>
              <span className="font-extrabold text-white text-sm">
                PKR {currentApp.requestedAmount.toLocaleString()}
              </span>
            </div>
            <div className="bg-[#0f2e3d] p-3 rounded-xl border border-[#1a4457]">
              <span className="text-[#9CA9A3] block text-[11px]">Tenure Plan</span>
              <span className="font-extrabold text-[#2F96B4] text-sm">
                {currentApp.tenureMonths} Months (0% Interest)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Score Ring & Recommendation Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Readiness Score Ring (AC F-6.1 & F-6.2) */}
        <div className="bg-white rounded-2xl p-6 border border-[#E4EBF2] shadow-sm flex flex-col items-center justify-center text-center space-y-4">
          <div className="flex items-center space-x-2 text-[#0E1B2A] font-bold text-sm">
            <Award className="w-5 h-5 text-[#0083CA]" />
            <span>Financing Readiness Score</span>
          </div>

          <div className="relative w-40 h-40 flex items-center justify-center">
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
              <span className="text-4xl font-extrabold text-[#0E1B2A] font-sans">
                {readinessScore}
              </span>
              <span className="text-[10px] font-bold text-[#5B6B7C] uppercase tracking-wider">
                Out of 100
              </span>
            </div>
          </div>

          <div className={`px-4 py-1.5 rounded-full text-xs font-bold border ${band.bg}`}>
            BAND: {band.label} (SCORE {readinessScore}/100)
          </div>
        </div>

        {/* Automated Recommendation Panel */}
        <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-[#E4EBF2] shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#E4EBF2] pb-3">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-[#0083CA]" />
                <h3 className="font-bold text-[#0E1B2A] text-base">
                  Automated Recommendation & Qualitative Pillar Analysis
                </h3>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 bg-[#F4F7FB] text-[#0083CA] border border-[#E4EBF2] rounded-full">
                UBL Decision Advisory
              </span>
            </div>

            <div className="pt-3 space-y-3">
              <div className="flex items-center space-x-3">
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-extrabold tracking-wide uppercase ${
                    recommendation.type === "APPROVE"
                      ? "bg-[#1E9E5A] text-white"
                      : recommendation.type === "COUNTER_OFFER"
                      ? "bg-[#E8A33D] text-white"
                      : "bg-[#D6455B] text-white"
                  }`}
                >
                  RECOMMENDATION: {recommendation.type.replace("_", " ")}
                </span>
              </div>
              <p className="text-xs font-semibold text-[#0E1B2A] leading-relaxed">
                {recommendation.reason}
              </p>

              {/* Indirect 5-Pillar Customer Feedback Preview */}
              <div className="bg-[#F4F7FB] p-3.5 rounded-xl border border-[#E4EBF2] space-y-2">
                <div className="flex items-center space-x-2 text-[#0083CA] font-bold text-xs">
                  <Info className="w-4 h-4" />
                  <span>Indirect Customer Feedback Statements (Communicated to SME):</span>
                </div>
                <ul className="space-y-1 text-xs text-[#5B6B7C]">
                  {activeFeedbackReasons.map((item, idx) => (
                    <li key={idx} className="flex items-start space-x-2 font-medium">
                      <span className="text-[#0083CA] font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Eligibility Summary */}
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#E4EBF2] text-xs">
            <div>
              <span className="text-[#5B6B7C] block text-[11px]">Requested Loan:</span>
              <span className="font-bold text-[#0E1B2A]">
                PKR {eligibility.requestedAmount.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[#5B6B7C] block text-[11px]">Recommended Limit:</span>
              <span className="font-extrabold text-[#0083CA]">
                PKR {eligibility.recommendedAmount.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[#5B6B7C] block text-[11px]">Safe Monthly Capacity (50%):</span>
              <span className="font-bold text-[#1E9E5A]">
                PKR {eligibility.safeMonthlyInstalment.toLocaleString()}/mo
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5 Banking Pillar Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-[#0083CA]" />
            <h3 className="font-bold text-[#0E1B2A] text-base">
              5 Banking Question Pillars & F-10 Explainability Drill-Down
            </h3>
          </div>
          <span className="text-xs text-[#5B6B7C]">Click any pillar card to toggle detail view</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {pillarEvidences.map((pillar, idx) => (
            <div
              key={idx}
              onClick={() => setExpandedPillar(expandedPillar === idx ? null : idx)}
              className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-sm flex flex-col justify-between ${
                expandedPillar === idx ? "border-[#0083CA] ring-2 ring-[#0083CA]/20" : "border-[#E4EBF2] hover:border-[#0083CA]"
              }`}
            >
              <div>
                <div className="flex items-center justify-between border-b border-[#E4EBF2] pb-2">
                  <span className="text-xs font-bold text-[#0E1B2A]">{pillar.pillarName}</span>
                  <span className="text-[10px] font-semibold text-[#5B6B7C]">{pillar.weight}</span>
                </div>

                <div className="my-2">
                  <div className="flex justify-between text-xs font-extrabold">
                    <span className="text-[#5B6B7C]">Score:</span>
                    <span className="text-[#0083CA]">
                      {pillar.score} / {pillar.maxScore}
                    </span>
                  </div>
                  <div className="w-full bg-[#F4F7FB] h-2 rounded-full mt-1 overflow-hidden">
                    <div
                      className="bg-[#0083CA] h-full rounded-full transition-all duration-500"
                      style={{ width: `${(pillar.score / pillar.maxScore) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1 text-[11px] text-[#5B6B7C] pt-1">
                  {pillar.evidenceLines.slice(0, expandedPillar === idx ? undefined : 2).map((line, i) => (
                    <p key={i} className="leading-tight">
                      {line}
                    </p>
                  ))}
                </div>
              </div>

              {pillar.chartData && (
                <div className="h-16 w-full pt-1 border-t border-[#E4EBF2] mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pillar.chartData}>
                      <Bar dataKey="value" fill="#00B7E4" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Verified 6-Month UBL Cashflow Chart */}
      <div className="bg-white rounded-2xl p-6 border border-[#E4EBF2] shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#E4EBF2] pb-3">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-[#0083CA]" />
            <h3 className="font-bold text-[#0E1B2A] text-base">
              Verified 6-Month UBL Core Banking Cashflow (GR-2 & GR-3)
            </h3>
          </div>
          <span className="text-xs text-[#5B6B7C]">
            Direct core bank data stream (Zero manual uploads/OCR)
          </span>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={cashflowChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4EBF2" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5B6B7C" }} />
              <YAxis
                tick={{ fontSize: 11, fill: "#5B6B7C" }}
                tickFormatter={(v) => `PKR ${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip formatter={(value: any) => [`PKR ${Number(value || 0).toLocaleString()}`, "Amount"]} />
              <Area type="monotone" dataKey="net" fill="#00B7E4/10" stroke="#00B7E4" name="Net Cashflow" />
              <Line type="monotone" dataKey="inflow" stroke="#0083CA" strokeWidth={3} name="Inflow" />
              <Line type="monotone" dataKey="outflow" stroke="#D6455B" strokeWidth={3} name="Outflow" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* F-11 RM Decision Capture */}
      <div className="bg-white rounded-2xl p-6 border border-[#E4EBF2] shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b border-[#E4EBF2] pb-3">
          <Lock className="w-5 h-5 text-[#0083CA]" />
          <h3 className="font-bold text-[#0E1B2A] text-base">
            F-11 Relationship Manager Decision Capture & Audit Log
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#0E1B2A] mb-1">
              RM Official Rationale & Risk Assessment Notes:
            </label>
            <textarea
              value={rmNotes}
              onChange={(e) => setRmNotes(e.target.value)}
              rows={3}
              placeholder="Enter official credit rationale..."
              className="w-full p-3 rounded-xl border border-[#E4EBF2] text-xs font-medium focus:outline-none focus:border-[#0083CA]"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              onClick={() => handleRmDecision("REJECTED")}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center space-x-1.5 border border-slate-800 cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>Reject Request</span>
            </button>

            <button
              onClick={() => handleRmDecision("MANUAL_REVIEW")}
              className="px-4 py-2.5 bg-[#D6455B] hover:bg-[#D6455B]/90 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Escalate to Senior</span>
            </button>

            <button
              onClick={() => handleRmDecision("COUNTER_OFFER")}
              className="px-4 py-2.5 bg-[#E8A33D] hover:bg-[#E8A33D]/90 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Issue Counter-Offer (PKR {eligibility.recommendedAmount.toLocaleString()})</span>
            </button>

            <button
              onClick={() => handleRmDecision("APPROVED")}
              className="px-5 py-2.5 bg-[#1E9E5A] hover:bg-[#1E9E5A]/90 text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve & Disburse</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
