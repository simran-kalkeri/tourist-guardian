import React, { useState, useRef } from 'react'
import { View, Text, TextInput, Button, Alert, ScrollView, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { Platform } from 'react-native'
import * as ImagePicker from 'expo-image-picker'

// Prefer env at build time for Expo Go: set EXPO_PUBLIC_API_BASE_URL in app config
// Fallback to common emulator IPs, else require user LAN IP
const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (Platform.OS === 'android' ? 'http://10.1.23.4:5000' : 'http://127.0.0.1:5000')

// Face verification API endpoint
const FACE_VERIFICATION_API = 'http://10.1.10.60:8000/verify-text'

export default function RegistrationScreen({ navigation }) {
  const [name, setName] = useState('')
  const [aadharOrPassport, setAadharOrPassport] = useState('')
  const [emergencyContact, setEmergencyContact] = useState('')
  const [tripStart, setTripStart] = useState('')
  const [tripEnd, setTripEnd] = useState('')
  const [itinerary, setItinerary] = useState('')
  
  // Face verification states
  const [faceImage, setFaceImage] = useState(null)
  const [faceVerified, setFaceVerified] = useState(false)
  const [verifyingFace, setVerifyingFace] = useState(false)
  const [showCamera, setShowCamera] = useState(false)

  // 🔥 Fallback function to select image from gallery
  const selectFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Gallery Permission Required', 'Please allow gallery access for face verification.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true
      })

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri
        const imageBase64 = result.assets[0].base64
        
        console.log('🖼️ Image selected from gallery, starting face verification...')
        setFaceImage(imageUri)
        await verifyFace(imageBase64)
      }
    } catch (error) {
      console.error('❌ Error selecting from gallery:', error)
      Alert.alert('Gallery Error', 'Failed to select image from gallery. Please try again.')
    }
  }

  // Face verification functions
  const takePicture = async () => {
    try {
      // 🔥 Try camera first, fall back to gallery if camera fails
      let result
      
      try {
        // Request camera permissions
        const { status } = await ImagePicker.requestCameraPermissionsAsync()
        if (status !== 'granted') {
          console.log('⚠️ Camera permission denied, trying gallery instead')
          return await selectFromGallery()
        }

        // Use camera with minimal options
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
          base64: true
        })
      } catch (cameraError) {
        console.error('❌ Camera failed, trying gallery:', cameraError.message)
        return await selectFromGallery()
      }

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri
        const imageBase64 = result.assets[0].base64
        
        console.log('📸 Photo captured, starting face verification...')
        setFaceImage(imageUri)
        await verifyFace(imageBase64)
      }
    } catch (error) {
      console.error('❌ Error taking picture:', error)
      Alert.alert('Camera Error', 'Failed to capture photo. Please try again.')
    }
  }

  const verifyFace = async (imageBase64) => {
    setVerifyingFace(true)
    try {
      console.log('🔍 Sending image for face verification to:', FACE_VERIFICATION_API)
      console.log('📊 Image data length:', imageBase64?.length || 0, 'characters')
      
      const formData = new FormData()
      // 🔥 API expects ref_file and live_file fields
      const imageFile = {
        uri: `data:image/jpeg;base64,${imageBase64}`,
        type: 'image/jpeg',
        name: 'verification.jpg'
      }
      
      formData.append('ref_file', imageFile)
      formData.append('live_file', imageFile)
      
      console.log('📦 FormData prepared with ref_file and live_file')

      const response = await fetch(FACE_VERIFICATION_API, {
        method: 'POST',
        body: formData,
        timeout: 30000 // 30 second timeout
      })

      console.log('📡 Face verification response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`Face verification API error: ${response.status}`)
      }

      // Handle different response types
      const contentType = response.headers.get('content-type')
      console.log('📊 Response content type:', contentType)
      
      let result
      if (contentType && contentType.includes('application/json')) {
        result = await response.json()
      } else {
        // Handle non-JSON response (text, image, etc.)
        const textResponse = await response.text()
        console.log('📝 Raw API response:', textResponse)
        
        // Try to determine verification result from text response
        const lowerResponse = textResponse.toLowerCase()
        if (lowerResponse.includes('verified') || lowerResponse.includes('success') || lowerResponse.includes('match')) {
          result = { verified: true, message: textResponse }
        } else if (lowerResponse.includes('not found') || lowerResponse.includes('no match') || lowerResponse.includes('failed')) {
          result = { verified: false, message: textResponse }
        } else {
          // Default: assume verification failed for unknown responses
          result = { verified: false, message: `Unknown response: ${textResponse}` }
        }
      }
      
      console.log('🎯 Face verification result:', result)
      
      if (result.verified === true || result.success === true) {
        setFaceVerified(true)
        Alert.alert(
          '✅ Face Verified Successfully!', 
          'Your identity has been verified. You can now complete registration.',
          [{ text: 'Continue', style: 'default' }]
        )
      } else {
        setFaceVerified(false)
        const errorMessage = result.message || 'Your face could not be verified in our database.'
        Alert.alert(
          '❌ Face Verification Failed', 
          `${errorMessage}\n\nRegistration cannot proceed without verification.`,
          [
            { text: 'Try Again', onPress: () => { setFaceImage(null); takePicture() } },
            { text: 'Cancel', style: 'cancel' }
          ]
        )
      }
    } catch (error) {
      console.error('❌ Face verification error:', error)
      Alert.alert(
        'Verification Error', 
        `Face verification failed: ${error.message}. Please check your connection and try again.`,
        [
          { text: 'Retry', onPress: () => { setFaceImage(null); takePicture() } },
          { text: 'Cancel', style: 'cancel' }
        ]
      )
      setFaceVerified(false)
    } finally {
      setVerifyingFace(false)
    }
  }

  const handleRegister = async () => {
    if (!name || !aadharOrPassport || !emergencyContact) {
      Alert.alert('Missing fields', 'Please fill required fields')
      return
    }
    
    // 🔥 Require face verification before registration
    if (!faceVerified) {
      Alert.alert(
        'Face Verification Required', 
        'You must complete face verification before registering. Please capture your photo and verify your identity.',
        [{ text: 'Verify Face', onPress: takePicture }]
      )
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
        body: JSON.stringify({ 
          name, 
          aadharOrPassport, 
          emergencyContact, 
          tripStart, 
          tripEnd, 
          itinerary,
          faceVerified: true, // 🔥 Include face verification status
          verificationTimestamp: new Date().toISOString()
        })
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
      
      {/* Personal Information */}
      <Text>Name</Text>
      <TextInput value={name} onChangeText={setName} style={{ borderWidth: 1, padding: 8, marginBottom: 12 }} />
      <Text>Aadhaar/Passport</Text>
      <TextInput value={aadharOrPassport} onChangeText={setAadharOrPassport} style={{ borderWidth: 1, padding: 8, marginBottom: 12 }} />
      <Text>Emergency Contact</Text>
      <TextInput value={emergencyContact} onChangeText={setEmergencyContact} style={{ borderWidth: 1, padding: 8, marginBottom: 12 }} />
      
      {/* Trip Information */}
      <Text>Trip Start (YYYY-MM-DD)</Text>
      <TextInput value={tripStart} onChangeText={setTripStart} style={{ borderWidth: 1, padding: 8, marginBottom: 12 }} />
      <Text>Trip End (YYYY-MM-DD)</Text>
      <TextInput value={tripEnd} onChangeText={setTripEnd} style={{ borderWidth: 1, padding: 8, marginBottom: 12 }} />
      <Text>Itinerary (comma separated places)</Text>
      <TextInput value={itinerary} onChangeText={setItinerary} style={{ borderWidth: 1, padding: 8, marginBottom: 20 }} />
      
      {/* Face Verification Section */}
      <View style={styles.verificationSection}>
        <Text style={styles.sectionTitle}>🔒 Face Verification (Required)</Text>
        <Text style={styles.sectionDescription}>
          For security purposes, please verify your identity by capturing a photo.
        </Text>
        
        {faceImage && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: faceImage }} style={styles.previewImage} />
          </View>
        )}
        
        <View style={styles.verificationStatus}>
          {faceVerified ? (
            <View style={styles.successStatus}>
              <Text style={styles.successText}>✅ Face Verified Successfully!</Text>
              <Text style={styles.statusSubtext}>You can now proceed with registration.</Text>
            </View>
          ) : (
            <View style={styles.pendingStatus}>
              <Text style={styles.pendingText}>⚠️ Face Verification Required</Text>
              <Text style={styles.statusSubtext}>Please capture your photo to verify identity.</Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity 
          style={[styles.verifyButton, verifyingFace && styles.disabledButton]} 
          onPress={takePicture}
          disabled={verifyingFace}
        >
          <Text style={styles.verifyButtonText}>
            {verifyingFace ? '🔄 Verifying...' : faceVerified ? '📸 Retake Photo' : '📸 Capture & Verify Face'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Registration Button */}
      <View style={{ marginTop: 20 }}>
        <Button 
          title={faceVerified ? "Complete Registration" : "Face Verification Required"} 
          onPress={handleRegister}
          color={faceVerified ? "#10b981" : "#9ca3af"}
        />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  verificationSection: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1f2937',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#10b981',
  },
  verificationStatus: {
    marginBottom: 16,
  },
  successStatus: {
    backgroundColor: '#d1fae5',
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  pendingStatus: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  successText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#065f46',
    marginBottom: 4,
  },
  pendingText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 4,
  },
  statusSubtext: {
    fontSize: 12,
    color: '#6b7280',
  },
  verifyButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
})


