import { SMEProfile, ScoreEngineResult, TimelineNode } from "@/types";

export function calculateCashPulseScore(
  sme: SMEProfile,
  askedLoan: number,
  tenureMonths: number
): ScoreEngineResult {
  const inflows = sme.monthlyInflows || sme.historyInflows || [1000000, 1100000, 1050000, 1200000, 1250000, 1300000];
  const outflows = sme.monthlyOutflows || sme.historyOutflows || [800000, 850000, 820000, 900000, 920000, 950000];
  const netHistory = inflows.map((inVal, i) => inVal - (outflows[i] || 0));

  // 1. Hybrid Trend Score (Q2 vs Q1 Block Growth + MoM Velocity)
  const avgFirst3 = (inflows[0] + inflows[1] + inflows[2]) / 3;
  const avgLast3 = (inflows[3] + inflows[4] + inflows[5]) / 3;
  const blockTrend = (avgLast3 - avgFirst3) / (avgFirst3 || 1);
  const momVelocity = (inflows[5] - inflows[4]) / (inflows[4] || 1);

  const rawTrendScore = 50 + blockTrend * 80 + momVelocity * 20;
  const trendSubscore = Math.max(0, Math.min(100, Math.round(rawTrendScore)));

  // 2. Stability Subscore (Relative CV)
  const meanNet = netHistory.reduce((a: number, b: number) => a + b, 0) / netHistory.length;
  const variance =
    netHistory.reduce((sum: number, val: number) => sum + Math.pow(val - meanNet, 2), 0) /
    netHistory.length;
  const stdNet = Math.sqrt(variance);
  const cv = stdNet / (Math.abs(meanNet) || 1);
  const stabilitySubscore = Math.max(
    0,
    Math.min(100, Math.round(100 - cv * 50))
  );

  // 3. Cash Cushion Subscore (Reserve Ratio)
  const avgOutflow = outflows.reduce((a: number, b: number) => a + b, 0) / outflows.length;
  const balance = sme.currentBalance ?? sme.initialBalance ?? 500000;
  const reserveRatio = balance / (avgOutflow || 1);
  const cushionSubscore = Math.max(
    0,
    Math.min(100, Math.round(reserveRatio * 150))
  );

  // 4. Payment Regularity Subscore
  const regularitySubscore = sme.onTimePaymentRate ?? sme.paymentRegularity ?? 85;

  // Final Weighted Readiness Score
  const readinessScore = Math.max(
    10,
    Math.min(
      99,
      Math.round(
        0.35 * stabilitySubscore +
          0.25 * trendSubscore +
          0.25 * regularitySubscore +
          0.15 * cushionSubscore
      )
    )
  );

  // Zero Interest Monthly Installment
  const monthlyInstallment = Math.round(askedLoan / tenureMonths);

  // Underwriting Capacity Calculations (Zero Interest)
  const maxSafeMonthlyPayment = Math.max(0, meanNet) * 0.6;
  const tenureMaxCapacity = maxSafeMonthlyPayment * tenureMonths;
  const meanInflow = inflows.reduce((a: number, b: number) => a + b, 0) / inflows.length;
  const baseCap = Math.min(meanInflow * 1.0, tenureMaxCapacity);

  let recommendedLimit = Math.round(baseCap * (readinessScore / 100));
  recommendedLimit = Math.max(
    250000,
    Math.floor(recommendedLimit / 50000) * 50000
  );

  const coverageRatio = askedLoan / (recommendedLimit || 1);
  const isApproved =
    coverageRatio <= 1.0 && monthlyInstallment <= maxSafeMonthlyPayment;

  const loanStatus: 'APPROVED' | 'COUNTER-OFFER' = isApproved
    ? 'APPROVED'
    : 'COUNTER-OFFER';

  let tipMessage = '';
  if (isApproved) {
    tipMessage = 'Loan fully approved under requested tenure with zero interest.';
  } else {
    const extendedTenureNeeded = Math.ceil(
      askedLoan / (maxSafeMonthlyPayment || 1)
    );
    tipMessage = `Extend tenure to ${extendedTenureNeeded} months to qualify for full PKR ${askedLoan.toLocaleString()}.`;
  }

  // Generate Positive & Risk Drivers
  const positiveDrivers: string[] = [];
  const riskDrivers: string[] = [];

  if (stabilitySubscore >= 80) {
    positiveDrivers.push(
      'High monthly net cashflow consistency over the last 6 months (+25 pts)'
    );
  } else {
    riskDrivers.push(
      'Volatile monthly net cashflow variance detected (-15 pts)'
    );
  }

  if (trendSubscore >= 60) {
    positiveDrivers.push(
      `Positive revenue growth velocity of +${(blockTrend * 100).toFixed(
        1
      )}% (+20 pts)`
    );
  } else {
    riskDrivers.push(
      `Declining revenue trend of ${(blockTrend * 100).toFixed(
        1
      )}% (-15 pts)`
    );
  }

  if (cushionSubscore >= 50) {
    positiveDrivers.push(
      'Strong liquid bank balance buffer covering operating expenses (+15 pts)'
    );
  } else {
    riskDrivers.push('Low liquid bank balance relative to monthly outflows (-10 pts)');
  }

  if (regularitySubscore >= 85) {
    positiveDrivers.push('Consistent on-time digital supplier payment track record (+15 pts)');
  }

  // Generate 9-Month Full Timeline Nodes
  const weights = [1, 2, 3, 4, 5, 6];
  const weightedInflowSum = inflows.reduce(
    (sum: number, val: number, idx: number) => sum + val * weights[idx],
    0
  );
  const weightedOutflowSum = outflows.reduce(
    (sum: number, val: number, idx: number) => sum + val * weights[idx],
    0
  );
  const baselineInflow = weightedInflowSum / 21;
  const baselineOutflow = weightedOutflowSum / 21;

  const monthlyG = Math.max(-0.1, Math.min(0.1, blockTrend / 3));

  const timeline: TimelineNode[] = [];
  let runningBalance = balance;

  // Historical Months 1-6
  for (let i = 0; i < 6; i++) {
    const net = netHistory[i];
    runningBalance += net;
    timeline.push({
      month: `M${i + 1}`,
      inflow: inflows[i],
      outflow: outflows[i],
      netCashflow: net,
      endingBalance: runningBalance,
      isForecast: false,
    });
  }

  // Forecast Months 7-9
  const seasonalIn = sme.seasonalMultIn || [1.05, 1.10, 1.05];
  const seasonalOut = sme.seasonalMultOut || [1.02, 1.05, 1.02];

  for (let k = 1; k <= 3; k++) {
    const multIn = seasonalIn[k - 1] || 1.0;
    const multOut = seasonalOut[k - 1] || 1.0;

    const pIn = Math.round(baselineInflow * (1 + k * monthlyG) * multIn);
    const pOut = Math.round(baselineOutflow * (1 + k * monthlyG) * multOut);
    const pNet = pIn - pOut;

    runningBalance += pNet;

    timeline.push({
      month: `M${k + 6} (F)`,
      inflow: pIn,
      outflow: pOut,
      netCashflow: pNet,
      endingBalance: runningBalance,
      isForecast: true,
    });
  }

  return {
    readinessScore,
    stabilitySubscore,
    trendSubscore,
    cushionSubscore,
    regularitySubscore,
    recommendedLimit,
    askedLoan,
    tenureMonths,
    monthlyInstallment,
    loanStatus,
    coverageRatio,
    tipMessage,
    positiveDrivers,
    riskDrivers,
    timeline,
  };
}
