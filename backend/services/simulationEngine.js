const haversine = (lat1, lon1, lat2, lon2) => {
  const toRad = v => (v * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

const moveTowards = (lat1, lon1, lat2, lon2, stepMeters) => {
  const dist = haversine(lat1, lon1, lat2, lon2)
  if (stepMeters >= dist || dist === 0) return { lat: lat2, lon: lon2 }
  const ratio = stepMeters / dist
  const lat = lat1 + (lat2 - lat1) * ratio
  const lon = lon1 + (lon2 - lon1) * ratio
  return { lat, lon }
}

class SimulationEngine {
  constructor({ TouristModel, broadcaster, tickSeconds = 5, defaultSpeedMps = 12 }) {
    this.Tourist = TouristModel
    this.broadcast = broadcaster
    this.tickMs = tickSeconds * 1000
    this.defaultSpeedMps = defaultSpeedMps
    this.timer = null
  }

  start() {
    if (this.timer) return
    this.timer = setInterval(() => this.tick(), this.tickMs)
    console.log(`SimulationEngine started (tick ${this.tickMs}ms)`)    
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  async tick() {
    try {
      // Check if mongoose is connected before attempting DB operations
      const mongoose = require('mongoose')
      if (mongoose.connection.readyState !== 1) {
        // Silently skip if DB not ready
        return
      }
      
      const tourists = await this.Tourist.find({ simulationMode: true, deviceTracked: false, isActive: true })
      const now = new Date()

      for (const t of tourists) {
        const idx = t.simulationState?.currentSegmentIndex || 0
        if (!t.itinerary || t.itinerary.length === 0) continue
        const curr = idx === 0 ? { lat: t.displayLatitude, lng: t.displayLongitude } : t.itinerary[idx - 1]
        const target = t.itinerary[idx] || t.itinerary[t.itinerary.length - 1]
        if (!target || target.lat === undefined || target.lng === undefined) continue

        const speed = t.simulationState?.simulatedSpeedMps || this.defaultSpeedMps
        const step = speed * (this.tickMs / 1000)
        const next = moveTowards(curr.lat, curr.lng, target.lat, target.lng, step)
        const distLeft = haversine(next.lat, next.lon, target.lat, target.lng)

        // Update tourist position (display only, raw untouched)
        t.displayLatitude = next.lat
        t.displayLongitude = next.lon
        t.locationSource = 'simulation'
        t.flags.simulated = true
        t.simulationState.lastSimTickAt = now

        // Arrived at waypoint
        if (distLeft < 5) {
          t.displayLatitude = target.lat
          t.displayLongitude = target.lng
          t.simulationState.currentSegmentIndex = Math.min(idx + 1, t.itinerary.length)
          this.broadcast({ type: 'itinerary_step_arrival', touristId: t.blockchainId, waypointIndex: idx, simulated: true, displayLatitude: t.displayLatitude, displayLongitude: t.displayLongitude, timestamp: now.toISOString() })

          // If completed itinerary
          if (t.simulationState.currentSegmentIndex >= t.itinerary.length) {
            t.isActive = true // Keep active for demo; could mark completed
          }
        }

        await t.save()
        this.broadcast({ type: 'location_update', touristId: t.blockchainId, tourist: t, displayLatitude: t.displayLatitude, displayLongitude: t.displayLongitude, simulated: true, timestamp: now.toISOString() })
      }
    } catch (e) {
      console.error('Simulation tick error:', e)
    }
  }
}

module.exports = SimulationEngine


