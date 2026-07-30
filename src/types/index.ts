// ─── CashPulse PRD & Canonical Design System Types ───

export interface SMEProfile {
  id: string;
  name: string;
  sector: string;
  city: string;
  iban: string;
  accountNumber: string;
  cnic?: string;
  email?: string;
  password?: string;
  monthlyInflows: number[];   // 6 months verified UBL data
  monthlyOutflows: number[];  // 6 months verified UBL data
  currentBalance: number;
  onTimePaymentRate: number;  // 0-100 pct
  digitalTxnShare: number;    // 0-100 pct
  avgTicketSize: number;
  uniqueCounterparties: number;
  // Legacy / Optional compatibility fields
  historyInflows?: number[];
  historyOutflows?: number[];
  initialBalance?: number;
  paymentRegularity?: number;
  seasonalMultIn?: number[];
  seasonalMultOut?: number[];
  defaultAskedLoan?: number;
  defaultAskedTenure?: number;
}

export interface TimelineNode {
  month: string;
  inflow: number;
  outflow: number;
  netCashflow: number;
  endingBalance: number;
  isForecast: boolean;
}

export interface ScoreEngineResult {
  readinessScore: number;
  stabilitySubscore: number;
  trendSubscore: number;
  cushionSubscore: number;
  regularitySubscore: number;
  recommendedLimit: number;
  askedLoan: number;
  tenureMonths: number;
  monthlyInstallment: number;
  loanStatus: 'APPROVED' | 'COUNTER-OFFER' | 'COUNTER_OFFER' | 'REJECTED';
  coverageRatio: number;
  tipMessage: string;
  positiveDrivers: string[];
  riskDrivers: string[];
  timeline: TimelineNode[];
}

/** PRD F-6: 5 Banking Pillars */
export interface FivePillarScore {
  cashflowStability: number;    // 0–30 (weight 30%)
  repaymentCapacity: number;    // 0–25 (weight 25%)
  liquidity: number;            // 0–20 (weight 20%)
  businessBehaviour: number;    // 0–15 (weight 15%)
  businessMomentum: number;     // 0–10 (weight 10%)
}

export interface PillarEvidence {
  pillarName: string;
  score: number;
  maxScore: number;
  weight: string;
  evidenceLines: string[];     // GR-2: every score needs evidence
  chartData?: { month: string; value: number }[];
}

/** PRD F-7 + F-8 */
export type RecommendationType = 'APPROVE' | 'COUNTER_OFFER' | 'MANUAL_REVIEW';

export interface EligibilityResult {
  requestedAmount: number;
  recommendedAmount: number;
  safeMonthlyInstalment: number;
  requestedInstalment: number;
  coverageRatio: number;
}

export interface Recommendation {
  type: RecommendationType;
  reason: string;
  evidence: string[];
}

/** Full assessment result combining F-6 + F-7 + F-8 */
export interface AssessmentResult {
  readinessScore: number;      // 0–100 composite score
  pillars: FivePillarScore;
  pillarEvidences: PillarEvidence[];
  eligibility: EligibilityResult;
  recommendation: Recommendation;
  cashflowChartData: { month: string; inflow: number; outflow: number; net: number }[];
  qualitativeReasons?: string[];
}

/** Loan application submitted by SME / processed by RM */
export interface LoanApplication {
  id: string;
  smeId: string;
  smeName: string;
  sector: string;
  city: string;
  iban?: string;
  requestedAmount: number;
  tenureMonths: number;
  purpose: string;
  status: 'PENDING' | 'ASSESSED' | 'APPROVED' | 'APPROVED_DISBURSED' | 'COUNTER_OFFER' | 'COUNTER_OFFER_ISSUED' | 'MANUAL_REVIEW' | 'REJECTED';
  submittedAt: string;
  assessedAt?: string;
  assessment?: AssessmentResult;
  readinessScore?: number;
  recommendedLimit?: number;
  monthlyInstallment?: number;
  scoreResult?: ScoreEngineResult;
  rmNotes?: string;
  qualitativeReasons?: string[];
}

export type FinancingApplication = LoanApplication;

/** Real-time cross-tab sync event */
export type SyncEventType =
  | 'APPLICATION_SUBMITTED'
  | 'APPLICATION_ASSESSED'
  | 'STATUS_UPDATED';

export interface SyncEvent {
  type: SyncEventType;
  payload: LoanApplication;
  timestamp: number;
}
