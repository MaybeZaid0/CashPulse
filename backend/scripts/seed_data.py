import sys
import os
import argparse
import random
import numpy as np
from datetime import datetime, timedelta
from pymongo import MongoClient

# Add parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.security import hash_password
from app.core.config import settings

DEMO_SMES = [
    {
        "customId": "SME-001",
        "name": "Ahmed & Sons FMCG Wholesalers",
        "sector": "Retail & Wholesale",
        "city": "Karachi",
        "accountNo": "0192-8374-6500",
        "iban": "PK36UBL0001928374650",
        "monthlyInflows": [1800000, 1950000, 1850000, 2100000, 2250000, 2300000],
        "monthlyOutflows": [1500000, 1600000, 1550000, 1700000, 1780000, 1820000],
        "currentBalance": 520000,
        "onTimePaymentRate": 94,
        "digitalTxnShare": 72,
        "avgTicketSize": 85000,
        "uniqueCounterparties": 34,
        "requestedLoan": 950000,
        "requestedTenure": 6,
    },
    {
        "customId": "SME-002",
        "name": "Lahore Textile Traders",
        "sector": "Apparel & Garments",
        "city": "Lahore",
        "accountNo": "0992-8371-1000",
        "iban": "PK36UBL0009928371100",
        "monthlyInflows": [1200000, 1150000, 1300000, 1250000, 1400000, 1350000],
        "monthlyOutflows": [1100000, 1050000, 1200000, 1180000, 1300000, 1280000],
        "currentBalance": 180000,
        "onTimePaymentRate": 76,
        "digitalTxnShare": 45,
        "avgTicketSize": 120000,
        "uniqueCounterparties": 12,
        "requestedLoan": 1200000,
        "requestedTenure": 12,
    },
    {
        "customId": "SME-003",
        "name": "Faisalabad Weaving Unit",
        "sector": "Small Manufacturer",
        "city": "Faisalabad",
        "accountNo": "0445-5667-7000",
        "iban": "PK36UBL0004455667700",
        "monthlyInflows": [2500000, 2600000, 2700000, 2800000, 2900000, 3100000],
        "monthlyOutflows": [2000000, 2100000, 2150000, 2200000, 2300000, 2400000],
        "currentBalance": 850000,
        "onTimePaymentRate": 97,
        "digitalTxnShare": 88,
        "avgTicketSize": 150000,
        "uniqueCounterparties": 28,
        "requestedLoan": 2000000,
        "requestedTenure": 6,
    },
    {
        "customId": "SME-004",
        "name": "Rawalpindi Electronics Hub",
        "sector": "Consumer Electronics",
        "city": "Rawalpindi",
        "accountNo": "0889-9001-1000",
        "iban": "PK36UBL0008899001100",
        "monthlyInflows": [1500000, 900000, 1800000, 800000, 1600000, 1100000],
        "monthlyOutflows": [1400000, 950000, 1600000, 850000, 1450000, 1050000],
        "currentBalance": 140000,
        "onTimePaymentRate": 62,
        "digitalTxnShare": 55,
        "avgTicketSize": 200000,
        "uniqueCounterparties": 8,
        "requestedLoan": 1500000,
        "requestedTenure": 12,
    },
    {
        "customId": "SME-005",
        "name": "Sialkot Sports Goods Mfg.",
        "sector": "Export Manufacturing",
        "city": "Sialkot",
        "accountNo": "0778-8992-2000",
        "iban": "PK36UBL0007788992200",
        "monthlyInflows": [1600000, 1650000, 1700000, 1750000, 1800000, 1900000],
        "monthlyOutflows": [1300000, 1350000, 1380000, 1400000, 1420000, 1450000],
        "currentBalance": 920000,
        "onTimePaymentRate": 96,
        "digitalTxnShare": 91,
        "avgTicketSize": 95000,
        "uniqueCounterparties": 42,
        "requestedLoan": 1800000,
        "requestedTenure": 6,
    },
    {
        "customId": "SME-006",
        "name": "Sukkur Hardware Supply",
        "sector": "Building Materials",
        "city": "Sukkur",
        "accountNo": "0112-2334-4000",
        "iban": "PK36UBL0001122334400",
        "monthlyInflows": [2200000, 2000000, 1900000, 1750000, 1600000, 1500000],
        "monthlyOutflows": [1900000, 1850000, 1800000, 1700000, 1600000, 1550000],
        "currentBalance": 95000,
        "onTimePaymentRate": 58,
        "digitalTxnShare": 30,
        "avgTicketSize": 250000,
        "uniqueCounterparties": 6,
        "requestedLoan": 1000000,
        "requestedTenure": 3,
    },
]

def seed(reset=False):
    client = MongoClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]

    if reset:
        print("Resetting database...")
        db.users.drop()
        db.smes.drop()
        db.transactions.drop()
        db.assessments.drop()
        print("✓ Cleared existing database collections")

    if db.users.count_documents({}) > 0 and not reset:
        print("Data already exists. Run with --reset to override.")
        return

    users = [
        {
            "name": "UBL Relationship Manager",
            "email": "rm@ubl.com",
            "role": "rm",
            "passwordHash": hash_password("cashpulse2026"),
            "createdAt": datetime.utcnow()
        },
        {
            "name": "Admin User",
            "email": "admin@ubl.com.pk",
            "role": "admin",
            "passwordHash": hash_password("admin1234"),
            "createdAt": datetime.utcnow()
        }
    ]
    res_users = db.users.insert_many(users)
    print(f"✓ Seeded {len(res_users.inserted_ids)} user accounts (including rm@ubl.com / cashpulse2026)")

    smes_to_insert = []
    for s in DEMO_SMES:
        smes_to_insert.append({
            "customId": s["customId"],
            "name": s["name"],
            "sector": s["sector"],
            "city": s["city"],
            "accountNo": s["accountNo"],
            "iban": s["iban"],
            "currentBalance": s["currentBalance"],
            "onTimePaymentRate": s["onTimePaymentRate"],
            "digitalTxnShare": s["digitalTxnShare"],
            "avgTicketSize": s["avgTicketSize"],
            "uniqueCounterparties": s["uniqueCounterparties"],
            "requestedLoan": s["requestedLoan"],
            "requestedTenure": s["requestedTenure"],
            "createdAt": datetime.utcnow()
        })

    sme_res = db.smes.insert_many(smes_to_insert)
    print(f"✓ Seeded {len(sme_res.inserted_ids)} Pakistani SME profiles into MongoDB")

    total_tx = 0
    today = datetime.utcnow()
    for sme_doc, orig_sme in zip(db.smes.find(), DEMO_SMES):
        sme_id = sme_doc["_id"]
        inflows = orig_sme["monthlyInflows"]
        outflows = orig_sme["monthlyOutflows"]
        
        txs = []
        for i in range(6):
            month_date = today - timedelta(days=30 * (6 - i))
            txs.append({
                "smeId": sme_id,
                "date": month_date + timedelta(days=5),
                "amount": float(inflows[i]),
                "type": "inflow",
                "balance": float(orig_sme["currentBalance"]),
                "description": f"Customer Payment - Month M{i+1}",
                "category": "revenue"
            })
            txs.append({
                "smeId": sme_id,
                "date": month_date + timedelta(days=15),
                "amount": float(outflows[i]),
                "type": "outflow",
                "balance": float(orig_sme["currentBalance"]),
                "description": f"Supplier Settlement - Month M{i+1}",
                "category": "expense"
            })
        db.transactions.insert_many(txs)
        total_tx += len(txs)

    print(f"✓ Seeded 6 months of verified UBL transaction ledgers ({total_tx} transactions)")
    print(f"✓ CashPulse MongoDB Seeding Complete: database '{settings.DATABASE_NAME}' at {settings.MONGODB_URL}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="Reset database before seeding")
    args = parser.parse_args()
    seed(args.reset)
