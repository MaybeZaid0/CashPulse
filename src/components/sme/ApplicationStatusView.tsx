"use client";

import React, { useState, useEffect } from "react";
import { SMEProfile, LoanApplication } from "@/types";
import { loadApplications, subscribe } from "@/lib/store";
import { generateQualitativePillarFeedback } from "@/lib/scoring";
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
  Info,
  MessageSquare,
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
      <div className="bg-white rounded-2xl p-10 border border-[#E5E7EB] shadow-sm text-center space-y-4 font-sans">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
        <div className="space-y-1">
          <h3 className="font-extrabold text-[#081921] text-lg">No Financing History Found</h3>
          <p className="text-xs text-[#5B6B7C] max-w-md mx-auto leading-relaxed">
            There are no submitted loan applications for <strong>{sme.name}</strong>. Go to the <strong>Apply for Working Capital</strong> tab to run a 5-pillar readiness check and submit a loan request!
          </p>
        </div>
      </div>
    );
  }

  const approvedApps = smeApps.filter((a) => a.status === "APPROVED");

  return (
    <div className="space-y-6 font-sans">
      {/* SME Loan History Header Banner */}
      <div className="bg-[#081921] text-white rounded-2xl p-6 border border-[#0f2e3d] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-[#2F96B4] font-bold text-xs uppercase tracking-wider">
              <History className="w-4 h-4" />
              <span>Verified SME Loan Application History</span>
            </div>
            <h2 className="text-xl font-extrabold text-white">{sme.name}</h2>
            <p className="text-xs text-slate-300">
              IBAN: {sme.iban} • {sme.city}, Pakistan
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-[#0f2e3d] p-3 rounded-xl border border-[#1a4457]">
              <span className="text-[#9CA9A3] block text-[11px]">Total Applications</span>
              <span className="font-extrabold text-white text-base">{smeApps.length} Submitted</span>
            </div>

            <div className="bg-[#0f2e3d] p-3 rounded-xl border border-[#1a4457]">
              <span className="text-[#9CA9A3] block text-[11px]">Approved Loans</span>
              <span className="font-extrabold text-[#2F96B4] text-base">{approvedApps.length} Approved</span>
            </div>
          </div>
        </div>
      </div>

      {/* History List of Applications */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[#081921] text-base">
            Loan Application Records ({smeApps.length})
          </h3>
          <span className="text-xs text-[#5B6B7C]">
            Live status synchronized with UBL Relationship Managers
          </span>
        </div>

        {smeApps.map((app) => {
          const isExpanded = expandedAppId === app.id;
          const isApproved = app.status === "APPROVED";
          const isCounterOffer = app.status === "COUNTER_OFFER" || app.status === "COUNTER_OFFER_ISSUED";
          const isPending = app.status === "PENDING" || app.status === "ASSESSED";
          const isManualReview = app.status === "MANUAL_REVIEW";
          const isRejected = app.status === "REJECTED";

          // Calculate qualitative reasons for low-scoring categories indirectly
          const feedbackReasons =
            app.qualitativeReasons ||
            app.assessment?.qualitativeReasons ||
            (app.assessment?.pillars
              ? generateQualitativePillarFeedback(sme, app.requestedAmount, app.tenureMonths, app.assessment.pillars)
              : [
                  "Your safe monthly repayment capacity did not satisfy our debt service coverage requirements for the requested loan installment.",
                  "Your available liquid bank balance reserves did not satisfy our minimum operating expense buffer requirements.",
                ]);

          return (
            <div
              key={app.id}
              className={`bg-white rounded-2xl border transition-all shadow-sm overflow-hidden ${
                isExpanded ? "border-[#2F96B4] ring-2 ring-[#2F96B4]/10" : "border-[#E5E7EB]"
              }`}
            >
              {/* Card Header Row */}
              <div
                onClick={() => setExpandedAppId(isExpanded ? null : app.id)}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-[#F6F6F6]/50 transition-all border-b border-[#E5E7EB]"
              >
                <div className="flex items-center space-x-3">
                  <span className="font-mono font-extrabold text-xs text-[#2F96B4] bg-[#2F96B4]/10 px-3 py-1 rounded-lg border border-[#2F96B4]/30">
                    {app.id}
                  </span>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-[#081921] text-sm">{app.purpose}</h4>
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
                    <span className="font-extrabold text-[#081921] text-sm">
                      PKR {app.requestedAmount.toLocaleString()}
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                      isApproved
                        ? "bg-[#2F96B4]/10 text-[#2F96B4] border-[#2F96B4]/30"
                        : isCounterOffer
                        ? "bg-[#E8A33D]/10 text-[#E8A33D] border-[#E8A33D]/30"
                        : isManualReview
                        ? "bg-[#D6455B]/10 text-[#D6455B] border-[#D6455B]/30"
                        : isRejected
                        ? "bg-slate-900 text-slate-100 border-slate-700"
                        : "bg-[#2F96B4]/10 text-[#2F96B4] border-[#2F96B4]/30"
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
                <div className="p-6 space-y-6 bg-[#F6F6F6]/30">
                  {/* 4-Step Status Progress Tracker */}
                  <div className="py-2">
                    <div className="relative flex items-center justify-between">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-[#E5E7EB] -z-0" />
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#2F96B4] transition-all duration-500 -z-0"
                        style={{
                          width: isPending ? "33%" : "100%",
                        }}
                      />

                      {/* Step 1 */}
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-[#2F96B4] text-white flex items-center justify-center text-xs font-bold shadow-md">
                          <Check className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-bold text-[#081921] mt-2">1. Submitted</span>
                      </div>

                      {/* Step 2 */}
                      <div className="relative z-10 flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-md ${
                            isPending
                              ? "bg-[#2F96B4] text-white ring-4 ring-[#2F96B4]/20"
                              : "bg-[#2F96B4] text-white"
                          }`}
                        >
                          {isPending ? <Clock className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </div>
                        <span className="text-[11px] font-bold text-[#081921] mt-2">2. Under Review</span>
                      </div>

                      {/* Step 3 */}
                      <div className="relative z-10 flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-md ${
                            isPending
                              ? "bg-slate-200 text-slate-500 border border-slate-300"
                              : "bg-[#2F96B4] text-white"
                          }`}
                        >
                          {isPending ? "3" : <Check className="w-4 h-4" />}
                        </div>
                        <span className="text-[11px] font-bold text-[#081921] mt-2">3. Credit Decision</span>
                      </div>

                      {/* Step 4 */}
                      <div className="relative z-10 flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-md ${
                            isPending
                              ? "bg-slate-200 text-slate-400 border border-slate-300"
                              : isApproved
                              ? "bg-[#2F96B4] text-white ring-4 ring-[#2F96B4]/20"
                              : isCounterOffer
                              ? "bg-[#E8A33D] text-white ring-4 ring-[#E8A33D]/20"
                              : "bg-[#D6455B] text-white ring-4 ring-[#D6455B]/20"
                          }`}
                        >
                          {isPending ? "4" : isApproved ? <Check className="w-4 h-4" /> : "!"}
                        </div>
                        <span className="text-[11px] font-bold text-[#081921] mt-2">
                          {isApproved ? "4. Approved" : isCounterOffer ? "4. Counter-Offer" : isManualReview ? "4. Manual Review" : "4. Rejected"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Decision & Qualitative Pillar Feedback Callouts */}
                  <div className="space-y-4">
                    {isPending && (
                      <div className="bg-[#F6F6F6] border border-[#E5E7EB] rounded-xl p-5 text-center space-y-2">
                        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-[#2F96B4]/10 text-[#2F96B4] rounded-full text-xs font-bold border border-[#2F96B4]/30">
                          <Clock className="w-4 h-4 animate-spin" />
                          <span>Status: Under Evaluation by UBL Risk Officer</span>
                        </div>
                        <p className="text-xs text-[#5B6B7C] max-w-md mx-auto leading-relaxed">
                          Your requested loan of <strong>PKR {app.requestedAmount.toLocaleString()}</strong> ({app.tenureMonths} Months) is being reviewed. Expected turnaround &lt; 48 hours.
                        </p>
                      </div>
                    )}

                    {isApproved && (
                      <div className="bg-[#2F96B4]/10 border border-[#2F96B4]/30 rounded-xl p-5 space-y-3 shadow-sm">
                        <div className="flex items-center space-x-2 text-[#2F96B4] font-bold text-sm">
                          <CheckCircle2 className="w-5 h-5" />
                          <span>Financing Request APPROVED</span>
                        </div>
                        <p className="text-xs text-[#081921] leading-relaxed">
                          Your working capital loan request of <strong>PKR {app.requestedAmount.toLocaleString()}</strong> over {app.tenureMonths} months has been fully approved with zero interest.
                        </p>
                        <div className="pt-2">
                          <button
                            onClick={() => alert("Fund disbursement initiated to your verified supplier IBAN account!")}
                            className="px-6 py-2.5 bg-[#2F96B4] hover:bg-[#257A93] text-white font-extrabold text-xs rounded-xl shadow-lg shadow-[#2F96B4]/20 flex items-center space-x-2 transition-all cursor-pointer"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            <span>Request Supplier Fund Disbursement</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {isCounterOffer && (
                      <div className="bg-[#E8A33D]/10 border border-[#E8A33D]/30 rounded-xl p-5 space-y-4 shadow-sm">
                        <div className="flex items-center space-x-2 text-[#E8A33D] font-bold text-sm">
                          <AlertTriangle className="w-5 h-5" />
                          <span>Recommended Counter-Offer from Bank</span>
                        </div>
                        <p className="text-xs text-[#081921] leading-relaxed">
                          Your requested loan of <strong>PKR {app.requestedAmount.toLocaleString()}</strong> exceeds your current safe monthly repayment capacity. UBL recommends an adjusted counter-offer limit of <strong>PKR {(app.assessment?.eligibility.recommendedAmount || Math.round(app.requestedAmount * 0.65)).toLocaleString()}</strong> under a 0% interest repayment plan.
                        </p>

                        <div className="bg-white p-4 rounded-xl border border-[#E8A33D]/30 text-xs text-[#081921] font-semibold space-y-2">
                          <div className="flex justify-between border-b border-slate-100 pb-2">
                            <span>Approved Counter-Offer Limit:</span>
                            <span className="font-extrabold text-[#E8A33D] text-sm">
                              PKR {(app.assessment?.eligibility.recommendedAmount || Math.round(app.requestedAmount * 0.65)).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Adjusted Monthly Instalment:</span>
                            <span className="font-bold text-[#081921]">
                              PKR {Math.round((app.assessment?.eligibility.recommendedAmount || Math.round(app.requestedAmount * 0.65)) / app.tenureMonths).toLocaleString()} / mo
                            </span>
                          </div>
                        </div>

                        {/* Custom RM Typed Remarks Card */}
                        {app.rmNotes && (
                          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-1.5 shadow-sm">
                            <div className="flex items-center space-x-2 text-amber-700 font-extrabold text-xs uppercase tracking-wider">
                              <MessageSquare className="w-4 h-4 text-amber-600" />
                              <span>Official Relationship Manager Remarks:</span>
                            </div>
                            <p className="text-xs text-amber-950 font-medium leading-relaxed bg-white p-3 rounded-lg border border-amber-200/80">
                              "{app.rmNotes}"
                            </p>
                          </div>
                        )}

                        {/* Indirect 5-Pillar Feedback Panel */}
                        <div className="bg-white p-4 rounded-xl border border-[#E8A33D]/40 space-y-2">
                          <div className="flex items-center space-x-2 text-[#E8A33D] font-extrabold text-xs uppercase tracking-wider">
                            <Info className="w-4 h-4" />
                            <span>Bank Assessment Feedback & Improvement Areas:</span>
                          </div>
                          <ul className="space-y-1.5 pt-1">
                            {feedbackReasons.map((reason, idx) => (
                              <li key={idx} className="text-xs text-slate-700 flex items-start space-x-2 font-medium">
                                <span className="text-[#E8A33D] font-bold mt-0.5">•</span>
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="pt-2">
                          <button
                            onClick={() => alert(`Accepted Counter-Offer for PKR ${(app.assessment?.eligibility.recommendedAmount || Math.round(app.requestedAmount * 0.65)).toLocaleString()}!`)}
                            className="px-5 py-2.5 bg-[#E8A33D] hover:bg-[#E8A33D]/90 text-white font-extrabold text-xs rounded-xl flex items-center space-x-2 transition-all cursor-pointer"
                          >
                            <span>Accept PKR {(app.assessment?.eligibility.recommendedAmount || Math.round(app.requestedAmount * 0.65)).toLocaleString()} Counter-Offer</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {isRejected && (
                      <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
                        <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
                          <AlertTriangle className="w-5 h-5" />
                          <span>Loan Request Not Approved</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          After reviewing your 6-month UBL core banking records, UBL loan officers were unable to approve this loan request at this time.
                        </p>

                        {/* Custom RM Typed Remarks Card */}
                        {app.rmNotes && (
                          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1.5">
                            <div className="flex items-center space-x-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider">
                              <MessageSquare className="w-4 h-4 text-amber-400" />
                              <span>Official Relationship Manager Remarks:</span>
                            </div>
                            <p className="text-xs text-slate-200 font-medium leading-relaxed bg-slate-900 p-3 rounded-lg border border-slate-800">
                              "{app.rmNotes}"
                            </p>
                          </div>
                        )}

                        {/* Indirect 5-Pillar Feedback Panel */}
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                          <div className="flex items-center space-x-2 text-rose-400 font-extrabold text-xs uppercase tracking-wider">
                            <Info className="w-4 h-4" />
                            <span>Bank Assessment Reasons & Criteria Feedback:</span>
                          </div>
                          <ul className="space-y-1.5 pt-1">
                            {feedbackReasons.map((reason, idx) => (
                              <li key={idx} className="text-xs text-slate-300 flex items-start space-x-2 font-medium">
                                <span className="text-rose-400 font-bold mt-0.5">•</span>
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {isManualReview && (
                      <div className="bg-[#D6455B]/10 border border-[#D6455B]/30 rounded-xl p-5 space-y-4 shadow-sm">
                        <div className="flex items-center space-x-2 text-[#D6455B] font-bold text-sm">
                          <AlertTriangle className="w-5 h-5" />
                          <span>Under Special Bank Review</span>
                        </div>
                        <p className="text-xs text-[#081921] leading-relaxed">
                          Your application requires senior credit officer review and manual document verification. A UBL credit officer will contact your registered business phone number.
                        </p>

                        {/* Custom RM Typed Remarks Card */}
                        {app.rmNotes && (
                          <div className="bg-white border border-[#D6455B]/30 p-4 rounded-xl space-y-1.5">
                            <div className="flex items-center space-x-2 text-[#D6455B] font-extrabold text-xs uppercase tracking-wider">
                              <MessageSquare className="w-4 h-4" />
                              <span>Official Relationship Manager Remarks:</span>
                            </div>
                            <p className="text-xs text-slate-800 font-medium leading-relaxed bg-[#F4F7FB] p-3 rounded-lg border border-slate-200">
                              "{app.rmNotes}"
                            </p>
                          </div>
                        )}

                        {/* Indirect 5-Pillar Feedback Panel */}
                        <div className="bg-white p-4 rounded-xl border border-[#D6455B]/30 space-y-2">
                          <div className="flex items-center space-x-2 text-[#D6455B] font-extrabold text-xs uppercase tracking-wider">
                            <Info className="w-4 h-4" />
                            <span>Bank Assessment Advisory:</span>
                          </div>
                          <ul className="space-y-1.5 pt-1">
                            {feedbackReasons.map((reason, idx) => (
                              <li key={idx} className="text-xs text-slate-700 flex items-start space-x-2 font-medium">
                                <span className="text-[#D6455B] font-bold mt-0.5">•</span>
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
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
