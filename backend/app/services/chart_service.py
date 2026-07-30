import pandas as pd

def build_cashflow_series(transactions: list) -> list:
    """
    Returns a list of 6 monthly objects, sorted oldest -> newest.
    """
    if not transactions:
        return []

    df = pd.DataFrame(transactions)
    df["date"]  = pd.to_datetime(df["date"])
    df["month"] = df["date"].dt.to_period("M")
    
    inflow_by_month  = df[df["type"] == "inflow"].groupby("month")["amount"].sum()
    outflow_by_month = df[df["type"] == "outflow"].groupby("month")["amount"].sum()
    balance_by_month = df.groupby("month")["balance"].last()   # end-of-month balance
    
    # Align all series on the same 6 months
    all_months = sorted(set(df["month"].unique()))[-6:]
    
    result = []
    for m in all_months:
        result.append({
            "month":   m.strftime("%b %Y"),
            "inflow":  round(inflow_by_month.get(m, 0), 0),
            "outflow": round(outflow_by_month.get(m, 0), 0),
            "net":     round(inflow_by_month.get(m, 0) - outflow_by_month.get(m, 0), 0),
            "balance": round(balance_by_month.get(m, 0), 0),
        })
    return result

def build_pillar_radar_data(pillar_scores: list) -> dict:
    """
    Returns chart.js-compatible data for a horizontal bar chart of pillar scores.
    Each bar shows score / max as a percentage.
    """
    return {
        "labels": [p["label"] for p in pillar_scores],
        "scores": [p["score"] for p in pillar_scores],
        "maxes":  [p["max"]   for p in pillar_scores],
        "pcts":   [round(p["score"] / p["max"] * 100, 1) if p["max"] > 0 else 0 for p in pillar_scores],
    }
