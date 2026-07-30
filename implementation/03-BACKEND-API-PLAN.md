# CashPulse — Backend API Implementation Plan

> **Framework**: FastAPI (Python 3.11+)  
> **Database Driver**: Motor (async) + PyMongo  
> **Auth**: JWT (python-jose + passlib/bcrypt)

---

## 1. Current Backend State

### Existing Endpoints (3 routers, 8 endpoints)
- `auth.py`: signup, login
- `smes.py`: list SMEs, get SME detail
- `assessments.py`: create assessment, get assessment, record decision, get report

### Existing Services (5 services)
- `feature_engineering.py`: Transaction → feature vectors
- `scoring_engine.py`: Features → 6-pillar scoring
- `eligibility_engine.py`: Readiness + features → loan eligibility
- `recommendation_engine.py`: Readiness + eligibility → APPROVE/COUNTER/MANUAL_REVIEW
- `chart_service.py`: Transactions → chart data

---

## 2. Bugs to Fix in Existing Backend

### 2.1 MongoDB Connection Pooling (P0 — A1-006)

**File**: `backend/app/db/mongo.py`

**Current** (creates new client per request):
```python
client: AsyncIOMotorClient = None

def get_client() -> AsyncIOMotorClient:
    return AsyncIOMotorClient(settings.MONGODB_URL)

def get_db():
    return get_client()[settings.DATABASE_NAME]
```

**Fix** (singleton with lifespan):
```python
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

_client: AsyncIOMotorClient | None = None

def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            maxPoolSize=50,
            minPoolSize=5,
            serverSelectionTimeoutMS=5000,
        )
    return _client

def get_db():
    return get_client()[settings.DATABASE_NAME]

async def close_client():
    global _client
    if _client:
        _client.close()
        _client = None
```

**Also update `main.py`**:
```python
from contextlib import asynccontextmanager
from app.db.mongo import close_client

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_client()

app = FastAPI(title="CashPulse API", version="1.0.0", lifespan=lifespan)
```

### 2.2 Assessment Serialization Fix (P1 — A1-008)

**File**: `backend/app/routers/assessments.py`

**Problem**: `create_assessment` returns raw dict with ObjectId that Pydantic cannot serialize.

**Fix**: Remove `response_model=AssessmentOut` from decorator and manually serialize:
```python
@router.post("/")
async def create_assessment(body: AssessmentCreate, db=Depends(get_db), current_user=Depends(get_current_user)):
    # ... existing scoring logic ...
    
    res = await db["assessments"].insert_one(doc)
    doc["_id"] = res.inserted_id
    return serialize_assessment(doc)
```

### 2.3 Auth Endpoint Fixes (P1 — A1-007)

**File**: `backend/app/routers/auth.py`

- Add response models: `response_model=Token`
- Add `createdAt` field to user document on signup
- Add role-based access control preparation
- Fix: username field in OAuth2 form maps to email

### 2.4 Bare Except Fixes (P2 — A1-019, A1-020)

Replace all bare `except:` with:
```python
except (ValueError, TypeError, bson.errors.InvalidId):
    raise HTTPException(status_code=400, detail="Invalid ID format")
```

### 2.5 Datetime Fix (P1 — A1-009)

Replace `datetime.utcnow()` with `datetime.now(timezone.utc)` across all files.

---

## 3. New Endpoints to Build

### 3.1 Applications Router (`backend/app/routers/applications.py`)

This is a NEW router for the SME loan application workflow. Currently, applications are only managed in localStorage.

```python
# NEW FILE: backend/app/routers/applications.py

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from bson import ObjectId
from datetime import datetime, timezone
from pydantic import BaseModel
from app.db.mongo import get_db
from app.core.security import get_current_user

router = APIRouter()

class ApplicationCreate(BaseModel):
    smeId: str
    smeName: str
    sector: str
    city: str
    requestedAmount: float
    tenureMonths: int
    purpose: str
    loanReason: str  # NEW: detailed reason for AI analysis

class ApplicationUpdate(BaseModel):
    status: str
    rmNotes: Optional[str] = None
    assessmentId: Optional[str] = None

class ApplicationOut(BaseModel):
    id: str
    smeId: str
    smeName: str
    sector: str
    city: str
    requestedAmount: float
    tenureMonths: int
    purpose: str
    loanReason: str
    status: str
    submittedAt: datetime
    assessedAt: Optional[datetime] = None
    assessmentId: Optional[str] = None
    rmNotes: Optional[str] = None
    decidedAt: Optional[datetime] = None
    decidedBy: Optional[str] = None
    # AI Disbursement fields (new feature)
    aiDisbursementRecommendation: Optional[dict] = None
    disbursementPlan: Optional[dict] = None

@router.post("/")
async def create_application(body: ApplicationCreate, db=Depends(get_db)):
    """SME submits a loan application (no auth required for SME portal)."""
    doc = {
        "smeId": body.smeId,
        "smeName": body.smeName,
        "sector": body.sector,
        "city": body.city,
        "requestedAmount": body.requestedAmount,
        "tenureMonths": body.tenureMonths,
        "purpose": body.purpose,
        "loanReason": body.loanReason,
        "status": "PENDING",
        "submittedAt": datetime.now(timezone.utc),
    }
    res = await db["applications"].insert_one(doc)
    doc["id"] = str(res.inserted_id)
    del doc["_id"]
    return doc

@router.get("/")
async def list_applications(
    status: Optional[str] = Query(None),
    smeId: Optional[str] = Query(None),
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    """List all loan applications with optional filtering."""
    query = {}
    if status:
        query["status"] = status
    if smeId:
        query["smeId"] = smeId

    cursor = db["applications"].find(query).sort("submittedAt", -1)
    apps = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        apps.append(doc)
    return apps

@router.get("/{app_id}")
async def get_application(app_id: str, db=Depends(get_db)):
    """Get a specific application by ID."""
    try:
        obj_id = ObjectId(app_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid application ID")
    
    app = await db["applications"].find_one({"_id": obj_id})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    app["id"] = str(app["_id"])
    del app["_id"]
    return app

@router.put("/{app_id}/status")
async def update_application_status(
    app_id: str,
    body: ApplicationUpdate,
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    """RM updates application status after assessment."""
    try:
        obj_id = ObjectId(app_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid application ID")

    update_fields = {
        "status": body.status,
        "decidedAt": datetime.now(timezone.utc),
        "decidedBy": user.get("email"),
    }
    if body.rmNotes:
        update_fields["rmNotes"] = body.rmNotes
    if body.assessmentId:
        update_fields["assessmentId"] = body.assessmentId

    result = await db["applications"].update_one(
        {"_id": obj_id}, {"$set": update_fields}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")

    return await get_application(app_id, db)
```

**Register in `main.py`**:
```python
from app.routers import auth, smes, assessments, applications

app.include_router(applications.router, prefix="/api/applications", tags=["Applications"])
```

### 3.2 List Assessments Endpoint

**File**: `backend/app/routers/assessments.py`

Add a `GET /` endpoint to list all assessments:
```python
@router.get("/")
async def list_assessments(
    smeId: Optional[str] = Query(None),
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    query = {}
    if smeId:
        try:
            query["smeId"] = ObjectId(smeId)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid smeId")

    cursor = db["assessments"].find(query).sort("createdAt", -1).limit(100)
    results = []
    async for doc in cursor:
        results.append(serialize_assessment(doc))
    return results
```

### 3.3 Health Check Endpoint

Add to `main.py`:
```python
@app.get("/api/health")
async def health_check():
    from app.db.mongo import get_db
    try:
        db = get_db()
        await db.command("ping")
        return {"status": "healthy", "database": "connected", "version": "1.0.0"}
    except Exception as e:
        return {"status": "degraded", "database": "disconnected", "error": str(e)}
```

---

## 4. Input Validation Improvements

### 4.1 Pydantic Model Constraints

```python
from pydantic import BaseModel, Field, validator

class AssessmentCreate(BaseModel):
    smeId: str = Field(..., min_length=1)
    requestedLoan: float = Field(..., gt=0, le=100_000_000)  # Max 10 crore
    requestedTenure: int = Field(..., ge=3, le=60)  # 3-60 months

    @validator("smeId")
    def validate_sme_id(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid SME ID format")
        return v

class DecisionIn(BaseModel):
    decision: str = Field(..., pattern="^(APPROVE|REJECT|COUNTER_OFFER|MANUAL_REVIEW)$")
    note: str = Field(..., min_length=1, max_length=2000)
```

### 4.2 Division by Zero Protection

In `feature_engineering.py`:
```python
monthly_installment_est = requested_loan / max(requested_tenure, 1)
```

In `eligibility_engine.py`:
```python
safe_monthly_payment = avg_net * safe_ratio if avg_net > 0 else 0.0
headroom_pct = (requested_loan / max(safe_loan_amount, 0.01)) * 100
```

---

## 5. Scoring Engine Cache

### 5.1 Cache `scoring_config.json` at Module Level

```python
import json
import os
from functools import lru_cache

CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "scoring_config.json")

@lru_cache(maxsize=1)
def load_config():
    with open(CONFIG_PATH, "r") as f:
        return json.load(f)
```

This loads the config once and caches it forever (suitable for a config file that rarely changes).

---

## 6. Error Handling Middleware

### Add Global Exception Handler

```python
# backend/app/core/error_handler.py

from fastapi import Request
from fastapi.responses import JSONResponse
from bson.errors import InvalidId

async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, InvalidId):
        return JSONResponse(status_code=400, content={"detail": "Invalid MongoDB ObjectId"})
    # Log the error
    import traceback
    traceback.print_exc()
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
```

Register in `main.py`:
```python
from app.core.error_handler import global_exception_handler

app.add_exception_handler(Exception, global_exception_handler)
```

---

## 7. API Documentation

### Add OpenAPI Tags Metadata

```python
tags_metadata = [
    {"name": "Auth", "description": "User authentication and registration"},
    {"name": "SMEs", "description": "SME profile and transaction data"},
    {"name": "Assessments", "description": "Credit readiness assessments"},
    {"name": "Applications", "description": "Loan application management"},
    {"name": "Disbursement", "description": "AI-powered disbursement management"},
]

app = FastAPI(
    title="CashPulse API",
    version="1.0.0",
    description="AI-Powered SME Lending Decision Support Platform for UBL",
    openapi_tags=tags_metadata,
    lifespan=lifespan,
)
```

---

## 8. Requirements.txt Updates

```txt
# Web framework
fastapi==0.115.0
uvicorn[standard]==0.30.0

# Database
motor==3.5.0
pymongo==4.8.0

# Auth & Security
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9

# Data & Charts
pandas==2.2.0
numpy==1.26.0
scipy==1.12.0

# AI (NEW — for disbursement feature)
google-generativeai==0.8.0
# OR
# openai==1.40.0

# Utilities
python-dotenv==1.0.1
httpx==0.27.0
pydantic==2.8.0
pydantic-settings==2.4.0
email-validator==2.2.0

# Rate Limiting
slowapi==0.1.9

# Dev & Testing
pytest==8.3.0
pytest-asyncio==0.23.0
```

---

## 9. File Structure (Target)

```
backend/
├── main.py                          # FastAPI app with lifespan
├── .env                             # Environment variables
├── requirements.txt                 # Pinned dependencies
├── scoring_config.json              # Scoring thresholds config
├── app/
│   ├── __init__.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py                # Pydantic settings
│   │   ├── security.py              # JWT, password hashing
│   │   ├── error_handler.py         # [NEW] Global error handling
│   │   └── rate_limiter.py          # [NEW] Rate limiting
│   ├── db/
│   │   ├── __init__.py
│   │   └── mongo.py                 # MongoDB connection (fixed)
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── sme.py
│   │   ├── transaction.py
│   │   ├── assessment.py            # Fixed validation
│   │   ├── application.py           # [NEW] Loan application model
│   │   └── disbursement.py          # [NEW] Disbursement model
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py                  # Fixed login
│   │   ├── smes.py                  # Fixed serialization
│   │   ├── assessments.py           # Fixed + list endpoint
│   │   ├── applications.py          # [NEW] Loan applications
│   │   └── disbursement.py          # [NEW] AI disbursement
│   └── services/
│       ├── __init__.py
│       ├── feature_engineering.py    # Fixed edge cases
│       ├── scoring_engine.py         # Cached config
│       ├── eligibility_engine.py     # Fixed naming
│       ├── recommendation_engine.py  # Enhanced with tenure advice
│       ├── chart_service.py
│       ├── ai_analyzer.py           # [NEW] Gemini/OpenAI text analysis
│       ├── forecasting_engine.py    # [NEW] Cashflow forecasting
│       └── disbursement_engine.py   # [NEW] Staged disbursement logic
├── scripts/
│   ├── seed_data.py                 # Fixed UTF-8
│   └── test_scoring.py
└── tests/
    ├── __init__.py
    ├── test_auth.py                 # [NEW]
    ├── test_assessments.py          # [NEW]
    └── test_scoring_engine.py       # [NEW]
```
