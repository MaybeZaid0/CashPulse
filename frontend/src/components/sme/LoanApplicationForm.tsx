"use client";

import React, { useState } from "react";
import { SMEProfile, AssessmentResult } from "@/types";
import { apiCreateAssessment } from "@/lib/api-client";
import ReadinessReportModal from "./ReadinessReportModal";
import { Calculator, RefreshCw, ShieldCheck } from "lucide-react";

interface LoanApplicationFormProps {
  sme: SMEProfile;
  onSubmitSuccess: () => void;
}

export default function LoanApplicationForm({
  sme,
  onSubmitSuccess,
}: LoanApplicationFormProps) {
  const [requestedAmount, setRequestedAmount] = useState<number>(950_000);
  const [tenureMonths, setTenureMonths] = useState<number>(6);
  const [purpose, setPurpose] = useState<string>("Inventory Stocking");

  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);

  const handleCheckReadiness = async () => {
    setIsEvaluating(true);
    const { data, error } = await apiCreateAssessment(
      String(sme.id),
      requestedAmount,
      tenureMonths
    );

    if (error) {
      alert("Error: " + error);
      setIsEvaluating(false);
      return;
    }

    setAssessmentResult(data);
    setIsEvaluating(false);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-[#E4EBF2] shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-[#E4EBF2] pb-3">
          <div className="flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-[#0083CA]" />
            <h3 className="font-bold text-[#0E1B2A] text-base">
              Business Loan Application
            </h3>
          </div>
          <span className="text-xs text-[#0083CA] font-bold bg-[#0083CA]/10 px-3 py-1 rounded-full border border-[#0083CA]/20">
            0% Interest Loan
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold text-[#0E1B2A] mb-1">
              Requested Loan Amount (PKR):
            </label>
            <input
              type="number"
              value={requestedAmount}
              onChange={(e) => setRequestedAmount(Number(e.target.value))}
              step={50000}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E4EBF2] font-extrabold text-[#0E1B2A] focus:outline-none focus:border-[#0083CA] text-base"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0E1B2A] mb-1">
              Repayment Period:
            </label>
            <select
              value={tenureMonths}
              onChange={(e) => setTenureMonths(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E4EBF2] font-extrabold text-[#0E1B2A] focus:outline-none focus:border-[#0083CA] text-sm bg-white cursor-pointer"
            >
              <option value={3}>3 Months</option>
              <option value={6}>6 Months</option>
              <option value={12}>12 Months</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0E1B2A] mb-1">
              Purpose of Funds:
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Inventory Bulk Purchase, Raw Material..."
              className="w-full px-4 py-2.5 rounded-xl border border-[#E4EBF2] font-bold text-[#0E1B2A] focus:outline-none focus:border-[#0083CA] text-sm bg-white"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleCheckReadiness}
            disabled={isEvaluating}
            className="w-full py-3 px-6 bg-[#0083CA] hover:bg-[#005B8F] text-white font-extrabold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isEvaluating ? "animate-spin" : ""}`} />
            <span>{isEvaluating ? "Evaluating..." : "Check Readiness"}</span>
          </button>
        </div>
      </div>

      {showModal && assessmentResult && (
        <ReadinessReportModal
          sme={sme}
          requestedAmount={requestedAmount}
          tenureMonths={tenureMonths}
          purpose={purpose}
          assessment={assessmentResult}
          onClose={() => setShowModal(false)}
          onSubmitSuccess={() => {
            setShowModal(false);
            onSubmitSuccess();
          }}
        />
      )}
    </div>
  );
}
