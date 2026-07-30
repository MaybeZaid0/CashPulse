import { ScoreEngineResult, SMEProfile, FinancingApplication } from "@/types";
import { calculateCashPulseScore } from "./engine";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export async function fetchScoreResult(
  sme: SMEProfile,
  askedLoan: number,
  tenureMonths: number
): Promise<ScoreEngineResult> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/readiness-score?account_id=${sme.id}&asked_loan=${askedLoan}&tenure_months=${tenureMonths}`,
      {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (error) {
    console.warn("Backend API unavailable, executing client-side engine:", error);
  }

  // Fallback to client-side engine if backend server is offline
  return calculateCashPulseScore(sme, askedLoan, tenureMonths);
}

export async function submitFinancingApplication(
  app: Omit<FinancingApplication, "id" | "submittedAt">
): Promise<FinancingApplication> {
  const newApp: FinancingApplication = {
    ...app,
    id: `REQ-${Date.now().toString().slice(-6)}`,
    submittedAt: new Date().toISOString(),
  };

  try {
    const res = await fetch(`${API_BASE_URL}/api/financing/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newApp),
    });

    if (res.ok) {
      const saved = await res.json();
      return saved;
    }
  } catch (error) {
    console.warn("Backend API submission fallback:", error);
  }

  return newApp;
}
