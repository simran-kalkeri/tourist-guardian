import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Button, Alert, Switch } from 'react-native'
import MapView, { Marker, Polygon } from 'react-native-maps'
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
  const wsRef = useRef(null)
  const webviewRef = useRef(null)

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
      
      // Load risk zones
      try {
        const response = await fetch(`${API_BASE}/api/zones`)
        const data = await response.json()
        if (data.success) {
          setZones(data.zones)
          console.log('✅ Loaded', data.zones.length, 'risk zones')
        }
      } catch (error) {
        console.error('❌ Failed to load risk zones:', error)
      }
    })()
  }, [touristId])

  useEffect(() => {
    if (!tracking) return
    console.log('📍 Starting real-time GPS tracking for tourist:', touristId)
    
    // Connect WebSocket for real-time updates
    wsRef.current = new WebSocket(WS_URL)
    wsRef.current.onopen = () => console.log('✅ WebSocket connected')
    wsRef.current.onerror = (error) => console.error('❌ WebSocket error:', error)
    
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
        <MapView style={{ flex: 1 }} initialRegion={{ latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 2, longitudeDelta: 2 }}>
          <Marker coordinate={coords} title={tourist.name} description={`ID: ${tourist.blockchainId}`} />
          {zones.map((z, idx) => (
            <Polygon key={idx} coordinates={z.coordinates.map(([lat, lng]) => ({ latitude: lat, longitude: lng }))} strokeColor={z.riskLevel==='high'?'#dc2626':z.riskLevel==='medium'?'#f59e0b':'#3b82f6'} fillColor={z.riskLevel==='high'?'rgba(220,38,38,0.2)':z.riskLevel==='medium'?'rgba(245,158,11,0.2)':'rgba(59,130,246,0.2)'} />
          ))}
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
        <Text style={{ fontSize: 12, color: tracking ? '#10b981' : '#f59e0b', marginBottom: 8 }}>
          {locationStatus}
        </Text>
        <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
          <Button title="Safety Score" onPress={requestSafetyScore} />
          <Button title="🆘 SOS" color="#dc2626" onPress={triggerSOS} />
        </View>
      </View>
    </View>
  )
}




