# CashPulse — Frontend ↔ Backend API Connectivity Audit

> **Status**: CRITICALLY DISCONNECTED  
> **Root Cause**: Frontend was built with client-side-only patterns; backend APIs exist but are never called  
> **Fix Effort**: ~3-4 days of focused integration work

---

## 1. Current State: API Endpoint Mapping

### Backend Available Endpoints (FastAPI)

| Method | Endpoint | Auth Required | Description | Request Body | Response |
|--------|----------|--------------|-------------|-------------|----------|
| POST | `/api/auth/signup` | No | Register new user | `{name, email, password}` | `{access_token, token_type, user}` |
| POST | `/api/auth/login` | No | Login (OAuth2 form) | `username=email&password=pass` | `{access_token, token_type, user}` |
| GET | `/api/smes/` | Yes (JWT) | List all SMEs | — | `[{id, name, sector, ...}]` |
| GET | `/api/smes/{id}` | Yes (JWT) | SME detail + txn summary | — | `{id, name, transactionSummary, ...}` |
| POST | `/api/assessments/` | Yes (JWT) | Create assessment | `{smeId, requestedLoan, requestedTenure}` | `AssessmentOut` |
| GET | `/api/assessments/{id}` | Yes (JWT) | Get assessment | — | `AssessmentOut` |
| POST | `/api/assessments/{id}/decision` | Yes (JWT) | Record RM decision | `{decision, note}` | `AssessmentOut` |
| GET | `/api/assessments/{id}/report` | Yes (JWT) | Get report data | — | Report JSON |

### Frontend API Calls (Currently Broken)

| Frontend Function | File | Calls | Backend Match | Status |
|-------------------|------|-------|---------------|--------|
| `fetchScoreResult()` | `lib/api.ts` | `GET /api/readiness-score?...` | ❌ No match | **BROKEN** — endpoint doesn't exist |
| `submitFinancingApplication()` | `lib/api.ts` | `POST /api/financing/request` | ❌ No match | **BROKEN** — endpoint doesn't exist |
| RM Login | `RMPortal.tsx` | None (hardcoded check) | ❌ Not called | **BROKEN** — should call `/api/auth/login` |
| Load Applications | `store.ts` | `localStorage.getItem()` | ❌ Not called | **BROKEN** — should call backend |
| Save Application | `store.ts` | `localStorage.setItem()` | ❌ Not called | **BROKEN** — should call backend |
| Run Assessment | `LoanApplicationForm.tsx` | `lib/scoring.ts` (client-side) | ❌ Not called | **BROKEN** — should call `/api/assessments/` POST |

### Result: **0 out of 8 backend endpoints are actually called by the frontend.**

---

## 2. Type Mismatch Analysis

### Frontend Types vs Backend Response Shapes

#### Problem 1: Two Different Score Types

**Frontend `ScoreEngineResult`** (used by `engine.ts` + `ApplicationContext`):
```typescript
{
  readinessScore: number,         // 0-100
  stabilitySubscore: number,      // 0-100
  trendSubscore: number,          // 0-100
  cushionSubscore: number,        // 0-100
  regularitySubscore: number,     // 0-100
  recommendedLimit: number,
  askedLoan: number,
  loanStatus: 'APPROVED' | 'COUNTER-OFFER',
  timeline: TimelineNode[],       // 9 months (6 historical + 3 forecast)
  ...
}
```

**Backend `AssessmentOut`** (returned by `/api/assessments/`):
```python
{
  "id": "...",
  "smeId": "...",
  "rmId": "...",
  "requestedLoan": float,
  "requestedTenure": int,
  "features": {                   # 20+ engineered features
    "avg_monthly_inflow": float,
    "cashflow_volatility_pct": float,
    ...
  },
  "pillarScores": [               # 6 pillars, NOT 4 subscores
    {"pillar": "cashflow_stability", "score": int, "max": 30, "reason": str, ...},
    {"pillar": "repayment_behaviour", "score": int, "max": 25, ...},
    ...
  ],
  "readiness": float,             # 0-100
  "readinessBand": str,           # "Strong" | "Review" | "High Risk"
  "eligibility": {...},
  "recommendation": {
    "type": "APPROVE" | "COUNTER_OFFER" | "MANUAL_REVIEW",
    ...
  },
  "cashflowSeries": [...],       # 6 months only, different shape
  "pillarRadarData": {...},
  ...
}
```

**These are completely incompatible structures.**

#### Problem 2: Frontend `AssessmentResult` vs Backend `AssessmentOut`

The frontend has ANOTHER type `AssessmentResult` (used by `scoring.ts`):
```typescript
{
  readinessScore: number,     // sum of 5 pillars (0-100)
  pillars: FivePillarScore,   // {cashflowStability, repaymentCapacity, liquidity, businessBehaviour, businessMomentum}
  pillarEvidences: PillarEvidence[],
  eligibility: EligibilityResult,
  recommendation: Recommendation,
  cashflowChartData: {...}[],
}
```

This is closer to the backend shape but still has different field names and structures.

---

## 3. Implementation Plan: Full API Integration

### Step 1: Create API Service Layer (`frontend/src/lib/api-client.ts`)

```
PURPOSE: Single source of truth for all backend API communication.
Replaces: lib/api.ts + hardcoded localStorage calls

FEATURES:
- Centralized fetch wrapper with auth token management
- Automatic token inclusion in Authorization header
- Error handling with user-facing error states
- Response type mapping (backend → frontend types)
- Retry logic with exponential backoff
- Offline detection and graceful degradation
```

**File: `frontend/src/lib/api-client.ts`**

```typescript
// IMPLEMENTATION PLAN — exact code to write

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

// Token management
let authToken: string | null = null;

export function setAuthToken(token: string) {
  authToken = token;
  if (typeof window !== "undefined") {
    sessionStorage.setItem("cashpulse_token", token);
  }
}

export function getAuthToken(): string | null {
  if (authToken) return authToken;
  if (typeof window !== "undefined") {
    authToken = sessionStorage.getItem("cashpulse_token");
  }
  return authToken;
}

export function clearAuthToken() {
  authToken = null;
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("cashpulse_token");
  }
}

// Generic fetch wrapper
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: string; status: number }> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      clearAuthToken();
      return { error: "Session expired. Please login again.", status: 401 };
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        error: errBody.detail || `Request failed (${res.status})`,
        status: res.status,
      };
    }

    const data = await res.json();
    return { data, status: res.status };
  } catch (err) {
    return {
      error: "Cannot connect to server. Please check if the backend is running.",
      status: 0,
    };
  }
}

// ─── AUTH ───
export async function apiLogin(email: string, password: string) {
  // OAuth2PasswordRequestForm expects form data, not JSON
  const formData = new URLSearchParams();
  formData.append("username", email);
  formData.append("password", password);

  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { error: err.detail || "Login failed", status: res.status };
  }

  const data = await res.json();
  setAuthToken(data.access_token);
  return { data, status: res.status };
}

export async function apiSignup(name: string, email: string, password: string) {
  return apiFetch("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

// ─── SMEs ───
export async function apiGetSMEs() {
  return apiFetch("/api/smes/");
}

export async function apiGetSME(id: string) {
  return apiFetch(`/api/smes/${id}`);
}

// ─── ASSESSMENTS ───
export async function apiCreateAssessment(
  smeId: string,
  requestedLoan: number,
  requestedTenure: number
) {
  return apiFetch("/api/assessments/", {
    method: "POST",
    body: JSON.stringify({ smeId, requestedLoan, requestedTenure }),
  });
}

export async function apiGetAssessment(id: string) {
  return apiFetch(`/api/assessments/${id}`);
}

export async function apiRecordDecision(
  assessmentId: string,
  decision: string,
  note: string
) {
  return apiFetch(`/api/assessments/${assessmentId}/decision`, {
    method: "POST",
    body: JSON.stringify({ decision, note }),
  });
}

export async function apiGetReport(assessmentId: string) {
  return apiFetch(`/api/assessments/${assessmentId}/report`);
}
```

### Step 2: Connect RM Portal Login

**File: `frontend/src/components/rm/RMPortal.tsx`**

Changes needed:
1. Replace hardcoded login check with `apiLogin()` call
2. Store auth token in sessionStorage
3. Add auth state management (loading, error states)
4. Add token to all subsequent API calls
5. Handle 401 responses with automatic redirect to login

### Step 3: Connect SME Assessment Flow

**File: `frontend/src/components/sme/LoanApplicationForm.tsx`**

Changes needed:
1. Replace `runAssessment(sme, ...)` client-side call with `apiCreateAssessment(sme.id, ...)`
2. Map backend `AssessmentOut` response to frontend `AssessmentResult` display format
3. Or: create a new component that directly renders backend response format
4. Add proper loading and error states

### Step 4: Connect RM Portfolio List

**File: `frontend/src/components/rm/PortfolioList.tsx`**

Changes needed:
1. Replace `loadApplications()` (localStorage) with backend API calls
2. Create new endpoint `GET /api/assessments/` to list all assessments
3. Map backend assessment list to portfolio display format
4. Remove dependency on `DEMO_SME_PROFILES` for SME lookup
5. Remove `lib/store.ts` dependency (or keep as offline fallback)

### Step 5: Connect RM Decision Actions

**File: `frontend/src/components/rm/AssessmentDashboard.tsx`**

Changes needed:
1. Replace `updateApplication()` (localStorage) with `apiRecordDecision()`
2. Optimistically update UI on decision
3. Handle backend errors and show feedback

### Step 6: Create Frontend `.env.local`

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

---

## 4. New Backend Endpoints Needed

| Method | Endpoint | Purpose | Priority |
|--------|----------|---------|----------|
| GET | `/api/assessments/` | List all assessments (for RM portfolio) | P0 |
| POST | `/api/assessments/` | Already exists — fix response serialization | P0 |
| GET | `/api/smes/{id}/assessments` | List assessments for a specific SME | P1 |
| POST | `/api/applications/` | SME submits loan application (new flow) | P1 |
| GET | `/api/applications/` | List applications (for RM queue) | P1 |
| PUT | `/api/applications/{id}/status` | Update application status | P1 |

---

## 5. Data Flow Diagrams (Target State)

### SME Loan Application Flow
```
SME Portal                    Backend                         RM Portal
─────────                    ─────────                       ──────────
  │                              │                               │
  │ 1. Fill loan form            │                               │
  │    (amount, tenure, purpose) │                               │
  │                              │                               │
  │ 2. POST /api/applications/  │                               │
  │─────────────────────────────►│                               │
  │                              │ 3. Store in MongoDB           │
  │                              │    (status: PENDING)          │
  │◄─────────────────────────────│                               │
  │ 4. Show "Submitted" status   │                               │
  │                              │                               │
  │                              │ 5. GET /api/applications/     │
  │                              │◄──────────────────────────────│
  │                              │                               │
  │                              │ 6. Return pending apps        │
  │                              │──────────────────────────────►│
  │                              │                               │ 7. RM clicks "Assess"
  │                              │                               │
  │                              │ 8. POST /api/assessments/     │
  │                              │◄──────────────────────────────│
  │                              │ 9. Run scoring pipeline       │
  │                              │ 10. Store assessment          │
  │                              │──────────────────────────────►│
  │                              │                               │ 11. Show assessment dashboard
  │                              │                               │
  │                              │ 12. POST /assessment/decision │
  │                              │◄──────────────────────────────│
  │                              │ 13. Update status             │
  │                              │──────────────────────────────►│
  │                              │                               │ 14. Status updated
  │                              │                               │
  │ 15. Poll/WebSocket for       │                               │
  │     status updates           │                               │
  │◄─────────────────────────────│                               │
  │ 16. Show decision to SME     │                               │
```

### Authentication Flow
```
RM Portal                     Backend
──────────                    ─────────
  │                              │
  │ 1. POST /api/auth/login      │
  │    (form: username, password) │
  │─────────────────────────────►│
  │                              │ 2. Verify credentials
  │                              │ 3. Generate JWT
  │◄─────────────────────────────│
  │ 4. Store token in            │
  │    sessionStorage            │
  │                              │
  │ 5. GET /api/smes/            │
  │    Authorization: Bearer xxx │
  │─────────────────────────────►│
  │                              │ 6. Validate JWT
  │                              │ 7. Return data
  │◄─────────────────────────────│
```

---

## 6. Migration Strategy

### Phase A: Parallel Operation (Days 1-2)
- Keep localStorage sync as fallback
- Add backend API calls alongside existing code
- Feature flag to toggle between localStorage and API mode

### Phase B: Backend Primary (Days 3-4)
- Make API calls primary data source
- Use localStorage only for offline cache
- Add error handling for backend unavailability

### Phase C: Full Migration (Days 5-6)
- Remove localStorage-only code paths
- Remove `lib/store.ts` cross-tab sync (replace with server-sent events or polling)
- Remove `lib/engine.ts` duplicate scoring engine
- Consolidate to single `AssessmentResult` type that matches backend
