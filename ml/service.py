#!/usr/bin/env python3
"""
FastAPI inference service for Tourist Safety models.
Loads trained models from ml/models; if missing, will attempt to train using ml/data.
Exposes:
- GET /health
- POST /predict  (single or batch)
"""

import os
import json
from pathlib import Path
from typing import List, Optional, Any, Dict

import pandas as pd
import joblib
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from model_training import ModelTrainingPipeline


MODELS_DIR = Path(__file__).parent / "models"
DATA_DIR = Path(__file__).parent / "data"

# --- Simple Geofencing & Area Risk Configuration ---
# Replace these with real polygons/tiles as data becomes available.
RESTRICTED_ZONES = [
    # Example square near lat 28.62, lng 77.20
    [(28.620, 77.195), (28.620, 77.205), (28.630, 77.205), (28.630, 77.195)],
]

HIGH_RISK_AREAS = [
    # Example polygon defining a higher risk pocket
    [(28.500, 77.100), (28.500, 77.300), (28.700, 77.300), (28.700, 77.100)],
]

def _point_in_polygon(lat: float, lng: float, polygon: list) -> bool:
    # Ray casting algorithm for point-in-polygon
    inside = False
    n = len(polygon)
    if n < 3:
        return False
    for i in range(n):
        lat_i, lng_i = polygon[i]
        lat_j, lng_j = polygon[(i + 1) % n]
        intersect = ((lng_i > lng) != (lng_j > lng)) and (
            lat < (lat_j - lat_i) * (lng - lng_i) / (lng_j - lng_i + 1e-9) + lat_i
        )
        if intersect:
            inside = not inside
    return inside

def _compute_area_flags(lat: float, lng: float) -> dict:
    in_restricted = any(_point_in_polygon(lat, lng, poly) for poly in RESTRICTED_ZONES)
    in_high_risk = any(_point_in_polygon(lat, lng, poly) for poly in HIGH_RISK_AREAS)
    # Risk baseline + bump if inside high-risk area; clamp to [0,1]
    base = 0.2
    risk = base + (0.5 if in_high_risk else 0.0) + (0.3 if in_restricted else 0.0)
    return {
        'is_in_restricted_zone': in_restricted,
        'area_risk_score': float(max(0.0, min(1.0, risk)))
    }

def _infer_time_of_day_bucket(ts: str) -> str:
    try:
        # Lazy parse without extra deps
        from datetime import datetime
        hour = datetime.fromisoformat(ts.replace('Z', '+00:00')).hour
    except Exception:
        return 'unknown'
    if 5 <= hour < 12:
        return 'morning'
    if 12 <= hour < 17:
        return 'afternoon'
    if 17 <= hour < 21:
        return 'evening'
    return 'night'


class LocationTick(BaseModel):
    tourist_id: str
    timestamp: str
    latitude: float
    longitude: float
    speed_m_s: float = 0.0
    accuracy_m: float = 10.0
    provider: Optional[str] = "gps"
    battery_pct: Optional[int] = 100
    device_status: Optional[str] = "active"
    # Precomputed features if available; otherwise defaults
    time_of_day_bucket: Optional[str] = None
    distance_from_itinerary: Optional[float] = 0.0
    time_since_last_fix: Optional[float] = 0.0
    avg_speed_last_15min: Optional[float] = 0.0
    area_risk_score: Optional[float] = 0.3
    prior_incidents_count: Optional[int] = 0
    days_into_trip: Optional[int] = 0
    is_in_restricted_zone: Optional[bool] = False
    sos_flag: Optional[bool] = False
    age: Optional[int] = 30
    sex_encoded: Optional[int] = 0
    days_trip_duration: Optional[int] = 5


class PredictRequest(BaseModel):
    records: List[LocationTick] = Field(..., description="One or more location-feature records")


app = FastAPI(title="Tourist Safety ML Service", version="1.0")


class ModelBundle:
    def __init__(self):
        self.pipeline = None
        self._load_or_train()

    def _load_or_train(self):
        MODELS_DIR.mkdir(exist_ok=True)

        safety_path = MODELS_DIR / 'safety_score_model.joblib'
        anomaly_path = MODELS_DIR / 'anomaly_detection_model.joblib'

        if safety_path.exists() and anomaly_path.exists():
            try:
                self.safety = joblib.load(safety_path)
                self.anomaly = joblib.load(anomaly_path)
                return
            except Exception:
                pass

        # Train if models missing
        if not (DATA_DIR / 'train.csv').exists():
            print("Training data not found. Generating synthetic dataset...")
            from data_generator import TouristDataGenerator
            generator = TouristDataGenerator(seed=42)
            generator.generate_dataset(num_tourists=1000, output_dir=str(DATA_DIR))

        self.pipeline = ModelTrainingPipeline(data_dir=str(DATA_DIR), models_dir=str(MODELS_DIR))
        self.pipeline.train_models()
        self.pipeline.save_models()

        self.safety = self.pipeline.safety_model
        self.anomaly = self.pipeline.anomaly_model


bundle = None


@app.on_event("startup")
def _startup():
    global bundle
    bundle = ModelBundle()


@app.get("/health")
def health():
    return {"status": "ok", "models_ready": True}


@app.post("/predict")
def predict(req: PredictRequest):
    try:
        # Convert input and enrich with geofence/risk/time-of-day if missing
        input_rows = []
        for r in req.records:
            row = r.dict()
            lat = float(row.get('latitude') or 0.0)
            lng = float(row.get('longitude') or 0.0)
            # Fill area flags when not provided
            if row.get('area_risk_score') is None or row.get('is_in_restricted_zone') is None:
                flags = _compute_area_flags(lat, lng)
                row.setdefault('area_risk_score', flags['area_risk_score'])
                row.setdefault('is_in_restricted_zone', flags['is_in_restricted_zone'])
            # Fill time of day bucket if missing
            if not row.get('time_of_day_bucket') and row.get('timestamp'):
                row['time_of_day_bucket'] = _infer_time_of_day_bucket(row['timestamp'])
            input_rows.append(row)

        df = pd.DataFrame(input_rows)
        # Safety score only (anomaly reasons removed until proper time-series logic exists)
        scores, conf = bundle.safety.predict(df)
        df_out = df.copy()
        df_out['predicted_safety'] = scores
        df_out['confidence'] = conf
        
        def band(score: float) -> str:
            if score >= 75:
                return 'high'
            if score >= 50:
                return 'medium'
            return 'low'

        def derive_risk_factors(row: Dict[str, Any]) -> Dict[str, Any]:
            factors = []
            # Transparent, input-driven explanations (not anomalies)
            if float(row.get('area_risk_score', 0)) >= 0.6:
                factors.append('high_area_risk')
            if float(row.get('distance_from_itinerary', 0)) >= 300:
                factors.append('off_itinerary')
            if float(row.get('time_since_last_fix', 0)) >= 900:
                factors.append('stale_gps_signal')
            if float(row.get('avg_speed_last_15min', 0)) < 0.3:
                factors.append('low_recent_movement')
            if bool(row.get('is_in_restricted_zone', False)):
                factors.append('restricted_zone_flag')
            if bool(row.get('sos_flag', False)):
                factors.append('sos_flag_active')
            if int(row.get('prior_incidents_count', 0)) > 0:
                factors.append('prior_incidents_history')
            # Summarize
            summary = ' | '.join(factors) if factors else 'no notable risk factors from input'
            return { 'factors': factors, 'summary': summary }

        results = []
        for _, row in df_out.iterrows():
            score = float(row['predicted_safety'])
            conf_v = float(row['confidence'])
            rationale = derive_risk_factors(row)
            results.append({
                'tourist_id': row['tourist_id'],
                'timestamp': row['timestamp'],
                'predicted_safety': score,
                'confidence': conf_v,
                'safety_band': band(score),
                'explanations': rationale
            })

        return {
            "success": True,
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("ML_PORT", "8001")))


