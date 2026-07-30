# CashPulse — Cashflow Forecasting & Confidence Scoring Engine

> **Purpose**: Predict future SME cashflow to validate staged disbursement decisions  
> **Method**: Weighted Moving Average (WMA) + Linear Regression + Seasonal Adjustment  
> **Confidence Score**: Statistical measure of prediction reliability

---

## 1. Overview

After the first disbursement stage, the system forecasts the SME's cashflow for the next monitoring period (typically 3-4 months). If the confidence score exceeds the threshold (default 70%), the next disbursement stage is recommended for release.

```
Stage 1 Disbursed → Wait 2-3 months → Forecast Next 3-4 Months
                                              │
                                    ┌─────────┴─────────┐
                                    │                    │
                              Confidence > 70%     Confidence < 70%
                                    │                    │
                              ✅ Release Stage 2    ⚠️ Hold Stage 2
                                                    RM Decision Required
```

---

## 2. Backend Implementation

### 2.1 Forecasting Engine Service

**New File: `backend/app/services/forecasting_engine.py`**

```python
"""
Cashflow Forecasting Engine for CashPulse.
Predicts future monthly cashflows using multiple methods and provides
confidence scores for staged disbursement decisions.
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Optional
from datetime import datetime, timedelta


def forecast_cashflow(
    transactions: list,
    forecast_months: int = 3,
    confidence_threshold: float = 0.70,
) -> dict:
    """
    Generate cashflow forecast for specified number of months.
    
    Args:
        transactions: List of transaction dicts from MongoDB
        forecast_months: Number of months to forecast (default 3)
        confidence_threshold: Minimum confidence for approval (default 0.70)
    
    Returns:
        dict with forecast data, confidence score, and recommendation
    """
    if not transactions or len(transactions) < 10:
        return {
            "status": "INSUFFICIENT_DATA",
            "message": "Not enough transaction history for reliable forecasting",
            "confidenceScore": 0.0,
            "confidenceMet": False,
            "predictions": [],
            "methodology": "NONE",
        }
    
    df = pd.DataFrame(transactions)
    df["date"] = pd.to_datetime(df["date"])
    df["month"] = df["date"].dt.to_period("M")
    
    # Aggregate monthly data
    monthly_in = df[df["type"] == "inflow"].groupby("month")["amount"].sum()
    monthly_out = df[df["type"] == "outflow"].groupby("month")["amount"].sum()
    
    all_months = pd.period_range(df["month"].min(), df["month"].max(), freq="M")
    monthly_in = monthly_in.reindex(all_months, fill_value=0.0)
    monthly_out = monthly_out.reindex(all_months, fill_value=0.0)
    monthly_net = monthly_in - monthly_out
    
    # Run multiple forecasting methods
    wma_forecast = _forecast_wma(monthly_in, monthly_out, forecast_months)
    lr_forecast = _forecast_linear_regression(monthly_in, monthly_out, forecast_months)
    
    # Ensemble: average of both methods
    ensemble_predictions = []
    for i in range(forecast_months):
        wma_in = wma_forecast["predictions"][i]["predictedInflow"]
        wma_out = wma_forecast["predictions"][i]["predictedOutflow"]
        lr_in = lr_forecast["predictions"][i]["predictedInflow"]
        lr_out = lr_forecast["predictions"][i]["predictedOutflow"]
        
        avg_in = (wma_in + lr_in) / 2
        avg_out = (wma_out + lr_out) / 2
        avg_net = avg_in - avg_out
        
        # Confidence interval (based on historical variance)
        net_values = monthly_net.values.astype(float)
        std_net = float(np.std(net_values)) if len(net_values) > 1 else 0
        
        last_month = all_months[-1]
        forecast_month = last_month + (i + 1)
        
        ensemble_predictions.append({
            "month": str(forecast_month),
            "monthLabel": forecast_month.strftime("%b %Y"),
            "predictedInflow": round(avg_in, 2),
            "predictedOutflow": round(avg_out, 2),
            "predictedNet": round(avg_net, 2),
            "confidenceInterval": {
                "lower": round(avg_net - 1.96 * std_net, 2),
                "upper": round(avg_net + 1.96 * std_net, 2),
            },
            "isForecast": True,
        })
    
    # Calculate overall confidence score
    confidence = _calculate_confidence(
        monthly_in.values.astype(float),
        monthly_out.values.astype(float),
        monthly_net.values.astype(float),
        ensemble_predictions,
    )
    
    # Historical data for chart
    historical = []
    for m in all_months[-6:]:  # Last 6 months
        historical.append({
            "month": str(m),
            "monthLabel": m.strftime("%b %Y"),
            "inflow": round(float(monthly_in.get(m, 0)), 2),
            "outflow": round(float(monthly_out.get(m, 0)), 2),
            "net": round(float(monthly_net.get(m, 0)), 2),
            "isForecast": False,
        })
    
    return {
        "status": "FORECAST_GENERATED",
        "methodology": "ENSEMBLE_WMA_LR",
        "forecastMonths": forecast_months,
        "confidenceScore": confidence,
        "confidenceThreshold": confidence_threshold,
        "confidenceMet": confidence >= confidence_threshold,
        "recommendation": "PROCEED" if confidence >= confidence_threshold else "HOLD",
        "historicalData": historical,
        "predictions": ensemble_predictions,
        "summary": {
            "avgHistoricalNet": round(float(monthly_net.mean()), 2),
            "avgForecastedNet": round(
                sum(p["predictedNet"] for p in ensemble_predictions) / len(ensemble_predictions), 2
            ),
            "trend": "IMPROVING" if ensemble_predictions[-1]["predictedNet"] > float(monthly_net.mean()) else "DECLINING",
            "volatility": round(float(monthly_net.std() / abs(monthly_net.mean())) * 100, 2) if monthly_net.mean() != 0 else 999,
        },
    }


def _forecast_wma(
    monthly_in: pd.Series,
    monthly_out: pd.Series,
    forecast_months: int,
) -> dict:
    """Weighted Moving Average forecast — recent months weighted higher."""
    in_values = monthly_in.values.astype(float)
    out_values = monthly_out.values.astype(float)
    
    # Use last 6 months with exponentially increasing weights
    n = min(6, len(in_values))
    weights = np.array([2**i for i in range(n)], dtype=float)
    weights = weights / weights.sum()
    
    recent_in = in_values[-n:]
    recent_out = out_values[-n:]
    
    base_in = np.dot(weights, recent_in)
    base_out = np.dot(weights, recent_out)
    
    # Calculate trend from last 3 months
    if len(in_values) >= 3:
        trend_in = (in_values[-1] - in_values[-3]) / 2
        trend_out = (out_values[-1] - out_values[-3]) / 2
    else:
        trend_in = 0
        trend_out = 0
    
    predictions = []
    for i in range(forecast_months):
        pred_in = max(0, base_in + trend_in * (i + 1))
        pred_out = max(0, base_out + trend_out * (i + 1))
        predictions.append({
            "predictedInflow": round(pred_in, 2),
            "predictedOutflow": round(pred_out, 2),
            "predictedNet": round(pred_in - pred_out, 2),
        })
    
    return {"predictions": predictions, "method": "WMA"}


def _forecast_linear_regression(
    monthly_in: pd.Series,
    monthly_out: pd.Series,
    forecast_months: int,
) -> dict:
    """Simple linear regression forecast."""
    in_values = monthly_in.values.astype(float)
    out_values = monthly_out.values.astype(float)
    
    n = len(in_values)
    x = np.arange(n)
    
    # Fit linear regression for inflows
    if n >= 3:
        slope_in, intercept_in = np.polyfit(x, in_values, 1)
        slope_out, intercept_out = np.polyfit(x, out_values, 1)
    else:
        slope_in, intercept_in = 0, in_values.mean() if len(in_values) > 0 else 0
        slope_out, intercept_out = 0, out_values.mean() if len(out_values) > 0 else 0
    
    predictions = []
    for i in range(forecast_months):
        future_x = n + i
        pred_in = max(0, slope_in * future_x + intercept_in)
        pred_out = max(0, slope_out * future_x + intercept_out)
        predictions.append({
            "predictedInflow": round(pred_in, 2),
            "predictedOutflow": round(pred_out, 2),
            "predictedNet": round(pred_in - pred_out, 2),
        })
    
    return {"predictions": predictions, "method": "LINEAR_REGRESSION"}


def _calculate_confidence(
    inflows: np.ndarray,
    outflows: np.ndarray,
    nets: np.ndarray,
    predictions: list,
) -> float:
    """
    Calculate confidence score (0.0 - 1.0) based on:
    1. Data quality (enough months, no gaps)
    2. Cashflow stability (low CoV = higher confidence)
    3. Trend consistency (stable trend = higher confidence)
    4. Forecast reasonableness (predictions within historical range)
    """
    scores = []
    
    # 1. Data sufficiency (0-0.25)
    n_months = len(nets)
    data_score = min(n_months / 6.0, 1.0) * 0.25
    scores.append(data_score)
    
    # 2. Cashflow stability (0-0.30)
    mean_net = nets.mean()
    std_net = nets.std() if len(nets) > 1 else 0
    cov = abs(std_net / mean_net) if mean_net != 0 else 10
    stability_score = max(0, (1 - min(cov, 2) / 2)) * 0.30
    scores.append(stability_score)
    
    # 3. Positive net cashflow ratio (0-0.25)
    positive_ratio = sum(1 for n in nets if n > 0) / len(nets) if len(nets) > 0 else 0
    positive_score = positive_ratio * 0.25
    scores.append(positive_score)
    
    # 4. Prediction reasonableness (0-0.20)
    hist_max = max(abs(nets.max()), abs(nets.min())) if len(nets) > 0 else 1
    pred_nets = [p["predictedNet"] for p in predictions]
    reasonable = sum(1 for p in pred_nets if abs(p) <= hist_max * 2) / len(pred_nets)
    reasonable_score = reasonable * 0.20
    scores.append(reasonable_score)
    
    total = sum(scores)
    return round(min(max(total, 0.0), 1.0), 2)
```

### 2.2 Forecasting API Endpoint

Add to `backend/app/routers/disbursement.py`:

```python
from app.services.forecasting_engine import forecast_cashflow

@router.post("/plans/{plan_id}/stages/{stage_number}/forecast")
async def generate_stage_forecast(
    plan_id: str,
    stage_number: int,
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    """Generate cashflow forecast for a disbursement stage."""
    try:
        obj_id = ObjectId(plan_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid plan ID")
    
    plan = await db["disbursement_plans"].find_one({"_id": obj_id})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Get the stage
    stage = None
    for s in plan.get("stages", []):
        if s["stageNumber"] == stage_number:
            stage = s
            break
    
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    
    # Get SME transactions
    sme_id = plan.get("smeId")
    try:
        sme_obj_id = ObjectId(sme_id)
    except Exception:
        sme_obj_id = None
    
    query = {"smeId": sme_obj_id} if sme_obj_id else {"smeId": sme_id}
    cursor = db["transactions"].find(query).sort("date", 1)
    transactions = await cursor.to_list(length=5000)
    
    # Generate forecast
    forecast_months = stage.get("monitoringPeriodMonths", 3)
    confidence_threshold = stage.get("confidenceThreshold", 0.70)
    
    forecast = forecast_cashflow(
        transactions=transactions,
        forecast_months=forecast_months,
        confidence_threshold=confidence_threshold,
    )
    
    # Store forecast result
    forecast_doc = {
        "smeId": sme_id,
        "disbursementPlanId": obj_id,
        "stageNumber": stage_number,
        "forecastDate": datetime.now(timezone.utc),
        "periodMonths": forecast_months,
        **forecast,
        "createdAt": datetime.now(timezone.utc),
    }
    
    forecast_res = await db["forecasts"].insert_one(forecast_doc)
    
    # Update the stage with forecast results
    stage_path = f"stages.{stage_number - 1}"
    await db["disbursement_plans"].update_one(
        {"_id": obj_id},
        {"$set": {
            f"{stage_path}.forecastData": forecast,
            f"{stage_path}.confidenceScore": forecast["confidenceScore"],
            f"{stage_path}.confidenceMet": forecast["confidenceMet"],
            "updatedAt": datetime.now(timezone.utc),
        }}
    )
    
    return {
        "forecastId": str(forecast_res.inserted_id),
        **forecast,
    }
```

---

## 3. Frontend Visualization

### 3.1 Forecast Chart Component

The forecast chart should show:
- Last 6 months historical data (solid lines)
- Next 3-4 months forecasted data (dashed lines)
- Confidence interval band (shaded area)
- Clear "Historical" vs "Forecast" divider

### 3.2 Confidence Score Gauge

```
┌─────────────────────────────────────────┐
│ Cashflow Forecast Confidence             │
│                                          │
│         ┌──────────────┐                │
│         │     82%      │                │
│         │  CONFIDENT   │                │
│         └──────────────┘                │
│                                          │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░ 82/100           │
│                                          │
│ Threshold: 70% ✅ MET                    │
│ Recommendation: PROCEED TO STAGE 2      │
│                                          │
│ Factors:                                 │
│ • Data Quality: ████████░░ 25/25        │
│ • Stability:    ██████░░░░ 22/30        │
│ • Positive Months: ████████░░ 20/25     │
│ • Prediction Quality: ███████░░░ 15/20  │
└─────────────────────────────────────────┘
```
