#!/usr/bin/env node

/**
 * Demo script for Admin UI Panels (Priority 3)
 * Tests wallet pool and TX queue dashboard functionality
 */

const axios = require('axios')

const API_BASE = process.env.API_BASE || 'http://10.1.1.0:5000'
const FRONTEND_BASE = process.env.FRONTEND_BASE || 'http://10.1.1.0:3000'

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

async function checkFrontendHealth() {
  try {
    const response = await axios.get(`${FRONTEND_BASE}`)
    console.log(`✅ Frontend Health: ${response.status === 200 ? 'OK' : 'Error'}`)
    return true
  } catch (error) {
    console.log(`❌ Frontend not reachable: ${error.message}`)
    return false
  }
}

async function registerTestTourists() {
  console.log('\n🏃 Registering test tourists...')
  
  const testTourists = [
    {
      name: "Kaziranga Explorer",
      aadharOrPassport: `TEST${Math.floor(Math.random() * 1000000)}`,
      tripStart: "2025-09-12",
      tripEnd: "2025-09-15",
      emergencyContact: "+919876543210",
      itinerary: [
        { name: "Kaziranga National Park", lat: 26.60, lng: 93.32 },
        { name: "Majuli Island", lat: 26.95, lng: 94.17 }
      ]
    },
    {
      name: "Tawang Adventure",
      aadharOrPassport: `TEST${Math.floor(Math.random() * 1000000)}`,
      tripStart: "2025-09-12",
      tripEnd: "2025-09-16",
      emergencyContact: "+919876543211",
      itinerary: [
        { name: "Sela Pass", lat: 27.58, lng: 92.72 },
        { name: "Tawang Monastery", lat: 27.59, lng: 91.87 }
      ]
    }
  ]

  const touristIds = []
  for (const tourist of testTourists) {
    try {
      const response = await axios.post(`${API_BASE}/api/tourists/register`, tourist)
      if (response.data.success) {
        console.log(`✅ ${tourist.name}: ID ${response.data.tourist.id}, Wallet ${response.data.tourist.walletAddress}`)
        touristIds.push(response.data.tourist.id)
      }
    } catch (error) {
      console.log(`❌ Failed to register ${tourist.name}: ${error.message}`)
    }
  }

  return touristIds
}

async function triggerSOS(touristId) {
  try {
    console.log(`\n🚨 Triggering SOS for tourist ${touristId}...`)
    const response = await axios.post(`${API_BASE}/api/tourists/${touristId}/sos`)
    
    if (response.data.success) {
      console.log(`✅ SOS triggered successfully!`)
      return true
    } else {
      console.log(`❌ SOS failed: ${response.data.error}`)
      return false
    }
  } catch (error) {
    console.log(`❌ SOS error: ${error.message}`)
    return false
  }
}

async function monitorDashboards(durationSeconds = 60) {
  console.log(`\n🔄 Monitoring dashboards for ${durationSeconds} seconds...`)
  console.log(`📱 Open admin dashboard: ${FRONTEND_BASE}`)
  console.log(`   - Navigate to "Wallet Pool" tab`)
  console.log(`   - Navigate to "TX Queue" tab`)
  console.log(`   - Watch real-time updates every 15 seconds`)
  
  const startTime = Date.now()
  const endTime = startTime + (durationSeconds * 1000)
  
  let checkCount = 0
  while (Date.now() < endTime) {
    await new Promise(resolve => setTimeout(resolve, 15000)) // Wait 15 seconds
    
    checkCount++
    const remaining = Math.ceil((endTime - Date.now()) / 1000)
    
    console.log(`\n--- Dashboard Check ${checkCount} (${remaining}s remaining) ---`)
    
    // Check wallet pool status
    try {
      const walletResponse = await axios.get(`${API_BASE}/api/wallet-pool/status`)
      const walletStatus = walletResponse.data.status
      console.log(`💰 Wallet Pool: ${walletStatus.available} available, ${walletStatus.assigned} assigned`)
    } catch (error) {
      console.log(`❌ Wallet pool check failed: ${error.message}`)
    }
    
    // Check TX queue status
    try {
      const txResponse = await axios.get(`${API_BASE}/api/tx-queue/status`)
      const txStatus = txResponse.data.status
      console.log(`📝 TX Queue: ${txStatus.pending} pending, ${txStatus.sent} sent, ${txStatus.failed} failed`)
    } catch (error) {
      console.log(`❌ TX queue check failed: ${error.message}`)
    }
  }
}

async function testWalletRelease() {
  console.log('\n🔓 Testing wallet release functionality...')
  
  try {
    // Get wallet pool status
    const walletResponse = await axios.get(`${API_BASE}/api/wallet-pool/status`)
    const assignedWallets = walletResponse.data.status.assignedWallets
    
    if (assignedWallets.length > 0) {
      const walletToRelease = assignedWallets[0]
      console.log(`🔄 Attempting to release wallet ${walletToRelease.index}...`)
      
      try {
        const releaseResponse = await axios.post(`${API_BASE}/api/admin/wallet-pool/${walletToRelease.index}/release`)
        console.log(`✅ Wallet released successfully: ${releaseResponse.data.message}`)
      } catch (error) {
        if (error.response?.status === 400) {
          console.log(`⚠️  Cannot release wallet: ${error.response.data.error}`)
          if (error.response.data.pendingJobs) {
            console.log(`   Pending jobs: ${error.response.data.pendingJobs}`)
          }
        } else {
          console.log(`❌ Release failed: ${error.message}`)
        }
      }
    } else {
      console.log('ℹ️  No assigned wallets to release')
    }
  } catch (error) {
    console.log(`❌ Wallet release test failed: ${error.message}`)
  }
}

async function main() {
  console.log('🚀 Starting Admin UI Panels Demo (Priority 3)')
  console.log(`🌐 API Base: ${API_BASE}`)
  console.log(`🌐 Frontend Base: ${FRONTEND_BASE}`)
  
  // Check health
  if (!(await checkAPIHealth())) {
    return
  }
  
  if (!(await checkFrontendHealth())) {
    console.log('⚠️  Frontend not accessible, but API is working')
  }
  
  // Register test tourists
  const touristIds = await registerTestTourists()
  
  if (touristIds.length === 0) {
    console.log('❌ No tourists registered successfully')
    return
  }
  
  // Trigger SOS for first tourist
  if (touristIds[0]) {
    await triggerSOS(touristIds[0])
  }
  
  // Test wallet release
  await testWalletRelease()
  
  // Monitor dashboards
  await monitorDashboards(60)
  
  console.log('\n🏁 Demo completed!')
  console.log('\n📊 What to check in the admin dashboard:')
  console.log('   1. Wallet Pool tab:')
  console.log('      - See assigned wallets with tourist IDs')
  console.log('      - Try releasing a wallet (if no pending TXs)')
  console.log('      - Watch real-time updates')
  console.log('   2. TX Queue tab:')
  console.log('      - See registration and SOS jobs')
  console.log('      - Watch retry attempts and status changes')
  console.log('      - View transaction hashes when sent')
  console.log('   3. Overview tab:')
  console.log('      - See tourist list with wallet addresses')
  console.log('      - Monitor SOS alerts')
  console.log('      - Check simulation status')
  
  console.log('\n💡 Key Features Demonstrated:')
  console.log('   ✅ Real-time dashboard updates (15s polling)')
  console.log('   ✅ Wallet pool management and release')
  console.log('   ✅ TX queue monitoring and retry logic')
  console.log('   ✅ Responsive UI with filters and search')
  console.log('   ✅ Admin-only actions (wallet release)')
  console.log('   ✅ Error handling and status indicators')
}

// Run demo
main().catch(console.error)







