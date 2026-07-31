"use client";

import React, { useState, useEffect } from "react";
import { SMEProfile, LoanApplication } from "@/types";
import { loadApplications, updateApplication, subscribe } from "@/lib/store";
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
  Info,
  MessageSquare,
  X,
} from "lucide-react";

interface ApplicationStatusViewProps {
  sme: SMEProfile;
}

interface ConfirmationState {
  isOpen: boolean;
  title: string;
  subtitle: string;
  amount: number;
  type: "DISBURSEMENT" | "COUNTER_OFFER";
  appId: string;
}

export default function ApplicationStatusView({ sme }: ApplicationStatusViewProps) {
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  
  // Custom In-App Confirmation Modal State (Plain SME Language)
  const [modal, setModal] = useState<ConfirmationState>({
    isOpen: false,
    title: "",
    subtitle: "",
    amount: 0,
    type: "DISBURSEMENT",
    appId: "",
  });

  useEffect(() => {
    const allApps = loadApplications();
    setApplications(allApps);
    const unsubscribe = subscribe((updatedApps) => {
      setApplications(updatedApps);
    });
    return () => unsubscribe();
  }, []);

  const smeApps = applications.filter(
    (app) => app.smeId === sme.id || app.smeName === sme.name
  );

  useEffect(() => {
    if (smeApps.length > 0 && !expandedAppId) {
      setExpandedAppId(smeApps[0].id);
    }
  }, [smeApps]);

  const handleAcceptCounterOffer = (app: LoanApplication) => {
    const approvedAmount = app.assessment?.eligibility.recommendedAmount || Math.round(app.requestedAmount * 0.65);
    updateApplication(app.id, {
      status: "APPROVED",
      smeAccepted: true,
      rmNotes: app.rmNotes ? `${app.rmNotes} [SME Accepted Counter-Offer for PKR ${approvedAmount.toLocaleString()}]` : `SME Accepted Counter-Offer for PKR ${approvedAmount.toLocaleString()}`,
    } as any);

    setModal({
      isOpen: true,
      title: "Counter-Offer Accepted & Approved!",
      subtitle: "Your adjusted loan has been approved. The updated amount is now ready.",
      amount: approvedAmount,
      type: "COUNTER_OFFER",
      appId: app.id,
    });
  };

  const handleRequestDisbursement = (app: LoanApplication) => {
    const amount = app.assessment?.eligibility.recommendedAmount || app.requestedAmount;
    updateApplication(app.id, {
      smeAccepted: true,
      disbursementRequested: true,
    } as any);

    setModal({
      isOpen: true,
      title: "Loan Transfer Initiated",
      subtitle: "UBL has initiated the loan transfer request to your registered bank account.",
      amount: amount,
      type: "DISBURSEMENT",
      appId: app.id,
    });
  };

  if (smeApps.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-10 border border-[#E2E6E7] shadow-sm text-center space-y-4 font-sans">
        <Building2 className="w-12 h-12 text-[#5C6B70] mx-auto" />
        <div className="space-y-1">
          <h3 className="font-bold text-[#081921] text-lg">No Business Loan Requests Found</h3>
          <p className="text-xs text-[#5C6B70] max-w-md mx-auto leading-relaxed">
            There are no submitted loan applications for <strong>{sme.name}</strong>. Go to the <strong>Request Business Loan</strong> tab to submit a new loan request!
          </p>
        </div>
      </div>
    );
  }

  const approvedApps = smeApps.filter((a) => a.status === "APPROVED");

  return (
    <div className="space-y-6 font-sans relative">
      {/* Custom In-App Confirmation Modal (Plain SME Language) */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#081921]/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-[#E2E6E7] shadow-2xl max-w-md w-full p-6 space-y-5 relative overflow-hidden">
            {/* Top Close Button */}
            <button
              onClick={() => setModal({ ...modal, isOpen: false })}
              className="absolute top-4 right-4 p-1 text-[#5C6B70] hover:text-[#081921] rounded-lg transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header Badge & Title */}
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-xl bg-[#2F9E5E]/15 text-[#2F9E5E] flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1 pt-0.5">
                <h3 className="font-bold text-[#081921] text-lg leading-tight">
                  {modal.title}
                </h3>
                <p className="text-xs text-[#5C6B70] leading-relaxed">
                  {modal.subtitle}
                </p>
              </div>
            </div>

            {/* Loan Details Card */}
            <div className="bg-[#F6F6F6] rounded-xl border border-[#E2E6E7] p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-[#E2E6E7]">
                <span className="text-[#5C6B70] font-medium">Loan ID:</span>
                <span className="font-mono font-bold text-[#2F96B4] bg-[#2F96B4]/10 px-2 py-0.5 rounded">
                  {modal.appId}
                </span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-[#E2E6E7]">
                <span className="text-[#5C6B70] font-medium">Loan Amount:</span>
                <span className="font-extrabold text-[#081921] text-sm">
                  PKR {modal.amount.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#5C6B70] font-medium">Bank Account IBAN:</span>
                <span className="font-mono text-[11px] text-[#081921] font-semibold">
                  {sme.iban}
                </span>
              </div>
            </div>

            {/* Modal Primary Action Button */}
            <div className="pt-2">
              <button
                onClick={() => setModal({ ...modal, isOpen: false })}
                className="w-full py-2.5 bg-[#2F96B4] hover:bg-[#257A93] text-white font-semibold text-sm rounded-lg flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Got It & View Updated Status</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SME Loan History Header Banner */}
      <div className="bg-[#081921] text-white rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-[#2F96B4] font-bold text-xs uppercase tracking-wider">
              <History className="w-4 h-4" />
              <span>Your Business Loan Requests</span>
            </div>
            <h2 className="text-xl font-bold text-white">{sme.name}</h2>
            <p className="text-xs text-slate-300">
              IBAN: {sme.iban} • {sme.city}, Pakistan
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-[#081921]/90 p-3 rounded-xl border border-slate-800">
              <span className="text-[#5C6B70] block text-[11px]">Total Submitted</span>
              <span className="font-extrabold text-white text-base">{smeApps.length} Requests</span>
            </div>

            <div className="bg-[#081921]/90 p-3 rounded-xl border border-slate-800">
              <span className="text-[#5C6B7C] block text-[11px]">Approved</span>
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
          <span className="text-xs text-[#5C6B70]">
            Live status synchronized with UBL
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
                isExpanded ? "border-[#2F96B4] ring-2 ring-[#2F96B4]/10" : "border-[#E2E6E7]"
              }`}
            >
              {/* Card Header Row */}
              <div
                onClick={() => setExpandedAppId(isExpanded ? null : app.id)}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-[#F6F6F6]/50 transition-all border-b border-[#E2E6E7]"
              >
                <div className="flex items-center space-x-3">
                  <span className="font-mono font-extrabold text-xs text-[#2F96B4] bg-[#2F96B4]/10 px-3 py-1 rounded-lg border border-[#2F96B4]/30">
                    {app.id}
                  </span>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-[#081921] text-sm">{app.purpose}</h4>
                      <span className="text-xs text-[#5C6B70]">({app.tenureMonths} Months)</span>
                    </div>
                    <span className="text-[11px] text-[#5C6B70]">
                      Submitted: {new Date(app.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <span className="text-[11px] text-[#5C6B70] block">Requested Amount:</span>
                    <span className="font-extrabold text-[#081921] text-sm">
                      PKR {app.requestedAmount.toLocaleString()}
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                      isApproved
                        ? "bg-[#2F9E5E]/15 text-[#2F9E5E] border-[#2F9E5E]/30"
                        : isCounterOffer
                        ? "bg-[#E0A63B]/25 text-[#081921] border-[#E0A63B]/40"
                        : isManualReview
                        ? "bg-[#D9534F]/15 text-[#D9534F] border-[#D9534F]/30"
                        : isRejected
                        ? "bg-[#D9534F]/15 text-[#D9534F] border-[#D9534F]/30"
                        : "bg-[#E0A63B]/15 text-[#E0A63B] border-[#E0A63B]/30"
                    }`}
                  >
                    {app.status.replace("_", " ")}
                  </span>

                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-[#5C6B70]" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#5C6B70]" />
                  )}
                </div>
              </div>

              {/* Card Expanded Detail Body */}
              {isExpanded && (
                <div className="p-6 space-y-6 bg-[#F6F6F6]/30">
                  {/* 4-Step Status Progress Tracker */}
                  <div className="py-2">
                    <div className="relative flex items-center justify-between">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-[#E2E6E7] -z-0" />
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
                        <span className="text-[11px] font-bold text-[#081921] mt-2">3. Decision</span>
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
                              ? "bg-[#E0A63B] text-white ring-4 ring-[#E0A63B]/20"
                              : "bg-[#D9534F] text-white ring-4 ring-[#D9534F]/20"
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

                  {/* Decision Callouts */}
                  <div className="space-y-4">
                    {isPending && (
                      <div className="bg-[#F6F6F6] border border-[#E2E6E7] rounded-xl p-5 text-center space-y-2">
                        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-[#2F96B4]/10 text-[#2F96B4] rounded-full text-xs font-bold border border-[#2F96B4]/30">
                          <Clock className="w-4 h-4 animate-spin" />
                          <span>Status: Bank Reviewing Your Application</span>
                        </div>
                        <p className="text-xs text-[#5C6B70] max-w-md mx-auto leading-relaxed">
                          Your requested loan of <strong>PKR {app.requestedAmount.toLocaleString()}</strong> ({app.tenureMonths} Months) is being reviewed. Expected turnaround &lt; 48 hours.
                        </p>
                      </div>
                    )}

                    {isApproved && (
                      <div className="bg-[#2F9E5E]/10 border border-[#2F9E5E]/30 rounded-xl p-5 space-y-3 shadow-sm">
                        <div className="flex items-center space-x-2 text-[#2F9E5E] font-bold text-sm">
                          <CheckCircle2 className="w-5 h-5" />
                          <span>Loan APPROVED</span>
                        </div>
                        <p className="text-xs text-[#081921] leading-relaxed">
                          Your business loan request of <strong>PKR {app.requestedAmount.toLocaleString()}</strong> over {app.tenureMonths} months has been fully approved.
                        </p>
                        <div className="pt-2">
                          <button
                            onClick={() => handleRequestDisbursement(app)}
                            className="px-6 py-2.5 bg-[#2F96B4] hover:bg-[#257A93] text-white font-semibold text-xs rounded-lg shadow-md shadow-[#2F96B4]/20 flex items-center space-x-2 transition-all cursor-pointer"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            <span>Initiate Loan Transfer</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {isCounterOffer && (
                      <div className="bg-[#E0A63B]/10 border border-[#E0A63B]/30 rounded-xl p-5 space-y-4 shadow-sm">
                        <div className="flex items-center space-x-2 text-[#E0A63B] font-bold text-sm">
                          <AlertTriangle className="w-5 h-5" />
                          <span>Recommended Adjusted Loan Amount</span>
                        </div>
                        <p className="text-xs text-[#081921] leading-relaxed">
                          Your requested loan of <strong>PKR {app.requestedAmount.toLocaleString()}</strong> is slightly above your monthly repayment limit. UBL recommends an adjusted loan amount of <strong>PKR {(app.assessment?.eligibility.recommendedAmount || Math.round(app.requestedAmount * 0.65)).toLocaleString()}</strong>.
                        </p>

                        <div className="bg-white p-4 rounded-xl border border-[#E0A63B]/30 text-xs text-[#081921] font-semibold space-y-2">
                          <div className="flex justify-between border-b border-slate-100 pb-2">
                            <span>Recommended Loan Amount:</span>
                            <span className="font-extrabold text-[#E0A63B] text-sm">
                              PKR {(app.assessment?.eligibility.recommendedAmount || Math.round(app.requestedAmount * 0.65)).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Monthly Payment:</span>
                            <span className="font-bold text-[#081921]">
                              PKR {Math.round((app.assessment?.eligibility.recommendedAmount || Math.round(app.requestedAmount * 0.65)) / app.tenureMonths).toLocaleString()} / mo
                            </span>
                          </div>
                        </div>

                        {/* Bank Manager Remarks */}
                        {app.rmNotes && (
                          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-1.5 shadow-sm">
                            <div className="flex items-center space-x-2 text-amber-700 font-bold text-xs uppercase tracking-wider">
                              <MessageSquare className="w-4 h-4 text-amber-600" />
                              <span>Bank Manager Remarks:</span>
                            </div>
                            <p className="text-xs text-amber-950 font-medium leading-relaxed bg-white p-3 rounded-lg border border-amber-200/80">
                              "{app.rmNotes}"
                            </p>
                          </div>
                        )}

                        <div className="pt-2">
                          <button
                            onClick={() => handleAcceptCounterOffer(app)}
                            className="px-5 py-2.5 bg-[#E0A63B] hover:bg-[#E0A63B]/90 text-white font-semibold text-xs rounded-lg flex items-center space-x-2 transition-all cursor-pointer shadow-md"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Accept PKR {(app.assessment?.eligibility.recommendedAmount || Math.round(app.requestedAmount * 0.65)).toLocaleString()} Adjusted Loan</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {isRejected && (
                      <div className="bg-[#D9534F]/10 border border-[#D9534F]/30 rounded-xl p-5 space-y-4 shadow-sm">
                        <div className="flex items-center space-x-2 text-[#D9534F] font-bold text-sm">
                          <AlertTriangle className="w-5 h-5" />
                          <span>Loan Request Not Approved</span>
                        </div>
                        <p className="text-xs text-[#081921] leading-relaxed">
                          After reviewing your 6-month UBL bank records, UBL loan officers were unable to approve this loan request at this time.
                        </p>

                        {/* Bank Manager Remarks */}
                        {app.rmNotes && (
                          <div className="bg-white border border-[#D9534F]/30 p-4 rounded-xl space-y-1.5">
                            <div className="flex items-center space-x-2 text-[#D9534F] font-bold text-xs uppercase tracking-wider">
                              <MessageSquare className="w-4 h-4" />
                              <span>Bank Manager Remarks:</span>
                            </div>
                            <p className="text-xs text-slate-800 font-medium leading-relaxed bg-[#F6F6F6] p-3 rounded-lg border border-[#E2E6E7]">
                              "{app.rmNotes}"
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {isManualReview && (
                      <div className="bg-[#2F96B4]/10 border border-[#2F96B4]/30 rounded-xl p-5 space-y-4 shadow-sm">
                        <div className="flex items-center space-x-2 text-[#2F96B4] font-bold text-sm">
                          <AlertTriangle className="w-5 h-5" />
                          <span>Under Special Bank Review</span>
                        </div>
                        <p className="text-xs text-[#081921] leading-relaxed">
                          Your application requires senior credit officer review. A UBL loan officer will contact your registered phone number.
                        </p>

                        {/* Bank Manager Remarks */}
                        {app.rmNotes && (
                          <div className="bg-white border border-[#2F96B4]/30 p-4 rounded-xl space-y-1.5">
                            <div className="flex items-center space-x-2 text-[#2F96B4] font-bold text-xs uppercase tracking-wider">
                              <MessageSquare className="w-4 h-4" />
                              <span>Bank Manager Remarks:</span>
                            </div>
                            <p className="text-xs text-slate-800 font-medium leading-relaxed bg-[#F6F6F6] p-3 rounded-lg border border-[#E2E6E7]">
                              "{app.rmNotes}"
                            </p>
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
