"use client";

import React, { useState } from "react";
import { SMEProfile, AssessmentResult, LoanApplication } from "@/types";
import { runAssessment } from "@/lib/scoring";
import { addApplication } from "@/lib/store";
import { Calculator, Send, ShieldCheck, RefreshCw } from "lucide-react";

interface LoanApplicationFormProps {
  sme: SMEProfile;
  onSubmitSuccess: () => void;
}

export default function LoanApplicationForm({
  sme,
  onSubmitSuccess,
}: LoanApplicationFormProps) {
  const [requestedAmount, setRequestedAmount] = useState<number>(950_000);
  const [tenureSelect, setTenureSelect] = useState<string>("6");
  const [customTenure, setCustomTenure] = useState<number>(6);

  const [purposeSelect, setPurposeSelect] = useState<string>("Inventory Stocking");
  const [customPurpose, setCustomPurpose] = useState<string>("");

  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  const effectiveTenure = tenureSelect === "OTHER" ? customTenure : Number(tenureSelect);
  const effectivePurpose = purposeSelect === "OTHER" ? (customPurpose || "Custom Business Purpose") : purposeSelect;

  const handleSubmitApplication = () => {
    setIsEvaluating(true);
    setTimeout(() => {
      const result = runAssessment(sme, requestedAmount, effectiveTenure);
      
      const newApp: LoanApplication = {
        id: `REQ-${Date.now().toString().slice(-6)}`,
        smeId: sme.id,
        smeName: sme.name,
        sector: sme.sector,
        city: sme.city,
        requestedAmount,
        tenureMonths: effectiveTenure,
        purpose: effectivePurpose,
        status: "PENDING",
        submittedAt: new Date().toISOString(),
        assessment: result,
      };

      addApplication(newApp);
      setIsEvaluating(false);
      onSubmitSuccess();
    }, 400);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
          <div className="flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-[#2F96B4]" />
            <h3 className="font-bold text-[#081921] text-base">
              Business Loan Application
            </h3>
          </div>
          <span className="text-xs text-[#2F96B4] font-bold bg-[#2F96B4]/10 px-3 py-1 rounded-full border border-[#2F96B4]/30">
            0% Interest Loan
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Requested Amount */}
          <div>
            <label className="block text-xs font-bold text-[#081921] mb-1">
              Requested Loan Amount (PKR):
            </label>
            <input
              type="number"
              value={requestedAmount}
              onChange={(e) => setRequestedAmount(Number(e.target.value))}
              step={50000}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] font-extrabold text-[#081921] focus:outline-none focus:border-[#2F96B4] text-base"
            />
          </div>

          {/* Repayment Period */}
          <div>
            <label className="block text-xs font-bold text-[#081921] mb-1">
              Repayment Period:
            </label>
            <select
              value={tenureSelect}
              onChange={(e) => setTenureSelect(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] font-extrabold text-[#081921] focus:outline-none focus:border-[#2F96B4] text-sm bg-white cursor-pointer"
            >
              <option value="3">3 Months</option>
              <option value="6">6 Months</option>
              <option value="12">12 Months</option>
              <option value="OTHER">Other (Custom Period)</option>
            </select>

            {tenureSelect === "OTHER" && (
              <div className="mt-2">
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={customTenure}
                  onChange={(e) => setCustomTenure(Number(e.target.value))}
                  placeholder="Enter months (e.g., 9, 18)..."
                  className="w-full px-4 py-2 rounded-xl border border-[#E5E7EB] font-bold text-[#081921] focus:outline-none focus:border-[#2F96B4] text-xs bg-[#F6F6F6]"
                />
              </div>
            )}
          </div>

          {/* Purpose of Funds */}
          <div>
            <label className="block text-xs font-bold text-[#081921] mb-1">
              Purpose of Funds:
            </label>
            <select
              value={purposeSelect}
              onChange={(e) => setPurposeSelect(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] font-bold text-[#081921] focus:outline-none focus:border-[#2F96B4] text-sm bg-white cursor-pointer"
            >
              <option value="Inventory Stocking">Inventory Stocking</option>
              <option value="Equipment Purchase">Equipment Purchase</option>
              <option value="Supplier Payment">Supplier Payment</option>
              <option value="Operational Expenses">Operational Expenses</option>
              <option value="OTHER">Other (Custom Purpose)</option>
            </select>

            {purposeSelect === "OTHER" && (
              <div className="mt-2">
                <input
                  type="text"
                  value={customPurpose}
                  onChange={(e) => setCustomPurpose(e.target.value)}
                  placeholder="Type custom purpose of funds..."
                  className="w-full px-4 py-2 rounded-xl border border-[#E5E7EB] font-bold text-[#081921] focus:outline-none focus:border-[#2F96B4] text-xs bg-[#F6F6F6]"
                />
              </div>
            )}
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleSubmitApplication}
            disabled={isEvaluating}
            className="w-full py-3 px-6 bg-[#081921] hover:bg-[#0f2e3d] text-white font-extrabold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
          >
            {isEvaluating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{isEvaluating ? "Submitting..." : "Submit Application"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
