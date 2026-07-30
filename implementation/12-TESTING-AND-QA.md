# CashPulse — Testing & Quality Assurance Plan

---

## 1. Testing Strategy

| Layer | Tool | Coverage Target | Priority |
|-------|------|----------------|----------|
| Backend Unit Tests | `pytest` + `pytest-asyncio` | 80%+ | P0 |
| Backend Integration Tests | `pytest` + `httpx` (TestClient) | 70%+ | P1 |
| Frontend Unit Tests | `vitest` (or `jest`) | 60%+ | P1 |
| Frontend Component Tests | `@testing-library/react` | Key flows | P1 |
| E2E Tests | `Playwright` | 5 critical paths | P2 |
| API Contract Tests | Manual + Swagger validation | All endpoints | P1 |
| Load Testing | `locust` (Python) | 50 concurrent users | P3 |

---

## 2. Backend Unit Tests

### 2.1 Scoring Engine Tests

```python
# backend/tests/test_scoring_engine.py

import pytest
from app.services.scoring_engine import (
    score_cashflow_stability,
    score_repayment_behaviour,
    score_all_pillars,
    compute_readiness,
    load_config,
)

@pytest.fixture
def config():
    return load_config()

class TestCashflowStability:
    def test_low_volatility_high_score(self, config):
        """Low CoV (≤15%) should score near maximum (30 points)."""
        features = {"cashflow_volatility_pct": 10.0}
        result = score_cashflow_stability(features, config)
        assert result["score"] >= 25
        assert result["max"] == 30
    
    def test_high_volatility_low_score(self, config):
        """Very high CoV (>50%) should score near minimum."""
        features = {"cashflow_volatility_pct": 60.0}
        result = score_cashflow_stability(features, config)
        assert result["score"] <= 10
    
    def test_evidence_included(self, config):
        """Score must include evidence (GR-2 compliance)."""
        features = {"cashflow_volatility_pct": 25.0}
        result = score_cashflow_stability(features, config)
        assert "evidence" in result
        assert len(result["evidence"]) >= 1

class TestReadinessScore:
    def test_readiness_is_sum_of_pillars(self):
        """Readiness = weighted sum of all pillar scores (AC F-6.1)."""
        pillar_scores = [
            {"pillar": "cashflow_stability", "score": 25, "max": 30},
            {"pillar": "repayment_behaviour", "score": 20, "max": 25},
            {"pillar": "debt_service", "score": 12, "max": 15},
            {"pillar": "liquidity", "score": 15, "max": 20},
            {"pillar": "business_momentum", "score": 7, "max": 10},
            {"pillar": "data_quality", "score": 0, "max": 0},
        ]
        readiness, band = compute_readiness(pillar_scores)
        assert readiness == 79  # sum of scores
    
    def test_band_strong(self):
        """Score ≥80 → Strong band (AC F-6.2)."""
        pillar_scores = [
            {"pillar": "p1", "score": 28, "max": 30},
            {"pillar": "p2", "score": 23, "max": 25},
            {"pillar": "p3", "score": 14, "max": 15},
            {"pillar": "p4", "score": 18, "max": 20},
            {"pillar": "p5", "score": 9, "max": 10},
            {"pillar": "p6", "score": 0, "max": 0},
        ]
        readiness, band = compute_readiness(pillar_scores)
        assert band == "Strong"
    
    def test_band_high_risk(self):
        """Score <60 → High Risk band (AC F-6.2)."""
        pillar_scores = [
            {"pillar": "p1", "score": 10, "max": 30},
            {"pillar": "p2", "score": 15, "max": 25},
            {"pillar": "p3", "score": 8, "max": 15},
            {"pillar": "p4", "score": 10, "max": 20},
            {"pillar": "p5", "score": 5, "max": 10},
            {"pillar": "p6", "score": 0, "max": 0},
        ]
        readiness, band = compute_readiness(pillar_scores)
        assert readiness < 60
        assert band == "High Risk"
```

### 2.2 Eligibility Engine Tests

```python
# backend/tests/test_eligibility_engine.py

import pytest
from app.services.eligibility_engine import compute_eligibility

class TestEligibility:
    def test_approved_when_within_safe_limit(self):
        """When requested ≤ safe limit AND readiness ≥ 80 → APPROVE (AC F-8.1)."""
        features = {
            "avg_monthly_net_cashflow": 500000,
            "avg_balance": 1000000,
        }
        config = {"eligibility": {"safe_ratio": 0.5, "min_readiness_for_approve": 80}}
        readiness = 85
        
        result = compute_eligibility(features, config, readiness, dq_score=5)
        assert result["safe_monthly_payment"] == 250000  # 50% of avg net
    
    def test_safe_payment_is_50_pct_of_net(self):
        """Safe monthly payment = 50% of avg monthly net cashflow (OQ-1)."""
        features = {"avg_monthly_net_cashflow": 200000, "avg_balance": 500000}
        config = {"eligibility": {"safe_ratio": 0.5, "min_readiness_for_approve": 80}}
        
        result = compute_eligibility(features, config, 75, dq_score=5)
        assert result["safe_monthly_payment"] == 100000
```

### 2.3 Recommendation Engine Tests

```python
# backend/tests/test_recommendation_engine.py

import pytest
from app.services.recommendation_engine import compute_recommendation

class TestRecommendation:
    def test_approve_when_eligible(self):
        """AC F-8.1: Approve if requested ≤ safe AND readiness ≥ 80."""
        eligibility = {
            "requested_amount": 1000000,
            "safe_loan_amount": 1500000,
        }
        config = {"eligibility": {"min_readiness_for_approve": 80}}
        readiness = 85
        
        rec = compute_recommendation(readiness, eligibility, config)
        assert rec["type"] == "APPROVE"
    
    def test_counter_offer_when_over_limit(self):
        """AC F-8.2: Counter-offer if requested > safe but readiness ≥ 60."""
        eligibility = {
            "requested_amount": 2000000,
            "safe_loan_amount": 1000000,
        }
        config = {"eligibility": {"min_readiness_for_approve": 80}}
        readiness = 70
        
        rec = compute_recommendation(readiness, eligibility, config)
        assert rec["type"] == "COUNTER_OFFER"
    
    def test_manual_review_when_high_risk(self):
        """AC F-8.3: Manual Review for high-risk cases."""
        eligibility = {
            "requested_amount": 2000000,
            "safe_loan_amount": 500000,
        }
        config = {"eligibility": {"min_readiness_for_approve": 80}}
        readiness = 45
        
        rec = compute_recommendation(readiness, eligibility, config)
        assert rec["type"] == "MANUAL_REVIEW"
```

### 2.4 API Integration Tests

```python
# backend/tests/test_api.py

import pytest
from httpx import AsyncClient
from main import app

@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

class TestAuthEndpoints:
    @pytest.mark.asyncio
    async def test_signup_success(self, client):
        res = await client.post("/api/auth/signup", json={
            "name": "Test User",
            "email": "test@example.com",
            "password": "TestPass123",
        })
        assert res.status_code == 200
        assert "access_token" in res.json()
    
    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client):
        res = await client.post("/api/auth/login", data={
            "username": "test@example.com",
            "password": "wrongpassword",
        })
        assert res.status_code == 401

class TestSMEEndpoints:
    @pytest.mark.asyncio
    async def test_list_smes_requires_auth(self, client):
        res = await client.get("/api/smes/")
        assert res.status_code == 401
    
    @pytest.mark.asyncio
    async def test_list_smes_with_auth(self, client):
        # Login first
        login_res = await client.post("/api/auth/login", data={
            "username": "admin@ubl.com.pk",
            "password": "admin1234",
        })
        token = login_res.json()["access_token"]
        
        res = await client.get("/api/smes/", headers={
            "Authorization": f"Bearer {token}"
        })
        assert res.status_code == 200
        assert isinstance(res.json(), list)

class TestHealthCheck:
    @pytest.mark.asyncio
    async def test_health_endpoint(self, client):
        res = await client.get("/api/health")
        assert res.status_code == 200
        assert res.json()["status"] in ["healthy", "degraded"]
```

---

## 3. Frontend Tests

### 3.1 Component Tests

```typescript
// frontend/src/__tests__/LoanApplicationForm.test.tsx

import { render, screen, fireEvent } from "@testing-library/react";
import LoanApplicationForm from "@/components/sme/LoanApplicationForm";

describe("LoanApplicationForm", () => {
  it("renders all required fields", () => {
    render(<LoanApplicationForm sme={mockSME} />);
    
    expect(screen.getByLabelText(/loan amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tenure/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/purpose/i)).toBeInTheDocument();
  });

  it("prevents submission with empty fields", () => {
    render(<LoanApplicationForm sme={mockSME} />);
    
    const submitButton = screen.getByText(/check eligibility/i);
    fireEvent.click(submitButton);
    
    expect(screen.getByText(/please provide/i)).toBeInTheDocument();
  });

  it("validates minimum loan amount", () => {
    render(<LoanApplicationForm sme={mockSME} />);
    
    const amountInput = screen.getByLabelText(/loan amount/i);
    fireEvent.change(amountInput, { target: { value: "100" } });
    
    const submitButton = screen.getByText(/check eligibility/i);
    fireEvent.click(submitButton);
    
    expect(screen.getByText(/minimum/i)).toBeInTheDocument();
  });
});
```

---

## 4. E2E Tests (Playwright)

### 4.1 Critical User Flows

```typescript
// e2e/sme-application-flow.spec.ts

import { test, expect } from "@playwright/test";

test.describe("SME Loan Application Flow", () => {
  test("complete loan application submission", async ({ page }) => {
    await page.goto("/");
    
    // 1. Select an SME
    await page.click('text=Apply for Working Capital');
    
    // 2. Fill loan application form
    await page.fill('[name="requestedAmount"]', "1000000");
    await page.selectOption('[name="tenureMonths"]', "12");
    await page.fill('[name="purpose"]', "Working Capital");
    await page.fill('textarea[name="loanReason"]', 
      "We need inventory restocking for Ramadan season with confirmed orders from 5 wholesale buyers worth PKR 30 lakh.");
    
    // 3. Submit
    await page.click('text=Check My Eligibility');
    
    // 4. Verify readiness report modal appears
    await expect(page.locator('text=Loan Eligibility Report')).toBeVisible();
    
    // 5. Submit application
    await page.click('text=Submit Application');
    
    // 6. Verify success
    await expect(page.locator('text=Application Submitted')).toBeVisible();
  });
});
```

```typescript
// e2e/rm-decision-flow.spec.ts

test.describe("RM Decision Flow", () => {
  test("RM can approve a loan application", async ({ page }) => {
    await page.goto("/rm");
    
    // 1. Login
    await page.fill('[name="email"]', "adnan.rahman@ubl.com.pk");
    await page.fill('[name="password"]', "demo1234");
    await page.click('text=Sign In');
    
    // 2. Click on first pending application
    await page.click('text=PENDING >> nth=0');
    
    // 3. Review assessment dashboard
    await expect(page.locator('text=Financing Readiness Score')).toBeVisible();
    
    // 4. Add RM notes
    await page.fill('textarea', 'Reviewed cashflow history. Strong repayment capacity.');
    
    // 5. Approve
    await page.click('text=Approve & Disburse');
    
    // 6. Verify status change
    await expect(page.locator('text=APPROVED')).toBeVisible();
  });
});
```

---

## 5. Test Configuration

### 5.1 Backend (`pytest.ini`)
```ini
[tool:pytest]
asyncio_mode = auto
testpaths = tests
python_files = test_*.py
python_functions = test_*
```

### 5.2 Frontend (add to `package.json`)
```json
{
  "scripts": {
    "test": "vitest",
    "test:e2e": "playwright test"
  },
  "devDependencies": {
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@playwright/test": "^1.45.0"
  }
}
```

---

## 6. Test Data Management

### Seed Test Database
```bash
# Reset and seed test data before running integration tests
cd backend
python scripts/seed_data.py --reset
```

### Mock SME Profile (for frontend tests)
```typescript
export const mockSME: SMEProfile = {
  id: 1,
  name: "Test Textile Mills",
  sector: "Textile",
  city: "Karachi",
  iban: "PK36UBL0109000XXXXPKR",
  accountAge: 48,
  monthlyInflows: [500000, 600000, 550000, 700000, 650000, 750000],
  monthlyOutflows: [300000, 350000, 320000, 400000, 380000, 420000],
  historyInflows: [500000, 600000, 550000, 700000, 650000, 750000],
  historyOutflows: [300000, 350000, 320000, 400000, 380000, 420000],
  onTimePaymentRate: 0.85,
  paymentRegularity: 0.82,
};
```
