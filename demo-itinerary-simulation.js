#!/usr/bin/env node

/**
 * Demo script for itinerary-driven simulation
 * Tests registration with NE tourist locations and simulation movement
 */

const axios = require('axios')

const API_BASE = process.env.API_BASE || 'http://10.1.1.0:5000'

// Sample NE tourist itineraries
const sampleItineraries = [
  {
    name: "Kaziranga Explorer",
    aadharOrPassport: "KAZ123456789",
    tripStart: "2025-09-12",
    tripEnd: "2025-09-15",
    emergencyContact: "+919876543210",
    itinerary: [
      { name: "Kaziranga National Park", lat: 26.60, lng: 93.32 },
      { name: "Majuli Island", lat: 26.95, lng: 94.17 },
      { name: "Kamakhya Temple", lat: 26.17, lng: 91.72 }
    ]
  },
  {
    name: "Tawang Adventure",
    aadharOrPassport: "TAW987654321",
    tripStart: "2025-09-12",
    tripEnd: "2025-09-16",
    emergencyContact: "+919876543211",
    itinerary: [
      { name: "Sela Pass", lat: 27.58, lng: 92.72 },
      { name: "Tawang Monastery", lat: 27.59, lng: 91.87 },
      { name: "Bomdila", lat: 27.25, lng: 92.40 }
    ]
  },
  {
    name: "Meghalaya Hills",
    aadharOrPassport: "MEG456789123",
    tripStart: "2025-09-12",
    tripEnd: "2025-09-14",
    emergencyContact: "+919876543212",
    itinerary: [
      { name: "Shillong", lat: 25.57, lng: 91.88 },
      { name: "Cherrapunji", lat: 25.27, lng: 91.72 },
      { name: "Dawki", lat: 25.22, lng: 92.00 }
    ]
  }
]

async function registerTourist(touristData) {
  try {
    console.log(`\n🏃 Registering: ${touristData.name}`)
    console.log(`📍 Starting at: ${touristData.itinerary[0].name} (${touristData.itinerary[0].lat}, ${touristData.itinerary[0].lng})`)
    
    const response = await axios.post(`${API_BASE}/api/tourists/register`, touristData)
    
    if (response.data.success) {
      console.log(`✅ Registered successfully!`)
      console.log(`🆔 Tourist ID: ${response.data.tourist.id}`)
      console.log(`💰 Wallet: ${response.data.tourist.walletAddress}`)
      return response.data.tourist.id
    } else {
      console.log(`❌ Registration failed:`, response.data.error)
      return null
    }
  } catch (error) {
    console.log(`❌ Registration error:`, error.response?.data?.error || error.message)
    return null
  }
}

async function checkTouristLocation(touristId) {
  try {
    const response = await axios.get(`${API_BASE}/api/tourists`)
    const tourist = response.data.tourists.find(t => t.blockchainId === touristId)
    
    if (tourist) {
      console.log(`📍 ${tourist.name}: (${tourist.displayLatitude.toFixed(4)}, ${tourist.displayLongitude.toFixed(4)})`)
      console.log(`🎯 Simulation: ${tourist.simulationMode ? 'ON' : 'OFF'}`)
      console.log(`📱 Device Tracked: ${tourist.deviceTracked ? 'YES' : 'NO'}`)
      console.log(`🔄 Location Source: ${tourist.locationSource}`)
      if (tourist.itinerary && tourist.itinerary.length > 0) {
        const currentSegment = tourist.simulationState?.currentSegmentIndex || 0
        const target = tourist.itinerary[currentSegment]
        if (target) {
          console.log(`🎯 Next Target: ${target.name} (${target.lat}, ${target.lng})`)
        }
      }
    }
  } catch (error) {
    console.log(`❌ Error checking location:`, error.message)
  }
}

async function triggerSOS(touristId) {
  try {
    console.log(`\n🚨 Triggering SOS for tourist ${touristId}...`)
    const response = await axios.post(`${API_BASE}/api/tourists/${touristId}/sos`)
    
    if (response.data.success) {
      console.log(`✅ SOS triggered successfully!`)
      console.log(`📍 Location: (${response.data.tourist.displayLatitude}, ${response.data.tourist.displayLongitude})`)
    } else {
      console.log(`❌ SOS failed:`, response.data.error)
    }
  } catch (error) {
    console.log(`❌ SOS error:`, error.response?.data?.error || error.message)
  }
}

async function main() {
  console.log('🚀 Starting Itinerary Simulation Demo')
  console.log(`🌐 API Base: ${API_BASE}`)
  
  // Check API health
  try {
    const health = await axios.get(`${API_BASE}/health`)
    console.log(`✅ API Health: ${health.data.status}`)
  } catch (error) {
    console.log(`❌ API not reachable: ${error.message}`)
    return
  }
  
  // Register tourists
  const touristIds = []
  for (const touristData of sampleItineraries) {
    const id = await registerTourist(touristData)
    if (id) touristIds.push(id)
  }
  
  if (touristIds.length === 0) {
    console.log('❌ No tourists registered successfully')
    return
  }
  
  console.log(`\n🎯 Monitoring ${touristIds.length} tourists for 30 seconds...`)
  console.log('📱 Check admin dashboard at http://10.1.1.0:3000 to see movement!')
  
  // Monitor locations every 5 seconds
  let count = 0
  const interval = setInterval(async () => {
    count++
    console.log(`\n--- Check ${count} (${new Date().toLocaleTimeString()}) ---`)
    
    for (const id of touristIds) {
      await checkTouristLocation(id)
    }
    
    // Trigger SOS for first tourist after 15 seconds
    if (count === 3 && touristIds[0]) {
      await triggerSOS(touristIds[0])
    }
    
    if (count >= 6) { // 30 seconds total
      clearInterval(interval)
      console.log('\n🏁 Demo completed!')
      console.log('📊 Check admin dashboard for final positions and SOS alerts')
    }
  }, 5000)
}

// Run demo
main().catch(console.error)

