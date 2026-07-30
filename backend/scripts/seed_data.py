import sys
import os
import argparse
import random
import numpy as np
from datetime import datetime, timedelta
from pymongo import MongoClient

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.security import hash_password
from app.core.config import settings

def generate_transactions_for_sme(sme_id, base_inflow, volatility_pct):
    transactions = []
    today = datetime.utcnow()
    for month_offset in range(6, 0, -1):
        month_date = today - timedelta(days=30 * month_offset)
        
        n_inflows = random.randint(3, 8)
        monthly_inflow = base_inflow * np.random.normal(1.0, volatility_pct)
        monthly_inflow = max(monthly_inflow, 1000)
        
        if n_inflows > 0:
            inflow_amounts = np.random.dirichlet(np.ones(n_inflows)) * monthly_inflow
            for amount in inflow_amounts:
                tx_date = month_date + timedelta(days=random.randint(1, 28))
                transactions.append({
                    "smeId": sme_id,
                    "date": tx_date,
                    "amount": round(float(amount), 2),
                    "type": "inflow",
                    "balance": 0.0,
                    "description": f"Client payment - {random.randint(1000, 9999)}",
                    "category": "revenue"
                })

        monthly_outflow = monthly_inflow * random.uniform(0.60, 0.85)
        n_outflows = random.randint(5, 12)
        if n_outflows > 0:
            outflow_amounts = np.random.dirichlet(np.ones(n_outflows)) * monthly_outflow
            for amount in outflow_amounts:
                tx_date = month_date + timedelta(days=random.randint(1, 28))
                transactions.append({
                    "smeId": sme_id,
                    "date": tx_date,
                    "amount": round(float(amount), 2),
                    "type": "outflow",
                    "balance": 0.0, 
                    "description": f"Vendor payment - {random.randint(1000, 9999)}",
                    "category": "expense"
                })
                
    transactions.sort(key=lambda x: x["date"])
    current_balance = base_inflow * 2 
    for tx in transactions:
        if tx["type"] == "inflow":
            current_balance += tx["amount"]
        else:
            current_balance -= tx["amount"]
        tx["balance"] = round(current_balance, 2)
        
    return transactions

def seed(reset=False):
    client = MongoClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    
    if reset:
        print("Resetting database...")
        db.users.drop()
        db.smes.drop()
        db.transactions.drop()
        db.assessments.drop()
        print("âœ“ Cleared existing data")
        
    if db.users.count_documents({}) > 0:
        print("Data already exists. Run with --reset to override.")
        return

    users = [
        {"name": "Admin User", "email": "admin@ubl.com.pk", "role": "admin", "passwordHash": hash_password("admin1234"), "createdAt": datetime.utcnow()},
        {"name": "Adnan Rahman", "email": "adnan.rahman@ubl.com.pk", "role": "rm", "passwordHash": hash_password("demo1234"), "createdAt": datetime.utcnow()},
        {"name": "Sara Qureshi", "email": "sara.qureshi@ubl.com.pk", "role": "rm", "passwordHash": hash_password("demo1234"), "createdAt": datetime.utcnow()}
    ]
    res = db.users.insert_many(users)
    print(f"âœ“ Created {len(res.inserted_ids)} users (admin + 2 RMs)")
    
    sectors = ["Textile", "Food & Beverage", "Retail", "Construction", "IT Services", "Transport"]
    sme_names = [
        "Karachi Textile Mills", "Lahore Fresh Foods", "Islamabad Tech Solutions",
        "Punjab Construction Co", "Sindh Logistics", "Peshawar Retail Group",
        "Quetta Minerals", "Multan Agro", "Faisalabad Fabrics", "Rawalpindi Auto Parts"
    ]
    
    smes = []
    for i, name in enumerate(sme_names):
        smes.append({
            "name": name,
            "sector": random.choice(sectors),
            "accountNo": f"UBL-{random.randint(1000,9999)}-PKR",
            "legalType": "SME",
            "requestedLoan": random.choice([1000000, 2500000, 5000000, 10000000]),
            "requestedTenure": random.choice([12, 24, 36]),
            "overduePaymentsCount": random.choice([0, 0, 0, 1, 2]),
            "bouncedChecksCount": random.choice([0, 0, 0, 0, 1]),
            "paymentRegularity": round(random.uniform(0.65, 0.95), 2),
            "createdAt": datetime.utcnow()
        })
        
    sme_res = db.smes.insert_many(smes)
    print(f"âœ“ Created {len(sme_res.inserted_ids)} SMEs across 6 sectors")
    
    total_tx = 0
    for sme_id in sme_res.inserted_ids:
        base_inflow = random.uniform(500000, 5000000)
        volatility = random.uniform(0.1, 0.6)
        
        txs = generate_transactions_for_sme(sme_id, base_inflow, volatility)
        db.transactions.insert_many(txs)
        total_tx += len(txs)
        
    print(f"âœ“ Generated 6 months of transactions per SME (avg ~{total_tx//10} txns/SME)")
    print(f"âœ“ Total transactions seeded: {total_tx}")
    print(f"âœ“ Database: {settings.DATABASE_NAME} on {settings.MONGODB_URL}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="Reset database before seeding")
    args = parser.parse_args()
    seed(args.reset)
