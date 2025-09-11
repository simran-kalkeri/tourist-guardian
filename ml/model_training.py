#!/usr/bin/env python3
"""
Tourist Safety Model Training Pipeline
Trains safety score prediction and anomaly detection models.
"""

import pandas as pd
import numpy as np
import joblib
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Tuple, List
import warnings
warnings.filterwarnings('ignore')

# ML libraries
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.metrics import roc_auc_score, precision_recall_curve, roc_curve
from sklearn.ensemble import IsolationForest
from sklearn.svm import OneClassSVM
import lightgbm as lgb
import shap

# Plotting (optional)
try:
    import matplotlib.pyplot as plt
    import seaborn as sns
    PLOTTING_AVAILABLE = True
except ImportError:
    PLOTTING_AVAILABLE = False
    plt = None
    sns = None

class SafetyScoreModel:
    """Safety Score Prediction Model using LightGBM."""
    
    def __init__(self, params: Dict[str, Any] = None):
        self.params = params or {
            'objective': 'regression',
            'metric': 'rmse',
            'boosting_type': 'gbdt',
            'num_leaves': 31,
            'learning_rate': 0.05,
            'feature_fraction': 0.9,
            'bagging_fraction': 0.8,
            'bagging_freq': 5,
            'verbose': -1,
            'random_state': 42
        }
        self.model = None
        self.feature_names = None
        self.scaler = StandardScaler()
        self.label_encoders = {}
        
    def prepare_features(self, df: pd.DataFrame, fit_encoders: bool = False) -> np.ndarray:
        """Prepare features for training/inference."""
        # Feature columns to use
        feature_cols = [
            'distance_from_itinerary', 'time_since_last_fix', 'avg_speed_last_15min',
            'area_risk_score', 'prior_incidents_count', 'days_into_trip',
            'is_in_restricted_zone', 'sos_flag', 'age', 'sex_encoded', 'days_trip_duration'
        ]
        
        # Categorical features to encode
        categorical_cols = ['time_of_day_bucket']
        
        df_processed = df.copy()
        
        # Handle categorical features
        for col in categorical_cols:
            if col in df_processed.columns:
                if fit_encoders:
                    self.label_encoders[col] = LabelEncoder()
                    df_processed[f'{col}_encoded'] = self.label_encoders[col].fit_transform(df_processed[col])
                else:
                    if col in self.label_encoders:
                        # Handle unseen categories
                        known_categories = set(self.label_encoders[col].classes_)
                        df_processed[col] = df_processed[col].apply(
                            lambda x: x if x in known_categories else self.label_encoders[col].classes_[0]
                        )
                        df_processed[f'{col}_encoded'] = self.label_encoders[col].transform(df_processed[col])
                    else:
                        df_processed[f'{col}_encoded'] = 0
                        
                feature_cols.append(f'{col}_encoded')
        
        # Select and order features
        available_cols = [col for col in feature_cols if col in df_processed.columns]
        X = df_processed[available_cols]
        
        # Handle missing values
        X = X.fillna(0)
        
        # Store feature names
        if fit_encoders:
            self.feature_names = list(X.columns)
        
        return X.values, available_cols
    
    def train(self, train_df: pd.DataFrame, val_df: pd.DataFrame = None) -> Dict[str, Any]:
        """Train the safety score model."""
        print("Preparing training features...")
        X_train, feature_cols = self.prepare_features(train_df, fit_encoders=True)
        y_train = train_df['safety_label'].values
        
        if val_df is not None:
            X_val, _ = self.prepare_features(val_df, fit_encoders=False)
            y_val = val_df['safety_label'].values
            val_data = lgb.Dataset(X_val, label=y_val, feature_name=feature_cols)
            valid_sets = [val_data]
            valid_names = ['validation']
        else:
            valid_sets = None
            valid_names = None
        
        print("Training LightGBM model...")
        train_data = lgb.Dataset(X_train, label=y_train, feature_name=feature_cols)
        
        self.model = lgb.train(
            self.params,
            train_data,
            num_boost_round=1000,
            valid_sets=valid_sets,
            valid_names=valid_names,
            callbacks=[lgb.early_stopping(100), lgb.log_evaluation(100)]
        )
        
        # Training metrics
        train_pred = self.model.predict(X_train)
        train_metrics = {
            'train_rmse': np.sqrt(mean_squared_error(y_train, train_pred)),
            'train_mae': mean_absolute_error(y_train, train_pred),
            'train_r2': r2_score(y_train, train_pred)
        }
        
        if val_df is not None:
            val_pred = self.model.predict(X_val)
            val_metrics = {
                'val_rmse': np.sqrt(mean_squared_error(y_val, val_pred)),
                'val_mae': mean_absolute_error(y_val, val_pred),
                'val_r2': r2_score(y_val, val_pred)
            }
            train_metrics.update(val_metrics)
        
        print(f"Training complete! RMSE: {train_metrics['train_rmse']:.2f}")
        return train_metrics
    
    def predict(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Predict safety scores with confidence."""
        X, _ = self.prepare_features(df, fit_encoders=False)
        predictions = self.model.predict(X)
        
        # Calculate confidence based on prediction variance
        # This is a simple heuristic - in practice you might use prediction intervals
        confidence = np.clip(100 - np.abs(predictions - 50), 20, 95) / 100
        
        return np.clip(predictions, 0, 100), confidence
    
    def explain_prediction(self, df: pd.DataFrame, sample_idx: int = 0) -> Dict[str, Any]:
        """Provide explanation for a single prediction using SHAP."""
        X, feature_cols = self.prepare_features(df, fit_encoders=False)
        
        # Create SHAP explainer
        explainer = shap.TreeExplainer(self.model)
        shap_values = explainer.shap_values(X[sample_idx:sample_idx+1])
        
        # Get feature importance
        feature_importance = dict(zip(feature_cols, shap_values[0]))
        
        return {
            'prediction': self.model.predict(X[sample_idx:sample_idx+1])[0],
            'feature_importance': feature_importance,
            'base_value': explainer.expected_value
        }
    
    def get_feature_importance(self) -> Dict[str, float]:
        """Get global feature importance."""
        importance = self.model.feature_importance(importance_type='gain')
        return dict(zip(self.feature_names, importance))

class AnomalyDetectionModel:
    """Anomaly Detection Model combining rule-based and ML approaches."""
    
    def __init__(self):
        self.isolation_forest = IsolationForest(
            contamination=0.1, 
            random_state=42,
            n_estimators=100
        )
        self.one_class_svm = OneClassSVM(
            nu=0.1, 
            kernel='rbf',
            gamma='scale'
        )
        self.scaler = StandardScaler()
        self.feature_names = None
        self.thresholds = {
            'distance_from_itinerary': 500,  # meters
            'time_since_last_fix': 1800,  # 30 minutes
            'prolonged_inactivity': 3600,  # 1 hour of no movement
            'high_risk_area': 0.7,  # risk score threshold
            'battery_critical': 10  # battery percentage
        }
        
    def prepare_features(self, df: pd.DataFrame, fit_scaler: bool = False) -> np.ndarray:
        """Prepare features for anomaly detection."""
        feature_cols = [
            'distance_from_itinerary', 'time_since_last_fix', 'avg_speed_last_15min',
            'area_risk_score', 'days_into_trip'
        ]
        
        # Add derived features
        df_processed = df.copy()
        df_processed['speed_variance'] = df_processed.groupby('tourist_id')['avg_speed_last_15min'].transform('std').fillna(0)
        df_processed['location_consistency'] = 1.0 / (1.0 + df_processed['distance_from_itinerary'])
        
        feature_cols.extend(['speed_variance', 'location_consistency'])
        
        # Select features
        available_cols = [col for col in feature_cols if col in df_processed.columns]
        X = df_processed[available_cols].fillna(0)
        
        if fit_scaler:
            X_scaled = self.scaler.fit_transform(X)
            self.feature_names = available_cols
        else:
            X_scaled = self.scaler.transform(X)
            
        return X_scaled, available_cols
    
    def train(self, train_df: pd.DataFrame) -> Dict[str, Any]:
        """Train anomaly detection models."""
        print("Training anomaly detection models...")
        X, feature_cols = self.prepare_features(train_df, fit_scaler=True)
        
        # Train models
        self.isolation_forest.fit(X)
        self.one_class_svm.fit(X)
        
        # Evaluate on training data
        if_scores = self.isolation_forest.decision_function(X)
        svm_scores = self.one_class_svm.decision_function(X)
        
        metrics = {
            'isolation_forest_outlier_ratio': np.sum(self.isolation_forest.predict(X) == -1) / len(X),
            'svm_outlier_ratio': np.sum(self.one_class_svm.predict(X) == -1) / len(X),
            'if_score_mean': np.mean(if_scores),
            'svm_score_mean': np.mean(svm_scores)
        }
        
        print("Anomaly detection training complete!")
        return metrics
    
    def detect_anomalies(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Detect anomalies in location data."""
        anomalies = []
        
        for idx, row in df.iterrows():
            alert = {
                'tourist_id': row['tourist_id'],
                'timestamp': row['timestamp'],
                'anomaly': False,
                'severity': 'info',
                'reasons': [],
                'anomaly_score': 0.0,
                'ml_scores': {}
            }
            
            # Rule-based detection
            rule_anomalies = self._detect_rule_based_anomalies(row)
            
            # ML-based detection
            X, _ = self.prepare_features(pd.DataFrame([row]), fit_scaler=False)
            
            if_score = self.isolation_forest.decision_function(X)[0]
            svm_score = self.one_class_svm.decision_function(X)[0]
            if_anomaly = self.isolation_forest.predict(X)[0] == -1
            svm_anomaly = self.one_class_svm.predict(X)[0] == -1
            
            alert['ml_scores'] = {
                'isolation_forest': float(if_score),
                'svm': float(svm_score)
            }
            
            # Combine rule-based and ML results
            all_reasons = rule_anomalies['reasons']
            ml_anomaly = if_anomaly or svm_anomaly
            
            if ml_anomaly:
                all_reasons.append('ml_detected_anomaly')
                
            # Determine overall severity
            if rule_anomalies['severity'] == 'critical' or (ml_anomaly and len(all_reasons) > 1):
                alert['severity'] = 'critical'
                alert['anomaly'] = True
                alert['anomaly_score'] = max(0.9, abs(min(if_score, svm_score)))
            elif rule_anomalies['severity'] == 'warn' or ml_anomaly:
                alert['severity'] = 'warn'
                alert['anomaly'] = True
                alert['anomaly_score'] = max(0.6, abs(min(if_score, svm_score)))
            elif len(all_reasons) > 0:
                alert['severity'] = 'info'
                alert['anomaly_score'] = 0.3
                
            alert['reasons'] = all_reasons
            anomalies.append(alert)
            
        return anomalies
    
    def _detect_rule_based_anomalies(self, row: pd.Series) -> Dict[str, Any]:
        """Detect rule-based anomalies."""
        reasons = []
        severity = 'info'
        
        # Route deviation
        if row.get('distance_from_itinerary', 0) > self.thresholds['distance_from_itinerary']:
            reasons.append('route_deviation')
            severity = 'warn'
            
        # Communication loss
        if row.get('time_since_last_fix', 0) > self.thresholds['time_since_last_fix']:
            reasons.append('communication_loss')
            if row.get('time_since_last_fix', 0) > 3600:  # More than 1 hour
                severity = 'critical'
            else:
                severity = 'warn'
                
        # Prolonged inactivity
        if row.get('avg_speed_last_15min', 1) == 0:
            reasons.append('prolonged_inactivity')
            severity = 'warn'
            
        # High risk area
        if row.get('area_risk_score', 0) > self.thresholds['high_risk_area']:
            reasons.append('high_risk_area')
            severity = 'warn'
            
        # Night travel in high risk area
        if (row.get('time_of_day_bucket', '') == 'night' and 
            row.get('area_risk_score', 0) > 0.4):
            reasons.append('night_travel_risky_area')
            severity = 'warn'
            
        # SOS flag
        if row.get('sos_flag', False):
            reasons.append('sos_activated')
            severity = 'critical'
            
        # Restricted zone
        if row.get('is_in_restricted_zone', False):
            reasons.append('restricted_zone_entry')
            severity = 'warn'
            
        return {'reasons': reasons, 'severity': severity}

class ModelTrainingPipeline:
    """Complete model training and evaluation pipeline."""
    
    def __init__(self, data_dir: str = "data", models_dir: str = "models"):
        self.data_dir = Path(data_dir)
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(exist_ok=True)
        
        self.safety_model = SafetyScoreModel()
        self.anomaly_model = AnomalyDetectionModel()
        self.metrics = {}
        
    def load_data(self) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """Load training, validation, and test datasets."""
        print("Loading datasets...")
        
        train_df = pd.read_csv(self.data_dir / "train.csv")
        val_df = pd.read_csv(self.data_dir / "val.csv")
        test_df = pd.read_csv(self.data_dir / "test.csv")
        
        print(f"Train: {len(train_df)} samples")
        print(f"Validation: {len(val_df)} samples")
        print(f"Test: {len(test_df)} samples")
        
        return train_df, val_df, test_df
    
    def train_models(self):
        """Train all models."""
        train_df, val_df, test_df = self.load_data()
        
        # Train safety score model
        print("\n=== Training Safety Score Model ===")
        safety_metrics = self.safety_model.train(train_df, val_df)
        self.metrics['safety_score'] = safety_metrics
        
        # Train anomaly detection model
        print("\n=== Training Anomaly Detection Model ===")
        anomaly_metrics = self.anomaly_model.train(train_df)
        self.metrics['anomaly_detection'] = anomaly_metrics
        
        # Evaluate on test set
        print("\n=== Evaluating on Test Set ===")
        self._evaluate_test_set(test_df)
        
    def _evaluate_test_set(self, test_df: pd.DataFrame):
        """Evaluate models on test set."""
        # Safety score evaluation
        test_predictions, test_confidence = self.safety_model.predict(test_df)
        test_rmse = np.sqrt(mean_squared_error(test_df['safety_label'], test_predictions))
        test_mae = mean_absolute_error(test_df['safety_label'], test_predictions)
        test_r2 = r2_score(test_df['safety_label'], test_predictions)
        
        self.metrics['safety_score'].update({
            'test_rmse': test_rmse,
            'test_mae': test_mae,
            'test_r2': test_r2
        })
        
        print(f"Safety Score Test RMSE: {test_rmse:.2f}")
        print(f"Safety Score Test MAE: {test_mae:.2f}")
        print(f"Safety Score Test R²: {test_r2:.3f}")
        
        # Anomaly detection evaluation
        anomalies = self.anomaly_model.detect_anomalies(test_df.head(1000))  # Sample for speed
        critical_alerts = sum(1 for a in anomalies if a['severity'] == 'critical')
        warn_alerts = sum(1 for a in anomalies if a['severity'] == 'warn')
        
        self.metrics['anomaly_detection'].update({
            'test_critical_alerts': critical_alerts,
            'test_warn_alerts': warn_alerts,
            'test_total_alerts': critical_alerts + warn_alerts,
            'test_alert_rate': (critical_alerts + warn_alerts) / len(anomalies)
        })
        
        print(f"Anomaly Detection - Critical: {critical_alerts}, Warnings: {warn_alerts}")
        
    def generate_plots(self):
        """Generate evaluation plots."""
        if not PLOTTING_AVAILABLE:
            print("\n=== Skipping plots (matplotlib not available) ===")
            return
            
        print("\n=== Generating Evaluation Plots ===")
        
        # Feature importance plot
        importance = self.safety_model.get_feature_importance()
        
        plt.figure(figsize=(10, 6))
        features = list(importance.keys())
        values = list(importance.values())
        
        plt.barh(features, values)
        plt.title('Safety Score Model - Feature Importance')
        plt.xlabel('Importance')
        plt.tight_layout()
        plt.savefig(self.models_dir / 'feature_importance.png', dpi=150, bbox_inches='tight')
        plt.close()
        
        print("Feature importance plot saved!")
        
    def save_models(self):
        """Save trained models and artifacts."""
        print("\n=== Saving Models ===")
        
        # Save safety score model
        joblib.dump(self.safety_model, self.models_dir / 'safety_score_model.joblib')
        
        # Save anomaly detection model
        joblib.dump(self.anomaly_model, self.models_dir / 'anomaly_detection_model.joblib')
        
        # Save metrics
        with open(self.models_dir / 'training_metrics.json', 'w') as f:
            json.dump(self.metrics, f, indent=2)
            
        # Save model metadata
        metadata = {
            'created_at': datetime.now().isoformat(),
            'safety_model_version': 'v1.0',
            'anomaly_model_version': 'v1.0',
            'framework_versions': {
                'lightgbm': lgb.__version__,
                'sklearn': '1.3.0',  # Approximate
                'numpy': np.__version__,
                'pandas': pd.__version__
            },
            'model_files': {
                'safety_score': 'safety_score_model.joblib',
                'anomaly_detection': 'anomaly_detection_model.joblib'
            }
        }
        
        with open(self.models_dir / 'model_metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)
            
        print(f"Models saved to {self.models_dir}/")
        
    def generate_model_card(self):
        """Generate model card documentation."""
        model_card = f"""# Tourist Safety AI Model Card

## Model Overview
- **Safety Score Model**: LightGBM regression model predicting tourist safety scores (0-100)
- **Anomaly Detection Model**: Hybrid approach combining rule-based and ML (Isolation Forest + One-Class SVM)
- **Created**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Performance Metrics

### Safety Score Model
- Test RMSE: {self.metrics['safety_score'].get('test_rmse', 'N/A'):.2f}
- Test MAE: {self.metrics['safety_score'].get('test_mae', 'N/A'):.2f}
- Test R²: {self.metrics['safety_score'].get('test_r2', 'N/A'):.3f}

### Anomaly Detection Model
- Alert Rate: {self.metrics['anomaly_detection'].get('test_alert_rate', 'N/A'):.1%}
- Critical Alerts: {self.metrics['anomaly_detection'].get('test_critical_alerts', 'N/A')}
- Warning Alerts: {self.metrics['anomaly_detection'].get('test_warn_alerts', 'N/A')}

## Features Used
### Safety Score Model
- distance_from_itinerary: Distance from planned route (meters)
- time_since_last_fix: Time since last GPS update (seconds)
- avg_speed_last_15min: Average speed in last 15 minutes (m/s)
- area_risk_score: Risk score of current location (0-1)
- time_of_day_bucket: Time period (morning/afternoon/evening/night)
- age: Tourist age
- days_into_trip: Days since trip started
- Other contextual features

### Anomaly Detection Model
- Rule-based thresholds for route deviation, communication loss, high-risk areas
- ML models trained on location patterns and behavioral features
- Combines multiple signals for robust detection

## Intended Use
- **Primary**: Real-time safety monitoring of tourists
- **Secondary**: Historical analysis and risk assessment
- **Users**: Tourism safety operators, emergency responders

## Limitations
- Models trained on synthetic data - may not capture all real-world patterns
- Performance may vary across different geographic regions
- Requires calibration with actual incident data
- Privacy considerations with location tracking

## Ethical Considerations
- Location data must be handled securely
- False positives may cause unnecessary alarm
- False negatives may miss actual emergencies
- Bias considerations across different tourist demographics

## Monitoring & Maintenance
- Monitor model performance metrics in production
- Retrain periodically with new data
- Calibrate thresholds based on operational feedback
- Update risk maps and area classifications regularly
"""

        with open(self.models_dir / 'MODEL_CARD.md', 'w') as f:
            f.write(model_card)
            
        print("Model card generated!")
        
    def run_full_pipeline(self):
        """Run the complete training pipeline."""
        print("🚀 Starting Tourist Safety AI Model Training Pipeline")
        print("=" * 60)
        
        self.train_models()
        self.generate_plots()
        self.save_models()
        self.generate_model_card()
        
        print("\n✅ Training Pipeline Complete!")
        print(f"📁 Models and artifacts saved to: {self.models_dir}")
        print("\n📊 Final Metrics:")
        for model_name, metrics in self.metrics.items():
            print(f"\n{model_name.upper()}:")
            for metric, value in metrics.items():
                if isinstance(value, float):
                    print(f"  {metric}: {value:.3f}")
                else:
                    print(f"  {metric}: {value}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Train tourist safety models")
    parser.add_argument("--data-dir", type=str, default="data",
                       help="Directory containing training data")
    parser.add_argument("--models-dir", type=str, default="models",
                       help="Directory to save trained models")
    
    args = parser.parse_args()
    
    pipeline = ModelTrainingPipeline(args.data_dir, args.models_dir)
    pipeline.run_full_pipeline()