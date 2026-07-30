import json
import os

CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "scoring_config.json")

def load_config():
    with open(CONFIG_PATH, "r") as f:
        return json.load(f)

def score_cashflow_stability(features: dict, max_score: int) -> dict:
    score = 0
    
    pm = features.get("positive_months", 0)
    if pm >= 5:
        score += 12
    elif pm == 4:
        score += 8

    vol = features.get("cashflow_volatility_pct", 999)
    if vol < 20:
        score += 9
    elif vol < 35:
        score += 6

    net = features.get("avg_monthly_net", 0)
    if net > 0:
        score += 9
    elif net >= -50000:
        score += 4

    # Stability Deduction: If 3 or more months are net-negative, deduct 20 points
    nm = features.get("negative_months", 0)
    has_stability_deduction = False
    if nm >= 3:
        score = max(0, score - 20)
        has_stability_deduction = True

    if vol < 999:
        reason = f"Cashflow net volatility is {vol:.1f}% (CoV) across the statement period, with {pm} of 6 months net-positive."
    else:
        reason = f"Cashflow net volatility is undefined, with {pm} of 6 months net-positive."
        
    if has_stability_deduction:
        reason += f" Volatility risk warning: Business had {nm} negative cashflow months, triggering a -20 point risk deduction."

    return {
        "pillar": "cashflow_stability",
        "score": min(score, max_score),
        "max": max_score,
        "reason": reason,
        "evidence": [
            {"label": "Avg Monthly Net Cashflow", "value": f"PKR {net:,.2f}"},
            {"label": "Cashflow Volatility (CoV%)", "value": f"{vol:.1f}%"},
            {"label": "Positive Months", "value": f"{pm} of 6"}
        ]
    }

def score_repayment_behaviour(features: dict, max_score: int) -> dict:
    reg = features.get("payment_regularity", 0.75)
    bounces = features.get("bounced_checks_count", 0)
    overdues = features.get("overdue_payments_count", 0)
    
    # 1. Regularity consistency (up to 10 points)
    reg_score = 0
    if reg >= 0.90:
        reg_score = 10
    elif reg >= 0.80:
        reg_score = 8
    elif reg >= 0.70:
        reg_score = 6
    elif reg >= 0.60:
        reg_score = 4
        
    # 2. Bounced checks (up to 8 points)
    bounce_score = 0
    if bounces == 0:
        bounce_score = 8
    elif bounces == 1:
        bounce_score = 4
    else:
        bounce_score = 0
        
    # 3. Overdues (up to 7 points)
    overdue_score = 0
    if overdues == 0:
        overdue_score = 7
    elif overdues == 1:
        overdue_score = 3
    else:
        overdue_score = 0
        
    score = reg_score + bounce_score + overdue_score
    reason = f"Payment behavior shows a regularity index of {reg:.2f}. Account history records {bounces} bounced checks and {overdues} overdue obligation events."
    
    return {
        "pillar": "repayment_behaviour",
        "score": min(score, max_score),
        "max": max_score,
        "reason": reason,
        "evidence": [
            {"label": "Payment Regularity", "value": f"{reg*100:.1f}%"},
            {"label": "Bounced Checks Count", "value": f"{bounces}"},
            {"label": "Overdue Payments Count", "value": f"{overdues}"}
        ]
    }

def score_debt_service_capacity(features: dict, max_score: int) -> dict:
    net = features.get("avg_monthly_net", 0)
    installment = features.get("monthly_installment_est", 0)
    config = load_config()
    safe_ratio = config.get("safe_repayment_ratio", 0.50)
    
    safe_monthly_payment = net * safe_ratio if net > 0 else 0.0
    utilization = (installment / safe_monthly_payment * 100) if safe_monthly_payment > 0 else 999.0
    
    score = 0
    if utilization <= 60.0:
        score = 20
    elif utilization <= 100.0:
        score = 15
    elif utilization <= 140.0:
        score = 10
    elif utilization <= 200.0:
        score = 5
    else:
        score = 0
        
    reason = f"Estimated monthly installment of PKR {installment:,.2f} represents {utilization:.1f}% of the safe repayment capacity limit (PKR {safe_monthly_payment:,.2f} per month at a {safe_ratio*100:.0f}% ratio)."
    
    return {
        "pillar": "debt_service_capacity",
        "score": min(score, max_score),
        "max": max_score,
        "reason": reason,
        "evidence": [
            {"label": "Est. Monthly Installment", "value": f"PKR {installment:,.2f}"},
            {"label": "Safe EMI Capacity Limit", "value": f"PKR {safe_monthly_payment:,.2f}"},
            {"label": "Safe Capacity Utilization", "value": f"{utilization:.1f}%"}
        ]
    }

def score_liquidity(features: dict, max_score: int) -> dict:
    score = 0
    rr = features.get("reserve_ratio", 0)
    
    if rr >= 2.0:
        score += 9
    elif rr >= 1.0:
        score += 6
    elif rr >= 0.5:
        score += 3
    
    mb = features.get("min_balance", 0)
    ab = features.get("avg_balance", 0)
    if mb >= 0:
        score += 6
    elif mb >= -50000:
        score += 3
        
    reason = f"Average account balance of PKR {ab:,.2f} provides a {rr:.2f}x reserve ratio relative to average monthly outflows. The minimum balance observed was PKR {mb:,.2f}."
    
    return {
        "pillar": "liquidity",
        "score": min(score, max_score),
        "max": max_score,
        "reason": reason,
        "evidence": [
            {"label": "Reserve Ratio", "value": f"{rr:.2f}x"},
            {"label": "Average Balance", "value": f"PKR {ab:,.2f}"},
            {"label": "Minimum Balance", "value": f"PKR {mb:,.2f}"}
        ]
    }

def score_business_momentum(features: dict, max_score: int) -> dict:
    trend = features.get("inflow_trend", 0)
    
    score = 0
    if trend >= 0.05:
        score = 5
    elif trend >= 0.01:
        score = 4
    elif trend >= -0.01:
        score = 3
    elif trend >= -0.05:
        score = 1
    else:
        score = 0
        
    reason = f"Business revenue momentum grew by {trend*100:.1f}% based on the Weighted Moving Average (WMA) of recent vs. baseline monthly inflows."
    
    return {
        "pillar": "business_momentum",
        "score": min(score, max_score),
        "max": max_score,
        "reason": reason,
        "evidence": [
            {"label": "WMA Inflow Trend", "value": f"{trend*100:.2f}%"}
        ]
    }

def score_data_quality(features: dict, max_score: int) -> dict:
    score = 0
    reasons_dq = []
    
    months = features.get("months_present", 0)
    if months >= 6:
        score += 2
        reasons_dq.append("6 complete months of statement history present")
    else:
        reasons_dq.append(f"Only {months} months present")
        
    has_gaps = features.get("has_gaps", False)
    if not has_gaps:
        score += 1
        reasons_dq.append("no gaps in data timeline")
    else:
        reasons_dq.append("gaps detected in monthly timeline")
        
    txn_count = features.get("txn_count", 0)
    if txn_count >= 20:
        score += 1
        reasons_dq.append("sufficient transaction density")
    else:
        reasons_dq.append("low transaction density")
        
    min_balance = features.get("min_balance", 0)
    if min_balance >= 0:
        score += 1
        reasons_dq.append("balance remained non-negative throughout")
    else:
        reasons_dq.append("negative balance events observed")
        
    reason = f"Data Quality score of {score}/5 is based on: " + ", ".join(reasons_dq) + "."
    
    return {
        "pillar": "data_quality",
        "score": min(score, max_score),
        "max": max_score,
        "reason": reason,
        "evidence": [
            {"label": "Months Present", "value": f"{months} of 6"},
            {"label": "No Timeline Gaps", "value": str(not has_gaps)},
            {"label": "Transaction Count", "value": f"{txn_count}"},
            {"label": "Min Balance Status", "value": "Non-Negative" if min_balance >= 0 else "Negative Balance"}
        ]
    }

def score_all_pillars(features: dict) -> list:
    config = load_config()
    pillars = config.get("pillars", {})
    
    results = [
        score_cashflow_stability(features, pillars.get("cashflow_stability", {}).get("max", 30)),
        score_repayment_behaviour(features, pillars.get("repayment_behaviour", {}).get("max", 25)),
        score_debt_service_capacity(features, pillars.get("debt_service_capacity", {}).get("max", 20)),
        score_liquidity(features, pillars.get("liquidity", {}).get("max", 15)),
        score_business_momentum(features, pillars.get("business_momentum", {}).get("max", 5)),
        score_data_quality(features, pillars.get("data_quality", {}).get("max", 5))
    ]
    
    for res in results:
        p_conf = pillars.get(res["pillar"], {})
        res["label"] = p_conf.get("label", res["pillar"])
        res["question"] = p_conf.get("question", "")
        
    return results

def compute_readiness(pillar_scores: list) -> tuple[int, str]:
    config = load_config()
    total = sum(p["score"] for p in pillar_scores)
    readiness = int(round(total))
    
    if readiness >= config["thresholds"]["approve"]:
        band = "Strong"
    elif readiness >= config["thresholds"]["counter_offer"]:
        band = "Review"
    else:
        band = "High Risk"
    
    return readiness, band
