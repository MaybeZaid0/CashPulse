import { SMEProfile, ScoreEngineResult, TimelineNode } from "@/types";

export const SAMPLE_SME_PROFILES: SMEProfile[] = [
  {
    id: 1,
    name: "Karachi FMCG Wholesaler",
    sector: "Retail & Wholesale",
    city: "Karachi",
    iban: "PK36UBL00000019283746",
    initialBalance: 500000,
    historyInflows: [1800000, 1900000, 1850000, 2100000, 2200000, 2300000],
    historyOutflows: [1500000, 1600000, 1550000, 1700000, 1750000, 1800000],
    paymentRegularity: 92,
    seasonalMultIn: [1.15, 1.25, 0.90],
    seasonalMultOut: [1.20, 1.05, 0.85],
    defaultAskedLoan: 950000,
    defaultAskedTenure: 6,
  },
  {
    id: 2,
    name: "Lahore Textile Trader",
    sector: "Apparel & Garments",
    city: "Lahore",
    iban: "PK36UBL00000099283711",
    initialBalance: 200000,
    historyInflows: [1200000, 1150000, 1300000, 1250000, 1400000, 1350000],
    historyOutflows: [1100000, 1050000, 1200000, 1180000, 1300000, 1280000],
    paymentRegularity: 78,
    seasonalMultIn: [1.30, 1.10, 0.80],
    seasonalMultOut: [1.25, 0.95, 0.85],
    defaultAskedLoan: 2500000,
    defaultAskedTenure: 3,
  },
  {
    id: 3,
    name: "Faisalabad Weaving Unit",
    sector: "Small Manufacturer",
    city: "Faisalabad",
    iban: "PK36UBL00000044556677",
    initialBalance: 850000,
    historyInflows: [2500000, 2600000, 2700000, 2800000, 2900000, 3100000],
    historyOutflows: [2000000, 2100000, 2150000, 2200000, 2300000, 2400000],
    paymentRegularity: 95,
    seasonalMultIn: [1.05, 1.10, 1.05],
    seasonalMultOut: [1.02, 1.05, 1.02],
    defaultAskedLoan: 1500000,
    defaultAskedTenure: 6,
  },
  {
    id: 4,
    name: "Rawalpindi Electronics Shop",
    sector: "Consumer Electronics",
    city: "Rawalpindi",
    iban: "PK36UBL00000088990011",
    initialBalance: 150000,
    historyInflows: [1500000, 900000, 1800000, 800000, 1600000, 1100000],
    historyOutflows: [1400000, 950000, 1600000, 850000, 1450000, 1050000],
    paymentRegularity: 65,
    seasonalMultIn: [0.90, 1.20, 1.10],
    seasonalMultOut: [0.95, 1.15, 1.00],
    defaultAskedLoan: 1200000,
    defaultAskedTenure: 3,
  },
  {
    id: 5,
    name: "Sialkot Sports Goods Craft",
    sector: "Export Manufacturing",
    city: "Sialkot",
    iban: "PK36UBL00000077889922",
    initialBalance: 900000,
    historyInflows: [1600000, 1650000, 1700000, 1750000, 1800000, 1900000],
    historyOutflows: [1300000, 1350000, 1380000, 1400000, 1420000, 1450000],
    paymentRegularity: 96,
    seasonalMultIn: [1.05, 1.08, 1.05],
    seasonalMultOut: [1.03, 1.05, 1.02],
    defaultAskedLoan: 1000000,
    defaultAskedTenure: 6,
  },
  {
    id: 6,
    name: "Sukkur Hardware Supply",
    sector: "Building Materials",
    city: "Sukkur",
    iban: "PK36UBL00000011223344",
    initialBalance: 100000,
    historyInflows: [2200000, 2000000, 1900000, 1750000, 1600000, 1500000],
    historyOutflows: [1900000, 1850000, 1800000, 1700000, 1600000, 1550000],
    paymentRegularity: 60,
    seasonalMultIn: [0.90, 0.85, 0.80],
    seasonalMultOut: [0.95, 0.90, 0.85],
    defaultAskedLoan: 2000000,
    defaultAskedTenure: 6,
  }
];

export function calculateCashPulseScore(
  sme: SMEProfile,
  askedLoan: number,
  tenureMonths: number
): ScoreEngineResult {
  const inflows = sme.historyInflows || sme.monthlyInflows || [0, 0, 0, 0, 0, 0];
  const outflows = sme.historyOutflows || sme.monthlyOutflows || [0, 0, 0, 0, 0, 0];
  const initialBalance = sme.initialBalance ?? sme.currentBalance ?? 0;
  const paymentRegularity = sme.paymentRegularity ?? sme.onTimePaymentRate ?? 100;
  const seasonalMultIn = sme.seasonalMultIn || [1, 1, 1];
  const seasonalMultOut = sme.seasonalMultOut || [1, 1, 1];

  const netHistory = inflows.map((inVal, i) => inVal - outflows[i]);

  // 1. Hybrid Trend Score (Q2 vs Q1 Block Growth + MoM Velocity)
  const avgFirst3 = (inflows[0] + inflows[1] + inflows[2]) / 3;
  const avgLast3 = (inflows[3] + inflows[4] + inflows[5]) / 3;
  const blockTrend = (avgLast3 - avgFirst3) / (avgFirst3 || 1);
  const momVelocity = (inflows[5] - inflows[4]) / (inflows[4] || 1);

  const rawTrendScore = 50 + blockTrend * 80 + momVelocity * 20;
  const trendSubscore = Math.max(0, Math.min(100, Math.round(rawTrendScore)));

  // 2. Stability Subscore (Relative CV)
  const meanNet = netHistory.reduce((a, b) => a + b, 0) / netHistory.length;
  const variance =
    netHistory.reduce((sum, val) => sum + Math.pow(val - meanNet, 2), 0) /
    netHistory.length;
  const stdNet = Math.sqrt(variance);
  const cv = stdNet / (Math.abs(meanNet) || 1);
  const stabilitySubscore = Math.max(
    0,
    Math.min(100, Math.round(100 - cv * 50))
  );

  // 3. Cash Cushion Subscore (Reserve Ratio)
  const avgOutflow = outflows.reduce((a, b) => a + b, 0) / outflows.length;
  const reserveRatio = initialBalance / (avgOutflow || 1);
  const cushionSubscore = Math.max(
    0,
    Math.min(100, Math.round(reserveRatio * 150))
  );

  // 4. Payment Regularity Subscore
  const regularitySubscore = paymentRegularity;

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
  const meanInflow = inflows.reduce((a, b) => a + b, 0) / inflows.length;
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
    (sum, val, idx) => sum + val * weights[idx],
    0
  );
  const weightedOutflowSum = outflows.reduce(
    (sum, val, idx) => sum + val * weights[idx],
    0
  );
  const baselineInflow = weightedInflowSum / 21;
  const baselineOutflow = weightedOutflowSum / 21;

  const monthlyG = Math.max(-0.1, Math.min(0.1, blockTrend / 3));

  const timeline: TimelineNode[] = [];
  let runningBalance = initialBalance;

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
  for (let k = 1; k <= 3; k++) {
    const multIn = seasonalMultIn[k - 1] || 1;
    const multOut = seasonalMultOut[k - 1] || 1;

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
