from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from bson import ObjectId
from datetime import datetime
from app.db.mongo import get_db
from app.core.security import get_current_user
from app.models.assessment import AssessmentCreate, AssessmentOut, DecisionIn
from app.services.feature_engineering import engineer_features
from app.services.scoring_engine import score_all_pillars, compute_readiness, load_config
from app.services.eligibility_engine import compute_eligibility
from app.services.recommendation_engine import compute_recommendation
from app.services.chart_service import build_cashflow_series, build_pillar_radar_data

router = APIRouter()

def serialize_assessment(assessment: dict) -> dict:
    assessment["id"] = str(assessment["_id"])
    assessment["smeId"] = str(assessment["smeId"])
    if "rmId" in assessment and isinstance(assessment["rmId"], ObjectId):
        assessment["rmId"] = str(assessment["rmId"])
    # Remove MongoDB's internal ID
    if "_id" in assessment:
        del assessment["_id"]
    return assessment

@router.post("/", response_model=AssessmentOut)
async def create_assessment(body: AssessmentCreate, db=Depends(get_db), current_user=Depends(get_current_user)):
    try:
        sme_obj_id = ObjectId(body.smeId)
    except:
        raise HTTPException(status_code=400, detail="Invalid smeId")
        
    sme = await db["smes"].find_one({"_id": sme_obj_id})
    if not sme:
        raise HTTPException(status_code=404, detail="SME not found")
        
    # Fetch transactions
    cursor = db["transactions"].find({"smeId": sme_obj_id}).sort("date", 1)
    transactions = await cursor.to_list(length=2000)
    
    # 1. Feature Engineering
    features = engineer_features(transactions, body.requestedLoan, body.requestedTenure, sme)
    
    # 2. Scoring
    pillar_scores = score_all_pillars(features)
    readiness, band = compute_readiness(pillar_scores)
    
    config = load_config()
    
    # 3. Eligibility
    dq_score = next((p["score"] for p in pillar_scores if p["pillar"] == "data_quality"), 5)
    eligibility = compute_eligibility(features, config, readiness, dq_score)
    
    # 4. Recommendation
    recommendation = compute_recommendation(readiness, eligibility, config)
    
    cashflow_series = build_cashflow_series(transactions)
    pillar_radar = build_pillar_radar_data(pillar_scores)
    
    # User ID string
    rm_id = str(current_user.get("_id", "mock_rm_id")) if "_id" in current_user else current_user.get("email")

    doc = {
        "smeId": sme_obj_id,
        "rmId": rm_id,
        "requestedLoan": body.requestedLoan,
        "requestedTenure": body.requestedTenure,
        "features": features,
        "pillarScores": pillar_scores,
        "readiness": readiness,
        "readinessBand": band,
        "eligibility": eligibility,
        "recommendation": recommendation,
        "cashflowSeries": cashflow_series,
        "pillarRadarData": pillar_radar,
        "decision": None,
        "decisionNote": None,
        "createdAt": datetime.utcnow()
    }
    
    res = await db["assessments"].insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc["smeId"] = str(doc["smeId"])
    
    return doc

@router.get("/{assessment_id}", response_model=AssessmentOut)
async def get_assessment(assessment_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    try:
        assessment_obj_id = ObjectId(assessment_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid assessment ID")
        
    assessment = await db.assessments.find_one({"_id": assessment_obj_id})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return serialize_assessment(assessment)

@router.post("/{assessment_id}/decision", response_model=AssessmentOut)
async def record_decision(assessment_id: str, body: DecisionIn, db=Depends(get_db), user=Depends(get_current_user)):
    try:
        assessment_obj_id = ObjectId(assessment_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid assessment ID")
        
    result = await db.assessments.update_one(
        {"_id": assessment_obj_id},
        {"$set": {
            "decision":     body.decision,
            "decisionNote": body.note,
            "decidedAt":    datetime.utcnow(),
            "decidedBy":    str(user.get("_id", "mock_rm_id")),
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Assessment not found")
        
    return await get_assessment(assessment_id, db, user)

def fmt_pkr(amount: float) -> str:
    return f"PKR {amount:,.0f}" if amount is not None else "N/A"

@router.get("/{assessment_id}/report")
async def get_report(assessment_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    assessment = await db.assessments.find_one({"_id": ObjectId(assessment_id)})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
        
    sme = await db.smes.find_one({"_id": ObjectId(assessment["smeId"])})
    
    rm_id_val = assessment.get("rmId")
    rm = None
    if rm_id_val:
        if isinstance(rm_id_val, ObjectId):
            rm = await db.users.find_one({"_id": rm_id_val})
        elif ObjectId.is_valid(rm_id_val):
            rm = await db.users.find_one({"_id": ObjectId(rm_id_val)})
        else:
            rm = await db.users.find_one({"email": rm_id_val})
            
    rm_name = rm["name"] if rm else (rm_id_val if rm_id_val else "Unknown RM")
    
    return {
        "reportDate":      datetime.utcnow().isoformat(),
        "smeName":         sme["name"] if sme else "Unknown SME",
        "smeSector":       sme["sector"] if sme else "Unknown Sector",
        "smeAccount":      sme["accountNo"] if sme else "Unknown Account",
        "rmName":          rm_name,
        "requestedLoan":   fmt_pkr(assessment.get("requestedLoan", 0)),
        "requestedTenure": f"{assessment.get('requestedTenure', 0)} months",
        "readiness":       assessment.get("readiness", 0),
        "readinessBand":   assessment.get("readinessBand", "Unknown"),
        "recommendation":  assessment.get("recommendation", {}),
        "pillarSummary":   [
            {"label": p["label"], "score": p["score"], "max": p["max"], "reason": p["reason"]}
            for p in assessment.get("pillarScores", [])
        ],
        "decision":      assessment.get("decision"),
        "decisionNote":  assessment.get("decisionNote"),
    }
