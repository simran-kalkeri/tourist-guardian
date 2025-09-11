const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const cron = require("node-cron")
const { ethers } = require("ethers")
const axios = require("axios")
const WebSocket = require("ws")
const http = require("http")
require("dotenv").config()
const EFIR = require("./models/EFIR")
const PoliceStation = require("./models/PoliceStation")

const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT || 5000
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8001"

// WebSocket Server
const wss = new WebSocket.Server({ server })
const connectedClients = new Set()

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New WebSocket connection')
  connectedClients.add(ws)
  
  ws.on('close', () => {
    console.log('WebSocket connection closed')
    connectedClients.delete(ws)
  })
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
    connectedClients.delete(ws)
  })
})

// Function to broadcast data to all connected clients
const broadcastToClients = (data) => {
  const message = JSON.stringify(data)
  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message)
      } catch (error) {
        console.error('Error sending WebSocket message:', error)
        connectedClients.delete(client)
      }
    }
  })
}

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// In-memory time-series storage and alerts (lightweight; replace with Redis/DB later)
const recentTicks = new Map() // key: touristId (number), value: [{timestamp, latitude, longitude}]
const MAX_TICKS_PER_TOURIST = 50
const alerts = [] // {touristId, type, severity, message, timestamp}

// MongoDB Connection
const MONGODB_URI =
  "mongodb+srv://siteadmin:officer123@cluster0.l6busjy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

// Blockchain setup
const BlockchainService = require("../blockchain/utils")
const IoTSimulationService = require("./services/iotSimulation")
const WalletQueueService = require("./services/walletQueue")

let blockchainService
let iotSimulation
let walletQueue

// Initialize services
async function initServices() {
  try {
    // Initialize blockchain service
    blockchainService = new BlockchainService()
    const initialized = await blockchainService.initialize()
    if (initialized) {
      console.log("Blockchain service initialized successfully")

      // Get contract info
      const info = await blockchainService.getContractInfo()
      if (info.success) {
        console.log("Contract Address:", info.contractAddress)
        console.log("Admin Address:", info.admin)
        console.log("Tourist Count:", info.touristCount)
      } else {
        console.log("Contract info not available:", info.error)
      }
    } else {
      console.log("Blockchain service not available - running in database-only mode")
    }

    // Initialize wallet queue service
    walletQueue = new WalletQueueService()
    console.log("Wallet queue service initialized")

    // Initialize IoT simulation service
    iotSimulation = new IoTSimulationService()
    await iotSimulation.initialize(Tourist, blockchainService)

    // Start IoT simulations for existing tourists
    setTimeout(async () => {
      await iotSimulation.startAllSimulations()
    }, 2000) // Wait 2 seconds for everything to be ready
  } catch (error) {
    console.error("Service initialization error:", error)
  }
}

// Tourist Schema
const touristSchema = new mongoose.Schema({
  blockchainId: { type: Number, required: true, unique: true },
  walletAddress: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  aadharOrPassport: { type: String, required: true },
  tripStart: { type: Date, required: true },
  tripEnd: { type: Date, required: true },
  emergencyContact: { type: String, required: true },
  latitude: { type: Number, default: 0 },
  longitude: { type: Number, default: 0 },
  sosActive: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

const Tourist = mongoose.model("Tourist", touristSchema)

// Ensure MongoDB indexes are correct (drop obsolete tokenId index if present)
async function ensureTouristIndexes() {
  try {
    const indexes = await Tourist.collection.indexes()
    const obsoleteNames = ["tokenId_1", "digitalID_1"]
    for (const idx of indexes) {
      if (obsoleteNames.includes(idx.name)) {
        try {
          await Tourist.collection.dropIndex(idx.name)
          console.log(`Dropped obsolete MongoDB index: ${idx.name}`)
        } catch (e) {
          console.log(`Index drop warning for ${idx.name}:`, e.message)
        }
      }
    }

    // Ensure current unique indexes exist
    await Tourist.collection.createIndex({ blockchainId: 1 }, { unique: true, sparse: false })
    await Tourist.collection.createIndex({ walletAddress: 1 }, { unique: true, sparse: false })
  } catch (error) {
    console.log("Index maintenance warning:", error.message)
  }
}

// API Routes

// 1. Register Tourist
app.post("/api/tourists/register", async (req, res) => {
  try {
    const { name, aadharOrPassport, tripStart, tripEnd, emergencyContact } = req.body

    if (!name || !aadharOrPassport || !tripStart || !tripEnd || !emergencyContact) {
      return res.status(400).json({ error: "All fields are required" })
    }

    // Check for expired assignments and release wallets
    walletQueue.checkExpiredAssignments()

    // Get next available wallet
    const assignedWallet = walletQueue.assignWallet(0, tripEnd) // We'll update the touristId after creation

    const tripStartTimestamp = Math.floor(new Date(tripStart).getTime() / 1000)
    const tripEndTimestamp = Math.floor(new Date(tripEnd).getTime() / 1000)

    // Register on blockchain using the assigned wallet
    let blockchainResult = { success: false, touristId: 0, transactionHash: null }
    
    if (blockchainService && blockchainService.contract) {
      // Create a temporary wallet for this transaction
      const tempWallet = new ethers.Wallet(assignedWallet.privateKey, blockchainService.provider)
      const tempContract = new ethers.Contract(
        blockchainService.contractAddress, 
        blockchainService.contractABI, 
        tempWallet
      )

      try {
        const tx = await tempContract.registerTourist(
          name,
          aadharOrPassport,
          tripStartTimestamp,
          tripEndTimestamp,
          emergencyContact,
          {
            gasLimit: 500000,
            gasPrice: ethers.parseUnits("20", "gwei")
          }
        )

        const receipt = await tx.wait()

        // Extract tourist ID from event
        const event = receipt.logs.find((log) => {
          try {
            const parsed = tempContract.interface.parseLog(log)
            return parsed.name === "TouristRegistered"
          } catch {
            return false
          }
        })

        if (event) {
          const parsed = tempContract.interface.parseLog(event)
          blockchainResult = {
            success: true,
            touristId: Number(parsed.args[0]),
            transactionHash: receipt.hash,
          }
        }
      } catch (blockchainError) {
        console.log("Blockchain registration failed, continuing with database only:", blockchainError.message)
      }
    }

    // Save to MongoDB
    const tourist = new Tourist({
      blockchainId: blockchainResult.touristId || Math.floor(Math.random() * 1000000), // Fallback ID if blockchain fails
      walletAddress: assignedWallet.address,
      name,
      aadharOrPassport,
      tripStart: new Date(tripStart),
      tripEnd: new Date(tripEnd),
      emergencyContact,
    })

    await tourist.save()

    // Update wallet assignment with actual tourist ID
    if (blockchainResult.success) {
      const assignment = walletQueue.assignedWallets.get(assignedWallet.address)
      if (assignment) {
        assignment.touristId = tourist.blockchainId
      }
    }

    if (iotSimulation) {
      await iotSimulation.addTouristToSimulation(tourist)
    }

    res.status(201).json({
      success: true,
      tourist: {
        id: tourist.blockchainId,
        walletAddress: tourist.walletAddress,
        name: tourist.name,
        tripStart: tourist.tripStart,
        tripEnd: tourist.tripEnd,
        transactionHash: blockchainResult.transactionHash,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({ error: "Registration failed: " + error.message })
  }
})

// 2. Get All Tourists (Admin only)
app.get("/api/tourists", async (req, res) => {
  try {
    const tourists = await Tourist.find({ isActive: true }).sort({ createdAt: -1 })
    res.json({ success: true, tourists })
  } catch (error) {
    console.error("Fetch tourists error:", error)
    res.status(500).json({ error: "Failed to fetch tourists" })
  }
})

// 3. Update Tourist Location
app.post("/api/tourists/:id/location", async (req, res) => {
  try {
    const { id } = req.params
    const { latitude, longitude } = req.body

    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and longitude are required" })
    }

    // Update on blockchain using service
    const blockchainResult = await blockchainService.updateLocation(Number(id), latitude, longitude)

    if (!blockchainResult.success) {
      return res.status(500).json({ error: "Blockchain location update failed: " + blockchainResult.error })
    }

    // Update in MongoDB
    const tourist = await Tourist.findOneAndUpdate(
      { blockchainId: Number(id), isActive: true },
      {
        latitude: latitude,
        longitude: longitude,
        updatedAt: new Date(),
      },
      { new: true },
    )

    if (!tourist) {
      return res.status(404).json({ error: "Tourist not found" })
    }

    // Store recent tick in memory for time-series
    try {
      const tid = Number(id)
      const now = new Date()
      const entry = { timestamp: now.toISOString(), latitude, longitude }
      const arr = recentTicks.get(tid) || []
      arr.push(entry)
      while (arr.length > MAX_TICKS_PER_TOURIST) arr.shift()
      recentTicks.set(tid, arr)
    } catch {}

    // Broadcast location update to all connected clients
    broadcastToClients({
      type: 'location_update',
      touristId: Number(id),
      tourist: tourist,
      latitude,
      longitude,
      timestamp: new Date().toISOString()
    })

    res.json({
      success: true,
      tourist,
      transactionHash: blockchainResult.transactionHash,
    })
  } catch (error) {
    console.error("Location update error:", error)
    res.status(500).json({ error: "Failed to update location" })
  }
})

// 4. Trigger SOS
app.post("/api/tourists/:id/sos", async (req, res) => {
  try {
    const { id } = req.params

    // Trigger SOS on blockchain using service
    const blockchainResult = await blockchainService.triggerSOS(Number(id))

    if (!blockchainResult.success) {
      return res.status(500).json({ error: "Blockchain SOS trigger failed: " + blockchainResult.error })
    }

    // Update in MongoDB
    const tourist = await Tourist.findOneAndUpdate(
      { blockchainId: Number(id), isActive: true },
      {
        sosActive: true,
        updatedAt: new Date(),
      },
      { new: true },
    )

    if (!tourist) {
      return res.status(404).json({ error: "Tourist not found" })
    }

    // Broadcast SOS alert to all connected clients
    broadcastToClients({
      type: 'sos_alert',
      touristId: Number(id),
      tourist: tourist,
      timestamp: new Date().toISOString(),
      severity: 'high'
    })

    res.json({
      success: true,
      message: "SOS triggered",
      tourist,
      transactionHash: blockchainResult.transactionHash,
    })
  } catch (error) {
    console.error("SOS trigger error:", error)
    res.status(500).json({ error: "Failed to trigger SOS" })
  }
})

// 5. Reset SOS (Admin only)
app.post("/api/tourists/:id/reset-sos", async (req, res) => {
  try {
    const { id } = req.params

    // Reset SOS on blockchain using service
    const blockchainResult = await blockchainService.resetSOS(Number(id))

    if (!blockchainResult.success) {
      return res.status(500).json({ error: "Blockchain SOS reset failed: " + blockchainResult.error })
    }

    // Update in MongoDB
    const tourist = await Tourist.findOneAndUpdate(
      { blockchainId: Number(id), isActive: true },
      {
        sosActive: false,
        updatedAt: new Date(),
      },
      { new: true },
    )

    if (!tourist) {
      return res.status(404).json({ error: "Tourist not found" })
    }

    res.json({
      success: true,
      message: "SOS reset",
      tourist,
      transactionHash: blockchainResult.transactionHash,
    })
  } catch (error) {
    console.error("SOS reset error:", error)
    res.status(500).json({ error: "Failed to reset SOS" })
  }
})

// Get simulation statistics
app.get("/api/simulation/stats", (req, res) => {
  try {
    const stats = iotSimulation ? iotSimulation.getSimulationStats() : { activeSimulations: 0, isRunning: false }
    res.json({ success: true, stats })
  } catch (error) {
    console.error("Simulation stats error:", error)
    res.status(500).json({ error: "Failed to get simulation stats" })
  }
})

// Get wallet queue status
app.get("/api/wallet-queue/status", (req, res) => {
  try {
    const status = walletQueue ? walletQueue.getQueueStatus() : { available: 0, assigned: 0, total: 0, assignedWallets: [] }
    res.json({ success: true, status })
  } catch (error) {
    console.error("Wallet queue status error:", error)
    res.status(500).json({ error: "Failed to get wallet queue status" })
  }
})

// Fetch recent ticks and alerts (basic observability)
app.get("/api/tourists/:id/recent-ticks", (req, res) => {
  const id = Number(req.params.id)
  res.json({ success: true, ticks: recentTicks.get(id) || [] })
})

app.get("/api/alerts", (req, res) => {
  res.json({ success: true, alerts: alerts.slice(-100) })
})

// Tourist detail with recent ticks
app.get("/api/tourists/:id/details", async (req, res) => {
  try {
    const id = Number(req.params.id)
    const tourist = await Tourist.findOne({ blockchainId: id, isActive: true })
    if (!tourist) return res.status(404).json({ success: false, error: "Tourist not found" })
    const ticks = recentTicks.get(id) || []
    res.json({ success: true, tourist, recentTicks: ticks })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// Simple E-FIR generation (now persisted in MongoDB, with nearest station assignment)
app.post("/api/efir", async (req, res) => {
  try {
    const { touristId, reason } = req.body
    const idNum = Number(touristId)
    const tourist = await Tourist.findOne({ blockchainId: idNum })
    if (!tourist) return res.status(404).json({ success: false, error: "Tourist not found" })
    const ticks = recentTicks.get(idNum) || []
    const last = ticks[ticks.length - 1] || { latitude: tourist.latitude, longitude: tourist.longitude, timestamp: new Date().toISOString() }
    const efirNumber = `EFIR-${Date.now()}-${idNum}`

    // Find nearest police station (simple haversine)
    const stations = await PoliceStation.find({})
    let nearest = null
    let nearestDist = Number.POSITIVE_INFINITY
    const toRad = (v) => (v * Math.PI) / 180
    function haversine(lat1, lon1, lat2, lon2) {
      const R = 6371000
      const dLat = toRad(lat2 - lat1)
      const dLon = toRad(lon2 - lon1)
      const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2
      return 2 * R * Math.asin(Math.sqrt(a))
    }
    for (const st of stations) {
      const d = haversine(last.latitude, last.longitude, st.latitude, st.longitude)
      if (d < nearestDist) { nearestDist = d; nearest = st }
    }

    const efirDoc = await EFIR.create({
      efirNumber,
      touristId: idNum,
      touristName: tourist.name,
      incidentType: reason || 'Safety Alert',
      description: `E-FIR generated for tourist ${tourist.name} due to: ${reason || 'Safety alert triggered'}`,
      latitude: last.latitude,
      longitude: last.longitude,
      lastKnownLocation: { latitude: last.latitude, longitude: last.longitude, timestamp: last.timestamp },
      status: 'pending',
      assignedStationId: nearest?._id,
      assignedStationName: nearest?.name,
      generatedBy: 'System'
    })

    // Broadcast E-FIR create
    broadcastToClients({ type: 'efir_created', efir: efirDoc })
    res.json({ success: true, efir: efirDoc })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

app.get("/api/efir", async (req, res) => {
  const efirs = await EFIR.find({}).sort({ createdAt: -1 }).limit(200)
  res.json({ success: true, efirs })
})

// Update E-FIR Status
app.put("/api/efir/:id/status", async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!status || !["pending", "in_progress", "resolved", "closed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" })
    }

    const efir = await EFIR.findOneAndUpdate({ efirNumber: id }, { status }, { new: true })
    if (!efir) return res.status(404).json({ error: "E-FIR not found" })

    broadcastToClients({ type: 'efir_status_update', efirId: id, status, efir })

    res.json({ success: true, message: "E-FIR status updated successfully", efir })
  } catch (error) {
    console.error("Failed to update E-FIR status:", error)
    res.status(500).json({ error: "Failed to update E-FIR status" })
  }
})

// Police stations APIs
app.get('/api/police-stations', async (req, res) => {
  const stations = await PoliceStation.find({}).limit(500)
  res.json({ success: true, stations })
})

// seed minimal NE police stations if empty
async function seedPoliceStationsIfEmpty() {
  const count = await PoliceStation.countDocuments()
  if (count > 0) return
  const demo = [
    { name: 'Panbazar PS', state: 'Assam', district: 'Kamrup Metro', latitude: 26.1838, longitude: 91.7450, phone: '0361-000000' },
    { name: 'Dispur PS', state: 'Assam', district: 'Kamrup Metro', latitude: 26.1433, longitude: 91.7898, phone: '0361-000000' },
    { name: 'Shillong Sadar PS', state: 'Meghalaya', district: 'East Khasi Hills', latitude: 25.5788, longitude: 91.8933, phone: '0364-000000' },
    { name: 'Itanagar PS', state: 'Arunachal Pradesh', district: 'Papum Pare', latitude: 27.0844, longitude: 93.6053, phone: '0360-000000' },
  ]
  await PoliceStation.insertMany(demo)
  console.log('Seeded demo police stations')
}

// Start/Stop simulation
app.post("/api/simulation/toggle", async (req, res) => {
  try {
    if (!iotSimulation) {
      return res.status(500).json({ error: "IoT simulation service not available" })
    }

    const stats = iotSimulation.getSimulationStats()

    if (stats.isRunning) {
      iotSimulation.stopAllSimulations()
      res.json({ success: true, message: "Simulations stopped", isRunning: false })
    } else {
      await iotSimulation.startAllSimulations()
      res.json({ success: true, message: "Simulations started", isRunning: true })
    }
  } catch (error) {
    console.error("Simulation toggle error:", error)
    res.status(500).json({ error: "Failed to toggle simulations" })
  }
})

// Get analytics data
app.get("/api/analytics", async (req, res) => {
  try {
    const tourists = await Tourist.find({ isActive: true })

    // Calculate analytics
    const totalTourists = tourists.length
    const activeTourists = tourists.filter((t) => t.latitude !== 0 && t.longitude !== 0).length
    const sosAlerts = tourists.filter((t) => t.sosActive).length

    // Group by areas
    const areaStats = tourists.reduce((acc, tourist) => {
      const area = getAreaFromCoordinates(tourist.latitude, tourist.longitude)
      if (!acc[area]) {
        acc[area] = { total: 0, sos: 0 }
      }
      acc[area].total++
      if (tourist.sosActive) acc[area].sos++
      return acc
    }, {})

    // Recent activity (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentActivity = await Tourist.find({
      updatedAt: { $gte: last24Hours },
      isActive: true,
    }).sort({ updatedAt: -1 })

    res.json({
      success: true,
      analytics: {
        totalTourists,
        activeTourists,
        sosAlerts,
        areaStats,
        recentActivity: recentActivity.slice(0, 10), // Last 10 activities
        simulationStats: iotSimulation ? iotSimulation.getSimulationStats() : null,
        alertsLast10: alerts.slice(-10)
      },
    })
  } catch (error) {
    console.error("Analytics error:", error)
    res.status(500).json({ error: "Failed to get analytics" })
  }
})

// Helper function for area calculation
function getAreaFromCoordinates(lat, lng) {
  if (lat === 0 && lng === 0) return "Unknown"
  if (lat > 29) return "Mountains"
  if (lat > 28.5) return "Downtown"
  if (lat > 28) return "Suburbs"
  return "Outskirts"
}

// ML Service proxy routes
app.get("/api/ml/health", async (req, res) => {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 5000 })
    res.json(response.data)
  } catch (error) {
    console.error("ML service health check failed:", error.message)
    res.status(503).json({ 
      status: "error", 
      message: "ML service unavailable",
      error: error.message 
    })
  }
})

app.post("/api/ml/predict", async (req, res) => {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/predict`, req.body, { 
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    })
    res.json(response.data)
  } catch (error) {
    console.error("ML prediction failed:", error.message)
    res.status(500).json({ 
      success: false,
      error: "ML prediction failed: " + error.message 
    })
  }
})

// Cron job to clean up expired tourists (runs every hour)
cron.schedule("0 * * * *", async () => {
  try {
    console.log("Running cleanup job for expired tourists...")

    const expiredTourists = await Tourist.find({
      tripEnd: { $lt: new Date() },
      isActive: true,
    })

    for (const tourist of expiredTourists) {
      try {
        if (iotSimulation) {
          iotSimulation.removeTouristFromSimulation(tourist.blockchainId)
        }

        // Release wallet back to queue
        if (walletQueue && tourist.walletAddress) {
          walletQueue.releaseWallet(tourist.walletAddress)
        }

        // Delete from blockchain using service
        if (blockchainService && blockchainService.contract) {
          const blockchainResult = await blockchainService.deleteTourist(tourist.blockchainId)
          if (!blockchainResult.success) {
            console.log(`Blockchain cleanup failed for tourist ${tourist.blockchainId}:`, blockchainResult.error)
          }
        }

        // Mark as inactive in MongoDB
        await Tourist.findByIdAndUpdate(tourist._id, { isActive: false })
        console.log(`Cleaned up expired tourist: ${tourist.name} (ID: ${tourist.blockchainId})`)
      } catch (error) {
        console.error(`Failed to cleanup tourist ${tourist.blockchainId}:`, error)
      }
    }

    // Check for expired wallet assignments
    if (walletQueue) {
      const releasedCount = walletQueue.checkExpiredAssignments()
      if (releasedCount > 0) {
        console.log(`Released ${releasedCount} expired wallet assignments`)
      }
    }
  } catch (error) {
    console.error("Cleanup job error:", error)
  }
})

// Lightweight periodic anomaly scan using in-memory ticks
setInterval(() => {
  try {
    const now = Date.now()
    const COMM_LOSS_MS = 20 * 60 * 1000 // 20 minutes
    const INACTIVITY_MS = 30 * 60 * 1000 // 30 minutes
    const MOVEMENT_THRESHOLD_METERS = 30 // ~30m

    function haversine(lat1, lon1, lat2, lon2) {
      function toRad(v) { return (v * Math.PI) / 180 }
      const R = 6371000
      const dLat = toRad(lat2 - lat1)
      const dLon = toRad(lon2 - lon1)
      const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      return R * c
    }

    for (const [tid, ticks] of recentTicks.entries()) {
      if (!ticks.length) continue
      const last = ticks[ticks.length - 1]
      const lastTs = new Date(last.timestamp).getTime()
      // Communication loss
      if (now - lastTs > COMM_LOSS_MS) {
        alerts.push({
          touristId: tid,
          type: 'communication_loss',
          severity: 'warn',
          message: 'No location update for >20 minutes',
          timestamp: new Date().toISOString()
        })
        continue
      }
      // Inactivity: minimal movement over 30 minutes
      const windowTicks = ticks.filter(t => now - new Date(t.timestamp).getTime() <= INACTIVITY_MS)
      if (windowTicks.length >= 2) {
        let moved = 0
        for (let i = 1; i < windowTicks.length; i++) {
          moved += haversine(
            windowTicks[i-1].latitude, windowTicks[i-1].longitude,
            windowTicks[i].latitude, windowTicks[i].longitude
          )
          if (moved > MOVEMENT_THRESHOLD_METERS) break
        }
        if (moved <= MOVEMENT_THRESHOLD_METERS) {
          const alert = {
            touristId: tid,
            type: 'prolonged_inactivity',
            severity: 'warn',
            message: 'Low movement over last 30 minutes',
            timestamp: new Date().toISOString()
          }
          alerts.push(alert)
          
          // Broadcast inactivity alert to all connected clients
          broadcastToClients({
            type: 'anomaly_alert',
            alert: alert
          })
        }
      }
      // Keep alerts list from growing unbounded
      if (alerts.length > 5000) alerts.splice(0, alerts.length - 4000)
    }
  } catch (e) {
    console.error('Anomaly scan error:', e.message)
  }
}, 60 * 1000) // every minute

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Server error:", error)
  res.status(500).json({ error: "Internal server error" })
})

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down gracefully...")
  if (iotSimulation) {
    iotSimulation.stopAllSimulations()
  }
  process.exit(0)
})

// Initialize and start server
async function startServer() {
  // Make sure indexes are correct before starting
  await ensureTouristIndexes()
  await initServices()
  await seedPoliceStationsIfEmpty()

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    console.log(`WebSocket server running on ws://localhost:${PORT}/ws`)
  })
}

startServer()

