"use client";

import React from "react";
import { ScoreEngineResult } from "@/types";
import { Award, CheckCircle2, AlertTriangle, ShieldCheck, Activity } from "lucide-react";

interface ReadinessScoreGaugeProps {
  scoreResult: ScoreEngineResult;
}

export default function ReadinessScoreGauge({ scoreResult }: ReadinessScoreGaugeProps) {
  const {
    readinessScore,
    stabilitySubscore,
    trendSubscore,
    cushionSubscore,
    regularitySubscore,
    loanStatus,
    askedLoan,
    recommendedLimit,
    monthlyInstallment,
    tenureMonths,
  } = scoreResult;

  const isApproved = loanStatus === "APPROVED";

  const getScoreColor = (score: number) => {
    if (score >= 75) return { stroke: "#16a34a", bg: "bg-emerald-500", text: "text-emerald-600" };
    if (score >= 50) return { stroke: "#d97706", bg: "bg-amber-500", text: "text-amber-600" };
    return { stroke: "#dc2626", bg: "bg-rose-500", text: "text-rose-600" };
  };

  const scoreTheme = getScoreColor(readinessScore);

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center space-x-2">
          <Award className="w-5 h-5 text-sky-600" />
          <h3 className="font-bold text-slate-900 text-base">Financing Readiness Score</h3>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md">
          Zero-Interest Model
        </span>
      </div>

      {/* Central Circle Gauge */}
      <div className="flex flex-col items-center justify-center py-2">
        <div className="relative w-44 h-44 flex items-center justify-center">
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
              stroke={scoreTheme.stroke}
              strokeLinecap="round"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute flex flex-col items-center text-center">
            <span className="text-4xl font-extrabold text-slate-900 tracking-tight font-sans">
              {readinessScore}
            </span>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Out of 100
            </span>
          </div>
        </div>

        {/* Dynamic Decision Status Badge */}
        <div
          className={`mt-4 w-full py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 text-xs font-bold shadow-sm ${
            isApproved
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-amber-50 text-amber-900 border border-amber-200"
          }`}
        >
          {isApproved ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>LOAN APPROVED: PKR {askedLoan.toLocaleString()}</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>COUNTER-OFFER: REC PKR {recommendedLimit.toLocaleString()}</span>
            </>
          )}
        </div>
      </div>

      {/* 3 Diagnostic Subscore Progress Bars */}
      <div className="space-y-4 pt-2 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Diagnostic Risk Breakdown
        </h4>

        {/* 1. Stability */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-700">Cashflow Stability (CV)</span>
            <span className="text-slate-900 font-bold">{stabilitySubscore}/100</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-sky-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${stabilitySubscore}%` }}
            />
          </div>
        </div>

        {/* 2. Trend */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-700">Revenue Growth Trend (Q2 vs Q1)</span>
            <span className="text-slate-900 font-bold">{trendSubscore}/100</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-700"
              style={{ width: `${trendSubscore}%` }}
            />
          </div>
        </div>

        {/* 3. Cushion */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-700">Cash Cushion Reserve Ratio</span>
            <span className="text-slate-900 font-bold">{cushionSubscore}/100</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-teal-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${cushionSubscore}%` }}
            />
          </div>
        </div>

        {/* 4. Payment Regularity */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-700">Digital Payment Regularity</span>
            <span className="text-slate-900 font-bold">{regularitySubscore}/100</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${regularitySubscore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Monthly Installment Footnote */}
      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
        <span className="text-slate-600 font-medium">Zero-Int Monthly Repayment:</span>
        <span className="font-extrabold text-slate-900">
          PKR {monthlyInstallment.toLocaleString()} / mo ({tenureMonths} Mo)
        </span>
      </div>
    </div>
  );
}
