from pydantic import BaseModel
from datetime import datetime

class Transaction(BaseModel):
    id: str
    smeId: str
    date: datetime
    amount: float
    type: str # inflow or outflow
    balance: float
    description: str
    category: str
