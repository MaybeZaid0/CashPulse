from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class AssessmentCreate(BaseModel):
    smeId: str
    requestedLoan: float
    requestedTenure: int

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
    eligibility_score:    float

class RecommendationOut(BaseModel):
    type:                 str
    recommended_amount:   Optional[float]
    recommended_tenure:   Optional[int]
    reason:               str
    evidence:             List[dict]

class DecisionIn(BaseModel):
    decision: str
    note: str

class AssessmentOut(BaseModel):
    id: str
    smeId: str
    rmId: str
    requestedLoan: float
    requestedTenure: int
    features: Dict[str, Any]
    pillarScores: List[PillarScore]
    readiness: float
    readinessBand: str
    eligibility: Optional[EligibilityOut] = None
    recommendation: Optional[RecommendationOut] = None
    cashflowSeries: List[Dict[str, Any]] = []
    pillarRadarData: Dict[str, Any] = {}
    decision: Optional[str] = None
    decisionNote: Optional[str] = None
    decidedAt: Optional[datetime] = None
    decidedBy: Optional[str] = None
    createdAt: datetime

class Assessment(AssessmentOut):
    pass
