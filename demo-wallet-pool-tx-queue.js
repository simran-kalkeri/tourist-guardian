#!/usr/bin/env node

/**
 * Demo script for Wallet Pool + TX Queue implementation
 * Tests wallet assignment, TX job enqueueing, and monitoring
 */

const axios = require('axios')

const API_BASE = process.env.API_BASE || 'http://10.1.1.0:5000'

async function checkAPIHealth() {
  try {
    const response = await axios.get(`${API_BASE}/health`)
    console.log(`✅ API Health: ${response.data.status}`)
    return true
  } catch (error) {
    console.log(`❌ API not reachable: ${error.message}`)
    return false
  }
}

async function getWalletPoolStatus() {
  try {
    const response = await axios.get(`${API_BASE}/api/wallet-pool/status`)
    console.log('\n💰 Wallet Pool Status:')
    console.log(`   Total: ${response.data.status.total}`)
    console.log(`   Available: ${response.data.status.available}`)
    console.log(`   Assigned: ${response.data.status.assigned}`)
    
    if (response.data.status.assignedWallets.length > 0) {
      console.log('   Assigned Wallets:')
      response.data.status.assignedWallets.forEach(wallet => {
        console.log(`     Index ${wallet.index}: ${wallet.address} → Tourist ${wallet.assignedToTouristId}`)
      })
    }
    return response.data.status
  } catch (error) {
    console.log(`❌ Error getting wallet pool status: ${error.message}`)
    return null
  }
}

async function getTXQueueStatus() {
  try {
    const response = await axios.get(`${API_BASE}/api/tx-queue/status`)
    console.log('\n📝 TX Queue Status:')
    console.log(`   Total: ${response.data.status.total}`)
    console.log(`   Pending: ${response.data.status.pending}`)
    console.log(`   Sent: ${response.data.status.sent}`)
    console.log(`   Failed: ${response.data.status.failed}`)
    
    if (response.data.status.jobs.length > 0) {
      console.log('   Recent Jobs:')
      response.data.status.jobs.slice(0, 5).forEach(job => {
        console.log(`     ${job.txType} (${job.status}) - Tourist ${job.touristId} - Attempts: ${job.attempts}`)
        if (job.txHash) console.log(`       TX Hash: ${job.txHash}`)
        if (job.lastError) console.log(`       Error: ${job.lastError}`)
      })
    }
    return response.data.status
  } catch (error) {
    console.log(`❌ Error getting TX queue status: ${error.message}`)
    return null
  }
}

async function registerTestTourist(name, itinerary) {
  try {
    console.log(`\n🏃 Registering: ${name}`)
    
    const response = await axios.post(`${API_BASE}/api/tourists/register`, {
      name,
      aadharOrPassport: `TEST${Math.floor(Math.random() * 1000000)}`,
      tripStart: "2025-09-12",
      tripEnd: "2025-09-15",
      emergencyContact: "+919876543210",
      itinerary
    })
    
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

async function triggerSOS(touristId) {
  try {
    console.log(`\n🚨 Triggering SOS for tourist ${touristId}...`)
    
    const response = await axios.post(`${API_BASE}/api/tourists/${touristId}/sos`)
    
    if (response.data.success) {
      console.log(`✅ SOS triggered successfully!`)
      return true
    } else {
      console.log(`❌ SOS failed:`, response.data.error)
      return false
    }
  } catch (error) {
    console.log(`❌ SOS error:`, error.response?.data?.error || error.message)
    return false
  }
}

async function monitorProgress(durationSeconds = 30) {
  console.log(`\n🔄 Monitoring progress for ${durationSeconds} seconds...`)
  
  const startTime = Date.now()
  const endTime = startTime + (durationSeconds * 1000)
  
  while (Date.now() < endTime) {
    await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
    
    const remaining = Math.ceil((endTime - Date.now()) / 1000)
    console.log(`\n--- Progress Check (${remaining}s remaining) ---`)
    
    await getWalletPoolStatus()
    await getTXQueueStatus()
  }
}

async function main() {
  console.log('🚀 Starting Wallet Pool + TX Queue Demo')
  console.log(`🌐 API Base: ${API_BASE}`)
  
  // Check API health
  if (!(await checkAPIHealth())) {
    return
  }
  
  // Show initial status
  console.log('\n📊 Initial Status:')
  await getWalletPoolStatus()
  await getTXQueueStatus()
  
  // Register test tourists
  const testItineraries = [
    {
      name: "Kaziranga Explorer",
      itinerary: [
        { name: "Kaziranga National Park", lat: 26.60, lng: 93.32 },
        { name: "Majuli Island", lat: 26.95, lng: 94.17 }
      ]
    },
    {
      name: "Tawang Adventure", 
      itinerary: [
        { name: "Sela Pass", lat: 27.58, lng: 92.72 },
        { name: "Tawang Monastery", lat: 27.59, lng: 91.87 }
      ]
    }
  ]
  
  const touristIds = []
  for (const test of testItineraries) {
    const id = await registerTestTourist(test.name, test.itinerary)
    if (id) touristIds.push(id)
  }
  
  if (touristIds.length === 0) {
    console.log('❌ No tourists registered successfully')
    return
  }
  
  // Show status after registration
  console.log('\n📊 Status After Registration:')
  await getWalletPoolStatus()
  await getTXQueueStatus()
  
  // Trigger SOS for first tourist
  if (touristIds[0]) {
    await triggerSOS(touristIds[0])
  }
  
  // Monitor progress
  await monitorProgress(30)
  
  console.log('\n🏁 Demo completed!')
  console.log('📊 Final Status:')
  await getWalletPoolStatus()
  await getTXQueueStatus()
  
  console.log('\n💡 Check Ganache UI to see transaction hashes!')
  console.log('💡 Check admin dashboard for wallet pool and TX queue panels!')
}

// Run demo
main().catch(console.error)







