# CashPulse PRD (Build Contract)

## Personas
- P1 Relationship Manager (primary user): assesses SME files, needs speed + evidence.
- P2 Credit Officer (reviewer): receives RM recommendation, needs defensibility.
- P3 SME applicant (indirect): subject of assessment; not a system user in MVP.

## Global Rules
- GR-1 CashPulse NEVER auto-approves. Output is always a recommendation for a human.
- GR-2 Every score must display evidence (numbers + chart). Never a bare score.
- GR-3 Only verified UBL transaction data is analyzed (MVP). No uploads/OCR.
- GR-4 Fully responsive: usable on PC and mobile.
- GR-5 Currency displayed as PKR with thousands separators.

## Features (build order)
- F-1  Auth / RM login (demo credentials; JWT).
- F-2  SME portfolio list (search, status chips, readiness preview).
- F-3  New Assessment flow — Step 1: select/enter SME + loan request (amount, tenure).
- F-4  New Assessment flow — Step 2: confirm UBL data window (6 months) + run analysis.
- F-5  Feature engineering service (backend) → derived indicators.
- F-6  Scoring engine: 5 banking questions → Readiness (0–100).
       - Cashflow Stability 0–30 (weight 30%)
       - Repayment Capacity 0–25 (weight 25%)
       - Liquidity 0–20 (weight 20%)
       - Business Behaviour 0–15 (weight 15%)
       - Business Momentum 0–10 (weight 10%)
- F-7  Eligibility engine: fit of requested loan vs safe capacity → recommended amount.
- F-8  Recommendation engine: Approve / Counter-offer / Manual Review + reason+evidence.
- F-9  Assessment dashboard: score ring, 5 pillar cards w/ evidence, cashflow chart,
       recommendation panel, RM decision actions.
- F-10 Explainability drill-down: each pillar expands to show reason + evidence + chart.
- F-11 RM decision capture (accept / counter / escalate) + notes, saved to record.
- F-12 Report/summary view (printable, ~2-min read).

## Acceptance criteria (samples)
- AC F-6.1 Readiness = weighted sum of 5 pillar scores, rounded, 0–100.
- AC F-6.2 Band: ≥80 Strong (green), 60–79 Review (amber), <60 High risk (red).
       Thresholds are config values, not hardcoded constants.
- AC F-8.1 If requested amount ≤ safe recommended amount AND readiness ≥80 → Approve.
- AC F-8.2 If requested > safe amount but readiness ≥60 → Counter-offer at safe amount.
- AC F-8.3 Else → Manual Review.
- AC GR-2.1 No screen shows a score without at least one evidence value beside it.

## NFRs
- NFR-1 Dashboard readable in ~2 minutes (info hierarchy).
- NFR-2 Analysis run returns < 3s on demo dataset.
- NFR-3 Lighthouse mobile layout: no horizontal scroll at 360px.

## Roadmap tracker
- [ ] T-0 Confirm scaffold deps (next, fastapi, motor/pymongo) match architecture.md
- [ ] F-1 Auth
- [ ] F-2 Portfolio list
- [ ] F-3/F-4 Assessment flow
- [ ] F-5 Feature engineering
- [ ] F-6 Scoring engine
- [ ] F-7 Eligibility
- [ ] F-8 Recommendation
- [ ] F-9/F-10 Dashboard + drill-down
- [ ] F-11 Decision capture
- [ ] F-12 Report view

## Open questions (defaults chosen)
- OQ-1 Safe repayment ratio default = 50% of avg monthly net cashflow (per PDF example).
- OQ-2 Data window default = last 6 months (per cashflow chart references).
