# Phase 1 — Foundation, Auth & Seed Data

> **Goal**: A running FastAPI server, database with seeded SME data, and working JWT authentication.  
> **Acceptance Test**: `POST /api/auth/login` returns a token. `GET /api/smes` returns 10 SMEs. `GET /api/smes/{id}` returns an SME with transaction summary.

---

## Files to Create

```
backend/
├── main.py                          ← App entrypoint, mounts routers
├── requirements.txt                 ← All pip packages
├── .env.example                     ← Template env config
├── scoring_config.json              ← Scoring weights/thresholds (used in Phase 2)
├── app/
│   ├── __init__.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py               ← Reads .env via pydantic-settings
│   │   └── security.py             ← JWT create/verify, bcrypt hash/verify
│   ├── db/
│   │   ├── __init__.py
│   │   └── mongo.py                ← Motor client, get_db() dependency
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py                 ← UserInDB, UserOut, Token schemas
│   │   ├── sme.py                  ← SME, SMESummary schemas
│   │   ├── transaction.py          ← Transaction schema
│   │   └── assessment.py           ← Assessment + all sub-schemas
│   └── routers/
│       ├── __init__.py
│       ├── auth.py                 ← POST /api/auth/login
│       └── smes.py                 ← GET /api/smes, GET /api/smes/{id}
└── scripts/
    └── seed_data.py                ← Synthetic data generator + seeder
```

---

## Implementation Details

### `main.py` — App entry point

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import auth, smes

app = FastAPI(title="CashPulse API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,  prefix="/api/auth",  tags=["Auth"])
app.include_router(smes.router,  prefix="/api/smes",  tags=["SMEs"])
# Add more routers in later phases
```

---

### `app/core/config.py` — Settings

```python
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "cashpulse"
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"

settings = Settings()
```

---

### `app/core/security.py` — JWT + Password hashing

```python
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_ctx.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)

def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
```

---

### `app/db/mongo.py` — Database connection

```python
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

client: AsyncIOMotorClient = None

def get_client() -> AsyncIOMotorClient:
    return AsyncIOMotorClient(settings.MONGODB_URL)

def get_db():
    return get_client()[settings.DATABASE_NAME]
```

---

### MongoDB Collections & Document Shapes

#### `users`
```json
{
  "_id": "ObjectId",
  "name": "Adnan Rahman",
  "email": "adnan.rahman@ubl.com.pk",
  "role": "rm",
  "passwordHash": "$2b$12$...",
  "createdAt": "ISODate"
}
```

#### `smes`
```json
{
  "_id": "ObjectId",
  "name": "Karachi Textile Mills",
  "sector": "Textile",
  "accountNo": "UBL-0042-PKR",
  "legalType": "SME",
  "requestedLoan": 2500000,
  "requestedTenure": 24,
  "createdAt": "ISODate"
}
```

#### `transactions`
```json
{
  "_id": "ObjectId",
  "smeId": "ObjectId",
  "date": "ISODate",
  "amount": 125000.00,
  "type": "inflow",
  "balance": 980000.00,
  "description": "Client payment - Invoice #PK-2024-08-12",
  "category": "revenue"
}
```

#### `assessments`
```json
{
  "_id": "ObjectId",
  "smeId": "ObjectId",
  "rmId": "ObjectId",
  "requestedLoan": 2500000,
  "requestedTenure": 24,
  "features": { ... },
  "pillarScores": [ ... ],
  "readiness": 74,
  "readinessBand": "Review",
  "eligibility": { ... },
  "recommendation": { ... },
  "decision": null,
  "decisionNote": null,
  "createdAt": "ISODate"
}
```

---

### `scripts/seed_data.py` — Synthetic data generation

**Strategy**:
- Use `pymongo` (sync) directly — seeder runs once, not part of the API.
- Generate 10 SMEs across 6 different sectors: Textile, Food & Beverage, Retail, Construction, IT Services, Transport.
- For each SME, generate 6 months of transactions (mix of inflows and outflows) using `numpy` and `random` to simulate realistic PKR cash flows.
- SME financial profiles vary to produce a spread of readiness scores (strong, review, high risk cases).

**Synthetic transaction generation rules**:
```python
import numpy as np, random
from datetime import datetime, timedelta

def generate_transactions_for_sme(sme_id, base_inflow, volatility_pct):
    """
    base_inflow: avg monthly inflow (PKR)
    volatility_pct: coefficient of variation (0.0 = stable, 0.6 = volatile)
    Returns list of transaction dicts covering last 6 months.
    """
    transactions = []
    today = datetime.utcnow()
    for month_offset in range(6, 0, -1):
        # Random inflows per month (3-8 inflow events)
        n_inflows = random.randint(3, 8)
        monthly_inflow = base_inflow * np.random.normal(1.0, volatility_pct)
        inflow_amounts = np.random.dirichlet(np.ones(n_inflows)) * monthly_inflow
        # Outflows = 60-85% of inflows
        monthly_outflow = monthly_inflow * random.uniform(0.60, 0.85)
        n_outflows = random.randint(5, 12)
        outflow_amounts = np.random.dirichlet(np.ones(n_outflows)) * monthly_outflow
        # Build transaction dicts with random dates within the month
        ...
    return transactions
```

---

### API Routes (Phase 1)

#### `POST /api/auth/login`
- **Input**: `{email, password}` (form data or JSON)
- **Logic**: Look up user by email → verify password → create JWT → set httpOnly cookie + return token
- **Response**: `{access_token, token_type, user: {id, name, role}}`

#### `GET /api/smes`
- **Auth**: Required (Bearer token)
- **Logic**: Fetch all SMEs from DB, join with latest assessment readiness per SME
- **Response**: Array of SME summaries with `{id, name, sector, lastReadiness, lastReadinessBand, requestedLoan}`

#### `GET /api/smes/{id}`
- **Auth**: Required
- **Logic**: Fetch SME detail + compute transaction summary (total inflow/outflow, avg balance)
- **Response**: Full SME object + `transactionSummary: {totalInflow, totalOutflow, avgBalance, txnCount, dateRange}`

---

## Acceptance Criteria

- [ ] `uvicorn main:app --reload` starts without errors
- [ ] `GET http://localhost:8000/docs` shows Swagger UI with all routes
- [ ] `POST /api/auth/login` with valid credentials returns `access_token`
- [ ] `POST /api/auth/login` with invalid credentials returns `401`
- [ ] `GET /api/smes` without token returns `401`
- [ ] `GET /api/smes` with valid token returns array of ≥10 SMEs
- [ ] `GET /api/smes/{id}` returns full SME + transaction summary
- [ ] MongoDB Compass shows `users`, `smes`, `transactions` collections populated
