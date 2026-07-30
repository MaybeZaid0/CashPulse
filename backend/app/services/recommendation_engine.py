def fmt_pkr(amount: float) -> str:
    """Format as PKR 2,500,000"""
    return f"PKR {amount:,.0f}" if amount is not None else "N/A"

def compute_recommendation(readiness: int, eligibility: dict, config: dict) -> dict:
    approve_threshold = config["thresholds"]["approve"]
    review_threshold  = config["thresholds"]["counter_offer"]
    
    within_safe  = eligibility["within_safe_capacity"]
    safe_amount  = eligibility["safe_loan_amount"]
    req_amount   = eligibility["requested_loan"]
    req_tenure   = eligibility["requested_tenure"]
    
    evidence = [
        {"label": "Readiness Score",      "value": f"{readiness} / 100"},
        {"label": "Eligibility Score",    "value": f"{eligibility['eligibility_score']:.1f} / 100"},
        {"label": "Requested Loan",       "value": fmt_pkr(req_amount)},
        {"label": "Safe Loan Capacity",   "value": fmt_pkr(safe_amount)},
        {"label": "Capacity Usage",       "value": f"{eligibility['headroom_pct']}% of safe capacity"},
    ]
    
    if within_safe and readiness >= approve_threshold:
        return {
            "type": "APPROVE",
            "recommended_amount": float(req_amount),
            "recommended_tenure": int(req_tenure),
            "reason": f"System recommends APPROVAL because the borrower demonstrates strong financial health (Readiness score of {readiness}/100) and the requested EMI utilizes only {eligibility['headroom_pct']:.1f}% of the safe repayment capacity.",
            "evidence": evidence
        }
    elif readiness >= review_threshold:
        # Determine counter offer loan amount rounded to nearest 50,000, clipped at 0
        recommended_loan = min(safe_amount, req_amount)
        recommended_loan = max(0.0, float((recommended_loan // 50000) * 50000))
        
        return {
            "type": "COUNTER_OFFER",
            "recommended_amount": recommended_loan,
            "recommended_tenure": int(req_tenure),
            "reason": f"System recommends a COUNTER-OFFER of {fmt_pkr(recommended_loan)} because while the business has adequate credit readiness ({readiness}/100), the requested loan amount of {fmt_pkr(req_amount)} exceeds the calculated safe repayment limit of {fmt_pkr(safe_amount)}.",
            "evidence": evidence
        }
    else:
        return {
            "type": "MANUAL_REVIEW",
            "recommended_amount": None,
            "recommended_tenure": None,
            "reason": f"System recommends escalation to MANUAL REVIEW because the Readiness score of {readiness}/100 indicates elevated risk, which falls below the policy review threshold of {review_threshold}.",
            "evidence": evidence
        }
