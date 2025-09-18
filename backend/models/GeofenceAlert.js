const mongoose = require('mongoose');

const geofenceAlertSchema = new mongoose.Schema({
  // Tourist information
  touristId: {
    type: Number,
    required: true,
    index: true
  },
  touristName: {
    type: String,
    required: true
  },
  
  // Location information
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  
  // Zone information
  zoneId: {
    type: String,
    required: true,
    index: true
  },
  zoneName: {
    type: String,
    required: true
  },
  zoneRiskLevel: {
    type: String,
    enum: ['low', 'moderate', 'high', 'critical'],
    required: true,
    index: true
  },
  
  // Alert type and event
  alertType: {
    type: String,
    default: 'geofence_alert'
  },
  eventType: {
    type: String,
    enum: ['zone_entry', 'zone_exit', 'zone_check'],
    required: true,
    index: true
  },
  
  // Alert details
  severity: {
    type: String,
    enum: ['low', 'moderate', 'high', 'critical'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'expired'],
    default: 'active',
    index: true
  },
  
  // Messages
  message: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  
  // Timestamps
  entryTime: {
    type: Date,
    required: true,
    index: true
  },
  exitTime: {
    type: Date,
    default: null
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Duration tracking
  durationInZone: {
    type: Number, // in milliseconds
    default: 0
  },
  
  // Metadata
  autoNotifyAuthorities: {
    type: Boolean,
    default: false
  },
  notificationsSent: [{
    type: String,
    timestamp: Date
  }],
  
  // Zone details snapshot
  zoneDetails: {
    safetyScore: Number,
    alertMessage: String,
    recommendations: [String]
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  collection: 'geofence_alerts'
});

// Compound indexes for efficient queries
geofenceAlertSchema.index({ touristId: 1, status: 1 });
geofenceAlertSchema.index({ zoneId: 1, eventType: 1, entryTime: -1 });
geofenceAlertSchema.index({ zoneRiskLevel: 1, status: 1, entryTime: -1 });
geofenceAlertSchema.index({ entryTime: -1 }); // For chronological queries

// Instance methods
geofenceAlertSchema.methods.markAsExited = function(exitLocation) {
  this.exitTime = new Date();
  this.status = 'resolved';
  this.lastUpdated = new Date();
  
  if (this.entryTime) {
    this.durationInZone = this.exitTime - this.entryTime;
  }
  
  // Update location to exit location if provided
  if (exitLocation) {
    this.latitude = exitLocation.latitude;
    this.longitude = exitLocation.longitude;
  }
  
  return this.save();
};

geofenceAlertSchema.methods.updateLocation = function(latitude, longitude) {
  this.latitude = latitude;
  this.longitude = longitude;
  this.lastUpdated = new Date();
  return this.save();
};

// Static methods
geofenceAlertSchema.statics.findActiveAlertsForTourist = function(touristId) {
  return this.find({
    touristId: touristId,
    status: 'active',
    exitTime: null
  }).sort({ entryTime: -1 });
};

geofenceAlertSchema.statics.findActiveCriticalAlerts = function() {
  return this.find({
    status: 'active',
    exitTime: null,
    zoneRiskLevel: { $in: ['high', 'critical'] }
  }).sort({ entryTime: -1 });
};

geofenceAlertSchema.statics.findActiveAlertsInZone = function(zoneId) {
  return this.find({
    zoneId: zoneId,
    status: 'active',
    exitTime: null
  }).sort({ entryTime: -1 });
};

geofenceAlertSchema.statics.getAlertHistory = function(filters = {}) {
  const query = {};
  
  if (filters.touristId) query.touristId = filters.touristId;
  if (filters.zoneId) query.zoneId = filters.zoneId;
  if (filters.riskLevel) query.zoneRiskLevel = filters.riskLevel;
  if (filters.eventType) query.eventType = filters.eventType;
  if (filters.status) query.status = filters.status;
  
  if (filters.dateRange) {
    query.entryTime = {
      $gte: filters.dateRange.start,
      $lte: filters.dateRange.end
    };
  }
  
  return this.find(query)
    .sort({ entryTime: -1 })
    .limit(filters.limit || 100);
};

const GeofenceAlert = mongoose.model('GeofenceAlert', geofenceAlertSchema);

module.exports = GeofenceAlert;