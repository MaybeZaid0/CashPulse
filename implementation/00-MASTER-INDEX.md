# CashPulse — Master Implementation Index

> **Project**: CashPulse — AI-Powered SME Lending Platform for UBL  
> **Stack**: Next.js (Frontend) + FastAPI (Backend) + MongoDB (Database)  
> **Date**: July 30, 2026  
> **Version**: 3.0 (Triple-Audit Edition)

---

## 📋 Implementation Plan Files

| # | File | Category | Description |
|---|------|----------|-------------|
| 00 | `00-MASTER-INDEX.md` | Index | This file — master table of contents |
| 01 | `01-TRIPLE-AUDIT-REPORT.md` | Audit | Three-pass bug/gap audit with cumulative findings |
| 02 | `02-FRONTEND-BACKEND-CONNECTIVITY.md` | Integration | Full API connectivity audit between Next.js ↔ FastAPI |
| 03 | `03-BACKEND-API-PLAN.md` | Backend | Complete FastAPI backend API implementation plan |
| 04 | `04-DATABASE-AUDIT-AND-PLAN.md` | Database | MongoDB schema audit + MongoDB Atlas migration plan |
| 05 | `05-SECURITY-AUDIT.md` | Security | Rigorous security audit and hardening plan |
| 06 | `06-AI-DISBURSEMENT-FEATURE.md` | New Feature | AI-powered loan disbursement recommendation system |
| 07 | `07-FORECASTING-ENGINE.md` | New Feature | Cashflow forecasting + confidence scoring engine |
| 08 | `08-STAGED-DISBURSEMENT-TRACKER.md` | New Feature | Multi-stage disbursement monitoring & RM control |
| 09 | `09-FRONTEND-ROUTING-AND-UI.md` | Frontend | Next.js routing audit + UI completion plan |
| 10 | `10-SME-PORTAL-ENHANCEMENTS.md` | Frontend | SME owner portal feature completion |
| 11 | `11-RM-PORTAL-ENHANCEMENTS.md` | Frontend | RM/Bank portal feature completion |
| 12 | `12-TESTING-AND-QA.md` | QA | Testing strategy — unit, integration, E2E |
| 13 | `13-DEPLOYMENT-AND-DEVOPS.md` | DevOps | Deployment pipeline, environment config, CI/CD |
| 14 | `14-JUDGE-COUNTER-QUESTIONS.md` | Prep | Anticipated counter-questions from judges/reviewers |
| 15 | `15-RECOMMENDATIONS.md` | Advisory | Strategic recommendations for product improvement |

---

## 🔍 Audit Summary (Three-Pass Results)

| Pass | New Bugs Found | Cumulative Total | Categories |
|------|---------------|-----------------|------------|
| Pass 1 | 28 | 28 | API disconnects, dead code, security gaps, type mismatches |
| Pass 2 | 19 | 47 | Edge cases, data flow gaps, missing validation, UX bugs |
| Pass 3 | 14 | 61 | Race conditions, performance issues, accessibility, deployment gaps |

**Total Issues Identified**: **61 bugs/gaps** across frontend, backend, database, security, and integration layers.

---

## 🏗️ Architecture Overview (Current State)

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 16)                     │
│  localhost:3000                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ SME      │  │ RM       │  │ Shared   │                  │
│  │ Portal   │  │ Portal   │  │ Layout   │                  │
│  │ (/)      │  │ (/rm)    │  │ Header   │                  │
│  └────┬─────┘  └────┬─────┘  └──────────┘                  │
│       │              │                                       │
│  ┌────▼──────────────▼──────────────────┐                   │
│  │  lib/store.ts (localStorage + BC)     │ ← Cross-tab sync │
│  │  lib/scoring.ts (client-side engine)  │ ← FALLBACK only  │
│  │  lib/api.ts (fetch to backend)        │ ← PRIMARY path   │
│  └────┬──────────────────────────────────┘                   │
└───────┼──────────────────────────────────────────────────────┘
        │ HTTP (fetch)
        ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (FastAPI)                           │
│  localhost:8000                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ /api/auth/signup    POST   (UserCreate)                 │ │
│  │ /api/auth/login     POST   (OAuth2PasswordRequestForm)  │ │
│  │ /api/smes/          GET    (List SMEs + last readiness) │ │
│  │ /api/smes/{id}      GET    (SME detail + txn summary)   │ │
│  │ /api/assessments/   POST   (Create assessment)          │ │
│  │ /api/assessments/{id}         GET                       │ │
│  │ /api/assessments/{id}/decision POST (RM decision)       │ │
│  │ /api/assessments/{id}/report   GET  (Report data)       │ │
│  └────────────────────────┬───────────────────────────────┘ │
│                           │                                  │
│  ┌────────────────────────▼───────────────────────────────┐ │
│  │ Services:                                               │ │
│  │   feature_engineering.py → scoring_engine.py →          │ │
│  │   eligibility_engine.py → recommendation_engine.py →    │ │
│  │   chart_service.py                                      │ │
│  └────────────────────────┬───────────────────────────────┘ │
└───────────────────────────┼──────────────────────────────────┘
                            │ Motor (async)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE (MongoDB)                         │
│  Collections: users, smes, transactions, assessments         │
│  (Currently: localhost:27017 — needs Atlas migration)         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 New Feature: AI Disbursement System (High-Level)

```
SME Loan Application
       │
       ▼
┌──────────────────┐     ┌────────────────────────────┐
│ AI Text Analyzer │────▶│ Disbursement Recommender    │
│ (Gemini/OpenAI)  │     │ Single vs Staged            │
└──────────────────┘     │ Risk minimization           │
                         └──────────┬─────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              ┌──────────┐   ┌──────────┐    ┌──────────┐
              │ Stage 1  │   │ Stage 2  │    │ Stage 3  │
              │ 30% Amt  │   │ 35% Amt  │    │ 35% Amt  │
              └────┬─────┘   └────┬─────┘    └────┬─────┘
                   │              │               │
              ┌────▼─────┐  ┌────▼─────┐    ┌────▼─────┐
              │ Forecast  │  │ Forecast │    │ Forecast │
              │ Check     │  │ Check    │    │ Check    │
              │ Conf >70% │  │ Conf >70%│    │ Final    │
              └───────────┘  └──────────┘    └──────────┘
```

---

## 📖 How to Use This Implementation Folder

1. **Start with `01-TRIPLE-AUDIT-REPORT.md`** — understand all existing bugs and gaps
2. **Read `02-FRONTEND-BACKEND-CONNECTIVITY.md`** — see where APIs are disconnected
3. **Follow files 03–08** — implement fixes and new features in order
4. **Complete with files 09–13** — polish UI, add tests, prepare deployment
5. **Review `14-JUDGE-COUNTER-QUESTIONS.md`** — prepare for presentation/demo
6. **Apply `15-RECOMMENDATIONS.md`** — strategic improvements for v2.0

---

## 🚀 Priority Execution Order

### Phase 1: Critical Fixes (Days 1-3)
- Fix all P0/P1 bugs from `01-TRIPLE-AUDIT-REPORT.md`
- Connect frontend to backend APIs (`02-FRONTEND-BACKEND-CONNECTIVITY.md`)
- Security hardening (`05-SECURITY-AUDIT.md`)

### Phase 2: Core Backend (Days 4-7)
- Complete backend APIs (`03-BACKEND-API-PLAN.md`)
- Database migration to Atlas (`04-DATABASE-AUDIT-AND-PLAN.md`)

### Phase 3: New AI Features (Days 8-14)
- AI disbursement engine (`06-AI-DISBURSEMENT-FEATURE.md`)
- Forecasting engine (`07-FORECASTING-ENGINE.md`)
- Staged disbursement tracker (`08-STAGED-DISBURSEMENT-TRACKER.md`)

### Phase 4: Frontend Polish (Days 15-18)
- Frontend routing and UI (`09-FRONTEND-ROUTING-AND-UI.md`)
- SME portal enhancements (`10-SME-PORTAL-ENHANCEMENTS.md`)
- RM portal enhancements (`11-RM-PORTAL-ENHANCEMENTS.md`)

### Phase 5: QA & Deploy (Days 19-21)
- Testing (`12-TESTING-AND-QA.md`)
- Deployment (`13-DEPLOYMENT-AND-DEVOPS.md`)
