const BlockchainService = require("../../blockchain/utils")

class IoTSimulationService {
  constructor() {
    this.activeSimulations = new Map()
    this.blockchainService = null
    this.Tourist = null
    this.Alert = null
    this.isRunning = false
  }

  async initialize(Tourist, blockchainService, Alert = null) {
    this.Tourist = Tourist
    this.blockchainService = blockchainService
    this.Alert = Alert
    console.log("IoT Simulation Service initialized with Alert model:", !!Alert)
  }

  // Generate random coordinates within a realistic range
  generateRandomLocation(baseLatitude = 28.6139, baseLongitude = 77.209, radiusKm = 50) {
    // Convert radius from kilometers to degrees (approximate)
    const radiusInDegrees = radiusKm / 111.32

    // Generate random angle and distance
    const angle = Math.random() * 2 * Math.PI
    const distance = Math.random() * radiusInDegrees

    // Calculate new coordinates
    const latitude = baseLatitude + distance * Math.cos(angle)
    const longitude = baseLongitude + distance * Math.sin(angle)

    return {
      latitude: Number.parseFloat(latitude.toFixed(6)),
      longitude: Number.parseFloat(longitude.toFixed(6)),
    }
  }

  // Simulate gradual movement (more realistic than random jumps)
  generateMovement(currentLat, currentLng, maxDistanceKm = 2) {
    const maxDistanceInDegrees = maxDistanceKm / 111.32

    // Generate small random movement
    const angle = Math.random() * 2 * Math.PI
    const distance = Math.random() * maxDistanceInDegrees

    const newLatitude = currentLat + distance * Math.cos(angle)
    const newLongitude = currentLng + distance * Math.sin(angle)

    return {
      latitude: Number.parseFloat(newLatitude.toFixed(6)),
      longitude: Number.parseFloat(newLongitude.toFixed(6)),
    }
  }

  // Start simulation for a specific tourist
  async startTouristSimulation(tourist) {
    if (this.activeSimulations.has(tourist.blockchainId)) {
      console.log(`Simulation already running for tourist ${tourist.blockchainId}`)
      return
    }

    console.log(`Starting IoT simulation for tourist: ${tourist.name} (ID: ${tourist.blockchainId})`)

    // Initialize with random location if not set
    let currentLocation = {
      latitude: tourist.latitude || 28.6139,
      longitude: tourist.longitude || 77.209,
    }

    if (tourist.latitude === 0 && tourist.longitude === 0) {
      currentLocation = this.generateRandomLocation()
      await this.updateTouristLocation(tourist.blockchainId, currentLocation.latitude, currentLocation.longitude)
    }

    // Create simulation interval
    const simulationInterval = setInterval(async () => {
      try {
        // Check if tourist is still active
        const updatedTourist = await this.Tourist.findOne({
          blockchainId: tourist.blockchainId,
          isActive: true,
        })

        if (!updatedTourist) {
          console.log(`Tourist ${tourist.blockchainId} is no longer active, stopping simulation`)
          this.stopTouristSimulation(tourist.blockchainId)
          return
        }

        // If device has sent a fix in the last 60s, don't override with simulation
        if (updatedTourist.deviceTracked) {
          currentLocation = { latitude: updatedTourist.latitude, longitude: updatedTourist.longitude }
        } else {
          // Generate new location (gradual movement)
          currentLocation = this.generateMovement(currentLocation.latitude, currentLocation.longitude)
          // Update location
          await this.updateTouristLocation(tourist.blockchainId, currentLocation.latitude, currentLocation.longitude)
        }

        // Random SOS trigger (1% chance every 5 seconds = very rare)
        if (Math.random() < 0.01 && !updatedTourist.sosActive) {
          console.log(`Triggering random SOS for tourist ${tourist.blockchainId}`)
          await this.triggerRandomSOS(tourist.blockchainId)
        }

        // Random SOS resolution (10% chance if SOS is active)
        if (Math.random() < 0.1 && updatedTourist.sosActive) {
          console.log(`Auto-resolving SOS for tourist ${tourist.blockchainId}`)
          await this.resetSOS(tourist.blockchainId)
        }
      } catch (error) {
        console.error(`Error in simulation for tourist ${tourist.blockchainId}:`, error)
      }
    }, 5000) // Update every 5 seconds

    this.activeSimulations.set(tourist.blockchainId, {
      interval: simulationInterval,
      tourist: tourist,
      currentLocation: currentLocation,
    })
  }

  // Stop simulation for a specific tourist
  stopTouristSimulation(touristId) {
    const simulation = this.activeSimulations.get(touristId)
    if (simulation) {
      clearInterval(simulation.interval)
      this.activeSimulations.delete(touristId)
      console.log(`Stopped simulation for tourist ${touristId}`)
    }
  }

  // Update tourist location in both database and blockchain
  async updateTouristLocation(touristId, latitude, longitude) {
    try {
      // Update in MongoDB with display coordinates
      await this.Tourist.findOneAndUpdate(
        { blockchainId: touristId, isActive: true },
        {
          latitude: latitude,
          longitude: longitude,
          displayLatitude: latitude,
          displayLongitude: longitude,
          locationSource: 'simulation',
          updatedAt: new Date(),
        },
      )

      // Skip blockchain updates for now to avoid constant errors
      // Blockchain integration can be enabled when contract is properly deployed

      console.log(`Updated location for tourist ${touristId}: ${latitude}, ${longitude}`)
    } catch (error) {
      console.error(`Failed to update location for tourist ${touristId}:`, error)
    }
  }

  // Trigger random SOS
  async triggerRandomSOS(touristId) {
    try {
      // Get tourist info for alert
      const tourist = await this.Tourist.findOneAndUpdate(
        { blockchainId: touristId, isActive: true },
        {
          sosActive: true,
          updatedAt: new Date(),
        },
        { new: true }
      )

      if (!tourist) {
        console.log(`Tourist ${touristId} not found for SOS trigger`)
        return
      }

      // Create SOS alert for analytics
      const sosAlert = {
        touristId: touristId,
        type: 'sos_alert',
        severity: 'high',
        message: `SOS alert triggered by simulation for ${tourist.name} (ID: ${touristId})`,
        timestamp: new Date(),
        tourist: {
          name: tourist.name,
          id: touristId,
          latitude: tourist.displayLatitude || tourist.latitude,
          longitude: tourist.displayLongitude || tourist.longitude
        }
      }

      // Save SOS alert to database if Alert model is available
      if (this.Alert) {
        try {
          const alertDoc = new this.Alert(sosAlert)
          await alertDoc.save()
          console.log(`💾 Saved simulation SOS alert to database: ${alertDoc._id}`);
        } catch (dbError) {
          console.error('Failed to save simulation SOS alert to database:', dbError)
        }
      }

      // Skip blockchain SOS updates to avoid errors
      // Blockchain integration can be enabled when contract is properly deployed

      console.log(`Triggered SOS for tourist ${touristId}`)
    } catch (error) {
      console.error(`Failed to trigger SOS for tourist ${touristId}:`, error)
    }
  }

  // Reset SOS
  async resetSOS(touristId) {
    try {
      // Update in MongoDB
      await this.Tourist.findOneAndUpdate(
        { blockchainId: touristId, isActive: true },
        {
          sosActive: false,
          updatedAt: new Date(),
        },
      )

      // Skip blockchain SOS reset to avoid errors
      // Blockchain integration can be enabled when contract is properly deployed

      console.log(`Reset SOS for tourist ${touristId}`)
    } catch (error) {
      console.error(`Failed to reset SOS for tourist ${touristId}:`, error)
    }
  }

  // Start simulation for all active tourists
  async startAllSimulations() {
    if (this.isRunning) {
      console.log("IoT simulations already running")
      return
    }

    try {
      // Check if mongoose is connected
      const mongoose = require('mongoose')
      if (mongoose.connection.readyState !== 1) {
        console.log('⚠️  MongoDB not ready, cannot start simulations')
        return
      }

      const activeTourists = await this.Tourist.find({ isActive: true })
      console.log(`Starting IoT simulations for ${activeTourists.length} active tourists`)

      for (const tourist of activeTourists) {
        await this.startTouristSimulation(tourist)
      }

      this.isRunning = true
      console.log("All IoT simulations started successfully")
    } catch (error) {
      console.error("Failed to start IoT simulations:", error)
    }
  }

  // Stop all simulations
  stopAllSimulations() {
    console.log("Stopping all IoT simulations...")

    for (const [touristId] of this.activeSimulations) {
      this.stopTouristSimulation(touristId)
    }

    this.isRunning = false
    console.log("All IoT simulations stopped")
  }

  // Get simulation statistics
  getSimulationStats() {
    return {
      activeSimulations: this.activeSimulations.size,
      isRunning: this.isRunning,
      simulatedTourists: Array.from(this.activeSimulations.keys()),
    }
  }

  // Add new tourist to simulation
  async addTouristToSimulation(tourist) {
    if (this.isRunning && tourist.isActive) {
      await this.startTouristSimulation(tourist)
    }
  }

  // Remove tourist from simulation
  removeTouristFromSimulation(touristId) {
    this.stopTouristSimulation(touristId)
  }
}

module.exports = IoTSimulationService
