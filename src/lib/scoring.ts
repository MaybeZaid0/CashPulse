import {
  SMEProfile,
  FivePillarScore,
  PillarEvidence,
  EligibilityResult,
  Recommendation,
  RecommendationType,
  AssessmentResult,
} from "@/types";

// Configurable thresholds per PRD AC F-6.2 & OQ-1
export const SCORING_CONFIG = {
  strongThreshold: 80,
  reviewThreshold: 60,
  safeRepaymentRatio: 0.50, // 50% of avg monthly net cashflow per OQ-1
};

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr: number[]): number {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / arr.length);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

const MONTHS = ["M1", "M2", "M3", "M4", "M5", "M6"];

// ─── PRD F-6: 5 Banking Question Pillars ───

function scoreCashflowStability(sme: SMEProfile): PillarEvidence {
  const nets = sme.monthlyInflows.map((v, i) => v - sme.monthlyOutflows[i]);
  const netMean = mean(nets);
  const netStd = stddev(nets);
  const cv = netStd / (Math.abs(netMean) || 1);

  const raw = 30 * (1 - Math.min(cv, 1));
  const score = clamp(raw, 0, 30);

  const evidence: string[] = [
    `Avg monthly net cashflow: PKR ${Math.round(netMean).toLocaleString()}`,
    `Standard deviation: PKR ${Math.round(netStd).toLocaleString()}`,
    `Coefficient of Variation (CV): ${(cv * 100).toFixed(1)}%`,
  ];
  if (cv < 0.25) evidence.push("✓ Highly stable monthly cashflows");
  else if (cv < 0.5) evidence.push("⚠ Moderate cashflow variance detected");
  else evidence.push("✗ High cashflow volatility: credit risk");

  return {
    pillarName: "Cashflow Stability",
    score,
    maxScore: 30,
    weight: "30%",
    evidenceLines: evidence,
    chartData: nets.map((n, i) => ({ month: MONTHS[i], value: n })),
  };
}

function scoreRepaymentCapacity(
  sme: SMEProfile,
  requestedAmount: number,
  tenureMonths: number
): PillarEvidence {
  const nets = sme.monthlyInflows.map((v, i) => v - sme.monthlyOutflows[i]);
  const avgNet = mean(nets);
  const requestedInstalment = requestedAmount / (tenureMonths || 1);
  const safeCapacity = avgNet * SCORING_CONFIG.safeRepaymentRatio;

  const ratio = safeCapacity / (requestedInstalment || 1);
  const raw = 25 * (Math.min(ratio, 1.5) / 1.5);
  const score = clamp(raw, 0, 25);

  const evidence: string[] = [
    `Avg monthly net cashflow: PKR ${Math.round(avgNet).toLocaleString()}`,
    `Safe monthly capacity (50% per OQ-1): PKR ${Math.round(safeCapacity).toLocaleString()}`,
    `Required zero-interest instalment: PKR ${Math.round(requestedInstalment).toLocaleString()}/mo`,
  ];
  if (ratio >= 1.0) evidence.push(`✓ Instalment is ${(ratio * 100).toFixed(0)}% covered by safe capacity`);
  else evidence.push(`✗ Instalment exceeds safe capacity by ${((1 - ratio) * 100).toFixed(0)}%`);

  return {
    pillarName: "Repayment Capacity",
    score,
    maxScore: 25,
    weight: "25%",
    evidenceLines: evidence,
  };
}

function scoreLiquidity(sme: SMEProfile): PillarEvidence {
  const avgOutflow = mean(sme.monthlyOutflows);
  const reserveMonths = sme.currentBalance / (avgOutflow || 1);

  const raw = 20 * (Math.min(reserveMonths, 1.5) / 1.5);
  const score = clamp(raw, 0, 20);

  const evidence: string[] = [
    `Current UBL liquid balance: PKR ${sme.currentBalance.toLocaleString()}`,
    `Avg monthly outflow: PKR ${Math.round(avgOutflow).toLocaleString()}`,
    `Liquid reserve buffer: ${reserveMonths.toFixed(2)} months of operating expenses`,
  ];
  if (reserveMonths >= 1.0) evidence.push("✓ Strong liquidity cushion");
  else if (reserveMonths >= 0.5) evidence.push("⚠ Moderate liquidity reserve");
  else evidence.push("✗ Low liquidity cushion: risk factor");

  return {
    pillarName: "Liquidity",
    score,
    maxScore: 20,
    weight: "20%",
    evidenceLines: evidence,
  };
}

function scoreBusinessBehaviour(sme: SMEProfile): PillarEvidence {
  const paymentScore = (sme.onTimePaymentRate / 100) * 10;
  const digitalScore = (sme.digitalTxnShare / 100) * 5;
  const score = clamp(paymentScore + digitalScore, 0, 15);

  const evidence: string[] = [
    `On-time supplier payment track record: ${sme.onTimePaymentRate}%`,
    `Digital transaction share: ${sme.digitalTxnShare}% of total volume`,
    `Unique counterparties: ${sme.uniqueCounterparties} active partners`,
  ];
  if (sme.onTimePaymentRate >= 90) evidence.push("✓ Excellent payment discipline");
  else if (sme.onTimePaymentRate >= 70) evidence.push("⚠ Acceptable payment track record");
  else evidence.push("✗ Late payment history detected");

  return {
    pillarName: "Business Behaviour",
    score,
    maxScore: 15,
    weight: "15%",
    evidenceLines: evidence,
  };
}

function scoreBusinessMomentum(sme: SMEProfile): PillarEvidence {
  const inflows = sme.monthlyInflows;
  const q1Avg = mean(inflows.slice(0, 3));
  const q2Avg = mean(inflows.slice(3, 6));
  const growthPct = ((q2Avg - q1Avg) / (q1Avg || 1)) * 100;
  const momVelocity = ((inflows[5] - inflows[4]) / (inflows[4] || 1)) * 100;

  const raw = 5 + (growthPct / 20) * 5 + (momVelocity / 10) * 2;
  const score = clamp(raw, 0, 10);

  const evidence: string[] = [
    `Q1 avg inflow: PKR ${Math.round(q1Avg).toLocaleString()}`,
    `Q2 avg inflow: PKR ${Math.round(q2Avg).toLocaleString()}`,
    `Q2 vs Q1 block growth: ${growthPct.toFixed(1)}%`,
    `MoM revenue velocity: ${momVelocity.toFixed(1)}%`,
  ];
  if (growthPct > 5) evidence.push("✓ Expanding business revenue trend");
  else if (growthPct > -5) evidence.push("⚠ Stable revenue trend");
  else evidence.push("✗ Contraction in monthly revenue");

  return {
    pillarName: "Business Momentum",
    score,
    maxScore: 10,
    weight: "10%",
    evidenceLines: evidence,
    chartData: inflows.map((v, i) => ({ month: MONTHS[i], value: v })),
  };
}

/**
 * Evaluates all 5 banking categories and generates indirect qualitative feedback statements
 * for low-scoring categories without mentioning raw numeric scores (e.g. "4/20").
 */
export function generateQualitativePillarFeedback(
  sme: SMEProfile,
  requestedAmount: number,
  tenureMonths: number,
  pillars: FivePillarScore
): string[] {
  const reasons: string[] = [];

  // 1. Cashflow Stability (Max 30, threshold < 20)
  if (pillars.cashflowStability < 20) {
    reasons.push(
      "Your monthly cashflow stability did not satisfy our consistency benchmark due to historical net cashflow fluctuations."
    );
  }

  // 2. Repayment Capacity (Max 25, threshold < 16)
  if (pillars.repaymentCapacity < 16) {
    reasons.push(
      "Your safe monthly repayment capacity did not satisfy our debt service coverage requirements for the requested loan installment."
    );
  }

  // 3. Liquidity (Max 20, threshold < 13)
  if (pillars.liquidity < 13) {
    reasons.push(
      "Your available liquid bank balance reserves did not satisfy our minimum operating expense buffer requirements."
    );
  }

  // 4. Business Behaviour (Max 15, threshold < 10)
  if (pillars.businessBehaviour < 10) {
    reasons.push(
      "Your supplier payment track record and transaction discipline indicated historical payment delays or lower digital transaction share."
    );
  }

  // 5. Business Momentum (Max 10, threshold < 6)
  if (pillars.businessMomentum < 6) {
    reasons.push(
      "Your business momentum and recent multi-quarter revenue growth did not meet our required expansion pace."
    );
  }

  // If no pillars are strictly below threshold but loan was counter-offered or rejected:
  if (reasons.length === 0) {
    reasons.push(
      "Your requested loan amount exceeded the recommended credit risk threshold relative to your overall banking profile."
    );
  }

  return reasons;
}

// ─── PRD F-7: Eligibility Engine ───

function computeEligibility(
  sme: SMEProfile,
  requestedAmount: number,
  tenureMonths: number,
  readinessScore: number
): EligibilityResult {
  const nets = sme.monthlyInflows.map((v, i) => v - sme.monthlyOutflows[i]);
  const avgNet = mean(nets);
  const safeMonthlyInstalment = Math.max(0, avgNet * SCORING_CONFIG.safeRepaymentRatio);
  
  // Constant Max Borrowing Capacity for this SME profile (independent of asked loan amount)
  let maxBorrowingCapacity = safeMonthlyInstalment * tenureMonths * (readinessScore / 100);
  maxBorrowingCapacity = Math.max(50_000, Math.floor(maxBorrowingCapacity / 10_000) * 10_000);

  // Recommended amount:
  // If requestedAmount <= maxBorrowingCapacity -> approve full requestedAmount
  // If requestedAmount > maxBorrowingCapacity -> counter offer maxBorrowingCapacity
  const recommendedAmount = requestedAmount <= maxBorrowingCapacity ? requestedAmount : maxBorrowingCapacity;

  const requestedInstalment = requestedAmount / (tenureMonths || 1);

  // Deal Fit Ratio (1.0 if asked <= capacity, < 1.0 if over-asking)
  const loanFitRatio = Math.min(1.0, maxBorrowingCapacity / (requestedAmount || 1));

  // Dynamic Deal Eligibility Score (0 - 100)
  const eligibilityScore = Math.round(readinessScore * loanFitRatio);

  return {
    requestedAmount,
    maxBorrowingCapacity,
    recommendedAmount,
    safeMonthlyInstalment: Math.round(safeMonthlyInstalment),
    requestedInstalment: Math.round(requestedInstalment),
    coverageRatio: recommendedAmount / (requestedAmount || 1),
    eligibilityScore,
    loanFitRatio: Math.round(loanFitRatio * 100) / 100,
  };
}

// ─── PRD F-8: Recommendation Engine ───

function computeRecommendation(
  readinessScore: number,
  eligibility: EligibilityResult
): Recommendation {
  let type: RecommendationType;
  let reason: string;
  const evidence: string[] = [];

  const { requestedAmount, maxBorrowingCapacity, recommendedAmount, safeMonthlyInstalment, requestedInstalment, eligibilityScore } = eligibility;

  // Case A: Asked loan <= Max Capacity AND Readiness >= 60 -> APPROVE full asked amount
  if (requestedAmount <= maxBorrowingCapacity && readinessScore >= SCORING_CONFIG.reviewThreshold) {
    type = "APPROVE";
    reason = `Requested loan of PKR ${requestedAmount.toLocaleString()} is fully supported within safe max borrowing capacity (PKR ${maxBorrowingCapacity.toLocaleString()}). Deal Eligibility Score: ${eligibilityScore}/100.`;
    evidence.push(`Financing Readiness Score: ${readinessScore}/100 (5-Pillar Profile Health)`);
    evidence.push(`Deal Eligibility Score: ${eligibilityScore}/100 (High Deal Fit for PKR ${requestedAmount.toLocaleString()})`);
    evidence.push(`Requested loan PKR ${requestedAmount.toLocaleString()} is fully supported by max capacity PKR ${maxBorrowingCapacity.toLocaleString()}`);
    evidence.push(`Monthly instalment PKR ${requestedInstalment.toLocaleString()}/mo is covered by safe monthly capacity PKR ${safeMonthlyInstalment.toLocaleString()}/mo`);
  }
  // Case B: Asked loan > Max Capacity AND Readiness >= 60 -> COUNTER OFFER with Max Capacity limit
  else if (readinessScore >= SCORING_CONFIG.reviewThreshold) {
    type = "COUNTER_OFFER";
    reason = `Requested loan of PKR ${requestedAmount.toLocaleString()} exceeds safe capacity limit. Deal Eligibility Score: ${eligibilityScore}/100. Recommending counter-offer limit of PKR ${recommendedAmount.toLocaleString()}.`;
    evidence.push(`Financing Readiness Score: ${readinessScore}/100`);
    evidence.push(`Deal Eligibility Score: ${eligibilityScore}/100 (Over-leverage risk detected for asked PKR ${requestedAmount.toLocaleString()})`);
    evidence.push(`Requested PKR ${requestedAmount.toLocaleString()} exceeds max borrowing capacity PKR ${maxBorrowingCapacity.toLocaleString()}`);
    evidence.push(`Recommended approved counter-offer limit: PKR ${recommendedAmount.toLocaleString()}`);
  }
  // Case C: Readiness < 60 (High Risk) -> MANUAL REVIEW
  else {
    type = "MANUAL_REVIEW";
    reason = `Readiness score (${readinessScore}/100) is in high risk band (<${SCORING_CONFIG.reviewThreshold}). Escalating for senior credit officer review.`;
    evidence.push(`Financing Readiness Score: ${readinessScore}/100 (below ${SCORING_CONFIG.reviewThreshold} threshold)`);
    evidence.push(`Deal Eligibility Score: ${eligibilityScore}/100`);
    evidence.push(`Safe monthly capacity PKR ${safeMonthlyInstalment.toLocaleString()}/mo vs required PKR ${requestedInstalment.toLocaleString()}/mo`);
    evidence.push(`Requires senior credit officer manual evaluation`);
  }

  return { type, reason, evidence };
}

// ─── Public API: Run Full Assessment (PRD F-6 + F-7 + F-8) ───

export function runAssessment(
  sme: SMEProfile,
  requestedAmount: number,
  tenureMonths: number
): AssessmentResult {
  const p1 = scoreCashflowStability(sme);
  const p2 = scoreRepaymentCapacity(sme, requestedAmount, tenureMonths);
  const p3 = scoreLiquidity(sme);
  const p4 = scoreBusinessBehaviour(sme);
  const p5 = scoreBusinessMomentum(sme);

  const pillars: FivePillarScore = {
    cashflowStability: p1.score,
    repaymentCapacity: p2.score,
    liquidity: p3.score,
    businessBehaviour: p4.score,
    businessMomentum: p5.score,
  };

  const readinessScore = p1.score + p2.score + p3.score + p4.score + p5.score;

  const eligibility = computeEligibility(sme, requestedAmount, tenureMonths, readinessScore);
  const recommendation = computeRecommendation(readinessScore, eligibility);

  const cashflowChartData = MONTHS.map((m, i) => ({
    month: m,
    inflow: sme.monthlyInflows[i],
    outflow: sme.monthlyOutflows[i],
    net: sme.monthlyInflows[i] - sme.monthlyOutflows[i],
  }));

  const qualitativeReasons = generateQualitativePillarFeedback(
    sme,
    requestedAmount,
    tenureMonths,
    pillars
  );

  return {
    readinessScore,
    pillars,
    pillarEvidences: [p1, p2, p3, p4, p5],
    eligibility,
    recommendation,
    cashflowChartData,
    qualitativeReasons,
  };
}
