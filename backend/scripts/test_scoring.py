import sys
import os
import json
from pymongo import MongoClient

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.services.feature_engineering import engineer_features
from app.services.scoring_engine import score_all_pillars, compute_readiness, load_config
from app.services.eligibility_engine import compute_eligibility
from app.services.recommendation_engine import compute_recommendation

def test_engines():
    print("Testing scoring and eligibility engine updates...")
    
    # 1. Connect to DB
    client = MongoClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    
    # 2. Get first SME
    sme = db.smes.find_one({})
    if not sme:
        print("[ERROR] No SMEs found in DB. Please seed first.")
        sys.exit(1)
        
    sme["id"] = str(sme["_id"])
    print(f"[OK] Testing with SME: {sme['name']} ({sme['sector']})")
    print(f"  Requested Loan: PKR {sme['requestedLoan']:,} for {sme['requestedTenure']} months")
    print(f"  Risk Profile - Overdue: {sme.get('overduePaymentsCount')}, Bounces: {sme.get('bouncedChecksCount')}, Regularity: {sme.get('paymentRegularity')}")

    # 3. Get Transactions
    txs = list(db.transactions.find({"smeId": sme["_id"]}).sort("date", 1))
    print(f"[OK] Fetched {len(txs)} transactions")

    # 4. Feature Engineering
    features = engineer_features(txs, sme["requestedLoan"], sme["requestedTenure"], sme)
    print("\nengineered features:")
    for k, v in features.items():
        if "balance" in k or "inflow" in k or "outflow" in k or "net" in k or "installment" in k:
            if isinstance(v, (int, float)):
                print(f"  {k}: PKR {v:,.2f}")
                continue
        print(f"  {k}: {v}")

    # 5. Scoring
    pillar_scores = score_all_pillars(features)
    readiness, readiness_band = compute_readiness(pillar_scores)
    print(f"\nReadiness Score: {readiness}/100 ({readiness_band})")
    for pillar in pillar_scores:
        print(f"  - {pillar['label']} ({pillar['pillar']}): {pillar['score']}/{pillar['max']}")
        print(f"    Reason: {pillar['reason']}")
        print(f"    Evidence:")
        for ev in pillar['evidence']:
            print(f"      * {ev['label']}: {ev['value']}")

    # 6. Eligibility
    config = load_config()
    dq_score = next((p["score"] for p in pillar_scores if p["pillar"] == "data_quality"), 5)
    eligibility = compute_eligibility(features, config, readiness, dq_score)
    print(f"\nEligibility details:")
    for k, v in eligibility.items():
        if "amount" in k or "payment" in k or "net" in k:
            print(f"  {k}: PKR {v:,.2f}")
        else:
            print(f"  {k}: {v}")

    # 7. Recommendation
    rec = compute_recommendation(readiness, eligibility, config)
    print(f"\nRecommendation:")
    print(f"  Type: {rec['type']}")
    print(f"  Reason: {rec['reason']}")
    if rec['recommended_amount']:
        print(f"  Recommended Amount: PKR {rec['recommended_amount']:,}")
    print(f"  Evidence:")
    for ev in rec['evidence']:
        print(f"    * {ev['label']}: {ev['value']}")

    print("\n[OK] Engine verification run complete without errors!")

if __name__ == "__main__":
    test_engines()
