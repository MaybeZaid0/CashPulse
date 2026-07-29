# Architecture

## Overview
Next.js (App Router) SPA-style frontend  ⇄  FastAPI REST backend  ⇄  MongoDB.

Flow: UBL Transaction History → Feature Engineering → Business Rules →
Readiness/Eligibility → Recommendation → RM Dashboard.

## Stack table
| Layer     | Tech                          | Notes |
|-----------|-------------------------------|-------|
| Frontend  | Next.js 14 (App Router), React, TypeScript, Tailwind or CSS Modules | Responsive, SSR-capable |
| Charts    | Recharts (or Chart.js)        | Cashflow, momentum, gauge |
| Auth      | JWT (demo)                    | httpOnly cookie |
| Backend   | FastAPI (Python 3.11)         | Pydantic models |
| DB Driver | Motor (async) / PyMongo       | |
| Database  | MongoDB                       | Collections: smes, transactions, assessments, users |
| Deploy    | Vercel (FE) + Render/Fly (BE) + MongoDB Atlas | |

## Collections
- users: {_id, name, email, role, passwordHash}
- smes: {_id, name, sector, accountNo, avgBalance, requestedLoan, requestedTenure}
- transactions: {_id, smeId, date, amount, type: inflow|outflow, balance, desc}
- assessments: {_id, smeId, rmId, features, pillarScores, readiness, eligibility,
                recommendation, decision, createdAt}

## Feature engineering (backend, F-5)
Derives: avgMonthlyInflow, avgMonthlyOutflow, avgMonthlyNetCashflow, cashflowVolatility
(CoV%), inflowTrend, avgBalance, reserveRatio, positiveMonths, negativeMonths,
txnActivity, paymentRegularity(synthetic), requestedLoan, requestedTenure.

## Scoring (F-6) — transparent business rules, no ML in MVP
Each pillar returns {score, max, reason, evidence[]}. Readiness = Σ(pillar). Config in
scoring_config.json (weights, thresholds, safeRatio).
