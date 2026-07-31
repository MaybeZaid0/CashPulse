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
  MessageSquare,
  X,
  HelpCircle,
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
  const [activeTab, setActiveTab] = useState<"standard" | "rationale">("rationale");
  const [currentApp, setCurrentApp] = useState<LoanApplication>(application);
  const [expandedPillar, setExpandedPillar] = useState<number | null>(null);
  const [isPrintMode, setIsPrintMode] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Confirmation Modal state
  const [pendingStatus, setPendingStatus] = useState<LoanApplication["status"] | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  const assessment = currentApp.assessment;

  if (!assessment) {
    return (
      <div className="p-8 text-center space-y-4 font-sans">
        <p className="text-slate-600 font-bold">No assessment data generated yet.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-[#081921] text-white text-xs font-bold rounded-xl"
        >
          Return to Portfolio List
        </button>
      </div>
    );
  }

  const { readinessScore, pillarEvidences, eligibility, recommendation, cashflowChartData } = assessment;

  // Check if decision is locked because RM confirmation has been given (status is no longer PENDING or ASSESSED)
  const isLocked =
    currentApp.status !== "PENDING" &&
    currentApp.status !== "ASSESSED";

  const getStatusLabel = (status: LoanApplication["status"] | null) => {
    switch (status) {
      case "APPROVED":
        return "Approve & Disburse Loan";
      case "COUNTER_OFFER":
        return `Issue Counter-Offer (PKR ${eligibility.recommendedAmount.toLocaleString()})`;
      case "REJECTED":
        return "Reject Financing Request";
      case "MANUAL_REVIEW":
        return "Escalate to Senior Risk Committee";
      default:
        return status || "Decision";
    }
  };

  const handleInitiateDecision = (newStatus: LoanApplication["status"]) => {
    if (isLocked) return;

    if ((newStatus === "REJECTED" || newStatus === "COUNTER_OFFER") && !rmNotes.trim()) {
      setActiveTab("rationale");
      setErrorMsg("Official Decision Rationale is mandatory when issuing a Rejection or Counter-Offer so the SME owner can view the reason.");
      return;
    }

    setErrorMsg("");
    setPendingStatus(newStatus);
    setShowConfirmModal(true);
  };

  const executeRmDecision = () => {
    if (!pendingStatus) return;

    const sme = DEMO_SME_PROFILES.find((s) => s.id === currentApp.smeId) || DEMO_SME_PROFILES[0];
    const qualitativeReasons = generateQualitativePillarFeedback(
      sme,
      currentApp.requestedAmount,
      currentApp.tenureMonths,
      assessment.pillars
    );

    const updated = updateApplication(currentApp.id, {
      status: pendingStatus,
      rmNotes: rmNotes.trim(),
      qualitativeReasons,
    });

    if (updated && updated.length > 0) {
      const match = updated.find((a) => a.id === currentApp.id);
      if (match) setCurrentApp(match);
    }

    setShowConfirmModal(false);
    setPendingStatus(null);
    onBack();
  };

  const getScoreBand = (score: number) => {
    if (score >= 80) return { label: "STRONG", stroke: "#2F9E5E", bg: "bg-[#2F9E5E]/10 text-[#2F9E5E] border-[#2F9E5E]/30" };
    if (score >= 60) return { label: "REVIEW", stroke: "#E0A63B", bg: "bg-[#E0A63B]/10 text-[#E0A63B] border-[#E0A63B]/30" };
    return { label: "HIGH RISK", stroke: "#D9534F", bg: "bg-[#D9534F]/10 text-[#D9534F] border-[#D9534F]/30" };
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
    <div className="space-y-6 pb-12 font-sans relative">
      {/* Confirmation Modal overlay */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#081921]/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl border border-[#E2E6E7] shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E2E6E7] pb-3">
              <div className="flex items-center space-x-2.5">
                <HelpCircle className="w-5 h-5 text-[#2F96B4]" />
                <h3 className="font-bold text-base text-[#081921]">Confirm Decision Action</h3>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-[#5C6B70] hover:text-[#081921] p-1 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-[#081921] font-medium leading-relaxed">
                Are you sure you want to submit the following decision for{" "}
                <span className="font-bold text-[#2F96B4]">{currentApp.smeName}</span>?
              </p>

              <div className="p-3 bg-[#F6F6F6] rounded-xl border border-[#E2E6E7] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#5C6B70] font-semibold">Decision Action:</span>
                  <span className="font-bold text-[#081921]">{getStatusLabel(pendingStatus)}</span>
                </div>
                {rmNotes.trim() && (
                  <div className="text-xs pt-1 border-t border-[#E2E6E7]">
                    <span className="text-[#5C6B70] font-semibold block">RM Remarks:</span>
                    <span className="text-[#081921] italic text-[11px]">"{rmNotes.trim()}"</span>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-[#5C6B70]">
                Note: Once submitted, the decision status will be updated in real-time across SME and RM portals.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-white hover:bg-[#F6F6F6] text-[#5C6B70] font-semibold text-xs rounded-lg border border-[#E2E6E7] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeRmDecision}
                className="px-5 py-2 bg-[#2F96B4] hover:bg-[#257A93] text-white font-semibold text-xs rounded-lg shadow-md transition-all cursor-pointer"
              >
                Confirm & Submit Decision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-2xl border border-[#E2E6E7] shadow-sm gap-3">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-xs font-bold text-[#081921] hover:text-[#2F96B4] px-3 py-1.5 rounded-xl bg-[#F6F6F6] border border-[#E2E6E7] transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← Back to Portfolio List</span>
        </button>

        <div className="flex items-center space-x-3">
          {isLocked && (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#2F9E5E]/15 text-[#2F9E5E] border border-[#2F9E5E]/30 rounded-full text-xs font-bold">
              <Lock className="w-3.5 h-3.5" />
              <span>Decision Locked (SME Accepted)</span>
            </span>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-[#F6F6F6] text-[#081921] border border-[#E2E6E7] rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#2F96B4]" />
            <span>Print Credit Report</span>
          </button>
        </div>
      </div>

      {/* SME Header Information (#081921 Dark Header) */}
      <div className="bg-[#081921] text-white rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-[#2F96B4] uppercase tracking-wider">
              UBL Digital SME Assessment File
            </span>
            <h2 className="text-2xl font-bold text-white leading-tight">{currentApp.smeName}</h2>
            <p className="text-xs text-slate-300 font-medium">
              Sector: {currentApp.sector} • Location: {currentApp.city} • Application ID: {currentApp.id}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Requested Loan</span>
              <span className="font-extrabold text-white text-sm">
                PKR {currentApp.requestedAmount.toLocaleString()}
              </span>
            </div>
            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Tenure Plan</span>
              <span className="font-extrabold text-[#2F96B4] text-sm">
                {currentApp.tenureMonths} Months
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Score Ring & Recommendation Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Readiness Score Ring */}
        <div className="bg-white rounded-2xl p-6 border border-[#E2E6E7] shadow-sm flex flex-col items-center justify-center text-center space-y-4">
          <div className="flex items-center space-x-2 text-[#081921] font-bold text-sm">
            <Award className="w-5 h-5 text-[#2F96B4]" />
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
              <span className="text-4xl font-extrabold text-[#081921] font-sans">
                {readinessScore}
              </span>
              <span className="text-[10px] font-bold text-[#5C6B70] uppercase tracking-wider">
                Out of 100
              </span>
            </div>
          </div>

          <div className={`px-4 py-1.5 rounded-full text-xs font-bold border ${band.bg}`}>
            BAND: {band.label} (SCORE {readinessScore}/100)
          </div>
        </div>

        {/* Automated Recommendation Panel */}
        <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-[#E2E6E7] shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#E2E6E7] pb-3">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-[#2F96B4]" />
                <h3 className="font-bold text-[#081921] text-base">
                  Automated Recommendation & Qualitative Analysis
                </h3>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 bg-[#F6F6F6] text-[#2F96B4] border border-[#E2E6E7] rounded-full">
                UBL Risk Advisory
              </span>
            </div>

            <div className="pt-3 space-y-3">
              <div className="flex items-center space-x-3">
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-extrabold tracking-wide uppercase ${
                    recommendation.type === "APPROVE"
                      ? "bg-[#2F9E5E] text-white"
                      : recommendation.type === "COUNTER_OFFER"
                      ? "bg-[#E0A63B] text-white"
                      : "bg-[#D9534F] text-white"
                  }`}
                >
                  SYSTEM ADVISORY: {recommendation.type.replace("_", " ")}
                </span>
                <span className="text-xs text-[#5C6B70] font-medium">
                  {recommendation.reason}
                </span>
              </div>

              <div className="p-3 bg-[#F6F6F6] rounded-xl border border-[#E2E6E7] space-y-1.5">
                <span className="text-[11px] font-bold text-[#081921] block">
                  Qualitative Pillar Assessment Remarks:
                </span>
                <ul className="space-y-1 text-xs text-[#5C6B70]">
                  {activeFeedbackReasons.map((reason, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-[#2F96B4] mt-0.5">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-2.5 bg-[#F6F6F6] rounded-lg border border-[#E2E6E7]">
              <span className="text-[11px] text-[#5C6B70] block">Recommended Limit</span>
              <span className="font-bold text-[#2F96B4] text-xs">
                PKR {eligibility.recommendedAmount.toLocaleString()}
              </span>
            </div>
            <div className="p-2.5 bg-[#F6F6F6] rounded-lg border border-[#E2E6E7]">
              <span className="text-[11px] text-[#5C6B70] block">Safe Installment</span>
              <span className="font-bold text-[#081921] text-xs">
                PKR {eligibility.safeMonthlyInstalment.toLocaleString()} / mo
              </span>
            </div>
            <div className="p-2.5 bg-[#F6F6F6] rounded-lg border border-[#E2E6E7] col-span-2 sm:col-span-1">
              <span className="text-[11px] text-[#5C6B70] block">Cashflow Coverage</span>
              <span className="font-bold text-[#2F9E5E] text-xs">
                {eligibility.coverageRatio.toFixed(2)}x
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Decision Control Box & Lock Enforcement */}
      <div className="bg-white rounded-2xl p-6 border border-[#E2E6E7] shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-[#E2E6E7] pb-3">
          <div className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-[#2F96B4]" />
            <h3 className="font-bold text-[#081921] text-base">
              Relationship Manager Decision Control
            </h3>
          </div>

          {/* Sub-Tab Selector */}
          {!isLocked && (
            <div className="flex items-center space-x-1 bg-[#F6F6F6] p-1 rounded-lg border border-[#E2E6E7]">
              <button
                onClick={() => setActiveTab("rationale")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === "rationale"
                    ? "bg-[#2F96B4] text-white shadow-sm"
                    : "text-[#5C6B70] hover:text-[#081921]"
                }`}
              >
                Custom Decision Rationale
              </button>
              <button
                onClick={() => setActiveTab("standard")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === "standard"
                    ? "bg-[#2F96B4] text-white shadow-sm"
                    : "text-[#5C6B70] hover:text-[#081921]"
                }`}
              >
                Standard Audit Notes
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {isLocked ? (
            /* Locked Banner once RM Confirmation has been given */
            <div className="p-4 bg-[#2F9E5E]/10 border border-[#2F9E5E]/30 rounded-xl flex items-start space-x-3 text-xs text-[#2F9E5E]">
              <Lock className="w-5 h-5 flex-shrink-0 text-[#2F9E5E] mt-0.5" />
              <div>
                <p className="font-bold text-sm text-[#081921]">
                  RM Decision Confirmed & Submitted ({currentApp.status.replace("_", " ")})
                </p>
                <p className="text-xs text-[#5C6B70] mt-0.5">
                  Official confirmation has been submitted by the Relationship Manager. Decision controls are now locked from further editing.
                </p>
                {currentApp.rmNotes && (
                  <p className="text-xs text-[#081921] font-semibold mt-2 pt-2 border-t border-[#2F9E5E]/20">
                    RM Remarks: <span className="font-normal italic">"{currentApp.rmNotes}"</span>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              {activeTab === "rationale" ? (
                <div className="space-y-2 bg-[#F6F6F6] p-4 rounded-xl border border-[#E2E6E7]">
                  <div className="flex items-center space-x-2 text-[#2F96B4] font-semibold text-xs">
                    <MessageSquare className="w-4 h-4" />
                    <span>Relationship Manager Official Rejection / Counter-Offer Rationale:</span>
                  </div>
                  <textarea
                    value={rmNotes}
                    onChange={(e) => setRmNotes(e.target.value)}
                    rows={3}
                    placeholder="Type official credit officer rationale for decision (communicated directly to applicant upon Counter-Offer or Rejection)..."
                    className="w-full p-3 rounded-lg border border-[#E2E6E7] text-xs font-medium bg-white focus:outline-none focus:border-[#2F96B4] focus:ring-2 focus:ring-[#2F96B4]/15"
                  />
                  <p className="text-[11px] text-[#5C6B70] font-medium">
                    Note: This rationale will be displayed directly on the SME Owner's application status dashboard.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#5C6B70] mb-1">
                    Internal Risk Audit Notes:
                  </label>
                  <textarea
                    value={rmNotes}
                    onChange={(e) => setRmNotes(e.target.value)}
                    rows={3}
                    placeholder="Enter internal credit assessment notes..."
                    className="w-full p-3 rounded-lg border border-[#E2E6E7] text-xs font-medium focus:outline-none focus:border-[#2F96B4] focus:ring-2 focus:ring-[#2F96B4]/15"
                  />
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-[#D9534F]/10 border border-[#D9534F]/30 rounded-xl text-xs font-bold text-[#D9534F]">
                  ⚠️ {errorMsg}
                </div>
              )}
            </>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            {/* Danger / Reject (Outline #D9534F) */}
            <button
              disabled={isLocked}
              onClick={() => handleInitiateDecision("REJECTED")}
              className={`px-4 py-2 bg-white text-[#D9534F] font-semibold text-xs rounded-lg transition-all flex items-center justify-center space-x-1.5 border border-[#D9534F] ${
                isLocked
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-[#D9534F]/10 cursor-pointer"
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-[#D9534F]" />
              <span>Reject Request</span>
            </button>

            {/* Escalate */}
            <button
              disabled={isLocked}
              onClick={() => handleInitiateDecision("MANUAL_REVIEW")}
              className={`px-4 py-2 bg-white text-[#2F96B4] font-semibold text-xs rounded-lg transition-all flex items-center justify-center space-x-1.5 border border-[#2F96B4] ${
                isLocked
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-[#2F96B4]/10 cursor-pointer"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Escalate to Senior</span>
            </button>

            {/* Warning / Counter Offer (Outline #E0A63B) */}
            <button
              disabled={isLocked}
              onClick={() => handleInitiateDecision("COUNTER_OFFER")}
              className={`px-4 py-2 bg-white text-[#E0A63B] font-semibold text-xs rounded-lg transition-all flex items-center justify-center space-x-1.5 border border-[#E0A63B] ${
                isLocked
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-[#E0A63B]/10 cursor-pointer"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Issue Counter-Offer (PKR {eligibility.recommendedAmount.toLocaleString()})</span>
            </button>

            {/* Primary / Accept (Solid #2F96B4) */}
            <button
              disabled={isLocked}
              onClick={() => handleInitiateDecision("APPROVED")}
              className={`px-5 py-2 text-white font-semibold text-xs rounded-lg transition-all flex items-center justify-center space-x-1.5 shadow-md ${
                isLocked
                  ? "bg-[#5C6B70] opacity-40 cursor-not-allowed"
                  : "bg-[#2F96B4] hover:bg-[#257A93] shadow-[#2F96B4]/20 cursor-pointer"
              }`}
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
