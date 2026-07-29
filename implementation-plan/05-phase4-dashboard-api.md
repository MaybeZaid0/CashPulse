# Phase 4 — Full Dashboard API, Chart Data & Decision Capture

> **Goal**: Complete all remaining REST endpoints, enrich the assessment with chart-ready data, and allow RMs to record their final decision on each assessment.  
> **Acceptance Test**: All 6 endpoints from `api.md` work correctly and return chart-ready data.

---

## Files to Create / Modify

```
backend/
└── app/
    ├── services/
    │   └── chart_service.py          ← Prepares chart-ready JSON data from transactions
    └── routers/
        └── assessments.py            ← Extended with GET /api/assessments/{id}
                                         and POST /api/assessments/{id}/decision
```

---

## Chart Data Service (`app/services/chart_service.py`)

The frontend needs clean, structured data to render charts using Chart.js (no server-side image generation needed — the chart data is served as JSON).

### `build_cashflow_series(transactions: list) -> list`

Builds a 6-month month-by-month cashflow series for the **main cashflow bar/line chart** on the dashboard.

```python
def build_cashflow_series(transactions: list) -> list:
    """
    Returns a list of 6 monthly objects, sorted oldest → newest.
    
    Output shape:
    [
      {
        "month":   "Feb 2025",
        "inflow":  1_450_000,
        "outflow": 1_050_000,
        "net":       400_000,
        "balance": 2_100_000
      },
      ...
    ]
    """
    df = pd.DataFrame(transactions)
    df["date"]  = pd.to_datetime(df["date"])
    df["month"] = df["date"].dt.to_period("M")
    
    inflow_by_month  = df[df["type"] == "inflow"].groupby("month")["amount"].sum()
    outflow_by_month = df[df["type"] == "outflow"].groupby("month")["amount"].sum()
    balance_by_month = df.groupby("month")["balance"].last()   # end-of-month balance
    
    # Align all series on the same 6 months
    all_months = sorted(set(df["month"].unique()))[-6:]
    
    result = []
    for m in all_months:
        result.append({
            "month":   m.strftime("%b %Y"),
            "inflow":  round(inflow_by_month.get(m, 0), 0),
            "outflow": round(outflow_by_month.get(m, 0), 0),
            "net":     round(inflow_by_month.get(m, 0) - outflow_by_month.get(m, 0), 0),
            "balance": round(balance_by_month.get(m, 0), 0),
        })
    return result
```

### `build_pillar_radar_data(pillar_scores: list) -> dict`

Prepares normalized data for the pillar radar/bar chart.

```python
def build_pillar_radar_data(pillar_scores: list) -> dict:
    """
    Returns chart.js-compatible data for a horizontal bar chart of pillar scores.
    Each bar shows score / max as a percentage.
    """
    return {
        "labels": [p["label"] for p in pillar_scores],
        "scores": [p["score"] for p in pillar_scores],
        "maxes":  [p["max"]   for p in pillar_scores],
        "pcts":   [round(p["score"] / p["max"] * 100, 1) for p in pillar_scores],
    }
```

---

## Remaining API Endpoints

### `GET /api/assessments/{id}` — Full Assessment

Returns the complete persisted assessment, with all data needed for the dashboard.

```python
@router.get("/{assessment_id}", response_model=AssessmentOut)
async def get_assessment(assessment_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    assessment = await db.assessments.find_one({"_id": ObjectId(assessment_id)})
    if not assessment:
        raise HTTPException(404, "Assessment not found")
    return serialize(assessment)
```

**Returns the full `AssessmentOut` schema** (from Phase 3) — all pillar scores, eligibility, recommendation, cashflow series, pillar radar data.

---

### `POST /api/assessments/{id}/decision` — RM Decision Capture

Allows the RM to record their final decision on an assessment.

**Request body**:
```json
{
  "decision": "ACCEPT",
  "note": "Approved after verifying business registration. Safe amount confirmed."
}
```

Valid values for `decision`:
- `"ACCEPT"` — RM accepts the system's recommendation
- `"COUNTER"` — RM proposes a different amount (stored in note)
- `"ESCALATE"` — RM escalates to Credit Officer for manual review

**Logic**:
```python
@router.post("/{assessment_id}/decision", response_model=AssessmentOut)
async def record_decision(assessment_id: str, body: DecisionIn, db=Depends(get_db), user=Depends(get_current_user)):
    result = await db.assessments.update_one(
        {"_id": ObjectId(assessment_id)},
        {"$set": {
            "decision":     body.decision,
            "decisionNote": body.note,
            "decidedAt":    datetime.utcnow(),
            "decidedBy":    str(user["_id"]),
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Assessment not found")
    return await get_assessment(assessment_id, db, user)
```

---

### `GET /api/smes` — Enriched Portfolio List

This was started in Phase 1. Now enrich it with the latest assessment readiness per SME.

```python
@router.get("/", response_model=List[SMESummaryOut])
async def list_smes(db=Depends(get_db), user=Depends(get_current_user)):
    smes = await db.smes.find().to_list(None)
    
    for sme in smes:
        # Fetch latest assessment for this SME
        latest = await db.assessments.find_one(
            {"smeId": sme["_id"]},
            sort=[("createdAt", -1)]
        )
        sme["lastReadiness"]     = latest["readiness"]     if latest else None
        sme["lastReadinessBand"] = latest["readinessBand"] if latest else None
        sme["lastAssessmentId"]  = str(latest["_id"])      if latest else None
    
    return [serialize_sme_summary(s) for s in smes]
```

---

## Report / Summary View (server-side)

For the printable report (F-12), we generate a clean summary dict that the frontend renders as a print-optimized page.

```python
@router.get("/{assessment_id}/report")
async def get_report(assessment_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    """
    Returns a simplified, print-ready summary of the assessment.
    This is what the frontend renders in the report/print view.
    """
    assessment = await get_assessment(assessment_id, db, user)
    sme        = await db.smes.find_one({"_id": ObjectId(assessment["smeId"])})
    rm         = await db.users.find_one({"_id": ObjectId(assessment["rmId"])})
    
    return {
        "reportDate":      datetime.utcnow().isoformat(),
        "smeName":         sme["name"],
        "smeSector":       sme["sector"],
        "smeAccount":      sme["accountNo"],
        "rmName":          rm["name"],
        "requestedLoan":   fmt_pkr(assessment["requestedLoan"]),
        "requestedTenure": f"{assessment['requestedTenure']} months",
        "readiness":       assessment["readiness"],
        "readinessBand":   assessment["readinessBand"],
        "recommendation":  assessment["recommendation"],
        "pillarSummary":   [
            {"label": p["label"], "score": p["score"], "max": p["max"], "reason": p["reason"]}
            for p in assessment["pillarScores"]
        ],
        "decision":      assessment.get("decision"),
        "decisionNote":  assessment.get("decisionNote"),
    }
```

---

## Full API Checklist (all from `api.md`)

| Method | Endpoint                             | Phase | Status |
|--------|--------------------------------------|-------|--------|
| POST   | `/api/auth/login`                    | 1     | ☐      |
| GET    | `/api/smes`                          | 1→4   | ☐      |
| GET    | `/api/smes/{id}`                     | 1     | ☐      |
| POST   | `/api/assessments`                   | 2–3   | ☐      |
| GET    | `/api/assessments/{id}`              | 4     | ☐      |
| POST   | `/api/assessments/{id}/decision`     | 4     | ☐      |
| GET    | `/api/assessments/{id}/report`       | 4     | ☐      |

---

## Acceptance Criteria

- [ ] `GET /api/smes` returns `lastReadiness` and `lastReadinessBand` per SME (null if no assessment yet)
- [ ] `GET /api/assessments/{id}` returns `cashflowSeries` as a 6-item array with month labels
- [ ] `GET /api/assessments/{id}` returns `pillarRadarData` for the pillar bar chart
- [ ] `POST /api/assessments/{id}/decision` accepts `ACCEPT`, `COUNTER`, or `ESCALATE`
- [ ] Decision is persisted and returned in subsequent `GET /api/assessments/{id}` calls
- [ ] `GET /api/assessments/{id}/report` returns a printable summary
- [ ] All routes return `401` for unauthenticated requests
- [ ] All routes return proper `404` when the resource doesn't exist
