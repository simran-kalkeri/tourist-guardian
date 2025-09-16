const mongoose = require('mongoose')
const crypto = require('crypto')

// Anomaly Detection Schema
const AnomalyDetectionSchema = new mongoose.Schema({
  touristId: { type: Number, required: true, index: true },
  anomalyType: { 
    type: String, 
    enum: ['gps_dropout', 'long_inactivity', 'route_deviation', 'speed_anomaly', 'location_anomaly'],
    required: true 
  },
  severity: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  confidence: { type: Number, min: 0, max: 1, required: true },
  description: { type: String, required: true },
  evidence: {
    location: {
      latitude: Number,
      longitude: Number,
      accuracy: Number,
      timestamp: Date
    },
    context: {
      lastKnownLocation: {
        latitude: Number,
        longitude: Number,
        timestamp: Date
      },
      expectedLocation: {
        latitude: Number,
        longitude: Number,
        timestamp: Date
      },
      timeSinceLastUpdate: Number, // minutes
      distanceFromExpected: Number, // km
      speedAnomaly: Number, // km/h
      itineraryDeviation: Number // km
    },
    features: {
      speed: Number,
      acceleration: Number,
      direction: Number,
      stopDuration: Number,
      routeConsistency: Number
    }
  },
  status: { 
    type: String, 
    enum: ['detected', 'investigating', 'resolved', 'false_positive'],
    default: 'detected'
  },
  alertSent: { type: Boolean, default: false },
  blockchainTxHash: { type: String },
  resolvedBy: { type: String },
  resolvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
})

// Indexes for efficient querying
AnomalyDetectionSchema.index({ touristId: 1, createdAt: -1 })
AnomalyDetectionSchema.index({ anomalyType: 1, severity: 1 })
AnomalyDetectionSchema.index({ status: 1, alertSent: 1 })

const AnomalyDetection = mongoose.model('AnomalyDetection', AnomalyDetectionSchema)

class AnomalyDetectorService {
  constructor() {
    this.rules = {
      gpsDropoutThreshold: 30, // minutes
      longInactivityThreshold: 120, // minutes
      routeDeviationThreshold: 5, // km
      speedAnomalyThreshold: 80, // km/h
      minConfidence: 0.6
    }
    
    this.touristStates = new Map() // In-memory state tracking
    this.initialized = false
  }

  async initialize() {
    try {
      console.log('🤖 Initializing Anomaly Detection Service...')
      this.initialized = true
      console.log('✅ Anomaly Detection Service initialized')
    } catch (error) {
      console.error('❌ Anomaly Detection Service initialization failed:', error)
      this.initialized = false
    }
  }

  // Main anomaly detection method
  async detectAnomalies(touristId, locationData, itinerary = []) {
    if (!this.initialized) {
      console.warn('⚠️ Anomaly detector not initialized')
      return []
    }

    const anomalies = []
    const currentTime = new Date()
    const { latitude, longitude, accuracy, timestamp } = locationData

    // Get or create tourist state
    let touristState = this.touristStates.get(touristId)
    if (!touristState) {
      touristState = {
        touristId,
        lastLocation: null,
        lastUpdate: null,
        expectedLocation: null,
        speedHistory: [],
        routeHistory: [],
        stopStartTime: null,
        isMoving: false
      }
      this.touristStates.set(touristId, touristState)
    }

    // Update tourist state
    const previousLocation = touristState.lastLocation
    touristState.lastLocation = { latitude, longitude, accuracy, timestamp }
    touristState.lastUpdate = currentTime

    // Calculate features
    const features = this.calculateFeatures(touristState, previousLocation, itinerary)
    
    // Run anomaly detection rules
    const detectedAnomalies = await this.runDetectionRules(touristId, touristState, features, itinerary)
    
    // Save detected anomalies
    for (const anomaly of detectedAnomalies) {
      try {
        const anomalyDoc = new AnomalyDetection(anomaly)
        await anomalyDoc.save()
        anomalies.push(anomalyDoc)
        
        // Send alert if high severity
        if (anomaly.severity === 'high' || anomaly.severity === 'critical') {
          await this.sendAnomalyAlert(anomalyDoc)
        }
      } catch (error) {
        console.error('Error saving anomaly:', error)
      }
    }

    return anomalies
  }

  // Calculate behavioral features
  calculateFeatures(touristState, previousLocation, itinerary) {
    const features = {
      speed: 0,
      acceleration: 0,
      direction: 0,
      stopDuration: 0,
      routeConsistency: 0
    }

    if (previousLocation && touristState.lastLocation) {
      // Calculate speed (km/h)
      const distance = this.calculateDistance(
        previousLocation.latitude, previousLocation.longitude,
        touristState.lastLocation.latitude, touristState.lastLocation.longitude
      )
      const timeDiff = (touristState.lastLocation.timestamp - previousLocation.timestamp) / (1000 * 60 * 60) // hours
      features.speed = timeDiff > 0 ? distance / timeDiff : 0

      // Calculate acceleration
      if (touristState.speedHistory.length > 0) {
        const lastSpeed = touristState.speedHistory[touristState.speedHistory.length - 1]
        features.acceleration = features.speed - lastSpeed
      }

      // Calculate direction (bearing)
      features.direction = this.calculateBearing(
        previousLocation.latitude, previousLocation.longitude,
        touristState.lastLocation.latitude, touristState.lastLocation.longitude
      )

      // Update speed history
      touristState.speedHistory.push(features.speed)
      if (touristState.speedHistory.length > 10) {
        touristState.speedHistory.shift()
      }
    }

    // Calculate stop duration
    if (features.speed < 1) { // Consider stopped if speed < 1 km/h
      if (!touristState.stopStartTime) {
        touristState.stopStartTime = touristState.lastUpdate
      }
      features.stopDuration = (touristState.lastUpdate - touristState.stopStartTime) / (1000 * 60) // minutes
    } else {
      touristState.stopStartTime = null
    }

    // Calculate route consistency
    if (itinerary.length > 0) {
      features.routeConsistency = this.calculateRouteConsistency(
        touristState.lastLocation, itinerary, touristState.routeHistory
      )
    }

    return features
  }

  // Run detection rules
  async runDetectionRules(touristId, touristState, features, itinerary) {
    const anomalies = []
    const currentTime = new Date()

    // Rule 1: GPS Dropout Detection
    if (touristState.lastUpdate) {
      const timeSinceLastUpdate = (currentTime - touristState.lastUpdate) / (1000 * 60) // minutes
      if (timeSinceLastUpdate > this.rules.gpsDropoutThreshold) {
        anomalies.push({
          touristId,
          anomalyType: 'gps_dropout',
          severity: timeSinceLastUpdate > 60 ? 'critical' : 'high',
          confidence: Math.min(0.9, timeSinceLastUpdate / 60),
          description: `GPS signal lost for ${Math.round(timeSinceLastUpdate)} minutes`,
          evidence: {
            location: touristState.lastLocation,
            context: {
              lastKnownLocation: touristState.lastLocation,
              timeSinceLastUpdate: Math.round(timeSinceLastUpdate)
            },
            features
          }
        })
      }
    }

    // Rule 2: Long Inactivity Detection
    if (features.stopDuration > this.rules.longInactivityThreshold) {
      anomalies.push({
        touristId,
        anomalyType: 'long_inactivity',
        severity: features.stopDuration > 240 ? 'critical' : 'high',
        confidence: Math.min(0.9, features.stopDuration / 240),
        description: `No movement detected for ${Math.round(features.stopDuration)} minutes`,
        evidence: {
          location: touristState.lastLocation,
          context: {
            lastKnownLocation: touristState.lastLocation,
            stopDuration: Math.round(features.stopDuration)
          },
          features
        }
      })
    }

    // Rule 3: Route Deviation Detection
    if (itinerary.length > 0 && features.routeConsistency < 0.5) {
      const expectedLocation = this.getExpectedLocation(itinerary, touristState.lastLocation.timestamp)
      if (expectedLocation) {
        const deviation = this.calculateDistance(
          touristState.lastLocation.latitude, touristState.lastLocation.longitude,
          expectedLocation.latitude, expectedLocation.longitude
        )
        
        if (deviation > this.rules.routeDeviationThreshold) {
          anomalies.push({
            touristId,
            anomalyType: 'route_deviation',
            severity: deviation > 20 ? 'critical' : 'high',
            confidence: Math.min(0.9, deviation / 20),
            description: `Significant route deviation: ${Math.round(deviation)}km from expected path`,
            evidence: {
              location: touristState.lastLocation,
              context: {
                lastKnownLocation: touristState.lastLocation,
                expectedLocation,
                distanceFromExpected: Math.round(deviation),
                itineraryDeviation: Math.round(deviation)
              },
              features
            }
          })
        }
      }
    }

    // Rule 4: Speed Anomaly Detection
    if (features.speed > this.rules.speedAnomalyThreshold) {
      anomalies.push({
        touristId,
        anomalyType: 'speed_anomaly',
        severity: features.speed > 120 ? 'critical' : 'high',
        confidence: Math.min(0.9, features.speed / 120),
        description: `Unusual speed detected: ${Math.round(features.speed)} km/h`,
        evidence: {
          location: touristState.lastLocation,
          context: {
            lastKnownLocation: touristState.lastLocation,
            speedAnomaly: Math.round(features.speed)
          },
          features
        }
      })
    }

    // Rule 5: Location Anomaly (using ML-like scoring)
    const locationAnomalyScore = this.calculateLocationAnomalyScore(touristState, features, itinerary)
    if (locationAnomalyScore > 0.7) {
      anomalies.push({
        touristId,
        anomalyType: 'location_anomaly',
        severity: locationAnomalyScore > 0.9 ? 'critical' : 'high',
        confidence: locationAnomalyScore,
        description: `Suspicious location pattern detected (score: ${locationAnomalyScore.toFixed(2)})`,
        evidence: {
          location: touristState.lastLocation,
          context: {
            lastKnownLocation: touristState.lastLocation,
            anomalyScore: locationAnomalyScore
          },
          features
        }
      })
    }

    return anomalies.filter(anomaly => anomaly.confidence >= this.rules.minConfidence)
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // Calculate bearing between two points
  calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180
    const lat1Rad = lat1 * Math.PI / 180
    const lat2Rad = lat2 * Math.PI / 180
    const y = Math.sin(dLon) * Math.cos(lat2Rad)
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon)
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
  }

  // Calculate route consistency score
  calculateRouteConsistency(currentLocation, itinerary, routeHistory) {
    if (itinerary.length === 0) return 1

    // Find closest itinerary point
    let minDistance = Infinity
    let closestPoint = null
    
    for (const point of itinerary) {
      const distance = this.calculateDistance(
        currentLocation.latitude, currentLocation.longitude,
        point.lat, point.lng
      )
      if (distance < minDistance) {
        minDistance = distance
        closestPoint = point
      }
    }

    // Calculate consistency based on distance from expected route
    const maxExpectedDistance = 10 // km
    return Math.max(0, 1 - (minDistance / maxExpectedDistance))
  }

  // Get expected location based on itinerary and time
  getExpectedLocation(itinerary, timestamp) {
    if (itinerary.length === 0) return null

    // Simple linear interpolation based on time
    // In a real system, this would be more sophisticated
    const now = new Date(timestamp)
    const hour = now.getHours()
    
    // Assume tourists follow itinerary roughly by time of day
    const progress = (hour - 6) / 12 // 6 AM to 6 PM
    const index = Math.floor(progress * (itinerary.length - 1))
    const point = itinerary[Math.max(0, Math.min(index, itinerary.length - 1))]
    
    return {
      latitude: point.lat,
      longitude: point.lng,
      timestamp
    }
  }

  // Calculate location anomaly score (ML-like)
  calculateLocationAnomalyScore(touristState, features, itinerary) {
    let score = 0

    // Speed anomaly contribution
    if (features.speed > 50) score += 0.3
    if (features.speed > 100) score += 0.2

    // Route consistency contribution
    score += (1 - features.routeConsistency) * 0.4

    // Stop duration contribution
    if (features.stopDuration > 60) score += 0.2
    if (features.stopDuration > 180) score += 0.3

    // Acceleration anomaly contribution
    if (Math.abs(features.acceleration) > 20) score += 0.2

    return Math.min(1, score)
  }

  // Send anomaly alert
  async sendAnomalyAlert(anomaly) {
    try {
      // Create alert hash for blockchain
      const alertHash = crypto.createHash('sha256')
        .update(JSON.stringify({
          touristId: anomaly.touristId,
          anomalyType: anomaly.anomalyType,
          severity: anomaly.severity,
          timestamp: anomaly.createdAt,
          location: anomaly.evidence.location
        }))
        .digest('hex')

      // Mark as alert sent
      anomaly.alertSent = true
      await anomaly.save()

      console.log(`🚨 Anomaly Alert: ${anomaly.anomalyType} for tourist ${anomaly.touristId} (${anomaly.severity})`)
      console.log(`   Alert Hash: ${alertHash}`)
      console.log(`   Description: ${anomaly.description}`)

      return { success: true, alertHash }
    } catch (error) {
      console.error('Error sending anomaly alert:', error)
      return { success: false, error: error.message }
    }
  }

  // Get anomalies for tourist
  async getTouristAnomalies(touristId, limit = 50) {
    try {
      return await AnomalyDetection.find({ touristId })
        .sort({ createdAt: -1 })
        .limit(limit)
    } catch (error) {
      console.error('Error fetching tourist anomalies:', error)
      return []
    }
  }

  // Get all anomalies with filters
  async getAllAnomalies(filters = {}) {
    try {
      const query = {}
      
      if (filters.touristId) query.touristId = filters.touristId
      if (filters.anomalyType) query.anomalyType = filters.anomalyType
      if (filters.severity) query.severity = filters.severity
      if (filters.status) query.status = filters.status
      if (filters.alertSent !== undefined) query.alertSent = filters.alertSent

      return await AnomalyDetection.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 100)
    } catch (error) {
      console.error('Error fetching anomalies:', error)
      return []
    }
  }

  // Get anomaly statistics
  async getAnomalyStats() {
    try {
      const stats = await AnomalyDetection.aggregate([
        {
          $group: {
            _id: '$anomalyType',
            count: { $sum: 1 },
            avgConfidence: { $avg: '$confidence' },
            criticalCount: {
              $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
            }
          }
        }
      ])

      const severityStats = await AnomalyDetection.aggregate([
        {
          $group: {
            _id: '$severity',
            count: { $sum: 1 }
          }
        }
      ])

      return {
        byType: stats,
        bySeverity: severityStats,
        total: await AnomalyDetection.countDocuments(),
        unresolved: await AnomalyDetection.countDocuments({ status: 'detected' })
      }
    } catch (error) {
      console.error('Error getting anomaly stats:', error)
      return { byType: [], bySeverity: [], total: 0, unresolved: 0 }
    }
  }

  // Resolve anomaly
  async resolveAnomaly(anomalyId, resolvedBy, status = 'resolved') {
    try {
      const anomaly = await AnomalyDetection.findByIdAndUpdate(
        anomalyId,
        {
          status,
          resolvedBy,
          resolvedAt: new Date()
        },
        { new: true }
      )

      return { success: true, anomaly }
    } catch (error) {
      console.error('Error resolving anomaly:', error)
      return { success: false, error: error.message }
    }
  }
}

// Export singleton instance
const anomalyDetectorService = new AnomalyDetectorService()

module.exports = {
  anomalyDetectorService,
  AnomalyDetection
}






