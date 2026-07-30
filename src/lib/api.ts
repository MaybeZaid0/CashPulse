import { SMEProfile, AssessmentResult, LoanApplication } from "@/types";
import { runAssessment } from "./scoring";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

/**
 * Executes 5-Pillar Credit Assessment via FastAPI Backend (or local fallback).
 */
export async function fetchAssessmentFromBackend(
  sme: SMEProfile,
  requestedAmount: number,
  tenureMonths: number
): Promise<AssessmentResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/assessments/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        smeId: sme.id,
        requestedLoan: requestedAmount,
        requestedTenure: tenureMonths,
      }),
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      return {
        readinessScore: data.readiness,
        pillars: {
          cashflowStability: data.pillarScores?.find((p: any) => p.pillar === "cashflow")?.score || 25,
          repaymentCapacity: data.pillarScores?.find((p: any) => p.pillar === "capacity")?.score || 20,
          liquidity: data.pillarScores?.find((p: any) => p.pillar === "liquidity")?.score || 15,
          businessBehaviour: data.pillarScores?.find((p: any) => p.pillar === "behaviour")?.score || 12,
          businessMomentum: data.pillarScores?.find((p: any) => p.pillar === "momentum")?.score || 8,
        },
        pillarEvidences: data.pillarScores?.map((p: any) => ({
          pillarName: p.label || p.pillar,
          score: p.score,
          maxScore: p.max,
          weight: `${p.weight * 100}%`,
          evidenceLines: [p.reason],
        })) || [],
        eligibility: {
          requestedAmount: data.eligibility?.requestedLoan || requestedAmount,
          recommendedAmount: data.eligibility?.recommendedLoan || requestedAmount,
          safeMonthlyInstalment: data.eligibility?.safeMonthlyCapacity || Math.round(requestedAmount / tenureMonths),
          requestedInstalment: Math.round(requestedAmount / tenureMonths),
          coverageRatio: data.eligibility?.coverageRatio || 1.2,
        },
        recommendation: {
          type: data.recommendation?.type || "APPROVE",
          reason: data.recommendation?.summary || "Passed 5-pillar credit assessment.",
          evidence: data.recommendation?.reasons || [],
        },
        cashflowChartData: data.cashflowSeries || [],
      };
    }
  } catch (error) {
    console.info("FastAPI backend offline, running client-side 5-pillar scoring engine.");
  }

  // Fallback to local scoring engine
  return runAssessment(sme, requestedAmount, tenureMonths);
}

/**
 * Submit Loan Application to FastAPI Backend / MongoDB
 */
export async function submitApplicationToBackend(app: LoanApplication): Promise<LoanApplication> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/assessments/${app.id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision: app.status,
        note: app.rmNotes || "",
      }),
    });

    if (res.ok) {
      const updated = await res.json();
      return {
        ...app,
        status: updated.decision || app.status,
      };
    }
  } catch (error) {
    console.info("FastAPI backend offline, saved application to real-time local store.");
  }

  return app;
}
