import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Polygon, Circle, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, AlertTriangle, Shield, Info, Calendar, Eye, EyeOff } from 'lucide-react'
import { Badge } from './ui/badge'

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
})

// Component to update map view when zones change (only on initial load)
const MapUpdater = ({ zones, shouldAutoFit = true }) => {
  const map = useMap()
  const [hasInitialized, setHasInitialized] = useState(false)

  useEffect(() => {
    // Only auto-fit bounds on initial load or when explicitly requested
    if (shouldAutoFit && !hasInitialized && zones.length > 0) {
      const validZones = zones.filter(zone => 
        (zone.coordinates && zone.coordinates.length > 0) || 
        (zone.latitude && zone.longitude)
      )

      if (validZones.length > 0) {
        // Calculate bounds for all zones
        const allLatLngs = []
        
        validZones.forEach(zone => {
          if (zone.coordinates && zone.coordinates.length > 0) {
            // For polygons
            zone.coordinates.forEach(coord => {
              allLatLngs.push([coord[0], coord[1]])
            })
          } else if (zone.latitude && zone.longitude) {
            // For circular zones
            allLatLngs.push([zone.latitude, zone.longitude])
          }
        })

        if (allLatLngs.length > 0) {
          const bounds = L.latLngBounds(allLatLngs)
          map.fitBounds(bounds, { padding: [20, 20] })
          setHasInitialized(true)
        }
      }
    }
  }, [zones, map, shouldAutoFit, hasInitialized])

  return null
}

// Get zone color based on risk level
const getZoneColor = (riskLevel) => {
  switch (riskLevel?.toLowerCase()) {
    case 'high':
      return '#dc2626' // Red
    case 'moderate':
    case 'medium':
      return '#f59e0b' // Yellow/Orange
    case 'low':
    case 'safe':
      return '#10b981' // Green
    default:
      return '#6b7280' // Gray
  }
}

// Get zone opacity based on alert status
const getZoneOpacity = (alertEnabled) => {
  return alertEnabled ? 0.3 : 0.15
}

// Zone popup component
const ZonePopup = ({ zone }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  const getZoneTypeBadge = (riskLevel) => {
    if (!riskLevel) return <Badge className="bg-gray-100 text-gray-800">📍 UNKNOWN</Badge>
    
    const types = {
      high: { color: 'bg-red-100 text-red-800', icon: '🚨' },
      moderate: { color: 'bg-orange-100 text-orange-800', icon: '⚠️' },
      medium: { color: 'bg-orange-100 text-orange-800', icon: '⚠️' },
      low: { color: 'bg-green-100 text-green-800', icon: '✅' },
      safe: { color: 'bg-green-100 text-green-800', icon: '✅' }
    }
    const type = types[riskLevel.toLowerCase()] || { color: 'bg-gray-100 text-gray-800', icon: '📍' }
    
    return (
      <Badge className={type.color}>
        <span className="mr-1">{type.icon}</span>
        {riskLevel.toUpperCase()}
      </Badge>
    )
  }

  return (
    <div className="p-4 min-w-64 max-w-80">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-base">
            {zone.name || 'Unnamed Zone'}
          </h3>
          <div className="mt-1">
            {getZoneTypeBadge(zone.risk_level)}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {zone.alert_enabled ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <Eye className="w-3 h-3 mr-1" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              <EyeOff className="w-3 h-3 mr-1" />
              Inactive
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-start gap-2 text-sm">
          <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <span className="text-gray-600">
            {zone.description || 'No description available'}
          </span>
        </div>

        {zone.latitude && zone.longitude && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">
              {zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)}
            </span>
          </div>
        )}

        {zone.radius && (
          <div className="flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">
              Radius: {zone.radius}m
            </span>
          </div>
        )}

        {zone.last_updated && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">
              Updated: {formatDate(zone.last_updated)}
            </span>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Zone ID: {zone._id ? zone._id.slice(-8) : 'N/A'}</span>
          {zone.alert_count && (
            <span className="text-red-600 font-medium">
              {zone.alert_count} alerts
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

const RiskZoneMap = ({ zones = [], loading = false, onZoneSelect = null, onRefresh = null }) => {
  const [showInactiveZones, setShowInactiveZones] = useState(true)
  
  // Default center (Northeast India - Guwahati)
  const defaultCenter = [26.1445, 91.7362]
  const defaultZoom = 7

  // Filter zones based on settings
  const visibleZones = zones.filter(zone => 
    showInactiveZones || zone.alert_enabled
  )

  const displayZones = visibleZones

  const activeZones = displayZones.filter(zone => zone.alert_enabled)
  const inactiveZones = displayZones.filter(zone => !zone.alert_enabled)
  const highRiskZones = displayZones.filter(zone => zone.risk_level === 'high')
  const moderateRiskZones = displayZones.filter(zone => zone.risk_level === 'moderate' || zone.risk_level === 'medium')
  const lowRiskZones = displayZones.filter(zone => zone.risk_level === 'low' || zone.risk_level === 'safe')

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Map Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Risk Zones Map</h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                <span className="text-gray-600">High ({highRiskZones.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-gray-600">Moderate ({moderateRiskZones.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                <span className="text-gray-600">Low ({lowRiskZones.length})</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="px-3 py-1 rounded-md text-xs font-medium transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200"
                  disabled={loading}
                >
                  <MapPin className="w-3 h-3 mr-1 inline" />
                  {loading ? "Updating..." : "Refresh Zones"}
                </button>
              )}
              <button
                onClick={() => setShowInactiveZones(!showInactiveZones)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  showInactiveZones 
                    ? "bg-gray-100 text-gray-700" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <EyeOff className="w-3 h-3 mr-1 inline" />
                {showInactiveZones ? "Hide" : "Show"} Inactive
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="h-[600px] relative">
        {loading ? (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading risk zones...</p>
            </div>
          </div>
        ) : displayZones.length === 0 ? (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No risk zones available</p>
              <p className="text-sm text-gray-400 mt-1">Add risk zones to see them on the map</p>
            </div>
          </div>
        ) : (
          <MapContainer
            center={defaultCenter}
            zoom={defaultZoom}
            style={{ height: "100%", width: "100%" }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapUpdater zones={displayZones} />

            {displayZones.map((zone) => {
              const color = getZoneColor(zone.risk_level)
              const opacity = getZoneOpacity(zone.alert_enabled)

              // Render polygon zones
              if (zone.coordinates && zone.coordinates.length > 0) {
                return (
                  <Polygon
                    key={zone._id}
                    positions={zone.coordinates}
                    pathOptions={{
                      color: color,
                      fillColor: color,
                      fillOpacity: opacity,
                      weight: zone.alert_enabled ? 2 : 1,
                      dashArray: zone.alert_enabled ? null : "5, 5"
                    }}
                    eventHandlers={{
                      click: () => onZoneSelect && onZoneSelect(zone)
                    }}
                  >
                    <Popup>
                      <ZonePopup zone={zone} />
                    </Popup>
                  </Polygon>
                )
              }
              // Render circular zones
              else if (zone.latitude && zone.longitude) {
                return (
                  <Circle
                    key={zone._id}
                    center={[zone.latitude, zone.longitude]}
                    radius={zone.radius || 500}
                    pathOptions={{
                      color: color,
                      fillColor: color,
                      fillOpacity: opacity,
                      weight: zone.alert_enabled ? 2 : 1,
                      dashArray: zone.alert_enabled ? null : "5, 5"
                    }}
                    eventHandlers={{
                      click: () => onZoneSelect && onZoneSelect(zone)
                    }}
                  >
                    <Popup>
                      <ZonePopup zone={zone} />
                    </Popup>
                  </Circle>
                )
              }
              
              return null
            })}
          </MapContainer>
        )}
      </div>

      {/* Map Statistics */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">{displayZones.length}</p>
            <p className="text-sm text-gray-500">Total Zones</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{activeZones.length}</p>
            <p className="text-sm text-gray-500">Active</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{highRiskZones.length}</p>
            <p className="text-sm text-gray-500">High Risk</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600">{moderateRiskZones.length}</p>
            <p className="text-sm text-gray-500">Moderate Risk</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RiskZoneMap