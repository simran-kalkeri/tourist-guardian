const mongoose = require("mongoose");

const zoneSchema = new mongoose.Schema({
  zone_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  radius: { type: Number, required: true }, // in meters (for backward compatibility)
  
  // New polygon support
  polygon_coordinates: [{
    latitude: { type: Number },
    longitude: { type: Number }
  }],
  zone_type: { 
    type: String, 
    enum: ['circle', 'polygon'], 
    default: 'circle' 
  },
  
  // Dynamic safety scoring
  safety_score: { type: Number, min: 1, max: 10, default: 10 },
  risk_level: { 
    type: String, 
    enum: ['low', 'moderate', 'high'], 
    default: 'low' 
  },
  last_updated: { type: Date, default: Date.now },
  safety_factors: {
    locationRisk: { type: Number, default: 0 },
    seasonalRisk: { type: Number, default: 0 },
    incidentRisk: { type: Number, default: 0 },
    weatherRisk: { type: Number, default: 0 },
    timeRisk: { type: Number, default: 0 }
  },
  recommendations: [{ type: String }],
  
  // Zone metadata
  description: { type: String },
  state: { type: String },
  district: { type: String },
  zone_category: { 
    type: String, 
    enum: ['urban', 'rural', 'forest', 'mountain', 'coastal', 'border'], 
    default: 'urban' 
  },
  
  // Geo-fencing settings
  alert_enabled: { type: Boolean, default: true },
  alert_message: { type: String, default: 'You have entered a high-risk zone' },
  auto_notify_authorities: { type: Boolean, default: false },
  
  // Statistics
  tourist_count: { type: Number, default: 0 },
  incident_count: { type: Number, default: 0 },
  last_incident: { type: Date }
});

// Index for geospatial queries
zoneSchema.index({ latitude: 1, longitude: 1 });
zoneSchema.index({ zone_category: 1 });
zoneSchema.index({ risk_level: 1 });

const Zone = mongoose.model("Zone", zoneSchema);
module.exports = Zone;