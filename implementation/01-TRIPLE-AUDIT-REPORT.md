# CashPulse — Triple-Pass Audit Report

> **Methodology**: Three independent audit passes over the full codebase. Each pass discovers bugs missed in previous passes.  
> **Total Issues Found**: **61 bugs/gaps/glitches**  
> **Severity Scale**: P0 (Critical/Blocker) → P1 (Major) → P2 (Moderate) → P3 (Minor/Cosmetic)

---

## 🔴 PASS 1: Structural & Integration Audit (28 Issues Found)

### P0 — Critical / Blockers

| # | ID | Component | File(s) | Issue | Impact |
|---|-----|-----------|---------|-------|--------|
| 1 | A1-001 | Integration | `frontend/src/lib/api.ts` ↔ Backend routers | **Frontend API calls hit non-existent backend endpoints.** The `fetchScoreResult()` calls `/api/readiness-score` which does NOT exist in the backend. Backend has `/api/assessments/` POST. The `submitFinancingApplication()` calls `/api/financing/request` which also does NOT exist. | Frontend cannot communicate with backend at all for scoring. Falls back to client-side engine every time. |
| 2 | A1-002 | Integration | `frontend/src/lib/api.ts` + `frontend/src/context/ApplicationContext.tsx` | **Frontend uses `ScoreEngineResult` type (old engine) while backend returns `AssessmentOut` type.** The data shapes are completely different — different field names, different structures, different scoring methodology. | Even if API endpoints were fixed, the response parsing would fail due to type mismatch. |
| 3 | A1-003 | Architecture | Frontend vs Backend | **Two completely separate scoring engines exist.** Frontend has `lib/engine.ts` (4-subscore: stability, trend, cushion, regularity = 0–100 each) and `lib/scoring.ts` (5-pillar: cashflow, repayment, liquidity, behaviour, momentum = 0–100 total). Backend has `services/scoring_engine.py` (6-pillar: cashflow, repayment, debt, liquidity, momentum, data_quality = 0–100 total). They produce entirely different scores for the same SME. | Fundamental scoring inconsistency — an SME may score 85 on frontend but 52 on backend. |
| 4 | A1-004 | Auth | `frontend/src/components/rm/RMPortal.tsx` | **RM authentication is hardcoded client-side.** Login checks `email === "rm@ubl.com" && password === "cashpulse2026"` — never calls the backend `/api/auth/login` endpoint. No JWT token is stored or sent with API requests. | Backend auth middleware (`get_current_user`) will reject all frontend requests that require authentication. |
| 5 | A1-005 | Data Flow | `frontend/src/lib/store.ts` | **All application data is stored in localStorage only.** The `addApplication()`, `loadApplications()`, `updateApplication()` functions use browser localStorage exclusively. No data is ever sent to or retrieved from the backend MongoDB database. | All loan applications, assessments, and RM decisions are lost on browser cache clear. No persistence. No data shared between different machines/browsers. |
| 6 | A1-006 | Database | `backend/app/db/mongo.py` | **New MongoDB client created on EVERY request.** `get_db()` calls `get_client()` which creates `AsyncIOMotorClient(settings.MONGODB_URL)` fresh each time. The module-level `client` variable is never assigned. | Connection pool exhaustion under load, massive performance degradation, potential MongoDB connection limit crashes. |

### P1 — Major Issues

| # | ID | Component | File(s) | Issue | Impact |
|---|-----|-----------|---------|-------|--------|
| 7 | A1-007 | Backend | `backend/app/routers/auth.py` | **Login endpoint uses `OAuth2PasswordRequestForm` which expects `username` field** but the frontend (if it were to call it) would send `email`. Also, no response model defined for signup/login. | Login will fail unless client sends `username` instead of `email` in form data. |
| 8 | A1-008 | Backend | `backend/app/routers/assessments.py` L85 | **`create_assessment` returns raw dict but declares `response_model=AssessmentOut`.** The dict contains `ObjectId` for `smeId` before line 83 converts it, and `_id` is not properly removed before Pydantic validation. | Pydantic validation errors will crash the assessment creation endpoint. |
| 9 | A1-009 | Backend | `backend/app/core/security.py` L19 | **`datetime.utcnow()` is deprecated** in Python 3.12+. Should use `datetime.now(timezone.utc)`. | DeprecationWarning, potential future breakage. |
| 10 | A1-010 | Backend | `backend/app/routers/assessments.py` L61 | **`rmId` is set to email string sometimes, ObjectId string other times.** The `get_current_user` returns `{"email": email}`, so `current_user.get("_id")` will always be missing. rmId becomes the email address. | Inconsistent rmId format causes report endpoint to fail finding the RM user document. |
| 11 | A1-011 | Frontend | `frontend/src/components/rm/PortfolioList.tsx` | **RM Portal uses `DEMO_SME_PROFILES` from `sme-data.ts`** to match applications. These use string IDs (`"SME-001"`) while `engine.ts` profiles use numeric IDs (`1, 2, 3...`). The `ApplicationContext.tsx` uses `engine.ts` profiles. | SME lookup `DEMO_SME_PROFILES.find((s) => s.id === app.smeId)` will never match because contexts use different ID formats. Always falls back to `DEMO_SME_PROFILES[0]`. |
| 12 | A1-012 | Frontend | Multiple files | **Two sets of SME demo data exist with different structures.** `lib/engine.ts` has `SAMPLE_SME_PROFILES` (6 SMEs, numeric IDs, `historyInflows`, `paymentRegularity`) and `lib/sme-data.ts` has `DEMO_SME_PROFILES` (6 SMEs, string IDs, `monthlyInflows`, `onTimePaymentRate`). | Confusing, error-prone. Components use different data sources leading to inconsistent behavior. |
| 13 | A1-013 | Frontend | `frontend/src/context/ApplicationContext.tsx` | **`ApplicationContext` is defined but the `ApplicationProvider` is never used in the component tree.** It's not wrapped around any layout or page. All state management that ApplicationContext provides is unused. | Dead code. The elaborate context provider with API integration does nothing. |
| 14 | A1-014 | Backend | `backend/app/core/config.py` L13-14 | **`Config` class uses `env_file = ".env"` but doesn't use `env_file_encoding`.** Also, `CORS_ORIGINS` is parsed as a `List[str]` from the `.env` string, but the `.env` file stores it as a JSON string `["http://localhost:3000","http://127.0.0.1:5500"]`. Pydantic v2 may not auto-parse this. | CORS may silently fail, blocking all frontend requests. |

### P2 — Moderate Issues

| # | ID | Component | File(s) | Issue | Impact |
|---|-----|-----------|---------|-------|--------|
| 15 | A1-015 | Frontend | `frontend/src/app/layout.tsx` L16 | **Page title is "Create Next App"** — default Next.js template. No meta description set. | Poor SEO, unprofessional appearance. |
| 16 | A1-016 | Frontend | `frontend/src/app/globals.css` L1 | **Uses `@import "tailwindcss"` (v4 syntax)** but package.json has `"tailwindcss": "^4"`. Need to verify Tailwind v4 is properly configured with PostCSS. | Potential CSS compilation failures if PostCSS plugin is misconfigured. |
| 17 | A1-017 | Backend | `backend/requirements.txt` | **No version pinning on any dependency.** `fastapi`, `motor`, `pandas`, etc. are all unpinned. | Reproducibility issues — different machines may install different versions causing subtle bugs. |
| 18 | A1-018 | Frontend | Dead components | `Header.tsx`, `RMDashboard.tsx`, `RMApplicationDetailModal.tsx`, `FactorDrivers.tsx`, `ForecastChart.tsx`, `SMEDashboard.tsx`, `ReadinessModal.tsx`, `RequestStatusTracker.tsx`, `TransactionLedger.tsx` | **9 placeholder/dead components** returning `null`. Clutters codebase. |
| 19 | A1-019 | Backend | `backend/app/routers/smes.py` L38 | **Bare `except:` clause** catches all exceptions including `SystemExit`, `KeyboardInterrupt`. Should catch `Exception` or specific exceptions. | Masks real errors, poor debugging experience. |
| 20 | A1-020 | Backend | `backend/app/routers/assessments.py` L30 | **Same bare `except:` pattern** in assessment creation and retrieval endpoints. | Same as above — silently swallows all exceptions. |
| 21 | A1-021 | Backend | `backend/main.py` | **No startup/shutdown events** for MongoDB connection lifecycle. | No graceful connection cleanup on server shutdown. |
| 22 | A1-022 | Frontend | `frontend/src/components/sme/AccountOverview.tsx` L31-38 | **Transaction ledger uses hardcoded sample data** instead of real SME transactions. The same 6 transactions show for every SME. | Misleading — users think they see real transaction history but it's always the same fake data. |

### P3 — Minor / Cosmetic

| # | ID | Component | File(s) | Issue | Impact |
|---|-----|-----------|---------|-------|--------|
| 23 | A1-023 | Frontend | `frontend/src/components/sme/LoanApplicationForm.tsx` L18 | **Default loan amount hardcoded to 950,000** regardless of selected SME. Should use SME's default or profile data. | Minor UX issue — defaults don't match selected SME context. |
| 24 | A1-024 | Frontend | Multiple | **Inconsistent PKR formatting.** Some places use `toLocaleString()`, some use `(value / 1000).toFixed(0) + "k"`. | Visual inconsistency across dashboard. |
| 25 | A1-025 | Frontend | `ApplicationStatusView.tsx` L38 | **SME app filtering uses OR condition** `app.smeId === sme.id || app.smeName === sme.name`. This could match wrong SMEs if names overlap. | Edge case: wrong applications shown for an SME. |
| 26 | A1-026 | Backend | `backend/app/models/sme.py` | **SME model includes `requestedLoan` and `requestedTenure`** as required fields. But SMEs shouldn't have loan requests as part of their profile — those belong to assessments. | Data model confusion. |
| 27 | A1-027 | Backend | `backend/scripts/seed_data.py` L76 | **Uses `âœ"` (corrupted UTF-8 checkmark)** in print statements instead of `✓`. | Garbled console output on seeding. |
| 28 | A1-028 | Frontend | `frontend/src/components/rm/AssessmentDashboard.tsx` L361 | **Area chart fill value `"#00B7E4/10"` is invalid CSS/SVG.** Should be `"rgba(0,183,228,0.1)"` or similar. | Chart rendering may ignore the fill or throw a warning. |

---

## 🟡 PASS 2: Data Flow & Edge Case Audit (19 Additional Issues Found)

### P0 — Critical

| # | ID | Component | File(s) | Issue | Impact |
|---|-----|-----------|---------|-------|--------|
| 29 | A2-001 | Data Flow | Frontend → Backend | **No NEXT_PUBLIC_API_BASE_URL environment variable is set.** The `.env` or `.env.local` file in the frontend directory doesn't exist. It falls back to `http://127.0.0.1:8000` which works locally but not in production. | API calls use wrong URL in any non-local environment. |
| 30 | A2-002 | Auth Flow | Complete stack | **No token refresh mechanism.** JWT expires after 480 minutes (8 hours). No refresh token, no automatic re-login, no expiry warning to user. | User session silently expires; all subsequent API calls fail with 401. |
| 31 | A2-003 | Data Flow | `frontend/src/components/rm/RMPortal.tsx` | **RM login doesn't store any auth token.** Even if backend auth were called, the token would not be persisted. No `Authorization: Bearer <token>` header is added to any subsequent API call. | Backend endpoints requiring authentication are completely inaccessible from frontend. |

### P1 — Major

| # | ID | Component | File(s) | Issue | Impact |
|---|-----|-----------|---------|-------|--------|
| 32 | A2-004 | Scoring | `backend/app/services/scoring_engine.py` | **`load_config()` reads JSON file from disk on EVERY scoring function call.** `score_debt_service_capacity` calls `load_config()` internally, and then `score_all_pillars` also loads it. Config is read 2-3 times per assessment. | Unnecessary disk I/O. Under load, this becomes a bottleneck. Should be cached at module level. |
| 33 | A2-005 | Data Flow | Backend transactions | **Transaction `balance` field is computed during seeding but never validated/recalculated by the backend.** If transactions are inserted out of order, balances will be incorrect. | Incorrect balance data feeds into scoring calculations, producing wrong results. |
| 34 | A2-006 | Frontend | `frontend/src/lib/store.ts` L99-101 | **Heartbeat polling interval of 1200ms** is very aggressive. Each heartbeat triggers `loadApplications()` which parses localStorage JSON. | Unnecessary CPU usage, potential UI jank on mobile devices. |
| 35 | A2-007 | Backend | `backend/app/routers/smes.py` L10-31 | **GET /api/smes/ loads ALL SMEs with N+1 query pattern.** For each SME, it runs a separate `find_one` query on assessments. With 100+ SMEs, this becomes O(N) database queries. | Slow response times as SME count grows. |
| 36 | A2-008 | Backend | `backend/app/services/feature_engineering.py` L68 | **`txn_activity_score` caps at 120 transactions.** `min(len(df) / 120.0, 1.0)` means any SME with 120+ transactions gets a perfect activity score regardless of quality. | Score inflation for high-volume SMEs. |
| 37 | A2-009 | Frontend | `frontend/src/components/sme/ApplicationStatusView.tsx` L44-45 | **`useEffect` has `smeApps` in dependency logic but not in dependency array.** React will warn about missing dependencies. Also, `expandedAppId` check may cause infinite re-render loop. | React warning, potential performance issue. |
| 38 | A2-010 | Backend | `backend/app/routers/assessments.py` L129 | **`smeId` is stored as `ObjectId` but passed to `find_one` as string** in the report endpoint: `ObjectId(assessment["smeId"])`. If smeId was already converted to string in serialization, this could fail. | Report endpoint may crash with `InvalidId` error. |

### P2 — Moderate

| # | ID | Component | File(s) | Issue | Impact |
|---|-----|-----------|---------|-------|--------|
| 39 | A2-011 | Validation | Backend routers | **No input validation on loan amounts.** `requestedLoan` accepts negative numbers, zero, or astronomically large values. No min/max constraints on `requestedTenure`. | Invalid loan requests create nonsensical assessments. Division by zero possible if tenure is 0. |
| 40 | A2-012 | Frontend | `frontend/src/components/sme/LoanApplicationForm.tsx` | **No form validation.** User can submit empty purpose, zero amount, etc. No error messages shown. | Poor UX, garbage data enters the system. |
| 41 | A2-013 | Backend | `backend/app/models/assessment.py` | **`DecisionIn` model accepts any string for `decision`** field. Should be an enum of valid decisions (APPROVE, REJECT, COUNTER_OFFER, MANUAL_REVIEW). | Invalid decision values can be stored in database. |
| 42 | A2-014 | Frontend | `frontend/src/components/rm/AssessmentDashboard.tsx` L115 | **Status display only replaces first underscore** with `status.replace("_", " ")`. For `COUNTER_OFFER`, this works. But for potential multi-underscore statuses, it won't. | Minor display issue. |
| 43 | A2-015 | Backend | `backend/app/services/eligibility_engine.py` L10 | **`headroom_pct` is confusing.** It's calculated as `requested_loan / safe_loan_amount * 100` but the name suggests percentage of headroom remaining. It's actually percentage of capacity used. | Misleading metric name in API responses and reports. |
| 44 | A2-016 | Frontend | `frontend/src/components/sme/SMEPortal.tsx` | **No loading states** for tab switching or data fetching. Tabs switch instantly but data may take time to load. | UX feels incomplete — no feedback during operations. |
| 45 | A2-017 | Backend | `backend/app/services/recommendation_engine.py` | **Counter-offer doesn't consider tenure adjustment.** Only loan amount is reduced, but sometimes extending tenure is a better recommendation. | Suboptimal recommendations — misses an important dimension of loan structuring. |

### P3 — Minor

| # | ID | Component | File(s) | Issue | Impact |
|---|-----|-----------|---------|-------|--------|
| 46 | A2-018 | Frontend | `frontend/src/components/sme/ReadinessReportModal.tsx` L31 | **Application ID generated with `Date.now().toString().slice(-6)`** which only gives 6 digits. Two rapid submissions within the same millisecond would generate duplicate IDs. | Edge case: ID collision on rapid submission. |
| 47 | A2-019 | Frontend | `frontend/src/types/index.ts` L130 | **`FinancingApplication.status` has 8 possible values** including duplicates like `COUNTER_OFFER` and `COUNTER-OFFER` (dash vs underscore). | Type confusion, potential status matching failures. |

---

## 🟢 PASS 3: Performance, Accessibility & Deployment Audit (14 Additional Issues Found)

### P1 — Major

| # | ID | Component | File(s) | Issue | Impact |
|---|-----|-----------|---------|-------|--------|
| 48 | A3-001 | Security | `backend/.env` | **JWT secret is `dev-secret-key-change-me`** — a weak, predictable secret used in production. | Any attacker can forge JWT tokens and impersonate any user. |
| 49 | A3-002 | Security | `backend/app/routers/auth.py` | **No rate limiting on login endpoint.** No brute-force protection. No account lockout after failed attempts. | Vulnerable to credential stuffing and brute-force attacks. |
| 50 | A3-003 | Security | `backend/app/core/security.py` | **JWT token stored in response body, not httpOnly cookie.** Despite `security.md` specifying httpOnly cookie storage, the actual implementation returns the token in JSON body. | Token is accessible to JavaScript, vulnerable to XSS attacks. |
| 51 | A3-004 | Performance | Backend services | **pandas/numpy imported on every request.** `feature_engineering.py` and `chart_service.py` import pandas at module level, which is fine, but the DataFrame creation happens per request. | Cold start latency (~2-3 seconds for first request). Acceptable but could be optimized. |

### P2 — Moderate

| # | ID | Component | File(s) | Issue | Impact |
|---|-----|-----------|---------|-------|--------|
| 52 | A3-005 | Accessibility | Frontend components | **No ARIA labels on interactive elements.** Score gauges, pillar cards, status badges have no screen reader support. | Inaccessible to users with disabilities. Fails WCAG 2.1 compliance. |
| 53 | A3-006 | Accessibility | Frontend components | **No keyboard navigation support** on pillar drill-down cards, application cards, or modal interactions. | Users cannot navigate with keyboard only. |
| 54 | A3-007 | Performance | `frontend/src/components/sme/AccountOverview.tsx` | **Recharts `ResponsiveContainer` wraps chart without explicit keys.** Multiple chart instances may cause React reconciliation issues. | Potential chart flickering on re-render. |
| 55 | A3-008 | Deployment | Frontend + Backend | **No environment-specific configuration.** No `.env.production`, no Docker files, no deployment scripts. | Cannot deploy to staging or production without manual configuration. |
| 56 | A3-009 | Deployment | `frontend/next.config.ts` | **Next.js config is empty** — no rewrites, no image domains, no output configuration. | Cannot proxy API calls in production, images from external sources won't load. |
| 57 | A3-010 | Error Handling | Frontend API calls | **`api.ts` silently catches all errors** and falls back to client-side engine. No error state shown to user. No retry logic. | Users never know if backend is down. They get client-side results without knowing they're degraded. |
| 58 | A3-011 | Data Integrity | `backend/app/routers/assessments.py` | **No transaction/atomicity for assessment creation.** If the `insert_one` succeeds but the response serialization fails, the assessment exists in DB but user gets an error. | Orphaned assessments in database, inconsistent state. |
| 59 | A3-012 | Frontend | `frontend/src/components/rm/AssessmentDashboard.tsx` | **Print mode (`isPrintMode`) state exists but no print-specific rendering.** The button toggles text but no CSS print styles are applied. | F-12 printable report feature is incomplete. |

### P3 — Minor

| # | ID | Component | File(s) | Issue | Impact |
|---|-----|-----------|---------|-------|--------|
| 60 | A3-013 | Code Quality | Multiple backend files | **No `__init__.py` files** in `app/core/`, `app/db/`, `app/models/`, `app/routers/`, `app/services/` directories. Python may handle this with implicit packages but it's not explicit. | Potential import issues in some environments. |
| 61 | A3-014 | Documentation | Backend | **No API documentation beyond auto-generated Swagger.** No README in backend directory. No endpoint documentation. | New developers cannot onboard quickly. |

---

## 📊 Summary by Severity

| Severity | Pass 1 | Pass 2 | Pass 3 | Total |
|----------|--------|--------|--------|-------|
| **P0 — Critical** | 6 | 3 | 0 | **9** |
| **P1 — Major** | 8 | 7 | 4 | **19** |
| **P2 — Moderate** | 8 | 7 | 8 | **23** |
| **P3 — Minor** | 6 | 2 | 2 | **10** |
| **Total** | **28** | **19** | **14** | **61** |

## 📊 Summary by Component

| Component | Issues | % |
|-----------|--------|---|
| Frontend ↔ Backend Integration | 12 | 19.7% |
| Backend API/Services | 16 | 26.2% |
| Frontend Components/UX | 18 | 29.5% |
| Security | 5 | 8.2% |
| Database/Data | 5 | 8.2% |
| Deployment/DevOps | 3 | 4.9% |
| Code Quality/Docs | 2 | 3.3% |

---

## 🎯 Fix Priority Matrix

### Immediate (Before Demo)
1. A1-001: Fix API endpoint URLs in frontend
2. A1-002: Align frontend types with backend response format
3. A1-004: Connect RM login to backend auth endpoint
4. A1-005: Replace localStorage with backend API persistence
5. A1-006: Fix MongoDB connection pooling
6. A3-001: Generate strong JWT secret

### Before Production
7. A1-003: Unify scoring engines (use backend as source of truth)
8. A2-002: Implement token refresh
9. A2-011: Add input validation
10. A3-002: Add rate limiting
11. A3-003: Move JWT to httpOnly cookie

### Post-Launch
12. A2-007: Optimize N+1 query pattern
13. A3-005/A3-006: Accessibility improvements
14. A3-008: Production deployment config
