/**
 * ML Service API client for tourist safety predictions
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

class MLService {
  /**
   * Check if ML service is healthy
   */
  async checkHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ml/health`);
      return await response.json();
    } catch (error) {
      console.error('ML health check failed:', error);
      return { status: 'error', message: 'ML service unavailable' };
    }
  }

  /**
   * Predict safety scores and anomalies for location data
   * @param {Array} records - Array of location tick objects
   * @returns {Promise<Object>} Prediction results
   */
  async predict(records) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ml/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('ML prediction failed:', error);
      throw error;
    }
  }

  /**
   * Create a location tick from tourist data
   * @param {Object} tourist - Tourist object with location data
   * @param {Object} options - Additional options
   * @returns {Object} Location tick for ML prediction
   */
  createLocationTick(tourist, options = {}) {
    const now = new Date();
    const hour = now.getHours();
    
    // Determine time of day bucket
    let timeOfDayBucket = 'morning';
    if (hour >= 12 && hour < 18) timeOfDayBucket = 'afternoon';
    else if (hour >= 18 && hour < 22) timeOfDayBucket = 'evening';
    else if (hour >= 22 || hour < 6) timeOfDayBucket = 'night';

    // Calculate days into trip
    const tripStart = new Date(tourist.tripStart);
    const daysIntoTrip = Math.floor((now - tripStart) / (1000 * 60 * 60 * 24));
    const tripDuration = Math.floor((new Date(tourist.tripEnd) - tripStart) / (1000 * 60 * 60 * 24));

    // Simple area risk calculation (can be enhanced)
    const areaRisk = this.calculateAreaRisk(tourist.latitude, tourist.longitude);

    return {
      tourist_id: tourist.blockchainId.toString(),
      timestamp: now.toISOString(),
      latitude: tourist.latitude || 0,
      longitude: tourist.longitude || 0,
      speed_m_s: options.speed || 0,
      accuracy_m: options.accuracy || 10,
      provider: options.provider || 'gps',
      battery_pct: options.battery || 100,
      device_status: options.deviceStatus || 'active',
      time_of_day_bucket: timeOfDayBucket,
      distance_from_itinerary: options.distanceFromItinerary || 0,
      time_since_last_fix: options.timeSinceLastFix || 0,
      avg_speed_last_15min: options.avgSpeed || 0,
      area_risk_score: areaRisk,
      prior_incidents_count: options.priorIncidents || 0,
      days_into_trip: Math.max(0, daysIntoTrip),
      is_in_restricted_zone: areaRisk > 0.6,
      sos_flag: tourist.sosActive || false,
      age: options.age || 30,
      sex_encoded: options.sexEncoded || 0, // M=0, F=1, Other=2
      days_trip_duration: tripDuration
    };
  }

  /**
   * Calculate area risk score based on coordinates
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {number} Risk score between 0 and 1
   */
  calculateAreaRisk(lat, lng) {
    if (lat === 0 && lng === 0) return 0.5; // Unknown location
    
    // Simple risk zones (can be enhanced with real data)
    if (lat > 29) return 0.1; // Mountains - low risk
    if (lat > 28.5) return 0.3; // Downtown - medium risk
    if (lat > 28) return 0.2; // Suburbs - low-medium risk
    return 0.8; // Outskirts - high risk
  }

  /**
   * Get safety status from prediction result
   * @param {Object} prediction - ML prediction result
   * @returns {Object} Safety status with color and message
   */
  getSafetyStatus(prediction) {
    const score = prediction.predicted_safety;
    const anomaly = prediction.anomaly;

    if (anomaly.anomaly && anomaly.severity === 'critical') {
      return { status: 'critical', color: 'red', message: 'Critical Alert' };
    }
    
    if (anomaly.anomaly && anomaly.severity === 'warn') {
      return { status: 'warning', color: 'orange', message: 'Warning' };
    }

    if (score >= 80) {
      return { status: 'safe', color: 'green', message: 'Safe' };
    } else if (score >= 60) {
      return { status: 'moderate', color: 'yellow', message: 'Moderate Risk' };
    } else {
      return { status: 'high_risk', color: 'red', message: 'High Risk' };
    }
  }
}

export default new MLService();














