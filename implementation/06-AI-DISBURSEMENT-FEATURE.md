# CashPulse — AI-Powered Loan Disbursement Recommendation System

> **New Feature**: AI analyzes SME loan purpose text to recommend single vs staged disbursement  
> **AI Provider**: Google Gemini API (primary) or OpenAI API (fallback)  
> **Benefit**: Minimizes risk for UBL, ensures SME gets funds when needed

---

## 1. Feature Overview

### 1.1 User Story (SME Point of View)
> "As an SME owner applying for a loan, I want to explain why I need the loan so the bank can process it faster and in a way that best suits my business needs."

### 1.2 User Story (Bank/RM Point of View)
> "As a UBL Relationship Manager, I want AI to analyze the SME's loan purpose and recommend whether the loan should be disbursed in full or in stages, so I can minimize default risk while ensuring the SME gets timely funding."

### 1.3 System Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ STEP 1: SME Fills Loan Application                               │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ "I need PKR 30 lakh to purchase industrial sewing machines   │ │
│ │  for my garment factory expansion. We have confirmed orders  │ │
│ │  from 3 new international buyers starting next quarter."     │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────┬───────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 2: AI Text Analysis (Gemini/OpenAI)                         │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Analyzes:                                                    │ │
│ │ • Purpose category (capital expenditure, working capital...) │ │
│ │ • Urgency level (immediate, planned, speculative)            │ │
│ │ • Risk indicators in text                                    │ │
│ │ • Specificity of plans (vague vs detailed)                   │ │
│ │ • Revenue generation potential                               │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────┬───────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 3: Disbursement Recommendation                              │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ RECOMMENDATION: STAGED DISBURSEMENT (3 stages)               │ │
│ │                                                              │ │
│ │ Stage 1: PKR 10 lakh (33%) — Immediately                    │ │
│ │   Reason: Machine down-payment and site preparation          │ │
│ │                                                              │ │
│ │ Stage 2: PKR 12 lakh (40%) — After 3 months                 │ │
│ │   Condition: Business cashflow confidence > 70%              │ │
│ │                                                              │ │
│ │ Stage 3: PKR 8 lakh (27%) — After 6 months                  │ │
│ │   Condition: First 2 stages utilized properly                │ │
│ │                                                              │ │
│ │ Risk Score: 0.25 (Low)                                       │ │
│ │ Confidence: 85%                                              │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Backend Implementation

### 2.1 AI Analyzer Service

**New File: `backend/app/services/ai_analyzer.py`**

```python
"""
AI-Powered Loan Purpose Analyzer using Google Gemini API.
Analyzes SME's loan reason text and generates disbursement recommendations.
"""

import os
import json
from typing import Optional

# Option A: Google Gemini
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

# Option B: OpenAI (fallback)
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


ANALYSIS_PROMPT = """You are a senior credit analyst at United Bank Limited (UBL), Pakistan's leading commercial bank. 
You are evaluating an SME loan application. Analyze the applicant's stated loan purpose and reason.

SME Details:
- Name: {sme_name}
- Sector: {sector}
- City: {city}
- Requested Loan: PKR {requested_amount:,.0f}
- Requested Tenure: {tenure_months} months
- Current Readiness Score: {readiness_score}/100 (Band: {readiness_band})
- Average Monthly Net Cashflow: PKR {avg_monthly_net:,.0f}

Loan Purpose: {purpose}
Detailed Reason: {loan_reason}

Based on this information, provide a JSON response with the following structure:
{{
  "purposeCategory": "<one of: CAPITAL_EXPENDITURE, WORKING_CAPITAL, INVENTORY, EXPANSION, DEBT_REFINANCING, EMERGENCY, OTHER>",
  "urgencyLevel": "<one of: IMMEDIATE, PLANNED, SPECULATIVE>",
  "specificityScore": <float 0.0-1.0, how specific and detailed the plan is>,
  "riskIndicators": ["<list of risk factors identified in the text>"],
  "positiveIndicators": ["<list of positive factors identified>"],
  "revenueGenerationPotential": "<one of: HIGH, MEDIUM, LOW, NONE>",
  "disbursementRecommendation": "<one of: SINGLE, STAGED>",
  "disbursementReason": "<1-2 sentence explanation of why single or staged>",
  "suggestedStages": [
    {{
      "stageNumber": 1,
      "percentOfTotal": <int>,
      "amount": <float>,
      "timing": "<when to disburse>",
      "purpose": "<what this stage funds>",
      "monitoringPeriodMonths": <int, how long to monitor before next stage>
    }}
  ],
  "overallRiskAssessment": "<one of: LOW, MODERATE, HIGH, VERY_HIGH>",
  "confidenceScore": <float 0.0-1.0>,
  "additionalNotes": "<any additional observations for the RM>"
}}

IMPORTANT RULES:
1. If the loan purpose is vague or speculative, recommend STAGED disbursement
2. If the purpose is specific with clear timeline, may recommend SINGLE for smaller amounts
3. For amounts > PKR 10 lakh, prefer STAGED unless very low risk
4. Always suggest at least 2 stages for STAGED disbursement
5. Each stage's monitoring period should be 2-4 months
6. The confidence score should reflect how well you can assess the application
7. Consider the SME's readiness score when making recommendations
8. All amounts should be in PKR

Respond ONLY with the JSON object, no other text."""


def _parse_ai_response(response_text: str) -> dict:
    """Parse the AI response, handling potential formatting issues."""
    # Strip markdown code blocks if present
    text = response_text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()
    
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to extract JSON from the response
        import re
        json_match = re.search(r'\{[\s\S]*\}', text)
        if json_match:
            return json.loads(json_match.group())
        raise ValueError("Could not parse AI response as JSON")


async def analyze_loan_purpose(
    sme_name: str,
    sector: str,
    city: str,
    requested_amount: float,
    tenure_months: int,
    purpose: str,
    loan_reason: str,
    readiness_score: float = 0,
    readiness_band: str = "Unknown",
    avg_monthly_net: float = 0,
) -> dict:
    """
    Analyze loan purpose using AI and return disbursement recommendation.
    
    Returns a dict with:
    - purposeCategory: str
    - disbursementRecommendation: "SINGLE" | "STAGED"
    - suggestedStages: list of stage objects
    - confidenceScore: float
    - riskIndicators: list of strings
    - etc.
    """
    
    prompt = ANALYSIS_PROMPT.format(
        sme_name=sme_name,
        sector=sector,
        city=city,
        requested_amount=requested_amount,
        tenure_months=tenure_months,
        purpose=purpose,
        loan_reason=loan_reason,
        readiness_score=readiness_score,
        readiness_band=readiness_band,
        avg_monthly_net=avg_monthly_net,
    )
    
    # Try Gemini first
    if GEMINI_AVAILABLE and os.getenv("GEMINI_API_KEY"):
        try:
            genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(prompt)
            return _parse_ai_response(response.text)
        except Exception as e:
            print(f"Gemini API error: {e}")
    
    # Try OpenAI fallback
    if OPENAI_AVAILABLE and os.getenv("OPENAI_API_KEY"):
        try:
            client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.3,
            )
            return _parse_ai_response(response.choices[0].message.content)
        except Exception as e:
            print(f"OpenAI API error: {e}")
    
    # Rule-based fallback (no AI available)
    return _rule_based_analysis(
        requested_amount, tenure_months, purpose, loan_reason,
        readiness_score, avg_monthly_net,
    )


def _rule_based_analysis(
    requested_amount: float,
    tenure_months: int,
    purpose: str,
    loan_reason: str,
    readiness_score: float,
    avg_monthly_net: float,
) -> dict:
    """
    Fallback rule-based analysis when AI APIs are unavailable.
    """
    combined_text = f"{purpose} {loan_reason}".lower()
    
    # Determine purpose category
    if any(w in combined_text for w in ["machine", "equipment", "vehicle", "property", "land"]):
        category = "CAPITAL_EXPENDITURE"
    elif any(w in combined_text for w in ["inventory", "stock", "bulk", "purchase"]):
        category = "INVENTORY"
    elif any(w in combined_text for w in ["expand", "growth", "new branch", "scale"]):
        category = "EXPANSION"
    elif any(w in combined_text for w in ["debt", "refinanc", "repay", "settle"]):
        category = "DEBT_REFINANCING"
    elif any(w in combined_text for w in ["emergency", "urgent", "critical"]):
        category = "EMERGENCY"
    else:
        category = "WORKING_CAPITAL"
    
    # Determine disbursement strategy
    is_large = requested_amount > 1000000  # > 10 lakh
    is_risky = readiness_score < 60
    is_long_tenure = tenure_months > 6
    is_vague = len(loan_reason) < 50
    
    if is_large or is_risky or is_vague:
        strategy = "STAGED"
        if is_large and is_risky:
            stages = [
                {"stageNumber": 1, "percentOfTotal": 25, "amount": requested_amount * 0.25,
                 "timing": "Immediately", "purpose": "Initial deployment",
                 "monitoringPeriodMonths": 3},
                {"stageNumber": 2, "percentOfTotal": 35, "amount": requested_amount * 0.35,
                 "timing": "After 3 months", "purpose": "Scale-up phase",
                 "monitoringPeriodMonths": 3},
                {"stageNumber": 3, "percentOfTotal": 40, "amount": requested_amount * 0.40,
                 "timing": "After 6 months", "purpose": "Final deployment",
                 "monitoringPeriodMonths": 0},
            ]
        else:
            stages = [
                {"stageNumber": 1, "percentOfTotal": 40, "amount": requested_amount * 0.40,
                 "timing": "Immediately", "purpose": "Primary deployment",
                 "monitoringPeriodMonths": 3},
                {"stageNumber": 2, "percentOfTotal": 60, "amount": requested_amount * 0.60,
                 "timing": "After 3 months", "purpose": "Remaining deployment",
                 "monitoringPeriodMonths": 0},
            ]
    else:
        strategy = "SINGLE"
        stages = [
            {"stageNumber": 1, "percentOfTotal": 100, "amount": requested_amount,
             "timing": "Immediately", "purpose": "Full deployment",
             "monitoringPeriodMonths": 0},
        ]
    
    # Calculate confidence
    specificity = min(len(loan_reason) / 200, 1.0)
    confidence = round(0.5 + (readiness_score / 100) * 0.3 + specificity * 0.2, 2)
    
    risk_indicators = []
    positive_indicators = []
    
    if is_vague:
        risk_indicators.append("Loan purpose description lacks detail")
    if is_risky:
        risk_indicators.append("Below-threshold readiness score")
    if readiness_score >= 80:
        positive_indicators.append("Strong financial health score")
    if specificity > 0.5:
        positive_indicators.append("Detailed business plan provided")
    
    return {
        "purposeCategory": category,
        "urgencyLevel": "IMMEDIATE" if "urgent" in combined_text else "PLANNED",
        "specificityScore": round(specificity, 2),
        "riskIndicators": risk_indicators,
        "positiveIndicators": positive_indicators,
        "revenueGenerationPotential": "HIGH" if readiness_score >= 80 else "MEDIUM" if readiness_score >= 60 else "LOW",
        "disbursementRecommendation": strategy,
        "disbursementReason": f"{'Staged disbursement recommended due to ' + ('high loan amount, ' if is_large else '') + ('elevated risk profile, ' if is_risky else '') + ('vague purpose description' if is_vague else 'standard precaution') if strategy == 'STAGED' else 'Single disbursement is appropriate given the SME\\'s strong financial profile and clear purpose.'}",
        "suggestedStages": stages,
        "overallRiskAssessment": "HIGH" if is_risky and is_large else "MODERATE" if is_risky or is_large else "LOW",
        "confidenceScore": confidence,
        "additionalNotes": "Rule-based analysis (AI service unavailable). Recommend manual RM review.",
        "analysisMethod": "RULE_BASED",
    }
```

### 2.2 Disbursement Router

**New File: `backend/app/routers/disbursement.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from bson import ObjectId
from datetime import datetime, timezone
from app.db.mongo import get_db
from app.core.security import get_current_user
from app.services.ai_analyzer import analyze_loan_purpose

router = APIRouter()

class AnalyzeRequest(BaseModel):
    smeId: str
    smeName: str
    sector: str
    city: str
    requestedAmount: float = Field(..., gt=0)
    tenureMonths: int = Field(..., ge=3, le=60)
    purpose: str
    loanReason: str = Field(..., min_length=10, max_length=5000)
    readinessScore: Optional[float] = 0
    readinessBand: Optional[str] = "Unknown"
    avgMonthlyNet: Optional[float] = 0

class StageOverride(BaseModel):
    stageNumber: int
    action: str  # "APPROVE" | "HOLD" | "CANCEL"
    reason: str

@router.post("/analyze")
async def analyze_disbursement(
    body: AnalyzeRequest,
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    """AI analyzes loan purpose and recommends disbursement strategy."""
    result = await analyze_loan_purpose(
        sme_name=body.smeName,
        sector=body.sector,
        city=body.city,
        requested_amount=body.requestedAmount,
        tenure_months=body.tenureMonths,
        purpose=body.purpose,
        loan_reason=body.loanReason,
        readiness_score=body.readinessScore,
        readiness_band=body.readinessBand,
        avg_monthly_net=body.avgMonthlyNet,
    )
    return result

@router.post("/plans")
async def create_disbursement_plan(
    body: dict,
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    """Create a disbursement plan based on AI analysis."""
    doc = {
        **body,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
        "createdBy": user.get("email"),
    }
    res = await db["disbursement_plans"].insert_one(doc)
    doc["id"] = str(res.inserted_id)
    del doc["_id"]
    return doc

@router.get("/plans/{plan_id}")
async def get_disbursement_plan(
    plan_id: str,
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    """Get a specific disbursement plan."""
    try:
        obj_id = ObjectId(plan_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid plan ID")
    
    plan = await db["disbursement_plans"].find_one({"_id": obj_id})
    if not plan:
        raise HTTPException(status_code=404, detail="Disbursement plan not found")
    plan["id"] = str(plan["_id"])
    del plan["_id"]
    return plan

@router.post("/plans/{plan_id}/stages/{stage_number}/override")
async def override_stage(
    plan_id: str,
    stage_number: int,
    body: StageOverride,
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    """RM overrides a disbursement stage decision."""
    try:
        obj_id = ObjectId(plan_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid plan ID")
    
    update_path = f"stages.{stage_number - 1}"
    result = await db["disbursement_plans"].update_one(
        {"_id": obj_id, f"{update_path}.stageNumber": stage_number},
        {"$set": {
            f"{update_path}.status": body.action,
            f"{update_path}.rmOverride": True,
            f"{update_path}.rmOverrideReason": body.reason,
            f"{update_path}.rmOverrideBy": user.get("email"),
            f"{update_path}.rmOverrideAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc),
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Plan or stage not found")
    
    return await get_disbursement_plan(plan_id, db, user)

@router.post("/plans/{plan_id}/contact-log")
async def add_contact_log(
    plan_id: str,
    body: dict,
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    """RM logs a contact attempt with the SME owner."""
    try:
        obj_id = ObjectId(plan_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid plan ID")
    
    contact_entry = {
        "date": datetime.now(timezone.utc),
        "type": body.get("type", "call"),
        "notes": body.get("notes", ""),
        "by": user.get("email"),
    }
    
    result = await db["disbursement_plans"].update_one(
        {"_id": obj_id},
        {
            "$push": {"contactLog": contact_entry},
            "$set": {"updatedAt": datetime.now(timezone.utc)},
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    return {"status": "Contact logged successfully"}
```

---

## 3. Frontend Implementation

### 3.1 Enhanced Loan Application Form

Add a new textarea field for "Detailed Reason" in the SME loan application form:

```tsx
// In LoanApplicationForm.tsx — add after purpose field:

<div className="md:col-span-3">
  <label className="block text-xs font-bold text-[#0E1B2A] mb-1">
    Why do you need this loan? (Explain in detail):
  </label>
  <textarea
    value={loanReason}
    onChange={(e) => setLoanReason(e.target.value)}
    placeholder="Please explain in detail why you need this loan, what you plan to use it for, 
    your timeline, and how it will help your business grow..."
    rows={4}
    className="w-full px-4 py-2.5 rounded-xl border border-[#E4EBF2] font-medium text-[#0E1B2A] 
    text-sm focus:outline-none focus:border-[#0083CA] resize-none"
  />
  <p className="text-[10px] text-[#5B6B7C] mt-1">
    The more detail you provide, the faster your application will be processed.
    Minimum 50 characters.
  </p>
</div>
```

### 3.2 AI Analysis Display Component

New component for RM dashboard showing AI disbursement recommendation:

```tsx
// New Component: DisbursementRecommendation.tsx
// Shows the AI analysis results with:
// - Purpose category badge
// - Risk assessment visualization
// - Staged disbursement timeline
// - RM override controls
// - Contact log
```

### 3.3 Staged Disbursement Timeline Visualization

```
┌─────────────────────────────────────────────────────────────┐
│ AI DISBURSEMENT RECOMMENDATION                               │
│                                                              │
│ Strategy: STAGED (3 Phases)    Confidence: 85%              │
│ Risk Level: ●○○ LOW                                         │
│                                                              │
│ Timeline:                                                    │
│ ┌────────┐    ┌────────┐    ┌────────┐                      │
│ │ Stage 1 │───▶│ Stage 2 │───▶│ Stage 3 │                    │
│ │ 10 Lakh │    │ 12 Lakh │    │ 8 Lakh  │                    │
│ │ Now     │    │ +3 Mo   │    │ +6 Mo   │                    │
│ │ ✅ Ready │    │ ⏳ Check │    │ 🔒 Locked│                    │
│ └────────┘    └────────┘    └────────┘                      │
│                                                              │
│ Before Stage 2:                                              │
│ • Forecast business cashflow for next 3 months              │
│ • Confidence must be > 70%                                   │
│ • RM can override if confidence is low                       │
│                                                              │
│ [▶ Disburse Stage 1]  [📞 Contact SME]  [✏️ Override]       │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Environment Variables Needed

```env
# Add to backend/.env
GEMINI_API_KEY=your-gemini-api-key-here
# OR
OPENAI_API_KEY=your-openai-api-key-here
```

---

## 5. Benefits Matrix

| Benefit | SME Point of View | Bank (UBL) Point of View |
|---------|-------------------|--------------------------|
| Speed | Faster processing — AI pre-analyzes the application | Automated first-pass reduces RM workload |
| Risk | Gets appropriate funding schedule | Staged disbursement limits exposure |
| Transparency | Understands why loan is staged | Clear AI reasoning for audit trail |
| Flexibility | Can explain needs in natural language | AI extracts structured insights from text |
| Monitoring | Knows when next disbursement is expected | Cashflow forecasting validates each stage |
| Communication | Clear contact mechanism with RM | Structured contact log for compliance |
