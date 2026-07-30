def compute_eligibility(features: dict, config: dict, readiness: int = 100, data_quality_score: int = 5) -> dict:
    safe_ratio           = config["safe_repayment_ratio"]
    avg_net              = features["avg_monthly_net"]
    requested_loan       = features["requested_loan"]
    requested_tenure     = features["requested_tenure"]

    safe_monthly_payment = avg_net * safe_ratio if avg_net > 0 else 0.0
    safe_loan_amount     = safe_monthly_payment * requested_tenure
    within_safe_capacity = requested_loan <= safe_loan_amount
    headroom_pct         = (requested_loan / safe_loan_amount * 100) if safe_loan_amount > 0 else 999.0

    # Calculate recommended amount for fit calculation
    recommended_loan = min(safe_loan_amount, requested_loan)
    # Round to nearest 50,000, clip at 0
    recommended_loan = max(0.0, float((recommended_loan // 50000) * 50000))

    # Calculate Loan Fit factor (ratio between recommended and requested, capped at 1.0)
    loan_fit = recommended_loan / requested_loan if requested_loan > 0.0 else 1.0
    loan_fit = max(0.0, min(1.0, loan_fit))

    # Confidence factor represents completeness and quality of statement data (0.0 to 1.0)
    confidence_factor = data_quality_score / 5.0

    # Eligibility Score = Readiness * Loan Fit * Confidence
    eligibility_score = float(readiness * loan_fit * confidence_factor)

    return {
        "avg_monthly_net":       round(avg_net, 2),
        "safe_repayment_ratio":  safe_ratio,
        "safe_monthly_payment":  round(safe_monthly_payment, 2),
        "requested_tenure":      requested_tenure,
        "safe_loan_amount":      round(safe_loan_amount, 2),
        "requested_loan":        requested_loan,
        "within_safe_capacity":  within_safe_capacity,
        "headroom_pct":          round(headroom_pct, 1),
        "eligibility_score":     round(eligibility_score, 1),
    }
