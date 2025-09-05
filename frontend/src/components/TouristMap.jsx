"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { MapPin, AlertTriangle, User, Phone, Calendar, Shield } from "lucide-react"

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
})

// Custom marker icons
const createCustomIcon = (color, isEmergency = false) => {
  const svgIcon = `
    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <path fill="${color}" stroke="#fff" strokeWidth="2" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 12.5 12.5 28.5 12.5 28.5s12.5-16 12.5-28.5C25 5.6 19.4 0 12.5 0z"/>
      <circle fill="#fff" cx="12.5" cy="12.5" r="6"/>
      ${
        isEmergency
          ? '<path fill="#dc2626" d="M12.5 6l1.5 4.5h4.5l-3.5 2.5 1.5 4.5-3.5-2.5-3.5 2.5 1.5-4.5-3.5-2.5h4.5z"/>'
          : '<circle fill="' + color + '" cx="12.5" cy="12.5" r="4"/>'
      }
    </svg>
  `

  return L.divIcon({
    html: svgIcon,
    className: "custom-marker",
    iconSize: [25, 41],
    iconAnchor: [12.5, 41],
    popupAnchor: [0, -41],
  })
}

// Component to update map view when tourists change
const MapUpdater = ({ tourists }) => {
  const map = useMap()

  useEffect(() => {
    if (tourists.length > 0) {
      const validTourists = tourists.filter((t) => t.latitude !== 0 && t.longitude !== 0)

      if (validTourists.length > 0) {
        const bounds = L.latLngBounds(validTourists.map((t) => [t.latitude, t.longitude]))
        map.fitBounds(bounds, { padding: [20, 20] })
      }
    }
  }, [tourists, map])

  return null
}

// Heatmap effect component
const HeatmapLayer = ({ tourists }) => {
  const map = useMap()

  useEffect(() => {
    // Simple heatmap visualization using circle markers
    const heatmapLayer = L.layerGroup()

    tourists.forEach((tourist) => {
      if (tourist.latitude !== 0 && tourist.longitude !== 0) {
        const circle = L.circle([tourist.latitude, tourist.longitude], {
          color: tourist.sosActive ? "#dc2626" : "#059669",
          fillColor: tourist.sosActive ? "#dc2626" : "#059669",
          fillOpacity: 0.1,
          radius: 500, // 500 meter radius
          weight: 1,
        })
        heatmapLayer.addLayer(circle)
      }
    })

    map.addLayer(heatmapLayer)

    return () => {
      map.removeLayer(heatmapLayer)
    }
  }, [tourists, map])

  return null
}

const TouristMap = ({ tourists, onResetSOS }) => {
  const [showHeatmap, setShowHeatmap] = useState(false)

  // Default center (can be adjusted based on your region)
  const defaultCenter = [28.6139, 77.209] // New Delhi coordinates
  const defaultZoom = 10

  // Filter tourists with valid coordinates
  const validTourists = tourists.filter((tourist) => tourist.latitude !== 0 && tourist.longitude !== 0)

  const TouristPopup = ({ tourist }) => (
    <div className="p-4 min-w-64">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
          <User className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{tourist.name}</h3>
          <p className="text-sm text-gray-500">ID: #{tourist.blockchainId}</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">
            {tourist.latitude.toFixed(4)}, {tourist.longitude.toFixed(4)}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">
            {new Date(tourist.tripStart).toLocaleDateString()} - {new Date(tourist.tripEnd).toLocaleDateString()}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Phone className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">{tourist.emergencyContact}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          {tourist.sosActive ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <AlertTriangle className="w-3 h-3 mr-1" />
              SOS Alert
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <Shield className="w-3 h-3 mr-1" />
              Safe
            </span>
          )}
        </div>

        {tourist.sosActive && (
          <button
            onClick={() => onResetSOS(tourist.blockchainId)}
            className="bg-red-600 text-white px-3 py-1 rounded-md text-xs font-medium hover:bg-red-700 transition-colors"
          >
            Reset SOS
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Map Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-gray-900">Real-time Tourist Locations</h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-600 rounded-full"></div>
                <span className="text-gray-600">Safe ({validTourists.filter((t) => !t.sosActive).length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                <span className="text-gray-600">SOS ({validTourists.filter((t) => t.sosActive).length})</span>
              </div>
            </div>

            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                showHeatmap ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {showHeatmap ? "Hide" : "Show"} Heatmap
            </button>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="h-96 relative">
        {validTourists.length === 0 ? (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No tourist locations available</p>
              <p className="text-sm text-gray-400 mt-1">Locations will appear here once tourists start their trips</p>
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

            <MapUpdater tourists={validTourists} />

            {showHeatmap && <HeatmapLayer tourists={validTourists} />}

            {validTourists.map((tourist) => (
              <Marker
                key={tourist.blockchainId}
                position={[tourist.latitude, tourist.longitude]}
                icon={createCustomIcon(tourist.sosActive ? "#dc2626" : "#059669", tourist.sosActive)}
              >
                <Popup>
                  <TouristPopup tourist={tourist} />
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Map Statistics */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">{validTourists.length}</p>
            <p className="text-sm text-gray-500">Tracked Tourists</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600">{validTourists.filter((t) => !t.sosActive).length}</p>
            <p className="text-sm text-gray-500">Safe</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{validTourists.filter((t) => t.sosActive).length}</p>
            <p className="text-sm text-gray-500">SOS Alerts</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">
              {new Set(validTourists.map((t) => `${Math.floor(t.latitude)},${Math.floor(t.longitude)}`)).size}
            </p>
            <p className="text-sm text-gray-500">Areas</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TouristMap
