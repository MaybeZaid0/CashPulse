import pandas as pd
import numpy as np
from scipy import stats

def engineer_features(transactions: list, requested_loan: float, requested_tenure: int, sme: dict = None) -> dict:
    if not transactions:
        return {
            "avg_monthly_inflow": 0.0, "avg_monthly_outflow": 0.0, "avg_monthly_net": 0.0,
            "cashflow_volatility_pct": 999.0, "inflow_trend": 0.0, "avg_balance": 0.0,
            "min_balance": 0.0, "reserve_ratio": 0.0, "positive_months": 0, "negative_months": 0,
            "txn_activity_score": 0.0, "payment_regularity": 0.0, "requested_loan": requested_loan,
            "requested_tenure": requested_tenure, "monthly_installment_est": requested_loan / requested_tenure if requested_tenure > 0 else 0.0,
            "overdue_payments_count": 0, "bounced_checks_count": 0,
            "months_present": 0, "has_gaps": False, "txn_count": 0
        }

    df = pd.DataFrame(transactions)
    df["date"] = pd.to_datetime(df["date"])
    df["month"] = df["date"].dt.to_period("M")

    inflow_df  = df[df["type"] == "inflow"]
    outflow_df = df[df["type"] == "outflow"]

    # Monthly aggregations
    monthly_in  = inflow_df.groupby("month")["amount"].sum()
    monthly_out = outflow_df.groupby("month")["amount"].sum()
    
    # We align months based on the full transaction date range
    all_months = pd.period_range(df["month"].min(), df["month"].max(), freq="M")
    
    # Reindex series to make sure all months in the range are represented
    monthly_in = monthly_in.reindex(all_months, fill_value=0.0)
    monthly_out = monthly_out.reindex(all_months, fill_value=0.0)
    monthly_net = monthly_in.subtract(monthly_out, fill_value=0.0)

    avg_monthly_inflow  = float(monthly_in.mean()) if not monthly_in.empty else 0.0
    avg_monthly_outflow = float(monthly_out.mean()) if not monthly_out.empty else 0.0
    avg_monthly_net     = float(monthly_net.mean()) if not monthly_net.empty else 0.0

    cashflow_volatility_pct = (float(monthly_net.std()) / abs(avg_monthly_net)) * 100 if avg_monthly_net != 0 and pd.notna(monthly_net.std()) else 999.0

    # Weighted Moving Average (WMA) Trend calculation over the last 6 months (padded if less)
    max_month = df["month"].max()
    six_periods = [max_month - i for i in range(5, -1, -1)]
    
    # Extract inflows for these 6 periods
    inflows_6 = [float(monthly_in.get(m, 0.0)) for m in six_periods]
    
    # Baseline (first 3 months): M1, M2, M3
    m1, m2, m3 = inflows_6[0], inflows_6[1], inflows_6[2]
    # Recent (last 3 months): M4, M5, M6
    m4, m5, m6 = inflows_6[3], inflows_6[4], inflows_6[5]
    
    w_baseline = (m1 * 1.0 + m2 * 2.0 + m3 * 3.0) / 6.0
    w_recent = (m4 * 1.0 + m5 * 2.0 + m6 * 3.0) / 6.0
    
    inflow_trend = (w_recent - w_baseline) / w_baseline if w_baseline > 0.0 else 0.0

    avg_balance = float(df["balance"].mean()) if "balance" in df.columns else avg_monthly_inflow * 1.5
    min_balance = float(df["balance"].min()) if "balance" in df.columns else 0.0
    reserve_ratio = avg_balance / avg_monthly_outflow if avg_monthly_outflow > 0.0 else 0.0

    # Count of net-positive months (out of 6 months window)
    net_6 = [float(monthly_net.get(m, 0.0)) for m in six_periods]
    positive_months = sum(1 for val in net_6 if val > 0.0)
    negative_months = sum(1 for val in net_6 if val <= 0.0)
    
    txn_activity_score = min(len(df) / 120.0, 1.0) 

    monthly_installment_est = requested_loan / requested_tenure if requested_tenure > 0 else 0.0

    # Extract SME metrics
    sme = sme or {}
    overdue_payments_count = int(sme.get("overduePaymentsCount", 0))
    bounced_checks_count = int(sme.get("bouncedChecksCount", 0))
    payment_regularity = float(sme.get("paymentRegularity", 0.75))

    # Data Quality metrics
    unique_months_in_data = df["month"].unique()
    months_present = len(unique_months_in_data)
    
    # Chronological gaps check
    has_gaps = False
    if months_present > 1:
        full_range_length = len(pd.period_range(df["month"].min(), df["month"].max(), freq="M"))
        if full_range_length > months_present:
            has_gaps = True

    return {
        "avg_monthly_inflow": round(avg_monthly_inflow, 2),
        "avg_monthly_outflow": round(avg_monthly_outflow, 2),
        "avg_monthly_net": round(avg_monthly_net, 2),
        "cashflow_volatility_pct": round(cashflow_volatility_pct, 2),
        "inflow_trend": round(inflow_trend, 4),
        "avg_balance": round(avg_balance, 2),
        "min_balance": round(min_balance, 2),
        "reserve_ratio": round(reserve_ratio, 4),
        "positive_months": positive_months,
        "negative_months": negative_months,
        "txn_activity_score": round(txn_activity_score, 4),
        "payment_regularity": round(payment_regularity, 4),
        "requested_loan": float(requested_loan),
        "requested_tenure": int(requested_tenure),
        "monthly_installment_est": round(monthly_installment_est, 2),
        "overdue_payments_count": overdue_payments_count,
        "bounced_checks_count": bounced_checks_count,
        "months_present": months_present,
        "has_gaps": has_gaps,
        "txn_count": len(df)
    }
