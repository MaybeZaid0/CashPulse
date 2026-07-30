from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SME(BaseModel):
    id: str
    name: str
    sector: str
    accountNo: str
    legalType: str
    requestedLoan: float
    requestedTenure: int
    createdAt: datetime

class SMESummary(BaseModel):
    id: str
    name: str
    sector: str
    lastReadiness: Optional[float] = None
    lastReadinessBand: Optional[str] = None
    lastAssessmentId: Optional[str] = None
    requestedLoan: float
