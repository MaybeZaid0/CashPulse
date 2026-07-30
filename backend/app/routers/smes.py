from fastapi import APIRouter, Depends, HTTPException
from app.db.mongo import get_db
from app.core.security import get_current_user
from typing import List

router = APIRouter()

@router.get("/")
async def get_smes(db = Depends(get_db), current_user = Depends(get_current_user)):
    cursor = db["smes"].find({})
    smes = []
    async for doc in cursor:
        obj_id = doc["_id"]
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        
        assessment = await db["assessments"].find_one(
            {"smeId": obj_id}, 
            sort=[("createdAt", -1)]
        )
        if assessment:
            doc["lastReadiness"] = assessment.get("readiness")
            doc["lastReadinessBand"] = assessment.get("readinessBand")
            doc["lastAssessmentId"] = str(assessment["_id"])
        else:
            doc["lastReadiness"] = None
            doc["lastReadinessBand"] = None
            doc["lastAssessmentId"] = None
            
        smes.append(doc)
    return smes

@router.get("/{id}")
async def get_sme(id: str, db = Depends(get_db), current_user = Depends(get_current_user)):
    from bson import ObjectId
    try:
        obj_id = ObjectId(id)
    except:
        raise HTTPException(status_code=400, detail="Invalid SME ID")
        
    sme = await db["smes"].find_one({"_id": obj_id})
    if not sme:
        raise HTTPException(status_code=404, detail="SME not found")
        
    sme["id"] = str(sme["_id"])
    del sme["_id"]
    
    pipeline = [
        {"$match": {"smeId": obj_id}},
        {"$group": {
            "_id": None,
            "totalInflow": {"$sum": {"$cond": [{"$eq": ["$type", "inflow"]}, "$amount", 0]}},
            "totalOutflow": {"$sum": {"$cond": [{"$eq": ["$type", "outflow"]}, "$amount", 0]}},
            "avgBalance": {"$avg": "$balance"},
            "txnCount": {"$sum": 1},
            "minDate": {"$min": "$date"},
            "maxDate": {"$max": "$date"}
        }}
    ]
    cursor = db["transactions"].aggregate(pipeline)
    summary_docs = await cursor.to_list(length=1)
    
    if summary_docs:
        s = summary_docs[0]
        sme["transactionSummary"] = {
            "totalInflow": s.get("totalInflow", 0),
            "totalOutflow": s.get("totalOutflow", 0),
            "avgBalance": s.get("avgBalance", 0),
            "txnCount": s.get("txnCount", 0),
            "dateRange": {
                "start": s.get("minDate"),
                "end": s.get("maxDate")
            }
        }
    else:
        sme["transactionSummary"] = {
            "totalInflow": 0, "totalOutflow": 0, "avgBalance": 0, "txnCount": 0,
            "dateRange": {"start": None, "end": None}
        }
        
    return sme
