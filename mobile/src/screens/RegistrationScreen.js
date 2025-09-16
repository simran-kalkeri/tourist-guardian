import React, { useState } from 'react'
import { View, Text, TextInput, Button, Alert, ScrollView } from 'react-native'
import { Platform } from 'react-native'

// Prefer env at build time for Expo Go: set EXPO_PUBLIC_API_BASE_URL in app config
// Fallback to common emulator IPs, else require user LAN IP
const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://127.0.0.1:5000')

export default function RegistrationScreen({ navigation }) {
  const [name, setName] = useState('')
  const [aadharOrPassport, setAadharOrPassport] = useState('')
  const [emergencyContact, setEmergencyContact] = useState('')
  const [tripStart, setTripStart] = useState('')
  const [tripEnd, setTripEnd] = useState('')
  const [itinerary, setItinerary] = useState('')

  const handleRegister = async () => {
    if (!name || !aadharOrPassport || !emergencyContact) {
      Alert.alert('Missing fields', 'Please fill required fields')
      return
    }
    if (tripStart && tripEnd) {
      const start = new Date(tripStart)
      const end = new Date(tripEnd)
      if (!(end > start)) {
        Alert.alert('Invalid dates', 'Trip end must be after trip start')
        return
      }
    }
    try {
      const res = await fetch(`${API_BASE}/api/tourists/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, aadharOrPassport, emergencyContact, tripStart, tripEnd, itinerary })
      })
      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch { data = { success: false, error: text || 'Unknown error' } }
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed')
      const tourist = data.tourist
      Alert.alert('Registered', `Welcome ${tourist.name}. ID: ${tourist.blockchainId}`)
      navigation.replace('Map', { tourist })
    } catch (e) {
      const hint = e.message.includes('Network request failed')
        ? `Cannot reach API at ${API_BASE}. Ensure your phone and PC are on the same network and the backend is accessible over LAN (firewall open).`
        : ''
      Alert.alert('Registration failed', `${e.message}${hint ? `\n\n${hint}` : ''}`)
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>Tourist Registration</Text>
      <Text>Name</Text>
      <TextInput value={name} onChangeText={setName} style={{ borderWidth: 1, padding: 8, marginBottom: 12 }} />
      <Text>Aadhaar/Passport</Text>
      <TextInput value={aadharOrPassport} onChangeText={setAadharOrPassport} style={{ borderWidth: 1, padding: 8, marginBottom: 12 }} />
      <Text>Emergency Contact</Text>
      <TextInput value={emergencyContact} onChangeText={setEmergencyContact} style={{ borderWidth: 1, padding: 8, marginBottom: 12 }} />
      <Text>Trip Start (YYYY-MM-DD)</Text>
      <TextInput value={tripStart} onChangeText={setTripStart} style={{ borderWidth: 1, padding: 8, marginBottom: 12 }} />
      <Text>Trip End (YYYY-MM-DD)</Text>
      <TextInput value={tripEnd} onChangeText={setTripEnd} style={{ borderWidth: 1, padding: 8, marginBottom: 12 }} />
      <Text>Itinerary (comma separated places)</Text>
      <TextInput value={itinerary} onChangeText={setItinerary} style={{ borderWidth: 1, padding: 8, marginBottom: 12 }} />
      <Button title="Register" onPress={handleRegister} />
    </ScrollView>
  )
}




