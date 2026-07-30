# Phase 3 — Eligibility Engine & Recommendation Engine

> **Goal**: Translate the Readiness Score into a concrete loan recommendation (Approve / Counter-offer / Manual Review) with a safe recommended amount and full reasoning.  
> **Acceptance Test**: `POST /api/assessments` now includes a full `eligibility` and `recommendation` block in the response.

---

## Files to Create / Modify

```
backend/
└── app/
    └── services/
        ├── eligibility_engine.py     ← Computes safe repayment capacity + recommended amount
        └── recommendation_engine.py  ← Decision logic: Approve / Counter / Manual Review
```

---

## Eligibility Engine (`app/services/eligibility_engine.py`)

### Purpose
Answers: *"How much can this SME safely borrow based on their verified cashflow?"*

### Logic

```
safe_monthly_payment = avg_monthly_net * safe_repayment_ratio
                     (default ratio = 0.50, from scoring_config.json)

safe_loan_amount = safe_monthly_payment * requested_tenure
```

This is the maximum loan CashPulse considers safe to recommend.

### Output — `eligibility` dict

```python
{
  "avg_monthly_net":       400_000.0,   # PKR — from features
  "safe_repayment_ratio":          0.5,
  "safe_monthly_payment":  200_000.0,   # PKR — what they can afford per month
  "requested_tenure":              24,  # months
  "safe_loan_amount":    4_800_000.0,   # PKR — max safe loan
  "requested_loan":      2_500_000.0,   # PKR — what they asked for
  "within_safe_capacity":       True,   # requested <= safe
  "headroom_pct":               92.0,   # how much of safe capacity they're using (%)
}
```

### Implementation

```python
def compute_eligibility(features: dict, config: dict) -> dict:
    safe_ratio           = config["safe_repayment_ratio"]
    avg_net              = features["avg_monthly_net"]
    requested_loan       = features["requested_loan"]
    requested_tenure     = features["requested_tenure"]

    safe_monthly_payment = avg_net * safe_ratio
    safe_loan_amount     = safe_monthly_payment * requested_tenure
    within_safe_capacity = requested_loan <= safe_loan_amount
    headroom_pct         = (requested_loan / safe_loan_amount * 100) if safe_loan_amount > 0 else 999

    return {
        "avg_monthly_net":       round(avg_net, 2),
        "safe_repayment_ratio":  safe_ratio,
        "safe_monthly_payment":  round(safe_monthly_payment, 2),
        "requested_tenure":      requested_tenure,
        "safe_loan_amount":      round(safe_loan_amount, 2),
        "requested_loan":        requested_loan,
        "within_safe_capacity":  within_safe_capacity,
        "headroom_pct":          round(headroom_pct, 1),
    }
```

---

## Recommendation Engine (`app/services/recommendation_engine.py`)

### Purpose
Combines the Readiness Score + Eligibility result into an explicit, human-readable recommendation.

### Decision Rules (from PRD `AC F-8.x`)

```
IF requested_loan <= safe_loan_amount  AND  readiness >= 80:
    → APPROVE
    recommended_amount = requested_loan
    reason = "Readiness is strong and requested amount is within safe capacity."

ELIF readiness >= 60:
    → COUNTER-OFFER
    recommended_amount = safe_loan_amount  (or requested, whichever is lower)
    reason = "Business shows adequate financial health, but requested amount
              exceeds safe repayment capacity. A counter-offer is recommended."

ELSE:
    → MANUAL REVIEW
    recommended_amount = None
    reason = "Readiness score indicates elevated risk. Manual review by
              Credit Officer is required before proceeding."
```

### Output — `recommendation` dict

```python
{
  "type":               "COUNTER_OFFER",   # "APPROVE" | "COUNTER_OFFER" | "MANUAL_REVIEW"
  "recommended_amount":    4_800_000.0,   # PKR (None for MANUAL_REVIEW)
  "recommended_tenure":           24,    # same as requested (or adjusted)
  "reason":             "Business shows adequate financial health...",
  "evidence": [
    {
      "label": "Readiness Score",
      "value": "74 / 100 (Review band)"
    },
    {
      "label": "Requested Loan",
      "value": "PKR 2,500,000"
    },
    {
      "label": "Safe Loan Capacity",
      "value": "PKR 4,800,000"
    },
    {
      "label": "Requested vs Safe",
      "value": "52% of safe capacity (within limits)"
    }
  ]
}
```

### Implementation

```python
def compute_recommendation(readiness: int, eligibility: dict, config: dict) -> dict:
    approve_threshold = config["thresholds"]["approve"]
    review_threshold  = config["thresholds"]["counter_offer"]
    
    within_safe  = eligibility["within_safe_capacity"]
    safe_amount  = eligibility["safe_loan_amount"]
    req_amount   = eligibility["requested_loan"]
    req_tenure   = eligibility["requested_tenure"]
    
    evidence = [
        {"label": "Readiness Score",      "value": f"{readiness} / 100"},
        {"label": "Requested Loan",       "value": fmt_pkr(req_amount)},
        {"label": "Safe Loan Capacity",   "value": fmt_pkr(safe_amount)},
        {"label": "Capacity Usage",       "value": f"{eligibility['headroom_pct']}% of safe capacity"},
    ]
    
    if within_safe and readiness >= approve_threshold:
        return {
            "type": "APPROVE",
            "recommended_amount": req_amount,
            "recommended_tenure": req_tenure,
            "reason": "Readiness is strong and the requested amount is comfortably within safe repayment capacity.",
            "evidence": evidence
        }
    elif readiness >= review_threshold:
        return {
            "type": "COUNTER_OFFER",
            "recommended_amount": min(safe_amount, req_amount),
            "recommended_tenure": req_tenure,
            "reason": "Business demonstrates adequate financial health, but requested amount exceeds safe repayment capacity. A counter-offer at the safe limit is recommended.",
            "evidence": evidence
        }
    else:
        return {
            "type": "MANUAL_REVIEW",
            "recommended_amount": None,
            "recommended_tenure": None,
            "reason": "Readiness score indicates elevated financial risk. This file requires escalation to a Credit Officer for manual review before any decision.",
            "evidence": evidence
        }

def fmt_pkr(amount: float) -> str:
    """Format as PKR 2,500,000"""
    return f"PKR {amount:,.0f}" if amount else "N/A"
```

---

## Full Assessment Pipeline Integration

In `app/routers/assessments.py`, the full pipeline now calls all services in sequence:

```python
@router.post("/", response_model=AssessmentOut)
async def create_assessment(body: AssessmentCreate, db=Depends(get_db), user=Depends(get_current_user)):
    
    # 1. Fetch last 6 months of transactions for the SME
    transactions = await db.transactions.find({"smeId": body.sme_id, ...}).to_list(None)
    
    # 2. Feature Engineering
    features = engineer_features(transactions, body.requested_loan, body.requested_tenure)
    
    # 3. Scoring Engine
    pillar_scores = score_all_pillars(features, config)
    
    # 4. Readiness Score
    readiness, readiness_band = compute_readiness(pillar_scores, config)
    
    # 5. Eligibility
    eligibility = compute_eligibility(features, config)
    
    # 6. Recommendation
    recommendation = compute_recommendation(readiness, eligibility, config)
    
    # 7. Also attach 6-month cashflow series for chart rendering
    cashflow_series = build_cashflow_series(transactions)   # see Phase 4
    
    # 8. Persist full assessment
    assessment_doc = {
        "smeId": body.sme_id,
        "rmId": user["_id"],
        "requestedLoan": body.requested_loan,
        "requestedTenure": body.requested_tenure,
        "features": features,
        "pillarScores": pillar_scores,
        "readiness": readiness,
        "readinessBand": readiness_band,
        "eligibility": eligibility,
        "recommendation": recommendation,
        "cashflowSeries": cashflow_series,
        "decision": None,
        "decisionNote": None,
        "createdAt": datetime.utcnow(),
    }
    result = await db.assessments.insert_one(assessment_doc)
    assessment_doc["_id"] = str(result.inserted_id)
    
    return assessment_doc
```

---

## Full `AssessmentOut` Pydantic Schema

```python
class PillarScore(BaseModel):
    pillar:   str
    label:    str
    question: str
    score:    int
    max:      int
    reason:   str
    evidence: List[dict]

class EligibilityOut(BaseModel):
    avg_monthly_net:      float
    safe_repayment_ratio: float
    safe_monthly_payment: float
    requested_tenure:     int
    safe_loan_amount:     float
    requested_loan:       float
    within_safe_capacity: bool
    headroom_pct:         float

class RecommendationOut(BaseModel):
    type:                 str     # APPROVE | COUNTER_OFFER | MANUAL_REVIEW
    recommended_amount:   Optional[float]
    recommended_tenure:   Optional[int]
    reason:               str
    evidence:             List[dict]

class AssessmentOut(BaseModel):
    id:               str
    sme_id:           str
    rm_id:            str
    requested_loan:   float
    requested_tenure: int
    features:         dict
    pillar_scores:    List[PillarScore]
    readiness:        int
    readiness_band:   str
    eligibility:      EligibilityOut
    recommendation:   RecommendationOut
    cashflow_series:  List[dict]
    decision:         Optional[str]
    decision_note:    Optional[str]
    created_at:       datetime
```

---

## Acceptance Criteria

- [ ] `POST /api/assessments` response includes `eligibility.safe_loan_amount` correctly computed
- [ ] `recommendation.type` is `"APPROVE"` when readiness ≥ 80 AND loan ≤ safe capacity
- [ ] `recommendation.type` is `"COUNTER_OFFER"` when readiness ≥ 60 but above safe capacity
- [ ] `recommendation.type` is `"MANUAL_REVIEW"` when readiness < 60
- [ ] `recommendation.evidence` always contains at least 4 entries
- [ ] All recommendation logic flows from `scoring_config.json` thresholds, not hardcoded values
