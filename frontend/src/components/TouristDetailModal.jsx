"use client"

import { useState, useEffect } from "react"
import { X, MapPin, Clock, Shield, AlertTriangle, Phone, Calendar, User, Activity } from "lucide-react"

const TouristDetailModal = ({ tourist, isOpen, onClose }) => {
  const [recentTicks, setRecentTicks] = useState([])
  const [safetyScore, setSafetyScore] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && tourist) {
      fetchRecentTicks()
      fetchSafetyScore()
    }
  }, [isOpen, tourist])

  const fetchRecentTicks = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/tourists/${tourist.blockchainId}/recent-ticks`)
      const result = await response.json()
      if (result.success) {
        setRecentTicks(result.ticks || [])
      }
    } catch (error) {
      console.error("Failed to fetch recent ticks:", error)
    }
  }

  const fetchSafetyScore = async () => {
    setLoading(true)
    try {
      const response = await fetch("http://localhost:5000/api/ml/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: [{
            tourist_id: tourist.blockchainId.toString(),
            timestamp: new Date().toISOString(),
            latitude: tourist.latitude || 28.6139,
            longitude: tourist.longitude || 77.2090,
            speed_m_s: 1.0,
            time_of_day_bucket: "afternoon",
            distance_from_itinerary: 0,
            time_since_last_fix: 60,
            avg_speed_last_15min: 1.0,
            area_risk_score: 0.3,
            prior_incidents_count: 0,
            days_into_trip: 1,
            is_in_restricted_zone: false,
            sos_flag: tourist.sosActive || false,
            age: 30,
            sex_encoded: 0,
            days_trip_duration: 5
          }]
        })
      })
      const result = await response.json()
      if (result.success && result.results.length > 0) {
        setSafetyScore(result.results[0])
      }
    } catch (error) {
      console.error("Failed to fetch safety score:", error)
    } finally {
      setLoading(false)
    }
  }

  const getSafetyBandColor = (band) => {
    switch (band) {
      case 'high': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (!isOpen || !tourist) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{tourist.name}</h2>
              <p className="text-sm text-gray-500">ID: #{tourist.blockchainId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{tourist.emergencyContact}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {new Date(tourist.tripStart).toLocaleDateString()} - {new Date(tourist.tripEnd).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {tourist.latitude && tourist.longitude 
                      ? `${tourist.latitude.toFixed(4)}, ${tourist.longitude.toFixed(4)}`
                      : "No location data"
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Safety Score */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Safety Assessment</h3>
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-600">Calculating safety score...</span>
                </div>
              ) : safetyScore ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSafetyBandColor(safetyScore.safety_band)}`}>
                      {safetyScore.safety_band.toUpperCase()}
                    </span>
                    <span className="text-lg font-semibold text-gray-900">
                      {Math.round(safetyScore.predicted_safety)}/100
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Confidence: {Math.round(safetyScore.confidence * 100)}%
                  </div>
                  {safetyScore.explanations && safetyScore.explanations.factors.length > 0 && (
                    <div className="text-sm text-gray-600">
                      <div className="font-medium mb-1">Risk Factors:</div>
                      <div className="text-xs">{safetyScore.explanations.summary}</div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={fetchSafetyScore}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
                >
                  Calculate Safety Score
                </button>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {recentTicks.length === 0 ? (
                <p className="text-gray-500 text-sm">No recent activity data</p>
              ) : (
                recentTicks.slice().reverse().map((tick, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Activity className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {tick.latitude.toFixed(4)}, {tick.longitude.toFixed(4)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(tick.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {Math.round((Date.now() - new Date(tick.timestamp).getTime()) / 60000)}m ago
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {tourist.sosActive ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  SOS Alert Active
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <Shield className="w-4 h-4 mr-1" />
                  Safe
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600">
              Last updated: {new Date(tourist.updatedAt).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TouristDetailModal
