# Tourist Safety ML Service

This directory contains the Machine Learning components for the Tourist Safety System, including data generation, model training, and inference services.

## Quick Start

### 1. Install Dependencies
```bash
cd ml
pip install -r requirements.txt
```

### 2. Start ML Service
```bash
# Windows
python service.py

# Or use the script
../scripts/start-ml-service.bat

# Linux/Mac
../scripts/start-ml-service.sh
```

The service will:
- Generate synthetic training data if missing
- Train safety score and anomaly detection models
- Start FastAPI server on http://localhost:8001

### 3. Test the Service
```bash
# Health check
curl http://localhost:8001/health

# Make a prediction
curl -X POST http://localhost:8001/predict \
  -H "Content-Type: application/json" \
  -d '{
    "records": [{
      "tourist_id": "test123",
      "timestamp": "2025-01-01T12:00:00Z",
      "latitude": 12.3,
      "longitude": 76.6,
      "speed_m_s": 1.2,
      "time_of_day_bucket": "afternoon",
      "distance_from_itinerary": 50,
      "time_since_last_fix": 120,
      "avg_speed_last_15min": 1.0,
      "area_risk_score": 0.2,
      "prior_incidents_count": 0,
      "days_into_trip": 1,
      "is_in_restricted_zone": false,
      "sos_flag": false,
      "age": 30,
      "sex_encoded": 0,
      "days_trip_duration": 5
    }]
  }'
```

## Architecture

### Components

1. **Data Generator** (`data_generator.py`)
   - Generates synthetic tourist location data
   - Creates realistic trajectories with anomalies
   - Produces labeled training data

2. **Model Training** (`model_training.py`)
   - Safety Score Model: LightGBM regression (0-100 score)
   - Anomaly Detection: Hybrid rule-based + ML approach
   - Feature engineering and evaluation

3. **Inference Service** (`service.py`)
   - FastAPI server for real-time predictions
   - Auto-trains models if missing
   - RESTful API endpoints

### Models

#### Safety Score Model
- **Algorithm**: LightGBM Gradient Boosting
- **Output**: Safety score 0-100 (higher = safer)
- **Features**: Location, speed, time, area risk, demographics
- **Use Case**: Real-time risk assessment

#### Anomaly Detection Model
- **Algorithm**: Isolation Forest + Rule-based
- **Output**: Anomaly flag with severity (info/warn/critical)
- **Triggers**: Route deviation, communication loss, high-risk areas
- **Use Case**: Alert generation for emergency response

## API Endpoints

### GET /health
Check service health and model readiness.

**Response:**
```json
{
  "status": "ok",
  "models_ready": true
}
```

### POST /predict
Get safety predictions with transparent, input-based explanations. (Anomaly reasons are disabled until time-series is available.)

**Request:**
```json
{
  "records": [
    {
      "tourist_id": "string",
      "timestamp": "ISO8601",
      "latitude": 0.0,
      "longitude": 0.0,
      "speed_m_s": 0.0,
      "accuracy_m": 10.0,
      "provider": "gps",
      "battery_pct": 100,
      "device_status": "active",
      "time_of_day_bucket": "afternoon",
      "distance_from_itinerary": 0.0,
      "time_since_last_fix": 0.0,
      "avg_speed_last_15min": 0.0,
      "area_risk_score": 0.3,
      "prior_incidents_count": 0,
      "days_into_trip": 0,
      "is_in_restricted_zone": false,
      "sos_flag": false,
      "age": 30,
      "sex_encoded": 0,
      "days_trip_duration": 5
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "tourist_id": "string",
      "timestamp": "ISO8601",
      "predicted_safety": 85.2,
      "confidence": 0.78,
      "safety_band": "high",
      "explanations": {
        "factors": ["high_area_risk", "off_itinerary"],
        "summary": "high_area_risk | off_itinerary"
      }
    }
  ]
}
```

## Integration with Main App

The ML service is integrated with the main tourist safety system:

1. **Backend Proxy**: Node.js server proxies requests to ML service
   - `GET /api/ml/health` → ML service health check
   - `POST /api/ml/predict` → ML predictions

2. **Frontend Service**: React service for easy ML integration
   - `mlService.js` provides helper functions
   - `createLocationTick()` converts tourist data to ML format
   - `getSafetyStatus()` interprets prediction results

## Configuration

### Environment Variables
- `ML_PORT`: ML service port (default: 8001)
- `ML_SERVICE_URL`: ML service URL for backend proxy (default: http://localhost:8001)

### Model Configuration
Models are saved in `ml/models/` directory:
- `safety_score_model.joblib`: Trained safety score model
- `anomaly_detection_model.joblib`: Trained anomaly detection model
- `training_metrics.json`: Training performance metrics
- `model_metadata.json`: Model version and metadata

## Development

### Regenerate Training Data
```bash
python data_generator.py --num-tourists 2000 --output-dir data
```

### Retrain Models
```bash
python model_training.py --data-dir data --models-dir models
```

### Run Tests
```bash
# Test data generation
python data_generator.py --num-tourists 100

# Test model training
python model_training.py

# Test inference service
python service.py
```

## Performance Notes

- **Training Time**: ~2-5 minutes for 1000 tourists
- **Inference Latency**: <100ms per prediction
- **Memory Usage**: ~200MB for loaded models
- **Concurrent Requests**: Handles 100+ requests/second

## Troubleshooting

### Common Issues

1. **ModuleNotFoundError**: Install missing dependencies
   ```bash
   pip install -r requirements.txt
   ```

2. **ML Service Unavailable**: Check if service is running
   ```bash
   curl http://localhost:8001/health
   ```

3. **Model Training Fails**: Check data directory exists
   ```bash
   ls ml/data/
   ```

4. **Import Errors**: Ensure you're in the correct directory
   ```bash
   cd ml
   python service.py
   ```

### Logs
- ML service logs are printed to console
- Check backend logs for proxy errors
- Model training progress is shown during startup

## Future Enhancements

- [ ] Real-time model retraining with new data
- [ ] A/B testing for model versions
- [ ] Advanced geospatial features with real crime data
- [ ] Ensemble models for better accuracy
- [ ] Model drift detection and monitoring
- [ ] GPU acceleration for faster inference

