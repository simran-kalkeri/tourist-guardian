import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Button, Alert, Switch } from 'react-native'
import MapView, { Marker, Polygon } from 'react-native-maps'
import { WebView } from 'react-native-webview'
import * as Location from 'expo-location'
import { Platform } from 'react-native'

// Configurable API base for Expo Go; falls back to emulator/localhost
const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://127.0.0.1:5000')
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
  const [coords, setCoords] = useState({ latitude: 26.2006, longitude: 92.9376 })
  const [zones, setZones] = useState([])
  const [tracking, setTracking] = useState(false)
  const wsRef = useRef(null)
  const webviewRef = useRef(null)

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required')
        return
      }
      const loc = await Location.getCurrentPositionAsync({})
      const lat = loc.coords.latitude
      const lng = loc.coords.longitude
      setCoords(isInNE(lat, lng) ? { latitude: lat, longitude: lng } : NE_CENTER)
      fetch(`${API_BASE}/api/zones`).then(r=>r.json()).then(d=>{ if(d.success) setZones(d.zones) })
    })()
  }, [])

  useEffect(() => {
    if (!tracking) return
    wsRef.current = new WebSocket(WS_URL)
    const sub = Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 }, async (loc) => {
      const { latitude, longitude } = loc.coords
      setCoords(isInNE(latitude, longitude) ? { latitude, longitude } : NE_CENTER)
      // send to backend
      try { await fetch(`${API_BASE}/api/tourists/${touristId}/location`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ latitude, longitude }) }) } catch {}
    })
    return () => { sub.then(w=>w.remove()); wsRef.current && wsRef.current.close() }
  }, [tracking])

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
      const res = await fetch('http://10.0.2.2:5000/api/ml/predict', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)})
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
      <View style={{ position:'absolute', top: 40, left: 16, right: 16, backgroundColor:'#ffffff', padding: 12, borderRadius: 8, elevation: 2, flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
        <Text>Real-time Tracking</Text>
        <Switch value={tracking} onValueChange={setTracking} />
        <Button title="Safety" onPress={requestSafetyScore} />
        <Button title="SOS" color="#dc2626" onPress={triggerSOS} />
      </View>
    </View>
  )
}




