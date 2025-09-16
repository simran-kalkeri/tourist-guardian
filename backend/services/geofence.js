const mongoose = require('mongoose')

// Geo-fence Zone Schema
const GeofenceZoneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  zoneType: { 
    type: String, 
    enum: ['high_risk', 'restricted', 'monitoring', 'safe_zone'],
    required: true 
  },
  severity: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  polygon: {
    type: {
      type: String,
      enum: ['Polygon'],
      required: true
    },
    coordinates: {
      type: [[[Number]]], // Array of linear rings
      required: true
    }
  },
  center: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  radius: { type: Number }, // For circular zones (optional)
  isActive: { type: Boolean, default: true },
  alertMessage: { type: String },
  autoAlert: { type: Boolean, default: true },
  createdBy: { type: String, default: 'system' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

// Index for geospatial queries
GeofenceZoneSchema.index({ polygon: '2dsphere' })
GeofenceZoneSchema.index({ center: '2dsphere' })
GeofenceZoneSchema.index({ zoneType: 1, isActive: 1 })

const GeofenceZone = mongoose.model('GeofenceZone', GeofenceZoneSchema)

class GeofenceService {
  constructor() {
    this.zones = new Map()
    this.initialized = false
  }

  async initialize() {
    try {
      console.log('🗺️  Initializing Geo-fence Service...')
      
      // Check if MongoDB is connected
      if (mongoose.connection.readyState !== 1) {
        console.log('⚠️  MongoDB not connected, initializing with default zones only')
        this.initializeDefaultZones()
        this.initialized = true
        console.log(`✅ Geo-fence Service initialized with ${this.zones.size} default zones`)
        return
      }
      
      // Load all active zones from database
      const zones = await GeofenceZone.find({ isActive: true }).maxTimeMS(5000)
      
      this.zones.clear()
      zones.forEach(zone => {
        this.zones.set(zone._id.toString(), zone)
      })
      
      this.initialized = true
      console.log(`✅ Geo-fence Service initialized with ${zones.length} zones`)
      
      // Create default NE risk zones if none exist
      if (zones.length === 0) {
        await this.createDefaultNortheastZones()
      }
      
    } catch (error) {
      console.error('❌ Geo-fence Service initialization failed:', error.message)
      // Fallback to default zones
      console.log('⚠️  Falling back to default zones')
      this.initializeDefaultZones()
      this.initialized = true
      console.log(`✅ Geo-fence Service initialized with ${this.zones.size} default zones`)
    }
  }

  initializeDefaultZones() {
    console.log('🏔️  Initializing default Northeast risk zones in memory...')
    
    const defaultZones = [
      {
        _id: 'zone_1',
        name: "Arunachal Pradesh Border Zone",
        description: "High-risk border area with restricted access",
        zoneType: "high_risk",
        severity: "critical",
        polygon: {
          type: "Polygon",
          coordinates: [[
            [92.0, 28.0], [93.5, 28.0], [93.5, 29.5], [92.0, 29.5], [92.0, 28.0]
          ]]
        },
        center: {
          type: "Point",
          coordinates: [92.75, 28.75]
        },
        alertMessage: "⚠️ You have entered a high-risk border zone. Please exercise extreme caution.",
        autoAlert: true
      },
      {
        _id: 'zone_2',
        name: "Assam Flood Prone Areas",
        description: "Areas prone to flooding during monsoon",
        zoneType: "monitoring",
        severity: "high",
        polygon: {
          type: "Polygon",
          coordinates: [[
            [90.0, 26.0], [95.0, 26.0], [95.0, 27.0], [90.0, 27.0], [90.0, 26.0]
          ]]
        },
        center: {
          type: "Point",
          coordinates: [92.5, 26.5]
        },
        alertMessage: "🌊 Flood-prone area detected. Monitor weather conditions.",
        autoAlert: true
      },
      {
        _id: 'zone_3',
        name: "Meghalaya Remote Areas",
        description: "Remote areas with limited connectivity",
        zoneType: "monitoring",
        severity: "medium",
        polygon: {
          type: "Polygon",
          coordinates: [[
            [90.0, 25.0], [92.0, 25.0], [92.0, 26.0], [90.0, 26.0], [90.0, 25.0]
          ]]
        },
        center: {
          type: "Point",
          coordinates: [91.0, 25.5]
        },
        alertMessage: "📶 Entering remote area with limited connectivity. Stay alert.",
        autoAlert: true
      },
      {
        _id: 'zone_4',
        name: "Kaziranga National Park",
        description: "Wildlife sanctuary with restricted movement",
        zoneType: "restricted",
        severity: "high",
        polygon: {
          type: "Polygon",
          coordinates: [[
            [93.0, 26.3], [93.5, 26.3], [93.5, 26.8], [93.0, 26.8], [93.0, 26.3]
          ]]
        },
        center: {
          type: "Point",
          coordinates: [93.25, 26.55]
        },
        alertMessage: "🐅 Wildlife sanctuary zone. Follow park guidelines strictly.",
        autoAlert: true
      }
    ]
    
    this.zones.clear()
    defaultZones.forEach(zone => {
      this.zones.set(zone._id, zone)
    })
  }

  async createDefaultNortheastZones() {
    console.log('🏔️  Creating default Northeast risk zones...')
    
    const defaultZones = [
      {
        name: "Arunachal Pradesh Border Zone",
        description: "High-risk border area with restricted access",
        zoneType: "high_risk",
        severity: "critical",
        polygon: {
          type: "Polygon",
          coordinates: [[
            [92.0, 28.0], [93.5, 28.0], [93.5, 29.5], [92.0, 29.5], [92.0, 28.0]
          ]]
        },
        center: {
          type: "Point",
          coordinates: [92.75, 28.75]
        },
        alertMessage: "⚠️ You have entered a high-risk border zone. Please exercise extreme caution.",
        autoAlert: true
      },
      {
        name: "Assam Flood Prone Areas",
        description: "Areas prone to flooding during monsoon",
        zoneType: "monitoring",
        severity: "high",
        polygon: {
          type: "Polygon",
          coordinates: [[
            [90.0, 26.0], [95.0, 26.0], [95.0, 27.0], [90.0, 27.0], [90.0, 26.0]
          ]]
        },
        center: {
          type: "Point",
          coordinates: [92.5, 26.5]
        },
        alertMessage: "🌊 Flood-prone area detected. Monitor weather conditions.",
        autoAlert: true
      },
      {
        name: "Meghalaya Remote Areas",
        description: "Remote areas with limited connectivity",
        zoneType: "monitoring",
        severity: "medium",
        polygon: {
          type: "Polygon",
          coordinates: [[
            [90.0, 25.0], [92.0, 25.0], [92.0, 26.0], [90.0, 26.0], [90.0, 25.0]
          ]]
        },
        center: {
          type: "Point",
          coordinates: [91.0, 25.5]
        },
        alertMessage: "📶 Entering remote area with limited connectivity. Stay alert.",
        autoAlert: true
      },
      {
        name: "Kaziranga National Park",
        description: "Wildlife sanctuary with restricted movement",
        zoneType: "restricted",
        severity: "high",
        polygon: {
          type: "Polygon",
          coordinates: [[
            [93.0, 26.3], [93.5, 26.3], [93.5, 26.8], [93.0, 26.8], [93.0, 26.3]
          ]]
        },
        center: {
          type: "Point",
          coordinates: [93.25, 26.55]
        },
        alertMessage: "🐅 Wildlife sanctuary zone. Follow park guidelines strictly.",
        autoAlert: true
      }
    ]

    for (const zoneData of defaultZones) {
      try {
        const zone = new GeofenceZone(zoneData)
        await zone.save()
        this.zones.set(zone._id.toString(), zone)
        console.log(`✅ Created zone: ${zone.name}`)
      } catch (error) {
        console.error(`❌ Failed to create zone ${zoneData.name}:`, error)
      }
    }
  }

  // Check if a point is inside any zone
  checkPointInZones(latitude, longitude) {
    if (!this.initialized) {
      console.warn('⚠️ Geo-fence service not initialized')
      return { inZone: false, zones: [] }
    }

    const point = [longitude, latitude] // GeoJSON format: [lng, lat]
    const results = []

    for (const [zoneId, zone] of this.zones) {
      if (this.isPointInPolygon(point, zone.polygon.coordinates[0])) {
        results.push({
          zoneId,
          name: zone.name,
          zoneType: zone.zoneType,
          severity: zone.severity,
          alertMessage: zone.alertMessage,
          autoAlert: zone.autoAlert
        })
      }
    }

    return {
      inZone: results.length > 0,
      zones: results
    }
  }

  // Point-in-polygon algorithm (Ray casting)
  isPointInPolygon(point, polygon) {
    const [x, y] = point
    let inside = false

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i]
      const [xj, yj] = polygon[j]

      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside
      }
    }

    return inside
  }

  // Get all zones for admin dashboard
  async getAllZones() {
    try {
      return await GeofenceZone.find({}).sort({ createdAt: -1 })
    } catch (error) {
      console.error('Error fetching zones:', error)
      return []
    }
  }

  // Get active zones only
  async getActiveZones() {
    try {
      return await GeofenceZone.find({ isActive: true }).sort({ severity: -1 })
    } catch (error) {
      console.error('Error fetching active zones:', error)
      return []
    }
  }

  // Create new zone
  async createZone(zoneData) {
    try {
      const zone = new GeofenceZone(zoneData)
      await zone.save()
      
      // Update in-memory cache
      this.zones.set(zone._id.toString(), zone)
      
      return { success: true, zone }
    } catch (error) {
      console.error('Error creating zone:', error)
      return { success: false, error: error.message }
    }
  }

  // Update zone
  async updateZone(zoneId, updateData) {
    try {
      const zone = await GeofenceZone.findByIdAndUpdate(
        zoneId, 
        { ...updateData, updatedAt: new Date() }, 
        { new: true }
      )
      
      if (zone) {
        // Update in-memory cache
        if (zone.isActive) {
          this.zones.set(zone._id.toString(), zone)
        } else {
          this.zones.delete(zone._id.toString())
        }
      }
      
      return { success: true, zone }
    } catch (error) {
      console.error('Error updating zone:', error)
      return { success: false, error: error.message }
    }
  }

  // Delete zone
  async deleteZone(zoneId) {
    try {
      await GeofenceZone.findByIdAndDelete(zoneId)
      
      // Remove from in-memory cache
      this.zones.delete(zoneId)
      
      return { success: true }
    } catch (error) {
      console.error('Error deleting zone:', error)
      return { success: false, error: error.message }
    }
  }

  // Get zone statistics
  async getZoneStats() {
    try {
      const stats = await GeofenceZone.aggregate([
        {
          $group: {
            _id: '$zoneType',
            count: { $sum: 1 },
            activeCount: {
              $sum: { $cond: ['$isActive', 1, 0] }
            }
          }
        }
      ])

      const severityStats = await GeofenceZone.aggregate([
        {
          $group: {
            _id: '$severity',
            count: { $sum: 1 }
          }
        }
      ])

      return {
        byType: stats,
        bySeverity: severityStats,
        total: await GeofenceZone.countDocuments(),
        active: await GeofenceZone.countDocuments({ isActive: true })
      }
    } catch (error) {
      console.error('Error getting zone stats:', error)
      return { byType: [], bySeverity: [], total: 0, active: 0 }
    }
  }

  // Refresh zones from database
  async refreshZones() {
    await this.initialize()
  }
}

// Export singleton instance
const geofenceService = new GeofenceService()

module.exports = {
  geofenceService,
  GeofenceZone
}






