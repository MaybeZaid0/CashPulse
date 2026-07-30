import { ScoreEngineResult, SMEProfile, FinancingApplication } from "@/types";
import { calculateCashPulseScore } from "./engine";
import { DEMO_SME_PROFILES } from "./sme-data";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export async function loginSME(
  cnic: string,
  email: string,
  password: string
): Promise<SMEProfile> {
  const cleanReqCnic = cnic.replace(/\D/g, "");
  const cleanReqEmail = email.trim().toLowerCase();

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/sme-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnic, email, password }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.sme) {
        return data.sme;
      }
    } else if (res.status === 401) {
      throw new Error("Invalid CNIC, Email, or Password");
    }
  } catch (error: any) {
    if (error.message === "Invalid CNIC, Email, or Password") {
      throw error;
    }
    console.warn("Backend API login offline, matching against client-side dummy dataset:", error);
  }

  // Fallback match against local DEMO_SME_PROFILES
  const match = DEMO_SME_PROFILES.find((sme) => {
    const smeCnicClean = (sme.cnic || "").replace(/\D/g, "");
    const smeEmailClean = (sme.email || "").trim().toLowerCase();
    return (
      smeCnicClean === cleanReqCnic &&
      smeEmailClean === cleanReqEmail &&
      sme.password === password
    );
  });

  if (match) {
    return match;
  }

  throw new Error("Invalid CNIC, Email, or Password. Please check dummy data credentials.");
}

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
