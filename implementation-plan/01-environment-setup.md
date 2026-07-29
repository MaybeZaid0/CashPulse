# Phase 0 — Environment Setup Guide

> **Goal**: Get your machine ready to run and develop CashPulse in under 30 minutes.  
> **Run this guide once** on every developer machine.

---

## Prerequisites — What You Need to Install

### 1. Python 3.11 or higher

Check if you already have it:
```bash
python --version
# Expected: Python 3.11.x or 3.12.x
```

If not installed, download from: https://www.python.org/downloads/  
⚠️ **Windows users**: During installation, check **"Add Python to PATH"**.

---

### 2. MongoDB Community Server (Local)

Download from: https://www.mongodb.com/try/download/community  
- Version: 7.x or 8.x (either works)  
- Install as a **Windows Service** (default option) — this makes it start automatically.

Verify MongoDB is running:
```bash
# In a new terminal
mongosh
# You should see the MongoDB shell prompt. Type exit to quit.
```

Alternatively, install **MongoDB Compass** (GUI) from https://www.mongodb.com/try/download/compass — useful for inspecting data visually.

---

### 3. Git (version control)

```bash
git --version
# Expected: git version 2.x.x
```

If not installed: https://git-scm.com/downloads

---

## Project Setup (Step by Step)

### Step 1 — Clone the repository

```bash
git clone https://github.com/MaybeZaid0/CashPulse.git
cd CashPulse
```

---

### Step 2 — Create and activate Python virtual environment

A virtual environment keeps project dependencies isolated from your system Python.

```bash
# Navigate to the backend folder (to be created in Phase 1)
cd backend

# Create virtual environment
python -m venv venv

# Activate it — Windows (PowerShell)
venv\Scripts\Activate.ps1

# Activate it — Windows (Command Prompt)
venv\Scripts\activate.bat

# Activate it — Mac/Linux
source venv/bin/activate
```

You'll know it's active when you see `(venv)` at the start of your terminal prompt.

> ⚠️ **Always activate the venv before running any Python commands or installing packages.**

---

### Step 3 — Install all Python dependencies

With the venv active:
```bash
pip install -r requirements.txt
```

The `requirements.txt` will include:

```
# Web framework
fastapi==0.115.5
uvicorn[standard]==0.32.1

# Database
motor==3.6.0          # async MongoDB driver
pymongo==4.10.1       # sync MongoDB driver (for scripts)

# Auth & Security
python-jose[cryptography]==3.3.0   # JWT tokens
passlib[bcrypt]==1.7.4             # password hashing
python-multipart==0.0.12           # form data parsing

# Data & Charts
pandas==2.2.3          # data manipulation
numpy==2.1.3           # numerical operations
matplotlib==3.9.3      # chart image generation (server-side PNG charts)
Pillow==11.0.0         # image processing

# Utilities
python-dotenv==1.0.1   # .env file loading
httpx==0.28.0          # async HTTP client (for testing)
pydantic==2.10.3       # data validation (bundled with FastAPI but pinned)
pydantic-settings==2.6.1  # settings management from .env
email-validator==2.2.0    # email field validation

# Dev & Testing
pytest==8.3.4
pytest-asyncio==0.24.0
httpx==0.28.0          # test client for async FastAPI
```

---

### Step 4 — Configure environment variables

Copy the example env file and fill it in:
```bash
# From the backend/ directory
copy .env.example .env
```

Edit `.env`:
```env
# MongoDB
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=cashpulse

# JWT
JWT_SECRET_KEY=change-this-to-a-long-random-string-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=480

# App
APP_ENV=development
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:5500
```

> 🔑 **JWT_SECRET_KEY**: For dev, any string is fine. Generate a secure one with:
> ```bash
> python -c "import secrets; print(secrets.token_hex(32))"
> ```

---

### Step 5 — Seed synthetic data into MongoDB

The seeder script generates realistic synthetic UBL SME and transaction data:
```bash
# From the backend/ directory, with venv active
python scripts/seed_data.py
```

Expected output:
```
✓ Cleared existing data
✓ Created 3 users (admin + 2 RMs)
✓ Created 10 SMEs across 6 sectors
✓ Generated 6 months of transactions per SME (avg ~90 txns/SME)
✓ Total transactions seeded: 927
✓ Database: cashpulse on mongodb://localhost:27017
```

---

### Step 6 — Start the FastAPI server

```bash
# From the backend/ directory, with venv active
uvicorn main:app --reload --port 8000
```

Expected output:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [12345]
INFO:     Application startup complete.
```

Visit http://127.0.0.1:8000/docs — you should see the **FastAPI auto-generated Swagger UI** with all endpoints.

---

### Step 7 — Open the Frontend

Open `frontend/index.html` directly in a browser (or use VS Code's Live Server extension).

> For development, VS Code's **Live Server** extension is recommended so the browser auto-refreshes on file changes.

---

## Demo Credentials (seeded by default)

| Role                | Email                     | Password   |
|---------------------|---------------------------|------------|
| Relationship Manager | adnan.rahman@ubl.com.pk   | demo1234   |
| Relationship Manager | sara.qureshi@ubl.com.pk   | demo1234   |
| Admin               | admin@ubl.com.pk          | admin1234  |

---

## Useful Commands Reference

```bash
# Start MongoDB manually (if not running as service)
mongod --dbpath C:\data\db

# Start FastAPI dev server
uvicorn main:app --reload --port 8000

# Re-seed database (drops + re-creates all data)
python scripts/seed_data.py --reset

# Run tests
pytest tests/ -v

# Deactivate virtual environment when done
deactivate
```

---

## VS Code Recommended Extensions

Install these for the best development experience:
- **Python** (ms-python.python) — Python language support
- **Pylance** (ms-python.vscode-pylance) — Type checking
- **MongoDB for VS Code** (mongodb.mongodb-vscode) — Visual DB browser
- **REST Client** (humao.rest-client) — Test API endpoints from `.http` files
- **Live Server** (ritwickdey.LiveServer) — Auto-refresh for frontend HTML

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `mongosh` not found | Add MongoDB bin folder to PATH, or use Compass GUI |
| `venv\Scripts\Activate.ps1` fails with security error | Run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` in PowerShell |
| Port 8000 already in use | Change to `uvicorn main:app --reload --port 8001` |
| `pip install` fails for a package | Try `pip install --upgrade pip` first, then retry |
| JWT errors | Make sure `.env` has `JWT_SECRET_KEY` set and venv is active |
