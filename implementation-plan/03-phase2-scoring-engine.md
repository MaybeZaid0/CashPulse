# Phase 2 — Feature Engineering & Scoring Engine

> **Goal**: Build the core intelligence of CashPulse — transform raw transaction data into meaningful financial features, then score those features across 5 pillars to produce a transparent Readiness Score (0–100).  
> **Acceptance Test**: `POST /api/assessments` returns a full assessment object with `pillarScores`, `readiness`, and evidence for each pillar.

---

## Files to Create

```
backend/
└── app/
    ├── services/
    │   ├── __init__.py
    │   ├── feature_engineering.py  ← Derives financial indicators from raw transactions
    │   └── scoring_engine.py       ← Scores the 5 pillars from features
    ├── routers/
    │   └── assessments.py          ← POST /api/assessments (triggers the pipeline)
    └── models/
        └── assessment.py           ← Extended with feature + score schemas
```

---

## Feature Engineering (`app/services/feature_engineering.py`)

This service takes raw transaction records and produces a clean dictionary of derived financial indicators that the scoring engine can work with.

### Input
```python
transactions: List[dict]   # last 6 months of SME transactions
requested_loan: float      # PKR amount from the assessment request
requested_tenure: int      # months
```

### Output — `features` dict
```python
{
  # Cashflow
  "avg_monthly_inflow":       1_450_000.0,   # PKR
  "avg_monthly_outflow":      1_050_000.0,   # PKR
  "avg_monthly_net":            400_000.0,   # inflow - outflow
  "cashflow_volatility_pct":         18.4,   # CoV% of monthly net cashflow
  "inflow_trend":                    +0.08,  # linear regression slope (normalized)

  # Balance & Liquidity
  "avg_balance":              2_100_000.0,   # PKR
  "min_balance":                280_000.0,   # PKR
  "reserve_ratio":                   1.44,   # avg_balance / avg_monthly_outflow

  # Activity
  "positive_months":                    5,   # months where net > 0 (out of 6)
  "negative_months":                    1,
  "txn_activity_score":              0.87,   # txn count normalized (0-1)
  "payment_regularity":              0.75,   # synthetic: consistent outflow timing

  # Loan context
  "requested_loan":          2_500_000.0,
  "requested_tenure":                  24,
  "monthly_installment_est":   119_048.0,   # requestedLoan / requestedTenure
}
```

### Implementation Logic

```python
import pandas as pd
import numpy as np
from scipy import stats

def engineer_features(transactions: list, requested_loan: float, requested_tenure: int) -> dict:
    df = pd.DataFrame(transactions)
    df["date"] = pd.to_datetime(df["date"])
    df["month"] = df["date"].dt.to_period("M")

    inflow_df  = df[df["type"] == "inflow"]
    outflow_df = df[df["type"] == "outflow"]

    # Monthly aggregations
    monthly_in  = inflow_df.groupby("month")["amount"].sum()
    monthly_out = outflow_df.groupby("month")["amount"].sum()
    monthly_net = monthly_in.subtract(monthly_out, fill_value=0)

    avg_monthly_inflow  = monthly_in.mean()
    avg_monthly_outflow = monthly_out.mean()
    avg_monthly_net     = monthly_net.mean()

    # Cashflow Volatility (Coefficient of Variation of monthly net)
    cashflow_volatility_pct = (monthly_net.std() / abs(avg_monthly_net)) * 100 if avg_monthly_net != 0 else 999

    # Inflow trend (linear regression over 6 monthly data points)
    x = np.arange(len(monthly_in))
    slope, _, _, _, _ = stats.linregress(x, monthly_in.values) if len(monthly_in) > 1 else (0,)
    inflow_trend = slope / avg_monthly_inflow if avg_monthly_inflow > 0 else 0

    # Balance
    avg_balance = df["balance"].mean() if "balance" in df.columns else avg_monthly_inflow * 1.5
    min_balance = df["balance"].min() if "balance" in df.columns else 0
    reserve_ratio = avg_balance / avg_monthly_outflow if avg_monthly_outflow > 0 else 0

    # Activity
    positive_months = int((monthly_net > 0).sum())
    negative_months = int((monthly_net <= 0).sum())
    txn_activity_score = min(len(df) / 120, 1.0)   # 120 txns over 6 months = perfect activity

    # Loan context
    monthly_installment_est = requested_loan / requested_tenure if requested_tenure > 0 else 0

    return {
        "avg_monthly_inflow": round(avg_monthly_inflow, 2),
        "avg_monthly_outflow": round(avg_monthly_outflow, 2),
        "avg_monthly_net": round(avg_monthly_net, 2),
        "cashflow_volatility_pct": round(cashflow_volatility_pct, 2),
        "inflow_trend": round(inflow_trend, 4),
        "avg_balance": round(avg_balance, 2),
        "min_balance": round(min_balance, 2),
        "reserve_ratio": round(reserve_ratio, 4),
        "positive_months": positive_months,
        "negative_months": negative_months,
        "txn_activity_score": round(txn_activity_score, 4),
        "payment_regularity": 0.75,   # synthetic placeholder; computed from outflow timing in full version
        "requested_loan": requested_loan,
        "requested_tenure": requested_tenure,
        "monthly_installment_est": round(monthly_installment_est, 2),
    }
```

---

## Scoring Engine (`app/services/scoring_engine.py`)

The scoring engine evaluates the 5 pillars from `scoring_config.json`. Each pillar scorer function returns:
```python
{
  "pillar":   "cashflow_stability",
  "label":    "Cashflow Stability",
  "question": "Is this business's cash consistent enough to rely on?",
  "score":    22,
  "max":      30,
  "reason":   "Cashflow is moderately stable with 5 of 6 positive months.",
  "evidence": [
    {"label": "Avg Monthly Net Cashflow", "value": "PKR 400,000"},
    {"label": "Cashflow Volatility (CoV%)", "value": "18.4%"},
    {"label": "Positive Months",           "value": "5 of 6"},
  ]
}
```

### Pillar 1 — Cashflow Stability (max: 30)

```
Question: Is cashflow stable and consistently positive?

Rules:
  +12 pts: positive_months >= 5  (5+ of 6 positive)  
  + 8 pts: positive_months == 4
  + 0 pts: positive_months <= 3

  + 9 pts: cashflow_volatility_pct < 20%   (stable)
  + 6 pts: cashflow_volatility_pct < 35%   (moderate)
  + 0 pts: cashflow_volatility_pct >= 35%  (volatile)

  + 9 pts: avg_monthly_net > 0              (net positive)
  + 4 pts: avg_monthly_net >= -50_000       (slight deficit)
  + 0 pts: avg_monthly_net < -50_000        (consistent deficit)
```

### Pillar 2 — Repayment Capacity (max: 25)

```
Question: Can this business afford the requested installment?

Derived metric: repayment_load = monthly_installment_est / avg_monthly_net
  (lower is better; 0.5 = installment is 50% of net cashflow)

Rules:
  +25 pts: repayment_load <= 0.30  (very comfortable)
  +20 pts: repayment_load <= 0.50  (comfortable, at safe threshold)
  +14 pts: repayment_load <= 0.70  (stretched but feasible)
  + 7 pts: repayment_load <= 1.00  (tight)
  + 0 pts: repayment_load > 1.00   (cannot cover installment)
```

### Pillar 3 — Liquidity (max: 20)

```
Question: Does this business hold enough liquid reserves?

Rules:
  reserve_ratio = avg_balance / avg_monthly_outflow

  +12 pts: reserve_ratio >= 2.0   (>2 months of outflows in reserve)
  + 8 pts: reserve_ratio >= 1.0
  + 4 pts: reserve_ratio >= 0.5
  + 0 pts: reserve_ratio < 0.5

  + 8 pts: min_balance >= 0       (never went negative)
  + 4 pts: min_balance >= -50_000
  + 0 pts: min_balance < -50_000
```

### Pillar 4 — Business Behaviour (max: 15)

```
Question: Is this business well-managed and active?

Rules:
  + 7 pts: txn_activity_score >= 0.70  (high activity)
  + 4 pts: txn_activity_score >= 0.40  (moderate)
  + 0 pts: txn_activity_score < 0.40   (low activity)

  + 8 pts: payment_regularity >= 0.80  (consistent outflow pattern)
  + 5 pts: payment_regularity >= 0.60
  + 0 pts: payment_regularity < 0.60
```

### Pillar 5 — Business Momentum (max: 10)

```
Question: Is this business growing?

Rules:
  inflow_trend (normalized slope of 6-month inflow series)

  +10 pts: inflow_trend >= +0.05   (strong upward trend)
  + 7 pts: inflow_trend >= +0.01   (slight growth)
  + 4 pts: inflow_trend >= -0.01   (stable, flat)
  + 0 pts: inflow_trend < -0.01    (declining)
```

---

### Readiness Score Computation

```python
def compute_readiness(pillar_scores: list, config: dict) -> tuple[int, str]:
    """Returns (readiness_score, band)"""
    total = sum(p["score"] for p in pillar_scores)
    readiness = round(total)   # already weighted by max values
    
    if readiness >= config["thresholds"]["approve"]:
        band = "Strong"
    elif readiness >= config["thresholds"]["counter_offer"]:
        band = "Review"
    else:
        band = "High Risk"
    
    return readiness, band
```

---

### `scoring_config.json`

```json
{
  "pillars": {
    "cashflow_stability": { "max": 30, "label": "Cashflow Stability",  "question": "Is this business's cash consistent?" },
    "repayment_capacity": { "max": 25, "label": "Repayment Capacity",  "question": "Can it afford the installment?" },
    "liquidity":          { "max": 20, "label": "Liquidity",           "question": "Does it hold enough reserves?" },
    "business_behaviour": { "max": 15, "label": "Business Behaviour",  "question": "Is it well-managed and active?" },
    "business_momentum":  { "max": 10, "label": "Business Momentum",   "question": "Is the business growing?" }
  },
  "thresholds": {
    "approve":       80,
    "counter_offer": 60
  },
  "safe_repayment_ratio": 0.50,
  "data_window_months":   6
}
```

---

## `POST /api/assessments` — Router

```python
@router.post("/", response_model=AssessmentOut)
async def create_assessment(body: AssessmentCreate, db=Depends(get_db), user=Depends(get_current_user)):
    # 1. Fetch transactions for smeId (last 6 months)
    # 2. Run feature_engineering.engineer_features()
    # 3. Run scoring_engine.score_all_pillars()
    # 4. Compute readiness + band
    # 5. Run eligibility engine (Phase 3)
    # 6. Run recommendation engine (Phase 3)
    # 7. Persist to assessments collection
    # 8. Return full assessment object
```

---

## Acceptance Criteria

- [ ] `POST /api/assessments` with a valid `smeId` returns `pillarScores` array with 5 entries
- [ ] Each pillar entry has `score`, `max`, `reason`, `evidence[]`
- [ ] `readiness` is the correct sum of all 5 pillar scores (0–100)
- [ ] `readinessBand` is `"Strong"`, `"Review"`, or `"High Risk"` based on thresholds in config
- [ ] Changing weights in `scoring_config.json` changes the output without touching Python code
- [ ] Assessment is saved to MongoDB `assessments` collection
