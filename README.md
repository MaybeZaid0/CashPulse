# 💳 CashPulse — AI-Powered SME Lending Platform

**CashPulse** is an end-to-end AI-powered financial decision support platform for **United Bank Limited (UBL)**. It combines a high-performance **Next.js** frontend with a **FastAPI** Python backend and **MongoDB** database to evaluate SME credit readiness, forecast monthly cashflows, analyze loan purpose text, and recommend single vs. staged disbursement schedules.

---

## 🌟 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 16)                     │
│  http://localhost:3000                                      │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │  SME Portal (/)  │  │ RM Portal (/rm)  │                 │
│  └────────┬─────────┘  └────────┬─────────┘                 │
│           └──────────┬──────────┘                           │
│                      ▼                                      │
│            src/lib/api-client.ts                            │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP / REST API
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                        │
│  http://localhost:8000                                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Endpoints: /api/auth, /api/smes, /api/assessments,     │ │
│  │            /api/applications, /api/disbursement        │ │
│  └────────────────────────┬───────────────────────────────┘ │
│                           │                                  │
│  ┌────────────────────────▼───────────────────────────────┐ │
│  │ Services:                                              │ │
│  │ • feature_engineering.py (WMA trend, volatility)       │ │
│  │ • scoring_engine.py      (6-pillar 0–100 score)        │ │
│  │ • eligibility_engine.py  (Safe cashflow capacity)        │ │
│  │ • recommendation_engine.py (APPROVE / COUNTER / MANUAL)│ │
│  │ • ai_analyzer.py         (Gemini/OpenAI + Rule Fallback)│ │
│  │ • forecasting_engine.py  (WMA + LR Cashflow Forecast)  │ │
│  └────────────────────────┬───────────────────────────────┘ │
└───────────────────────────┼──────────────────────────────────┘
                            │ Motor Async Driver
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE (MongoDB)                       │
│  mongodb://localhost:27017 or MongoDB Atlas Cloud            │
│  Collections: users, smes, transactions, assessments,       │
│               applications, disbursement_plans              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Prerequisites

Before you start, make sure you have installed on your machine:
* **Node.js** (v18 or higher) & **npm**
* **Python** (v3.10 or higher)
* **MongoDB** (Local MongoDB Community Server **OR** MongoDB Atlas URI)
* **Git**

---

## 🚀 Quick Start Guide

### 1. Database Setup (MongoDB)

#### Option A: Local MongoDB
1. Start your local MongoDB server (Default URL: `mongodb://localhost:27017`).

#### Option B: MongoDB Atlas (Cloud)
1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free **M0 Cluster**.
3. Under **Network Access**, allow IP `0.0.0.0/0`.
4. Under **Database Access**, create a user & password.
5. Copy your connection string (`mongodb+srv://<user>:<password>@cluster.mongodb.net/`).

---

### 2. Backend Setup (FastAPI)

1. Open a terminal and navigate to the `backend` folder:
   ```powershell
   cd backend
   ```

2. Create and activate a Python Virtual Environment:
   * **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     venv\Scripts\activate
     ```
   * **macOS / Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. Install all dependencies:
   ```powershell
   pip install -r requirements.txt
   ```

4. Configure Environment Variables (`backend/.env`):
   Verify or update [backend/.env](file:///c:/Users/kashan/OneDrive%20-%20Ecomise/Work/UBL%20Hackathon/CashPulse/backend/.env):
   ```env
   MONGODB_URL=mongodb://localhost:27017
   DATABASE_NAME=cashpulse

   JWT_SECRET_KEY=dev-secret-key-change-me
   JWT_ALGORITHM=HS256
   JWT_EXPIRE_MINUTES=480

   # Optional: AI Loan Purpose Analysis (Falls back to rule-based engine if omitted)
   GEMINI_API_KEY=your_gemini_key_here
   OPENAI_API_KEY=your_openai_key_here
   ```

5. **Seed Sample Data (Recommended)**:
   Populate MongoDB with sample SMEs, historical transactions, and demo accounts:
   ```powershell
   python scripts/seed_data.py
   ```

6. Start the FastAPI backend server:
   ```powershell
   uvicorn app.main:app --reload
   ```
   * API Server: `http://localhost:8000`
   * Interactive OpenAPI Docs: `http://localhost:8000/docs`

---

### 3. Frontend Setup (Next.js)

1. Open a **new terminal window** at the **main project root directory** (`CashPulse`):

2. Install Node.js dependencies:
   ```powershell
   npm install
   ```

3. Configure Environment Variables (`.env.local`):
   Verify or create `.env.local` at the root directory:
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
   ```

4. Start the Next.js development server:
   ```powershell
   npm run dev
   ```
   * App URL: `http://localhost:3000`

---

## 📊 Core Platform Features

| Feature | Description |
| :--- | :--- |
| **6-Pillar Credit Scoring** | Evaluates Cashflow Volatility, Inflow Stability, Debt Service Capacity, Revenue Growth, Operating Margin, and Account Activity to output a 0–100 score. |
| **Safe Capacity Engine** | Calculates maximum safe monthly installment and safe loan headroom to protect SMEs from over-indebtedness. |
| **AI Disbursement Analysis** | Analyzes loan purpose text via Gemini / OpenAI (or fallback rules) to recommend Single vs. Staged disbursement. |
| **Cashflow Forecasting** | Predicts 3-month cashflow using an ensemble of Weighted Moving Average (WMA) and Linear Regression with statistical confidence scoring. |
| **Dual Portals** | **SME Portal** for instant self-assessment & application; **RM Portal** for Relationship Manager review and stage approvals. |

---

## ⚡ API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate RM user & return JWT token |
| `GET` | `/api/smes/` | List all SME profiles |
| `POST` | `/api/assessments/` | Create a 6-pillar credit assessment |
| `POST` | `/api/applications/` | Submit a new SME loan application |
| `POST` | `/api/disbursement/analyze` | AI analysis of loan purpose & staged disbursement recommendation |
| `POST` | `/api/disbursement/plans/{id}/stages/{num}/forecast` | Generate 3-month cashflow forecast for stage release |

---

## 🔧 Troubleshooting & Tips

* **VS Code Python Import Warnings**:
  If VS Code shows red squiggly lines on `import pandas` or `import numpy`, select your virtual environment interpreter:
  Press `Ctrl + Shift + P` → **Python: Select Interpreter** → Choose `.\backend\venv\Scripts\python.exe`.
* **MongoDB Connection Timeout**:
  If `seed_data.py` times out, ensure local MongoDB service is running (`mongodb://localhost:27017`) or update `MONGODB_URL` in `backend/.env` to your Atlas URI.
* **CORS Blocked**:
  FastAPI has `CORSMiddleware` configured to allow `http://localhost:3000`.

---

## 📄 License & Credits
Developed for **UBL Hackathon 2026** by team CashPulse.
