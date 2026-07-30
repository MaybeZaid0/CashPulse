from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import auth, smes, assessments

app = FastAPI(title="CashPulse API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "CashPulse API is running", "docs": "/docs"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

app.include_router(auth.router,  prefix="/api/auth",  tags=["Auth"])
app.include_router(smes.router,  prefix="/api/smes",  tags=["SMEs"])
app.include_router(assessments.router, prefix="/api/assessments", tags=["Assessments"])
