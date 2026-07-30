"use client";

import React, { useState, useEffect } from "react";
import { SMEProfile, LoanApplication } from "@/types";
import { loadApplications, subscribe } from "@/lib/store";
import {
  Check,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Building2,
  History,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";

interface ApplicationStatusViewProps {
  sme: SMEProfile;
}

export default function ApplicationStatusView({ sme }: ApplicationStatusViewProps) {
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);

  useEffect(() => {
    const allApps = loadApplications();
    setApplications(allApps);
    const unsubscribe = subscribe((updatedApps) => {
      setApplications(updatedApps);
    });
    return () => unsubscribe();
  }, []);

  // Filter applications submitted by or associated with this SME
  const smeApps = applications.filter(
    (app) => app.smeId === sme.id || app.smeName === sme.name
  );

  useEffect(() => {
    if (smeApps.length > 0 && !expandedAppId) {
      setExpandedAppId(smeApps[0].id);
    }
  }, [smeApps]);

  if (smeApps.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-10 border border-[#E4EBF2] shadow-sm text-center space-y-4">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
        <div className="space-y-1">
          <h3 className="font-extrabold text-[#0E1B2A] text-lg">No Financing History Found</h3>
          <p className="text-xs text-[#5B6B7C] max-w-md mx-auto leading-relaxed">
            There are no submitted loan applications for <strong>{sme.name}</strong>. Go to the <strong>Apply for Working Capital</strong> tab to run a 5-pillar readiness check and submit a loan request!
          </p>
        </div>
      </div>
    );
  }

  const totalRequested = smeApps.reduce((sum, a) => sum + a.requestedAmount, 0);
  const approvedApps = smeApps.filter((a) => a.status === "APPROVED");

  return (
    <div className="space-y-6">
      {/* SME Loan History Header Banner */}
      <div className="bg-[#012A4A] text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-[#00B7E4] font-bold text-xs uppercase tracking-wider">
              <History className="w-4 h-4" />
              <span>Verified SME Loan Application History</span>
            </div>
            <h2 className="text-xl font-extrabold text-white">{sme.name}</h2>
            <p className="text-xs text-slate-300">
              IBAN: {sme.iban} • {sme.city}, Pakistan
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Total Applications</span>
              <span className="font-extrabold text-white text-base">{smeApps.length} Submitted</span>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Approved Loans</span>
              <span className="font-extrabold text-[#1E9E5A] text-base">{approvedApps.length} Approved</span>
            </div>
          </div>
        </div>
      </div>

      {/* History List of Applications */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[#0E1B2A] text-base">
            Loan Application Records ({smeApps.length})
          </h3>
          <span className="text-xs text-[#5B6B7C]">
            Live status synchronized with UBL Relationship Managers
          </span>
        </div>

        {smeApps.map((app) => {
          const isExpanded = expandedAppId === app.id;
          const isApproved = app.status === "APPROVED";
          const isCounterOffer = app.status === "COUNTER_OFFER";
          const isPending = app.status === "PENDING" || app.status === "ASSESSED";
          const isManualReview = app.status === "MANUAL_REVIEW";

          return (
            <div
              key={app.id}
              className={`bg-white rounded-2xl border transition-all shadow-sm overflow-hidden ${
                isExpanded ? "border-[#0083CA] ring-2 ring-[#0083CA]/10" : "border-[#E4EBF2]"
              }`}
            >
              {/* Card Header Row */}
              <div
                onClick={() => setExpandedAppId(isExpanded ? null : app.id)}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-[#F4F7FB]/50 transition-all border-b border-[#E4EBF2]"
              >
                <div className="flex items-center space-x-3">
                  <span className="font-mono font-extrabold text-xs text-[#0083CA] bg-[#0083CA]/10 px-3 py-1 rounded-lg border border-[#0083CA]/20">
                    {app.id}
                  </span>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-[#0E1B2A] text-sm">{app.purpose}</h4>
                      <span className="text-xs text-[#5B6B7C]">({app.tenureMonths} Months)</span>
                    </div>
                    <span className="text-[11px] text-[#5B6B7C]">
                      Submitted: {new Date(app.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <span className="text-[11px] text-[#5B6B7C] block">Requested Amount:</span>
                    <span className="font-extrabold text-[#0E1B2A] text-sm">
                      PKR {app.requestedAmount.toLocaleString()}
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                      isApproved
                        ? "bg-[#1E9E5A]/10 text-[#1E9E5A] border-[#1E9E5A]/30"
                        : isCounterOffer
                        ? "bg-[#E8A33D]/10 text-[#E8A33D] border-[#E8A33D]/30"
                        : isManualReview
                        ? "bg-[#D6455B]/10 text-[#D6455B] border-[#D6455B]/30"
                        : "bg-[#0083CA]/10 text-[#0083CA] border-[#0083CA]/30"
                    }`}
                  >
                    {app.status.replace("_", " ")}
                  </span>

                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-[#5B6B7C]" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#5B6B7C]" />
                  )}
                </div>
              </div>

              {/* Card Expanded Detail Body */}
              {isExpanded && (
                <div className="p-6 space-y-6 bg-[#F4F7FB]/30">
                  {/* 4-Step Status Progress Tracker */}
                  <div className="py-2">
                    <div className="relative flex items-center justify-between">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-[#E4EBF2] -z-0" />
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#0083CA] transition-all duration-500 -z-0"
                        style={{
                          width: isPending ? "33%" : "100%",
                        }}
                      />

                      {/* Step 1 */}
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-[#0083CA] text-white flex items-center justify-center text-xs font-bold shadow-md">
                          <Check className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-bold text-[#0E1B2A] mt-2">1. Submitted</span>
                      </div>

                      {/* Step 2 */}
                      <div className="relative z-10 flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-md ${
                            isPending
                              ? "bg-[#0083CA] text-white ring-4 ring-[#0083CA]/20"
                              : "bg-[#0083CA] text-white"
                          }`}
                        >
                          {isPending ? <Clock className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </div>
                        <span className="text-[11px] font-bold text-[#0E1B2A] mt-2">2. Under Review</span>
                      </div>

                      {/* Step 3 */}
                      <div className="relative z-10 flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-md ${
                            isPending
                              ? "bg-slate-200 text-slate-500 border border-slate-300"
                              : "bg-[#0083CA] text-white"
                          }`}
                        >
                          {isPending ? "3" : <Check className="w-4 h-4" />}
                        </div>
                        <span className="text-[11px] font-bold text-[#0E1B2A] mt-2">3. Credit Decision</span>
                      </div>

                      {/* Step 4 */}
                      <div className="relative z-10 flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-md ${
                            isPending
                              ? "bg-slate-200 text-slate-400 border border-slate-300"
                              : isApproved
                              ? "bg-[#1E9E5A] text-white ring-4 ring-[#1E9E5A]/20"
                              : isCounterOffer
                              ? "bg-[#E8A33D] text-white ring-4 ring-[#E8A33D]/20"
                              : "bg-[#D6455B] text-white ring-4 ring-[#D6455B]/20"
                          }`}
                        >
                          {isPending ? "4" : isApproved ? <Check className="w-4 h-4" /> : "!"}
                        </div>
                        <span className="text-[11px] font-bold text-[#0E1B2A] mt-2">
                          {isApproved ? "4. Approved" : isCounterOffer ? "4. Counter-Offer" : isManualReview ? "4. Manual Review" : "4. Decision"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Decision & Action Callouts */}
                  <div>
                    {isPending && (
                      <div className="bg-[#F4F7FB] border border-[#E4EBF2] rounded-xl p-5 text-center space-y-2">
                        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-[#0083CA]/10 text-[#0083CA] rounded-full text-xs font-bold border border-[#0083CA]/20">
                          <Clock className="w-4 h-4 animate-spin" />
                          <span>Status: Under Evaluation by UBL Risk Officer</span>
                        </div>
                        <p className="text-xs text-[#5B6B7C] max-w-md mx-auto leading-relaxed">
                          Your requested loan of <strong>PKR {app.requestedAmount.toLocaleString()}</strong> ({app.tenureMonths} Months) is being reviewed. Expected turnaround &lt; 48 hours.
                        </p>
                      </div>
                    )}

                    {isApproved && (
                      <div className="bg-[#1E9E5A]/10 border border-[#1E9E5A]/30 rounded-xl p-5 space-y-3 shadow-sm">
                        <div className="flex items-center space-x-2 text-[#1E9E5A] font-bold text-sm">
                          <CheckCircle2 className="w-5 h-5" />
                          <span>Financing Request APPROVED</span>
                        </div>
                        <p className="text-xs text-[#0E1B2A] leading-relaxed">
                          Your working capital loan request of <strong>PKR {app.requestedAmount.toLocaleString()}</strong> over {app.tenureMonths} months has been fully approved with zero interest.
                        </p>
                        <div className="pt-2">
                          <button
                            onClick={() => alert("Fund disbursement initiated to your verified supplier IBAN account!")}
                            className="px-6 py-2.5 bg-[#1E9E5A] hover:bg-[#1E9E5A]/90 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-[#1E9E5A]/20 flex items-center space-x-2 transition-all"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            <span>Request Supplier Fund Disbursement</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {isCounterOffer && (
                      <div className="bg-[#E8A33D]/10 border border-[#E8A33D]/30 rounded-xl p-5 space-y-3 shadow-sm">
                        <div className="flex items-center space-x-2 text-[#E8A33D] font-bold text-sm">
                          <AlertTriangle className="w-5 h-5" />
                          <span>Recommended Counter-Offer from Bank</span>
                        </div>
                        <p className="text-xs text-[#0E1B2A] leading-relaxed">
                          Your requested loan of <strong>PKR {app.requestedAmount.toLocaleString()}</strong> exceeds your current 6-month safe payment capacity. UBL recommends an approved limit of <strong>PKR {app.assessment?.eligibility.recommendedAmount.toLocaleString()}</strong> under a 0% interest repayment plan.
                        </p>
                        <div className="bg-white p-3.5 rounded-lg border border-[#E8A33D]/30 text-xs text-[#0E1B2A] font-semibold space-y-1.5">
                          <div className="flex justify-between">
                            <span>Approved Counter-Offer Limit:</span>
                            <span className="font-extrabold text-[#E8A33D] text-sm">
                              PKR {app.assessment?.eligibility.recommendedAmount.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Monthly Payment:</span>
                            <span className="font-bold text-[#0E1B2A]">
                              PKR {Math.round((app.assessment?.eligibility.recommendedAmount || 0) / app.tenureMonths).toLocaleString()} / mo
                            </span>
                          </div>
                        </div>
                        <div className="pt-2">
                          <button
                            onClick={() => alert(`Accepted Counter-Offer for PKR ${app.assessment?.eligibility.recommendedAmount.toLocaleString()}!`)}
                            className="px-5 py-2.5 bg-[#E8A33D] hover:bg-[#E8A33D]/90 text-white font-extrabold text-xs rounded-xl flex items-center space-x-2 transition-all"
                          >
                            <span>Accept PKR {app.assessment?.eligibility.recommendedAmount.toLocaleString()} Counter-Offer</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {isManualReview && (
                      <div className="bg-[#D6455B]/10 border border-[#D6455B]/30 rounded-xl p-5 space-y-3 shadow-sm">
                        <div className="flex items-center space-x-2 text-[#D6455B] font-bold text-sm">
                          <AlertTriangle className="w-5 h-5" />
                          <span>Under Special Bank Review</span>
                        </div>
                        <p className="text-xs text-[#0E1B2A] leading-relaxed">
                          Your application requires special bank review and manual document check. A UBL loan officer will contact your registered phone number within 2 business days.
                        </p>
                      </div>
                    )}

                    {app.status === "REJECTED" && (
                      <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-xl p-5 space-y-3 shadow-sm">
                        <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
                          <AlertTriangle className="w-5 h-5" />
                          <span>Loan Request Not Approved</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          After reviewing your account history, UBL loan officers were unable to approve this loan request at this time. You may re-apply after 30 days of updated transaction history.
                        </p>
                        {app.rmNotes && (
                          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-300">
                            <span className="font-bold text-amber-400 block mb-1">Official RM Note:</span>
                            <p>{app.rmNotes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
