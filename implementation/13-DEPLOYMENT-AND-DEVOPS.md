# CashPulse — Deployment & DevOps Plan

---

## 1. Current Deployment State

| Component | Current | Target |
|-----------|---------|--------|
| Frontend | `npm run dev` (localhost:3000) | Vercel |
| Backend | `uvicorn main:app` (localhost:8000) | Render / Railway / Fly.io |
| Database | Local MongoDB (localhost:27017) | MongoDB Atlas (M0 free tier) |
| CI/CD | None | GitHub Actions |
| Environment Config | Single `.env` | Per-environment configs |
| Monitoring | None | Vercel Analytics + UptimeRobot |

---

## 2. Deployment Architecture

```
                   ┌─────────────────┐
                   │    GitHub Repo   │
                   │  (main branch)   │
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │ GitHub Actions   │
                   │ CI/CD Pipeline   │
                   └──┬──────────┬───┘
                      │          │
              ┌───────▼──┐  ┌───▼──────────┐
              │  Vercel   │  │ Render/Fly   │
              │ Frontend  │  │  Backend     │
              │ Next.js   │  │  FastAPI     │
              │ (auto)    │  │  (Docker)    │
              └───────┬───┘  └───┬──────────┘
                      │          │
                      │     ┌────▼─────────┐
                      │     │ MongoDB Atlas │
                      │     │ (M0 Free)    │
                      │     └──────────────┘
                      │
              ┌───────▼───────┐
              │   CDN (Edge)   │
              │ Vercel Edge    │
              │ Network        │
              └───────────────┘
```

---

## 3. Vercel Frontend Deployment

### 3.1 Setup Steps

1. **Connect GitHub repo** to Vercel
2. **Set root directory** to `frontend/`
3. **Framework preset**: Next.js (auto-detected)
4. **Build command**: `npm run build`
5. **Output directory**: `.next`

### 3.2 Environment Variables (Vercel Dashboard)

```
NEXT_PUBLIC_API_BASE_URL=https://cashpulse-api.onrender.com
```

### 3.3 `vercel.json` (in `frontend/`)

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://cashpulse-api.onrender.com/api/:path*"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    }
  ]
}
```

---

## 4. Render Backend Deployment

### 4.1 Dockerfile

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

# Run with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

### 4.2 Render Configuration

**`render.yaml`** (in backend/):
```yaml
services:
  - type: web
    name: cashpulse-api
    env: docker
    plan: free
    dockerfilePath: ./Dockerfile
    envVars:
      - key: MONGODB_URL
        sync: false  # Set manually in Render dashboard
      - key: DATABASE_NAME
        value: cashpulse
      - key: JWT_SECRET_KEY
        generateValue: true
      - key: APP_ENV
        value: production
      - key: CORS_ORIGINS
        value: '["https://cashpulse.vercel.app"]'
      - key: GEMINI_API_KEY
        sync: false
    healthCheckPath: /api/health
```

### 4.3 Alternative: Railway Deployment

```toml
# backend/railway.toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "./Dockerfile"

[deploy]
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

---

## 5. GitHub Actions CI/CD

### 5.1 Backend CI Pipeline

```yaml
# .github/workflows/backend-ci.yml
name: Backend CI

on:
  push:
    branches: [main]
    paths: ['backend/**']
  pull_request:
    branches: [main]
    paths: ['backend/**']

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:7
        ports:
          - 27017:27017

    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        working-directory: backend
        run: pip install -r requirements.txt
      
      - name: Seed test data
        working-directory: backend
        env:
          MONGODB_URL: mongodb://localhost:27017
          DATABASE_NAME: cashpulse_test
        run: python scripts/seed_data.py --reset
      
      - name: Run tests
        working-directory: backend
        env:
          MONGODB_URL: mongodb://localhost:27017
          DATABASE_NAME: cashpulse_test
          JWT_SECRET_KEY: test-secret-key-ci-only
        run: pytest tests/ -v --tb=short

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Render
        env:
          RENDER_API_KEY: ${{ secrets.RENDER_API_KEY }}
          RENDER_SERVICE_ID: ${{ secrets.RENDER_SERVICE_ID }}
        run: |
          curl -X POST "https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys" \
            -H "Authorization: Bearer $RENDER_API_KEY"
```

### 5.2 Frontend CI Pipeline

```yaml
# .github/workflows/frontend-ci.yml
name: Frontend CI

on:
  push:
    branches: [main]
    paths: ['frontend/**']
  pull_request:
    branches: [main]
    paths: ['frontend/**']

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        working-directory: frontend
        run: npm ci
      
      - name: Build
        working-directory: frontend
        env:
          NEXT_PUBLIC_API_BASE_URL: http://localhost:8000
        run: npm run build
      
      - name: Lint
        working-directory: frontend
        run: npm run lint
```

---

## 6. Environment Configuration

### 6.1 Environment Matrix

| Variable | Development | Staging | Production |
|----------|------------|---------|------------|
| `MONGODB_URL` | `localhost:27017` | Atlas (staging cluster) | Atlas (prod cluster) |
| `DATABASE_NAME` | `cashpulse` | `cashpulse_staging` | `cashpulse` |
| `JWT_SECRET_KEY` | `dev-secret-xxx` | Generated | Generated |
| `APP_ENV` | `development` | `staging` | `production` |
| `CORS_ORIGINS` | `["localhost:3000"]` | `["staging.cashpulse.app"]` | `["cashpulse.vercel.app"]` |
| `GEMINI_API_KEY` | Optional | Required | Required |

### 6.2 File Structure

```
backend/
├── .env                    # Development (gitignored)
├── .env.example            # Template (committed)
├── .env.staging            # Staging (gitignored)
└── .env.production         # Production (gitignored)

frontend/
├── .env.local              # Development (gitignored)
├── .env.example            # Template (committed)
└── .env.production         # Production (gitignored)
```

### 6.3 `.env.example` (committed to git)

```env
# MongoDB
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=cashpulse

# JWT
JWT_SECRET_KEY=CHANGE_ME_TO_RANDOM_64_BYTES
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=480

# App
APP_ENV=development
CORS_ORIGINS=["http://localhost:3000"]

# AI (Optional)
# GEMINI_API_KEY=
# OPENAI_API_KEY=
```

---

## 7. Monitoring & Observability

### 7.1 Uptime Monitoring
- **UptimeRobot** (free): Monitor `/api/health` endpoint every 5 minutes
- Alert via email/Telegram on downtime

### 7.2 Vercel Analytics
- Enable Vercel Web Analytics for frontend performance
- Track Core Web Vitals (LCP, FID, CLS)

### 7.3 Application Logging
```python
# backend/main.py — add structured logging
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("cashpulse")
```

---

## 8. Pre-Deployment Checklist

### Backend
- [ ] Pin all dependency versions in `requirements.txt`
- [ ] Generate strong JWT secret for production
- [ ] Set up MongoDB Atlas cluster and connection string
- [ ] Run `seed_data.py` on Atlas to populate demo data
- [ ] Verify all tests pass
- [ ] Disable Swagger UI (`docs_url=None`)
- [ ] Enable CORS for production frontend URL only

### Frontend
- [ ] Set `NEXT_PUBLIC_API_BASE_URL` for production
- [ ] Update `layout.tsx` metadata (title, description)
- [ ] Verify `next build` completes without errors
- [ ] Test responsive design at 360px width
- [ ] Remove any `console.log` statements

### Infrastructure
- [ ] MongoDB Atlas: Configure IP whitelist
- [ ] Render/Railway: Set all environment variables
- [ ] Vercel: Set environment variables
- [ ] DNS: Configure custom domain (if applicable)
- [ ] HTTPS: Verify SSL certificates (auto with Vercel/Render)
