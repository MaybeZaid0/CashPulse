# CashPulse — Rigorous Security Audit & Hardening Plan

---

## 1. Security Audit Results

### 1.1 Authentication & Authorization

| # | Finding | Severity | Location | Details |
|---|---------|----------|----------|---------|
| S-01 | JWT secret is predictable | **CRITICAL** | `backend/.env` L6 | `JWT_SECRET_KEY=dev-secret-key-change-me` — trivially guessable. Attacker can forge tokens. |
| S-02 | JWT stored in response body | **HIGH** | `backend/app/routers/auth.py` | Token returned as JSON `{access_token: "..."}`. XSS can steal it. PRD says httpOnly cookie. |
| S-03 | No rate limiting on auth | **HIGH** | `backend/app/routers/auth.py` | No brute-force protection. Unlimited login attempts. |
| S-04 | RM login client-side only | **CRITICAL** | `frontend/src/components/rm/RMPortal.tsx` | Hardcoded credentials `rm@ubl.com / cashpulse2026` checked in JavaScript. No backend verification. |
| S-05 | No RBAC enforcement | **HIGH** | Backend routers | Any authenticated user can access any endpoint. No role checks (admin vs RM vs SME). |
| S-06 | No password complexity rules | **MEDIUM** | `backend/app/routers/auth.py` | Signup accepts any password, even empty strings. |
| S-07 | No account lockout | **MEDIUM** | Auth system | No lockout after failed login attempts. |
| S-08 | `get_current_user` returns minimal data | **MEDIUM** | `backend/app/core/security.py` | Returns only `{"email": email}`. No role, no user ID. Cannot do RBAC without another DB query. |
| S-09 | No CSRF protection | **MEDIUM** | Backend | FastAPI doesn't natively handle CSRF. Not an issue for API-only backends with Bearer tokens, but relevant if cookies are used. |
| S-10 | No token revocation mechanism | **LOW** | Auth system | Cannot invalidate a JWT before expiry. No blocklist. |

### 1.2 Data Security

| # | Finding | Severity | Location | Details |
|---|---------|----------|----------|---------|
| S-11 | MongoDB no authentication | **HIGH** | `backend/.env` L2 | `MONGODB_URL=mongodb://localhost:27017` — no username/password. Anyone on network can access. |
| S-12 | No data encryption at rest | **MEDIUM** | MongoDB local | Local MongoDB doesn't encrypt data files. Atlas provides this automatically. |
| S-13 | Sensitive fields not masked | **LOW** | API responses | Account numbers, IBANs returned in full. Should be partially masked for display. |
| S-14 | No audit logging | **HIGH** | Entire backend | No logging of who accessed what, when. Critical for banking/financial applications. |
| S-15 | No input sanitization | **MEDIUM** | All endpoints | User inputs not sanitized against NoSQL injection. `smeId` passed directly to MongoDB queries. |

### 1.3 API Security

| # | Finding | Severity | Location | Details |
|---|---------|----------|----------|---------|
| S-16 | CORS allows all methods/headers | **MEDIUM** | `backend/main.py` L12-13 | `allow_methods=["*"], allow_headers=["*"]` is overly permissive. |
| S-17 | No request size limits | **MEDIUM** | Backend | No max body size. Large payloads could cause OOM. |
| S-18 | No HTTPS enforcement | **HIGH** | Deployment | No TLS certificate. All traffic in plaintext. |
| S-19 | No API versioning | **LOW** | Backend | No `/v1/` prefix. Breaking changes will affect all clients. |
| S-20 | Swagger UI exposed | **LOW** | `backend/main.py` | `/docs` and `/redoc` accessible in production. Should be disabled or auth-gated. |

### 1.4 Frontend Security

| # | Finding | Severity | Location | Details |
|---|---------|----------|----------|---------|
| S-21 | Credentials visible in source | **CRITICAL** | `RMPortal.tsx` L12-17 | Demo credentials hardcoded in React component. Visible in browser source/bundle. |
| S-22 | No CSP headers | **MEDIUM** | Frontend | No Content-Security-Policy. Vulnerable to XSS. |
| S-23 | localStorage for sensitive data | **HIGH** | `lib/store.ts` | Application data with financial info stored in localStorage. Any XSS can read it. |

---

## 2. Remediation Plan

### 2.1 JWT Secret Key Generation (S-01)

```bash
# Generate a cryptographically secure random secret
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

Update `.env`:
```env
JWT_SECRET_KEY=<generated-64-byte-random-string>
```

For production, use environment variable injection (not .env file):
```bash
export JWT_SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(64))")
```

### 2.2 httpOnly Cookie JWT Storage (S-02)

```python
# backend/app/routers/auth.py — Updated login

from fastapi.responses import JSONResponse

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    user = await db["users"].find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["passwordHash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = create_access_token(data={
        "sub": user["email"],
        "role": user["role"],
        "user_id": str(user["_id"]),
    })
    
    response = JSONResponse(content={
        "user": {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
        }
    })
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.APP_ENV != "development",
        samesite="strict",
        max_age=settings.JWT_EXPIRE_MINUTES * 60,
        path="/",
    )
    
    return response
```

Update `get_current_user` to read from cookie:
```python
from fastapi import Cookie, Request

async def get_current_user(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        # Fallback to Authorization header for API clients
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = decode_token(token)
        return {
            "email": payload.get("sub"),
            "role": payload.get("role"),
            "user_id": payload.get("user_id"),
        }
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
```

### 2.3 Rate Limiting (S-03)

```python
# backend/app/core/rate_limiter.py

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
```

```python
# backend/main.py

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.rate_limiter import limiter

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

```python
# backend/app/routers/auth.py

from app.core.rate_limiter import limiter

@router.post("/login")
@limiter.limit("5/minute")  # Max 5 login attempts per minute per IP
async def login(request: Request, ...):
    ...

@router.post("/signup")
@limiter.limit("3/minute")  # Max 3 signups per minute per IP
async def signup(request: Request, ...):
    ...
```

### 2.4 Role-Based Access Control (S-05)

```python
# backend/app/core/security.py — Add RBAC decorator

from functools import wraps
from fastapi import HTTPException

def require_role(*allowed_roles):
    """Dependency that checks user role."""
    async def role_checker(current_user=Depends(get_current_user)):
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Insufficient permissions. Required roles: {allowed_roles}"
            )
        return current_user
    return role_checker

# Usage in routers:
@router.get("/")
async def get_smes(db=Depends(get_db), user=Depends(require_role("rm", "admin"))):
    ...

@router.post("/{id}/decision")
async def record_decision(..., user=Depends(require_role("rm", "admin"))):
    ...
```

### 2.5 Password Complexity (S-06)

```python
# backend/app/routers/auth.py

import re

class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)

    @validator("password")
    def validate_password(cls, v):
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v
```

### 2.6 Audit Logging (S-14)

```python
# backend/app/core/audit_logger.py

import logging
from datetime import datetime, timezone

audit_logger = logging.getLogger("cashpulse.audit")
audit_logger.setLevel(logging.INFO)

handler = logging.FileHandler("audit.log")
handler.setFormatter(logging.Formatter(
    "%(asctime)s | %(levelname)s | %(message)s"
))
audit_logger.addHandler(handler)

def log_action(user_email: str, action: str, resource: str, details: dict = None):
    audit_logger.info(
        f"USER={user_email} | ACTION={action} | RESOURCE={resource} | "
        f"DETAILS={details or {}}"
    )

# Usage:
# log_action("rm@ubl.com", "CREATE_ASSESSMENT", "assessments/abc123", {"smeId": "..."})
# log_action("rm@ubl.com", "APPROVE_LOAN", "assessments/abc123", {"amount": 1000000})
```

### 2.7 NoSQL Injection Prevention (S-15)

```python
# Always validate ObjectId before using in queries
from bson import ObjectId
from bson.errors import InvalidId

def validate_object_id(id_str: str) -> ObjectId:
    """Validate and convert string to ObjectId, preventing injection."""
    if not isinstance(id_str, str) or len(id_str) != 24:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    try:
        return ObjectId(id_str)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid ID format")

# Never do this:
# db.smes.find_one({"_id": user_input})  # user_input could be {"$gt": ""}

# Always do this:
# obj_id = validate_object_id(user_input)
# db.smes.find_one({"_id": obj_id})
```

### 2.8 CORS Hardening (S-16)

```python
# backend/main.py

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,  # Specific origins only
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # Specific methods
    allow_headers=["Content-Type", "Authorization"],   # Specific headers
    max_age=3600,  # Cache preflight for 1 hour
)
```

### 2.9 Disable Swagger in Production (S-20)

```python
app = FastAPI(
    title="CashPulse API",
    version="1.0.0",
    docs_url="/docs" if settings.APP_ENV == "development" else None,
    redoc_url="/redoc" if settings.APP_ENV == "development" else None,
    openapi_url="/openapi.json" if settings.APP_ENV == "development" else None,
)
```

### 2.10 Security Headers Middleware

```python
# backend/app/core/security_headers.py

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response

# Register in main.py:
app.add_middleware(SecurityHeadersMiddleware)
```

---

## 3. Environment Variable Security

### 3.1 Production `.env` Template

```env
# MongoDB Atlas
MONGODB_URL=mongodb+srv://<user>:<password>@cluster.mongodb.net/cashpulse
DATABASE_NAME=cashpulse

# JWT — MUST be unique per environment
JWT_SECRET_KEY=<GENERATED_64_BYTE_SECRET>
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60

# App
APP_ENV=production
CORS_ORIGINS=["https://cashpulse.vercel.app"]

# AI API Keys
GEMINI_API_KEY=<your-gemini-key>
# OPENAI_API_KEY=<your-openai-key>

# Rate Limiting
RATE_LIMIT_DEFAULT=100/minute
RATE_LIMIT_AUTH=5/minute
```

### 3.2 Never Commit to Git

```gitignore
# .gitignore additions
.env
.env.production
.env.local
*.pem
*.key
audit.log
```

---

## 4. Security Checklist for Demo Day

- [ ] JWT secret is random 64+ bytes
- [ ] Passwords hashed with bcrypt (cost factor 12+)
- [ ] Rate limiting enabled on auth endpoints
- [ ] CORS restricted to frontend origin only
- [ ] MongoDB has authentication enabled
- [ ] No credentials in source code
- [ ] API responses don't leak stack traces
- [ ] Input validation on all endpoints
- [ ] HTTPS enabled (or demo on localhost only)
- [ ] Swagger UI disabled in production mode
