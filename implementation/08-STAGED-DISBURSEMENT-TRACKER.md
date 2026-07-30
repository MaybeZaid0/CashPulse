# CashPulse — Multi-Stage Disbursement Tracker & RM Control Panel

---

## 1. Feature Overview

The Staged Disbursement Tracker provides a unified dashboard for RMs to monitor and control multi-stage loan disbursements. It combines AI recommendations, cashflow forecasting, confidence scoring, and direct SME communication into a single workflow.

---

## 2. Disbursement Lifecycle

```
Application Approved (STAGED)
│
├── Stage 1: PENDING → DISBURSED
│   └── Wait monitoring period (e.g., 3 months)
│       └── Auto-generate forecast
│           ├── Confidence ≥ 70% → Stage 2: READY
│           └── Confidence < 70% → Stage 2: ON_HOLD
│               └── RM Decision Required
│                   ├── Override → DISBURSED
│                   ├── Contact SME → Log + Reassess
│                   └── Cancel → CANCELLED
│
├── Stage 2: PENDING → [same cycle]
│
└── Stage 3: PENDING → [same cycle] → COMPLETED
```

---

## 3. Backend: Disbursement Stage State Machine

```python
# Valid stage status transitions
STAGE_TRANSITIONS = {
    "PENDING": ["READY", "DISBURSED"],      # Can skip READY for Stage 1
    "READY": ["DISBURSED", "ON_HOLD"],       # Forecast passed
    "DISBURSED": [],                          # Terminal for this stage
    "ON_HOLD": ["READY", "DISBURSED", "CANCELLED"],  # RM can override
    "CANCELLED": [],                          # Terminal
}
```

### 3.1 Cron Job / Scheduled Task: Auto-Forecast Check

```python
# backend/app/services/disbursement_scheduler.py

"""
Scheduled task that runs daily to check if any disbursement stages
need forecast evaluation.
"""

async def check_pending_stages():
    """
    For each active disbursement plan:
    1. Find stages where monitoring period has elapsed
    2. Auto-generate forecast
    3. Update stage status based on confidence
    4. Notify RM if action required
    """
    db = get_db()
    
    plans = await db["disbursement_plans"].find({
        "stages.status": {"$in": ["PENDING", "READY"]},
    }).to_list(length=1000)
    
    for plan in plans:
        for stage in plan.get("stages", []):
            if stage["status"] != "PENDING":
                continue
            if stage["stageNumber"] == 1:
                continue  # Stage 1 doesn't need forecast check
            
            # Check if previous stage was disbursed and monitoring period elapsed
            prev_stage = next(
                (s for s in plan["stages"] if s["stageNumber"] == stage["stageNumber"] - 1),
                None
            )
            
            if not prev_stage or prev_stage["status"] != "DISBURSED":
                continue
            
            disbursed_at = prev_stage.get("disbursedAt")
            if not disbursed_at:
                continue
            
            monitoring_months = prev_stage.get("monitoringPeriodMonths", 3)
            check_date = disbursed_at + timedelta(days=monitoring_months * 30)
            
            if datetime.now(timezone.utc) >= check_date:
                # Time to run forecast
                forecast = await generate_forecast_for_stage(plan, stage)
                
                new_status = "READY" if forecast["confidenceMet"] else "ON_HOLD"
                
                await db["disbursement_plans"].update_one(
                    {"_id": plan["_id"]},
                    {"$set": {
                        f"stages.{stage['stageNumber'] - 1}.status": new_status,
                        f"stages.{stage['stageNumber'] - 1}.forecastData": forecast,
                        f"stages.{stage['stageNumber'] - 1}.confidenceScore": forecast["confidenceScore"],
                        f"stages.{stage['stageNumber'] - 1}.confidenceMet": forecast["confidenceMet"],
                        "updatedAt": datetime.now(timezone.utc),
                    }}
                )
```

---

## 4. Frontend: Disbursement Tracker Dashboard

### 4.1 Component Structure

```
DisbursementTracker/
├── DisbursementOverview.tsx      # Summary cards + timeline
├── StageCard.tsx                  # Individual stage details
├── ForecastChart.tsx              # Historical + forecast chart
├── ConfidenceGauge.tsx            # Confidence score visualization
├── RMOverrideDialog.tsx           # Override confirmation modal
├── ContactLogPanel.tsx            # Communication history
└── DisbursementTimeline.tsx       # Visual timeline of stages
```

### 4.2 UI Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│ STAGED DISBURSEMENT TRACKER                                      │
│ Application: REQ-123456 | Ahmed & Sons FMCG | PKR 30,00,000    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌──────────┐      ┌──────────┐      ┌──────────┐               │
│ │ STAGE 1  │─────▶│ STAGE 2  │─────▶│ STAGE 3  │               │
│ │ PKR 10L  │      │ PKR 12L  │      │ PKR 8L   │               │
│ │ ✅ DONE   │      │ ⏳ REVIEW │      │ 🔒 LOCKED │               │
│ │ Jul 2026 │      │ Oct 2026 │      │ Jan 2027 │               │
│ └──────────┘      └──────────┘      └──────────┘               │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ STAGE 2 ASSESSMENT                                               │
│                                                                  │
│ ┌─────────────────────┐  ┌────────────────────────────────────┐ │
│ │ CONFIDENCE SCORE     │  │ 3-MONTH CASHFLOW FORECAST          │ │
│ │                      │  │                                    │ │
│ │     ┌────────┐      │  │ PKR                                │ │
│ │     │  72%   │      │  │ 2.5M ┤    ╱─╲                      │ │
│ │     │  PASS  │      │  │      │   ╱   ╲  ┈┈┈ Forecast      │ │
│ │     └────────┘      │  │ 2.0M ┤──╱     ╲╱─── ─ ─ ─        │ │
│ │                      │  │      │ ╱     Historical            │ │
│ │ Threshold: 70%       │  │ 1.5M ┤╱                           │ │
│ │ Status: ✅ MET        │  │      └────────────────────────     │ │
│ │                      │  │      M1  M2  M3  M4  M5  M6  F1   │ │
│ └─────────────────────┘  └────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ RM ACTIONS                                                   │ │
│ │                                                              │ │
│ │ [✅ Approve Stage 2]  [⏸️ Hold]  [📞 Contact SME]  [❌ Cancel] │ │
│ │                                                              │ │
│ │ RM Notes: _______________________________________________    │ │
│ │                                                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ CONTACT LOG                                                  │ │
│ │ ┌──────────────────────────────────────────────────────────┐ │ │
│ │ │ Jul 15, 2026 — Phone Call by RM Adnan Rahman             │ │ │
│ │ │ "Confirmed machinery delivery on schedule. Vendor         │ │ │
│ │ │  contract verified. Recommend proceeding."                │ │ │
│ │ └──────────────────────────────────────────────────────────┘ │ │
│ │ [+ Add Contact Entry]                                        │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. RM Override Flow

When confidence score is below threshold:

```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ STAGE 2 — REQUIRES RM DECISION                       │
│                                                          │
│ Confidence Score: 58% (Below 70% threshold)             │
│                                                          │
│ Forecast Summary:                                        │
│ • Avg predicted net cashflow: PKR 85,000/mo             │
│ • Historical avg: PKR 120,000/mo                         │
│ • Trend: DECLINING (-29%)                                │
│                                                          │
│ Risk Factors:                                            │
│ • Revenue dropped 15% in last month                      │
│ • 2 outflow spikes detected                              │
│                                                          │
│ OPTIONS:                                                  │
│ ┌─────────────────────────────────────────────────────┐  │
│ │ [Override & Approve]                                 │  │
│ │ I have verified the business is still viable.        │  │
│ │ Reason: ________________________________________     │  │
│ └─────────────────────────────────────────────────────┘  │
│ ┌─────────────────────────────────────────────────────┐  │
│ │ [Contact SME First]                                  │  │
│ │ Call/email the SME to understand the situation.       │  │
│ │ Phone: +92-XXX-XXXXXXX                               │  │
│ └─────────────────────────────────────────────────────┘  │
│ ┌─────────────────────────────────────────────────────┐  │
│ │ [Cancel Remaining Disbursement]                      │  │
│ │ Stop all future stages. Reason required.             │  │
│ │ Reason: ________________________________________     │  │
│ └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Integration with Existing Assessment Dashboard

Add a "Disbursement" tab to the RM Assessment Dashboard:

```tsx
// In AssessmentDashboard.tsx — add tab for disbursement tracking

const [activeTab, setActiveTab] = useState<"ASSESSMENT" | "DISBURSEMENT">("ASSESSMENT");

// In the render:
{activeTab === "DISBURSEMENT" && application.disbursementPlanId && (
  <DisbursementTracker planId={application.disbursementPlanId} />
)}
```

---

## 7. Notifications System (Future Enhancement)

When a stage needs RM attention:
- Email notification to assigned RM
- In-app notification badge on RM Portal
- SMS to RM (optional, via Twilio/etc.)

When a stage is approved by RM:
- Email notification to SME
- Status update visible in SME Portal
- SMS confirmation to SME
