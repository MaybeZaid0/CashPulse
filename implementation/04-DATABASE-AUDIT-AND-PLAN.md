# CashPulse — Database Audit & MongoDB Atlas Migration Plan

---

## 1. Current Database State

### 1.1 Connection Configuration
- **URI**: `mongodb://localhost:27017` (local MongoDB)
- **Database**: `cashpulse`
- **Driver**: Motor (async) for FastAPI, PyMongo for seed scripts
- **Connection Pooling**: ❌ **BROKEN** — new client created per request (Bug A1-006)

### 1.2 Collections (4 active)

| Collection | Documents (Seeded) | Indexes | Schema Validation | TTL |
|------------|-------------------|---------|-------------------|-----|
| `users` | 3 (admin + 2 RMs) | `_id` only | None | None |
| `smes` | 10 | `_id` only | None | None |
| `transactions` | ~600-800 | `_id` only | None | None |
| `assessments` | 0 (created via API) | `_id` only | None | None |

### 1.3 Critical Issues Found

| # | Issue | Severity | Details |
|---|-------|----------|---------|
| 1 | No indexes on query fields | P1 | `transactions.smeId`, `assessments.smeId`, `users.email` — all scanned linearly |
| 2 | No schema validation | P2 | Any shape of document can be inserted; no type safety |
| 3 | No TTL indexes | P3 | Old assessments never cleaned up |
| 4 | `smeId` stored inconsistently | P1 | Sometimes `ObjectId`, sometimes `string` in assessments |
| 5 | No compound indexes | P2 | `transactions` queried by `{smeId, date}` but no compound index |
| 6 | `balance` field unreliable | P2 | Computed during seeding, never recalculated |
| 7 | No `applications` collection | P0 | Required for new loan application workflow |
| 8 | No `disbursements` collection | P1 | Required for staged disbursement feature |
| 9 | User passwords in same collection as profile | P2 | Should separate auth credentials |
| 10 | No createdAt/updatedAt on most documents | P2 | No audit trail for data changes |

---

## 2. Schema Design (Target)

### 2.1 `users` Collection

```javascript
{
  _id: ObjectId,
  name: String,                    // Required
  email: String,                   // Required, unique
  passwordHash: String,            // Required (bcrypt)
  role: String,                    // "admin" | "rm" | "sme"
  status: String,                  // "active" | "suspended" | "pending"
  department: String,              // "Karachi Commercial" etc.
  lastLoginAt: Date,
  createdAt: Date,
  updatedAt: Date,
}

// Indexes:
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "role": 1 })
```

### 2.2 `smes` Collection

```javascript
{
  _id: ObjectId,
  name: String,                    // Required
  sector: String,                  // Required
  accountNo: String,               // Required, unique
  legalType: String,               // "SME" | "Sole Proprietor" | "Partnership"
  city: String,
  province: String,
  iban: String,
  contactPhone: String,            // For RM contact feature
  contactEmail: String,
  registrationNo: String,          // NTN/STRN
  annualRevenue: Number,
  employeeCount: Number,
  yearEstablished: Number,
  // Risk indicators
  overduePaymentsCount: Number,
  bouncedChecksCount: Number,
  paymentRegularity: Number,       // 0.0 - 1.0
  // Metadata
  assignedRmId: ObjectId,          // Reference to users collection
  createdAt: Date,
  updatedAt: Date,
}

// Indexes:
db.smes.createIndex({ "accountNo": 1 }, { unique: true })
db.smes.createIndex({ "sector": 1 })
db.smes.createIndex({ "assignedRmId": 1 })
db.smes.createIndex({ "name": "text", "sector": "text" })  // Text search
```

### 2.3 `transactions` Collection

```javascript
{
  _id: ObjectId,
  smeId: ObjectId,                 // Required, reference to smes
  date: Date,                      // Required
  amount: Number,                  // Required, positive
  type: String,                    // "inflow" | "outflow"
  balance: Number,                 // Running balance after this transaction
  description: String,
  category: String,                // "revenue" | "expense" | "loan" | "tax" etc.
  reference: String,               // Transaction reference number
  channel: String,                 // "digital" | "cash" | "cheque"
  counterparty: String,            // Name of other party
  createdAt: Date,
}

// Indexes (Critical for performance):
db.transactions.createIndex({ "smeId": 1, "date": 1 })          // Primary query pattern
db.transactions.createIndex({ "smeId": 1, "type": 1 })          // Inflow/outflow filtering
db.transactions.createIndex({ "smeId": 1, "date": 1, "type": 1 }) // Compound for aggregation
db.transactions.createIndex({ "date": 1 })                       // Date range queries
```

### 2.4 `assessments` Collection

```javascript
{
  _id: ObjectId,
  smeId: ObjectId,                 // Required, reference to smes
  rmId: ObjectId,                  // Required, reference to users (NOT email string)
  applicationId: ObjectId,         // Reference to applications collection
  requestedLoan: Number,
  requestedTenure: Number,
  // Computed data
  features: Object,                // Feature engineering output
  pillarScores: Array,             // 6 pillar score objects
  readiness: Number,               // 0-100
  readinessBand: String,           // "Strong" | "Review" | "High Risk"
  eligibility: Object,             // Eligibility computation
  recommendation: Object,          // AI recommendation
  cashflowSeries: Array,           // Chart data
  pillarRadarData: Object,         // Radar chart data
  // AI Disbursement (NEW)
  aiDisbursementAnalysis: Object,  // Gemini/OpenAI analysis result
  // Decision
  decision: String,                // null | "APPROVE" | "REJECT" | "COUNTER_OFFER" | "MANUAL_REVIEW"
  decisionNote: String,
  decidedAt: Date,
  decidedBy: ObjectId,
  // Metadata
  createdAt: Date,
  version: Number,                 // Schema version for migration
}

// Indexes:
db.assessments.createIndex({ "smeId": 1, "createdAt": -1 })     // Latest assessment per SME
db.assessments.createIndex({ "rmId": 1 })                        // RM's assessments
db.assessments.createIndex({ "applicationId": 1 })               // Link to application
db.assessments.createIndex({ "decision": 1 })                    // Filter by decision
db.assessments.createIndex({ "createdAt": -1 })                  // Sort by date
```

### 2.5 `applications` Collection (NEW)

```javascript
{
  _id: ObjectId,
  smeId: String,                   // SME identifier
  smeName: String,
  sector: String,
  city: String,
  requestedAmount: Number,
  tenureMonths: Number,
  purpose: String,                 // Short purpose category
  loanReason: String,              // Detailed text for AI analysis (NEW)
  reasonAnalysis: Object,          // AI analysis of the reason text (NEW)
  status: String,                  // "PENDING" | "ASSESSED" | "APPROVED" | "COUNTER_OFFER" |
                                   // "MANUAL_REVIEW" | "REJECTED" | "DISBURSING" | "COMPLETED"
  assessmentId: ObjectId,          // Reference to assessments
  disbursementPlanId: ObjectId,    // Reference to disbursement_plans (NEW)
  // RM fields
  rmNotes: String,
  decidedAt: Date,
  decidedBy: String,
  // Metadata
  submittedAt: Date,
  updatedAt: Date,
}

// Indexes:
db.applications.createIndex({ "status": 1, "submittedAt": -1 })
db.applications.createIndex({ "smeId": 1 })
db.applications.createIndex({ "submittedAt": -1 })
```

### 2.6 `disbursement_plans` Collection (NEW — for staged disbursement feature)

```javascript
{
  _id: ObjectId,
  applicationId: ObjectId,         // Reference to applications
  assessmentId: ObjectId,          // Reference to assessments
  smeId: String,
  totalAmount: Number,             // Total loan amount
  strategy: String,                // "SINGLE" | "STAGED"
  aiRecommendation: String,        // AI recommendation text
  aiConfidence: Number,            // 0.0 - 1.0
  stages: [
    {
      stageNumber: Number,         // 1, 2, 3...
      amount: Number,              // Amount for this stage
      percentOfTotal: Number,      // e.g., 30
      scheduledDate: Date,
      status: String,              // "PENDING" | "DISBURSED" | "ON_HOLD" | "CANCELLED"
      disbursedAt: Date,
      // Forecasting data
      forecastPeriodMonths: Number, // How many months to forecast
      forecastData: Object,        // Forecasted cashflow data
      confidenceScore: Number,     // 0.0 - 1.0
      confidenceThreshold: Number, // Minimum required (e.g., 0.70)
      confidenceMet: Boolean,      // Whether threshold was met
      // RM override
      rmOverride: Boolean,         // RM manually approved despite low confidence
      rmOverrideReason: String,
      rmOverrideBy: String,
      rmOverrideAt: Date,
    }
  ],
  // Contact log (for RM-SME communication)
  contactLog: [
    {
      date: Date,
      type: String,                // "call" | "email" | "meeting"
      notes: String,
      by: String,                  // RM email/name
    }
  ],
  createdAt: Date,
  updatedAt: Date,
  completedAt: Date,
}

// Indexes:
db.disbursement_plans.createIndex({ "applicationId": 1 })
db.disbursement_plans.createIndex({ "smeId": 1 })
db.disbursement_plans.createIndex({ "stages.status": 1 })
db.disbursement_plans.createIndex({ "stages.scheduledDate": 1 })
```

### 2.7 `forecasts` Collection (NEW — for cashflow predictions)

```javascript
{
  _id: ObjectId,
  smeId: ObjectId,
  disbursementPlanId: ObjectId,
  stageNumber: Number,
  forecastDate: Date,              // When the forecast was generated
  periodMonths: Number,            // Forecast horizon
  monthlyPredictions: [
    {
      month: String,               // "2026-08", "2026-09"...
      predictedInflow: Number,
      predictedOutflow: Number,
      predictedNet: Number,
      confidenceInterval: {
        lower: Number,
        upper: Number,
      },
    }
  ],
  overallConfidence: Number,       // 0.0 - 1.0
  methodology: String,            // "WMA" | "ARIMA" | "LINEAR_REGRESSION"
  createdAt: Date,
}

// Indexes:
db.forecasts.createIndex({ "smeId": 1, "createdAt": -1 })
db.forecasts.createIndex({ "disbursementPlanId": 1, "stageNumber": 1 })
```

---

## 3. MongoDB Atlas Migration Plan

### 3.1 Why Atlas?

| Feature | Local MongoDB | MongoDB Atlas |
|---------|-------------|---------------|
| High Availability | ❌ Single node | ✅ 3-node replica set |
| Automatic Backups | ❌ Manual | ✅ Continuous + point-in-time |
| Monitoring | ❌ None | ✅ Performance Advisor, Profiler |
| Security | ❌ No auth by default | ✅ TLS, IP whitelist, SCRAM |
| Scaling | ❌ Manual | ✅ Auto-scaling |
| Free Tier | N/A | ✅ M0 (512MB, shared) |

### 3.2 Atlas Setup Steps

#### Step 1: Create Atlas Account & Cluster
1. Go to https://cloud.mongodb.com
2. Create free M0 cluster (shared, 512MB)
3. Select region closest to deployment (e.g., `AWS ap-south-1` for Pakistan proximity)
4. Cluster name: `cashpulse-prod`

#### Step 2: Configure Network Access
```
# Allow connections from:
# Development: Your IP address
# Production: Your server IP or 0.0.0.0/0 (temporary, restrict later)
```

#### Step 3: Create Database User
```
Username: cashpulse_app
Password: <generate-strong-password-32-chars>
Role: readWrite on cashpulse database
```

#### Step 4: Get Connection String
```
mongodb+srv://cashpulse_app:<password>@cashpulse-prod.xxxxx.mongodb.net/cashpulse?retryWrites=true&w=majority
```

#### Step 5: Update Environment Variables

**`.env` (development)**:
```env
# MongoDB — LOCAL
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=cashpulse
```

**`.env.production`**:
```env
# MongoDB — ATLAS
MONGODB_URL=mongodb+srv://cashpulse_app:<password>@cashpulse-prod.xxxxx.mongodb.net/cashpulse?retryWrites=true&w=majority
DATABASE_NAME=cashpulse
```

#### Step 6: Update Motor Client Configuration

```python
# backend/app/db/mongo.py

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
            connectTimeoutMS=10000,
            # Atlas-specific settings
            retryWrites=True,
            w="majority",
            tls=True if "mongodb+srv" in settings.MONGODB_URL else False,
        )
    return _client

def get_db():
    return get_client()[settings.DATABASE_NAME]
```

### 3.3 Data Migration Script

```python
# backend/scripts/migrate_to_atlas.py

import os
from pymongo import MongoClient

LOCAL_URI = "mongodb://localhost:27017"
ATLAS_URI = os.getenv("ATLAS_MONGODB_URL")
DB_NAME = "cashpulse"

def migrate():
    local = MongoClient(LOCAL_URI)[DB_NAME]
    atlas = MongoClient(ATLAS_URI)[DB_NAME]
    
    collections = ["users", "smes", "transactions", "assessments"]
    
    for col_name in collections:
        docs = list(local[col_name].find({}))
        if docs:
            atlas[col_name].insert_many(docs)
            print(f"✓ Migrated {len(docs)} documents from {col_name}")
        else:
            print(f"⚠ No documents in {col_name}")
    
    # Create indexes
    create_indexes(atlas)
    print("✓ All indexes created")

def create_indexes(db):
    # Users
    db.users.create_index("email", unique=True)
    db.users.create_index("role")
    
    # SMEs
    db.smes.create_index("accountNo", unique=True)
    db.smes.create_index("sector")
    db.smes.create_index([("name", "text"), ("sector", "text")])
    
    # Transactions
    db.transactions.create_index([("smeId", 1), ("date", 1)])
    db.transactions.create_index([("smeId", 1), ("type", 1)])
    db.transactions.create_index("date")
    
    # Assessments
    db.assessments.create_index([("smeId", 1), ("createdAt", -1)])
    db.assessments.create_index("rmId")
    db.assessments.create_index("decision")
    db.assessments.create_index([("createdAt", -1)])
    
    # Applications (new)
    db.applications.create_index([("status", 1), ("submittedAt", -1)])
    db.applications.create_index("smeId")
    
    # Disbursement Plans (new)
    db.disbursement_plans.create_index("applicationId")
    db.disbursement_plans.create_index("smeId")

if __name__ == "__main__":
    migrate()
```

---

## 4. Backup Strategy

### 4.1 Atlas Automated Backups
- **Continuous backups**: Enabled by default on M10+ clusters
- **Point-in-time recovery**: Restore to any second in the last 24 hours
- **Snapshots**: Daily snapshots retained for 7 days

### 4.2 Manual Export (Free Tier)
```bash
# Export from Atlas
mongodump --uri="mongodb+srv://..." --out=backup_$(date +%Y%m%d)

# Restore to Atlas
mongorestore --uri="mongodb+srv://..." backup_20260730/
```

---

## 5. Performance Optimization

### 5.1 N+1 Query Fix for SME Listing

**Current** (A2-007): Each SME triggers a separate assessment query.

**Fix**: Use `$lookup` aggregation:
```python
@router.get("/")
async def get_smes(db=Depends(get_db), current_user=Depends(get_current_user)):
    pipeline = [
        {
            "$lookup": {
                "from": "assessments",
                "let": {"smeId": "$_id"},
                "pipeline": [
                    {"$match": {"$expr": {"$eq": ["$smeId", "$$smeId"]}}},
                    {"$sort": {"createdAt": -1}},
                    {"$limit": 1},
                    {"$project": {
                        "readiness": 1,
                        "readinessBand": 1,
                        "_id": 1,
                    }}
                ],
                "as": "latestAssessment"
            }
        },
        {
            "$addFields": {
                "id": {"$toString": "$_id"},
                "lastReadiness": {"$arrayElemAt": ["$latestAssessment.readiness", 0]},
                "lastReadinessBand": {"$arrayElemAt": ["$latestAssessment.readinessBand", 0]},
                "lastAssessmentId": {
                    "$toString": {"$arrayElemAt": ["$latestAssessment._id", 0]}
                },
            }
        },
        {"$project": {"_id": 0, "latestAssessment": 0}},
    ]

    cursor = db["smes"].aggregate(pipeline)
    return await cursor.to_list(length=1000)
```

This reduces N+1 queries to a single aggregation pipeline.

---

## 6. Data Integrity Rules

### 6.1 MongoDB Schema Validation

```javascript
db.createCollection("applications", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["smeId", "smeName", "requestedAmount", "tenureMonths", "purpose", "status", "submittedAt"],
      properties: {
        requestedAmount: {
          bsonType: "double",
          minimum: 50000,
          maximum: 100000000,
          description: "Loan amount must be between PKR 50,000 and PKR 10 crore"
        },
        tenureMonths: {
          bsonType: "int",
          minimum: 3,
          maximum: 60,
          description: "Tenure must be between 3 and 60 months"
        },
        status: {
          bsonType: "string",
          enum: ["PENDING", "ASSESSED", "APPROVED", "COUNTER_OFFER", "MANUAL_REVIEW", "REJECTED", "DISBURSING", "COMPLETED"],
          description: "Status must be a valid application status"
        }
      }
    }
  }
});
```
