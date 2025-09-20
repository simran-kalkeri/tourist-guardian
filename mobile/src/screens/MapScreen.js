import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Button, Alert, Switch } from 'react-native'
import MapView, { Marker, Polygon, Circle } from 'react-native-maps'
import { WebView } from 'react-native-webview'
import * as Location from 'expo-location'
import { Platform } from 'react-native'

// Configurable API base for Expo Go; falls back to emulator/localhost
const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (Platform.OS === 'android' ? 'http://10.1.23.4:5000' : 'http://127.0.0.1:5000')
let WS_URL
try {
  const u = new URL(API_BASE)
  WS_URL = `${u.protocol === 'https:' ? 'wss' : 'ws'}://${u.host}/ws`
} catch {
  WS_URL = 'ws://localhost:5000/ws'
}

// Northeast India bounds (rough) to keep map focused
const NE_BOUNDS = { minLat: 21.5, maxLat: 29.9, minLng: 88.0, maxLng: 97.5 }
const NE_CENTER = { latitude: 26.2006, longitude: 92.9376 } // Guwahati
function isInNE(lat, lng) {
  return lat >= NE_BOUNDS.minLat && lat <= NE_BOUNDS.maxLat && lng >= NE_BOUNDS.minLng && lng <= NE_BOUNDS.maxLng
}

export default function MapScreen({ route }) {
  const { tourist } = route.params
  const touristId = tourist?.blockchainId || tourist?.id
  // Start with general India center instead of NE India specific
  const [coords, setCoords] = useState({ latitude: 20.5937, longitude: 78.9629 })
  const [zones, setZones] = useState([])
  const [tracking, setTracking] = useState(true) // 🔥 Start tracking by default
  const [locationStatus, setLocationStatus] = useState('GPS Not Ready');
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [currentZones, setCurrentZones] = useState([]); // Zones user is currently in
  const [geofenceAlerts, setGeofenceAlerts] = useState([]);
  const wsRef = useRef(null)
  const webviewRef = useRef(null)
  
  // 🔥 Handle geofence alert notifications
  const handleGeofenceAlert = (alertData) => {
    const { zones, tourist, alertRequired } = alertData
    
    if (!zones || zones.length === 0) return
    
    const highRiskZones = zones.filter(z => z.risk_level === 'high')
    const isHighRisk = highRiskZones.length > 0
    const zoneName = zones.map(z => z.name).join(', ')
    
    // Update current zones
    setCurrentZones(zones)
    
    // Add alert to history
    const newAlert = {
      id: Date.now(),
      timestamp: new Date(),
      zones,
      message: `Entered ${isHighRisk ? 'high-risk' : 'risk'} zone: ${zoneName}`,
      severity: isHighRisk ? 'high' : 'medium',
      isHighRisk
    }
    
    setGeofenceAlerts(prev => [newAlert, ...prev.slice(0, 4)]) // Keep last 5 alerts
    
    // Show visual alert
    Alert.alert(
      isHighRisk ? '🚨 HIGH RISK ZONE ALERT!' : '⚠️ Risk Zone Alert',
      `You have entered: ${zoneName}\n\n${isHighRisk ? 'This is a HIGH RISK area. Please exercise extreme caution and consider leaving immediately.' : 'Please be cautious in this area.'}`,
      [
        { text: 'Understood', style: 'default' },
        { text: 'Get Safety Tips', onPress: () => showSafetyTips(zones) }
      ],
      { cancelable: false }
    )
    
    console.log('🚨 Geofence alert processed:', newAlert)
  }
  
  // Show safety tips for current zone
  const showSafetyTips = (zones) => {
    const tips = zones.map(z => z.recommendations || 'Stay alert and follow local guidelines').join('\n\n')
    Alert.alert(
      '🛡️ Safety Tips',
      tips || 'Stay alert, avoid isolated areas, keep emergency contacts handy, and report any suspicious activity.',
      [{ text: 'Got it', style: 'default' }]
    )
  }

  useEffect(() => {
    (async () => {
      setLocationStatus('Requesting location permission...')
      
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setLocationStatus('❌ Location permission denied')
        Alert.alert('Permission Required', 'Location permission is required for real-time safety tracking. Please enable it in settings.')
        setTracking(false)
        return
      }
      
      setLocationStatus('Getting initial GPS location...')
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeout: 10000 // 10 second timeout
        })
        const lat = loc.coords.latitude
        const lng = loc.coords.longitude
        
        console.log('✅ Initial GPS location obtained:', lat, lng)
        // 🔥 FIXED: Always use real GPS coordinates, don't restrict to NE India
        setCoords({ latitude: lat, longitude: lng })
        setLocationAccuracy(loc.coords.accuracy)
        setLocationStatus(`✅ GPS Ready - Accuracy: ${Math.round(loc.coords.accuracy || 0)}m`)
        
        // Send initial location to backend
        try {
          await fetch(`${API_BASE}/api/tourists/${touristId}/location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              latitude: lat, 
              longitude: lng,
              source: 'initial_gps',
              timestamp: new Date().toISOString()
            })
          })
          console.log('✅ Initial location sent to backend')
        } catch (error) {
          console.error('❌ Failed to send initial location:', error)
        }
        
      } catch (error) {
        console.error('❌ Failed to get initial location:', error)
        setLocationStatus('⚠️ GPS location failed - using default India center')
        // Use general India center instead of just NE India
        setCoords({ latitude: 20.5937, longitude: 78.9629 }) // India center
      }
      
      // Load risk zones - using same endpoint as admin dashboard
      console.log('🔍 Loading risk zones from:', `${API_BASE}/api/geofencing/zones`)
      try {
        const response = await fetch(`${API_BASE}/api/geofencing/zones`)
        console.log('📡 Zone API response status:', response.status, response.statusText)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log('📦 Raw zones data received:', JSON.stringify(data, null, 2))
        
        if (data.success && data.data) {
          const loadedZones = data.data || []
          setZones(loadedZones)
          console.log('✅ Successfully loaded', loadedZones.length, 'risk zones')
          
          // Log zone details for debugging
          loadedZones.forEach((zone, idx) => {
            console.log(`🏾 Zone ${idx + 1}:`, {
              name: zone.name,
              riskLevel: zone.risk_level,
              hasCoordinates: !!(zone.coordinates && zone.coordinates.length > 0),
              hasCircle: !!(zone.latitude && zone.longitude && zone.radius),
              coordinates: zone.coordinates?.length || 0,
              circle: zone.latitude ? `${zone.latitude}, ${zone.longitude} (${zone.radius}m)` : 'none'
            })
          })
        } else {
          console.warn('⚠️ Zones API returned no data or unsuccessful response:', data)
          setZones([])
        }
      } catch (error) {
        console.error('❌ Failed to load risk zones:', error.message)
        console.error('🗺️ Error details:', error)
        
        // Try fallback endpoint
        console.log('🔄 Trying fallback endpoint: /api/zones')
        try {
          const fallbackResponse = await fetch(`${API_BASE}/api/zones`)
          const fallbackData = await fallbackResponse.json()
          if (fallbackData.success && fallbackData.zones) {
            setZones(fallbackData.zones)
            console.log('✅ Loaded', fallbackData.zones.length, 'zones from fallback endpoint')
          } else {
            console.warn('⚠️ Fallback endpoint also failed')
            setZones([])
          }
        } catch (fallbackError) {
          console.error('❌ Fallback endpoint also failed:', fallbackError.message)
          setZones([])
        }
      }
    })()
  }, [touristId])

  useEffect(() => {
    if (!tracking) return
    console.log('📍 Starting real-time GPS tracking for tourist:', touristId)
    
    // Connect WebSocket for real-time updates
    wsRef.current = new WebSocket(WS_URL)
    wsRef.current.onopen = () => {
      console.log('✅ WebSocket connected')
      setLocationStatus(prev => prev + ' (Connected)')
    }
    wsRef.current.onerror = (error) => console.error('❌ WebSocket error:', error)
    
    // 🔥 Handle incoming WebSocket messages for geofence alerts
    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('📨 WebSocket message received:', data)
        
        if (data.type === 'geofence_alert' && data.touristId === Number(touristId)) {
          console.log('🚨 Geofence alert for current tourist:', data)
          handleGeofenceAlert(data)
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error)
      }
    }
    
    // Start GPS tracking with higher accuracy and more frequent updates
    const sub = Location.watchPositionAsync({ 
      accuracy: Location.Accuracy.High, // 🔥 Higher accuracy for real tracking
      timeInterval: 3000, // 🔥 Update every 3 seconds (was 5)
      distanceInterval: 5 // 🔥 Update every 5 meters (was 10)
    }, async (loc) => {
      const { latitude, longitude, accuracy } = loc.coords
      const timestamp = new Date().toISOString()
      
      console.log(`📡 GPS Update: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (accuracy: ${accuracy}m)`)
      
      // Update location status with accuracy
      setLocationAccuracy(accuracy)
      setLocationStatus(`✅ GPS Active - Accuracy: ${Math.round(accuracy || 0)}m`)
      
      // Update local coordinates with real GPS data
      // 🔥 FIXED: Always use real GPS coordinates, don't restrict to NE India
      setCoords({ latitude, longitude })
      
      // Send to backend with more details
      try {
        const response = await fetch(`${API_BASE}/api/tourists/${touristId}/location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            latitude, 
            longitude, 
            accuracy,
            timestamp,
            source: 'mobile_gps'
          })
        })
        
        if (response.ok) {
          const result = await response.json()
          console.log('✅ Location update sent successfully:', result)
        } else {
          console.error('❌ Location update failed:', response.status, response.statusText)
        }
      } catch (error) {
        console.error('❌ Network error sending location:', error)
      }
    })
    
    return () => { 
      console.log('⏹️ Stopping GPS tracking for tourist:', touristId)
      sub.then(w => w.remove())
      if (wsRef.current) wsRef.current.close()
    }
  }, [tracking, touristId])

  const triggerSOS = async () => {
    try {
      // send an immediate location update before triggering SOS to ensure admin sees latest fix
      try { await fetch(`${API_BASE}/api/tourists/${touristId}/location`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude }) }) } catch {}
      await fetch(`${API_BASE}/api/tourists/${touristId}/sos`, { method:'POST' })
      Alert.alert('SOS', 'SOS triggered and shared with authorities')
    } catch (e) { Alert.alert('Failed', e.message) }
  }

  const requestSafetyScore = async () => {
    try {
      const body = {
        records: [{
          tourist_id: String(tourist.blockchainId),
          timestamp: new Date().toISOString(),
          latitude: coords.latitude,
          longitude: coords.longitude,
          speed_m_s: 1.0,
          time_of_day_bucket: 'afternoon',
          distance_from_itinerary: 0,
          time_since_last_fix: 60,
          avg_speed_last_15min: 1.0,
          area_risk_score: 0.3,
          prior_incidents_count: 0,
          days_into_trip: 1,
          is_in_restricted_zone: false,
          sos_flag: false,
          age: 30,
          sex_encoded: 0,
          days_trip_duration: 5
        }]
      }
      const res = await fetch('http://192.168.221.1:5000/api/ml/predict', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)})
      const data = await res.json()
      if (data.success) {
        const r = data.results[0]
        Alert.alert('Safety', `Band: ${r.safety_band}, Score: ${Math.round(r.predicted_safety)}`)
      }
    } catch (e) { Alert.alert('Error', e.message) }
  }

  const leafletHTML = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>html,body,#map{height:100%;margin:0;padding:0} .leaflet-container{background:#f8fafc}</style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const NE_BOUNDS = [[21.5,88.0],[29.9,97.5]];
      const center = [${NE_CENTER.latitude}, ${NE_CENTER.longitude}];
      const map = L.map('map', { zoomControl: true, maxBounds: NE_BOUNDS }).setView(center, 7);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      const marker = L.marker(center).addTo(map);
      function update(lat, lng){ marker.setLatLng([lat, lng]); map.setView([lat, lng], map.getZoom()); }
      document.addEventListener('message', ev => { try { const d = JSON.parse(ev.data); if(d.type==='coords') update(d.lat,d.lng); } catch(e){} });
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ ready: true }));
    </script>
  </body></html>`

  useEffect(() => {
    if (webviewRef.current) {
      try { webviewRef.current.postMessage(JSON.stringify({ type: 'coords', lat: coords.latitude, lng: coords.longitude })) } catch {}
    }
  }, [coords])

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <MapView 
          style={{ flex: 1 }} 
          initialRegion={{ latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 2, longitudeDelta: 2 }}
          showsUserLocation={false}
          followsUserLocation={false}
          showsMyLocationButton={false}
        >
          {/* Tourist marker with enhanced styling */}
          <Marker 
            coordinate={coords} 
            title={tourist.name} 
            description={`ID: ${tourist.blockchainId}${currentZones.length > 0 ? ` | In: ${currentZones.map(z => z.name).join(', ')}` : ''}`}
            pinColor={currentZones.some(z => z.risk_level === 'high') ? 'red' : 'blue'}
          />
          
          {/* Render geofence zones */}
          {zones.map((zone, idx) => {
            const riskLevel = zone.riskLevel || zone.risk_level || 'low'
            const isHighRisk = riskLevel === 'high'
            const isMediumRisk = riskLevel === 'medium' || riskLevel === 'moderate' 
            
            const strokeColor = isHighRisk ? '#dc2626' : isMediumRisk ? '#f59e0b' : '#10b981'
            const fillColor = isHighRisk ? 'rgba(220,38,38,0.3)' : isMediumRisk ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.2)'
            
            // Render polygon zones
            if (zone.coordinates && zone.coordinates.length > 0) {
              return (
                <Polygon 
                  key={`polygon-${idx}`}
                  coordinates={zone.coordinates.map(([lat, lng]) => ({ latitude: lat, longitude: lng }))}
                  strokeColor={strokeColor}
                  fillColor={fillColor}
                  strokeWidth={2}
                  tappable={true}
                  onPress={() => Alert.alert(
                    `🏾 Zone: ${zone.name}`,
                    `Risk Level: ${riskLevel.toUpperCase()}\n${zone.description || 'No description available'}`,
                    [{ text: 'OK' }]
                  )}
                />
              )
            }
            
            // Render circular zones (if lat/lng and radius provided)
            if (zone.latitude && zone.longitude && zone.radius) {
              return (
                <Circle 
                  key={`circle-${idx}`}
                  center={{ latitude: zone.latitude, longitude: zone.longitude }}
                  radius={zone.radius}
                  strokeColor={strokeColor}
                  fillColor={fillColor}
                  strokeWidth={2}
                />
              )
            }
            
            return null
          })}
        </MapView>
      </View>
      {/* Leaflet (WebView) for parity with admin map */}
      <View style={{ position:'absolute', bottom: 0, left: 0, right: 0, height: 180, borderTopWidth: 1, borderColor: '#e5e7eb' }}>
        <WebView
          ref={webviewRef}
          originWhitelist={["*"]}
          source={{ html: leafletHTML }}
          javaScriptEnabled
          onMessage={() => {}}
        />
      </View>
      <View style={{ position:'absolute', top: 40, left: 16, right: 16, backgroundColor:'#ffffff', padding: 12, borderRadius: 8, elevation: 2 }}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>GPS Tracking</Text>
          <Switch value={tracking} onValueChange={setTracking} />
        </View>
        <Text style={{ fontSize: 12, color: tracking ? '#10b981' : '#f59e0b', marginBottom: 4 }}>
          {locationStatus}
        </Text>
        <Text style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>
          🏾 Risk Zones: {zones.length} loaded
        </Text>
        
        {/* Current zones display */}
        {currentZones.length > 0 && (
          <View style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#dc2626' }}>⚠️ Current Zones:</Text>
            {currentZones.map((zone, idx) => (
              <Text key={idx} style={{ 
                fontSize: 11, 
                color: zone.risk_level === 'high' ? '#dc2626' : zone.risk_level === 'medium' ? '#f59e0b' : '#10b981',
                marginLeft: 8
              }}>
                • {zone.name} ({zone.risk_level?.toUpperCase()})
              </Text>
            ))}
          </View>
        )}
        <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
          <Button title="Safety Score" onPress={requestSafetyScore} />
          <Button title="🆘 SOS" color="#dc2626" onPress={triggerSOS} />
        </View>
      </View>
    </View>
  )
}




