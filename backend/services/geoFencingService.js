// ENHANCED GEOFENCING SERVICE with Real-time Tracking and Database Persistence
const Zone = require('../models/zone');
const GeofenceAlert = require('../models/GeofenceAlert');

class GeoFencingService {
  constructor() {
    this.touristZoneStatus = new Map(); // Track which zones tourists are currently in
    this.alertHistory = []; // Keep memory cache for fast access
  }

  // Enhanced method to check tourist location and manage real-time zone status
  async checkTouristLocation(touristId, latitude, longitude, touristName = 'Unknown') {
    try {
      const zones = await Zone.find({ alert_enabled: true });
      const currentZones = [];
      
      // Check which zones the tourist is currently in
      for (const zone of zones) {
        let isInZone = false;
        
        if (zone.zone_type === 'circle') {
          const distance = this.getDistanceFromLatLonInMeters(
            latitude, longitude, zone.latitude, zone.longitude
          );
          isInZone = distance <= zone.radius;
        } else if (zone.zone_type === 'polygon' && zone.polygon_coordinates.length > 0) {
          isInZone = this.isPointInPolygon(latitude, longitude, zone.polygon_coordinates);
        }
        
        if (isInZone) {
          currentZones.push({
            zone_id: zone.zone_id,
            name: zone.name,
            safety_score: zone.safety_score,
            risk_level: zone.risk_level,
            alert_message: zone.alert_message,
            recommendations: zone.recommendations,
            auto_notify_authorities: zone.auto_notify_authorities
          });
        }
      }
      
      // Get previously tracked zones for this tourist
      const touristKey = `tourist_${touristId}`;
      let previousZones = this.touristZoneStatus.get(touristKey);
      
      // If not in memory, load from database (in case of server restart)
      if (!previousZones) {
        try {
          const activeAlerts = await GeofenceAlert.find({
            touristId,
            status: 'active',
            exitTime: null
          });
          previousZones = new Set(activeAlerts.map(alert => alert.zoneId));
          console.log(`🔄 Loaded ${previousZones.size} active zone(s) from database for tourist ${touristId}`);
        } catch (dbError) {
          console.warn('Failed to load previous zones from database:', dbError.message);
          previousZones = new Set();
        }
      }
      
      const currentZoneIds = new Set(currentZones.map(z => z.zone_id));
      
      // Detect zone entries (new zones)
      const enteredZones = currentZones.filter(zone => !previousZones.has(zone.zone_id));
      
      // Detect zone exits (zones no longer present)
      const exitedZoneIds = [...previousZones].filter(zoneId => !currentZoneIds.has(zoneId));
      
      // Process zone entries
      for (const zone of enteredZones) {
        await this.processZoneEntry(touristId, latitude, longitude, touristName, zone);
      }
      
      // Process zone exits
      for (const zoneId of exitedZoneIds) {
        await this.processZoneExit(touristId, latitude, longitude, touristName, zoneId);
      }
      
      // Update tracking
      this.touristZoneStatus.set(touristKey, currentZoneIds);
      
      return {
        isInZone: currentZones.length > 0,
        zones: currentZones,
        alert_required: currentZones.some(z => z.risk_level === 'high'),
        enteredZones: enteredZones.length,
        exitedZones: exitedZoneIds.length
      };
    } catch (error) {
      console.error('Error checking tourist location:', error);
      return { isInZone: false, zones: [], alert_required: false };
    }
  }

  // Process tourist entering a zone
  async processZoneEntry(touristId, latitude, longitude, touristName, zone) {
    try {
      const currentTime = new Date();
      
      // Check if there's already an active alert for this tourist in this zone
      try {
        const existingAlert = await GeofenceAlert.findOne({
          touristId,
          zoneId: zone.zone_id,
          status: 'active',
          exitTime: null
        });
        
        if (existingAlert) {
          console.log(`⚠️ Alert already exists for ${touristName} in ${zone.name}, updating location only`);
          // Just update the location of existing alert
          await existingAlert.updateLocation(latitude, longitude);
          return null; // Don't create duplicate
        }
      } catch (dbError) {
        console.warn('Database check failed, proceeding with alert creation:', dbError.message);
      }
      
      // Create database record for zone entry
      const alertData = {
        touristId,
        touristName,
        latitude,
        longitude,
        zoneId: zone.zone_id,
        zoneName: zone.name,
        zoneRiskLevel: zone.risk_level,
        alertType: 'geofence_alert',
        eventType: 'zone_entry',
        severity: zone.risk_level,
        status: 'active',
        message: this.generateAlertMessage([zone]),
        description: `Tourist ${touristName} entered ${zone.risk_level}-risk zone: ${zone.name}`,
        entryTime: currentTime,
        exitTime: null,
        zoneDetails: {
          safetyScore: zone.safety_score,
          alertMessage: zone.alert_message,
          recommendations: zone.recommendations
        },
        autoNotifyAuthorities: zone.auto_notify_authorities
      };
      
      // Save to database
      const geofenceAlert = new GeofenceAlert(alertData);
      await geofenceAlert.save();
      
      // Create alert for broadcasting/notifications
      const broadcastAlert = {
        type: 'geofence_alert',
        touristId,
        touristName,
        latitude,
        longitude,
        zones: [zone],
        timestamp: currentTime,
        alertLevel: zone.risk_level,
        severity: zone.risk_level,
        message: alertData.message,
        description: alertData.description,
        status: 'active',
        dbId: geofenceAlert._id
      };
      
      // Add to memory cache
      this.alertHistory.push(broadcastAlert);
      
      // Send notifications
      await this.sendNotifications(broadcastAlert);
      
      // Auto-notify authorities for high-risk zones
      if (zone.risk_level === 'high' && zone.auto_notify_authorities) {
        await this.notifyAuthorities(broadcastAlert, [zone]);
      }
      
      console.log(`🚨 Zone entry: ${touristName} entered ${zone.risk_level}-risk zone ${zone.name}`);
      
      return broadcastAlert;
    } catch (error) {
      console.error('Error processing zone entry:', error);
    }
  }
  
  // Process tourist exiting a zone
  async processZoneExit(touristId, latitude, longitude, touristName, zoneId) {
    try {
      // Find ALL active alerts for this tourist in this zone (in case of duplicates)
      const activeAlerts = await GeofenceAlert.find({
        touristId,
        zoneId,
        status: 'active',
        exitTime: null
      }).sort({ entryTime: -1 });
      
      if (activeAlerts.length > 0) {
        console.log(`✅ Zone exit: ${touristName} leaving zone. Found ${activeAlerts.length} active alert(s) to resolve`);
        
        let zoneName = '';
        let zoneRiskLevel = '';
        
        // Mark ALL active alerts as exited to clean up duplicates
        for (const alert of activeAlerts) {
          await alert.markAsExited({ latitude, longitude });
          zoneName = alert.zoneName;
          zoneRiskLevel = alert.zoneRiskLevel;
          console.log(`✅ Resolved alert ${alert._id} for ${touristName}`);
        }
        
        // Create a single exit event record
        const exitAlert = new GeofenceAlert({
          touristId,
          touristName,
          latitude,
          longitude,
          zoneId,
          zoneName,
          zoneRiskLevel,
          alertType: 'geofence_alert',
          eventType: 'zone_exit',
          severity: 'low', // Exit events are low severity
          status: 'resolved',
          message: `Tourist ${touristName} has left ${zoneName}`,
          description: `Tourist ${touristName} exited ${zoneRiskLevel}-risk zone: ${zoneName}`,
          entryTime: new Date(), // For exit events, entryTime is the exit time
          exitTime: null,
          zoneDetails: activeAlerts[0].zoneDetails
        });
        
        await exitAlert.save();
        
        console.log(`✅ Zone exit completed: ${touristName} left ${zoneName} zone (cleaned up ${activeAlerts.length} duplicate(s))`);
        
        return {
          type: 'zone_exit',
          touristId,
          touristName,
          zoneId,
          zoneName,
          duplicatesRemoved: activeAlerts.length,
          timestamp: new Date()
        };
      }
    } catch (error) {
      console.error('Error processing zone exit:', error);
    }
  }

  // Get currently active alerts for a tourist (database-based)
  async getActiveAlerts(touristId) {
    try {
      const alerts = await GeofenceAlert.findActiveAlertsForTourist(touristId);
      return alerts.map(alert => this.formatAlertForAPI(alert));
    } catch (error) {
      console.error('Error getting active alerts:', error);
      return [];
    }
  }

  // Get all currently active critical alerts (database-based)
  async getActiveCriticalAlerts() {
    try {
      const alerts = await GeofenceAlert.findActiveCriticalAlerts();
      return alerts.map(alert => this.formatAlertForAPI(alert));
    } catch (error) {
      console.error('Error getting critical alerts:', error);
      return [];
    }
  }

  // Get alert history with optional filters (database-based)
  async getAlertHistory(filters = {}) {
    try {
      // Set default limit
      if (!filters.limit) filters.limit = 100;
      
      const alerts = await GeofenceAlert.getAlertHistory(filters);
      return alerts.map(alert => this.formatAlertForAPI(alert));
    } catch (error) {
      console.error('Error getting alert history:', error);
      return this.alertHistory; // Fallback to memory cache
    }
  }

  // Format database alert for API response
  formatAlertForAPI(dbAlert) {
    return {
      type: dbAlert.alertType,
      touristId: dbAlert.touristId,
      touristName: dbAlert.touristName,
      latitude: dbAlert.latitude,
      longitude: dbAlert.longitude,
      zones: [{
        zone_id: dbAlert.zoneId,
        name: dbAlert.zoneName,
        safety_score: dbAlert.zoneDetails?.safetyScore,
        risk_level: dbAlert.zoneRiskLevel,
        alert_message: dbAlert.zoneDetails?.alertMessage,
        recommendations: dbAlert.zoneDetails?.recommendations || [],
        auto_notify_authorities: dbAlert.autoNotifyAuthorities
      }],
      timestamp: dbAlert.entryTime,
      alertLevel: dbAlert.zoneRiskLevel,
      severity: dbAlert.severity,
      message: dbAlert.message,
      description: dbAlert.description,
      status: dbAlert.status,
      eventType: dbAlert.eventType,
      exitTime: dbAlert.exitTime,
      durationInZone: dbAlert.durationInZone
    };
  }

  // Generate alert message based on zones
  generateAlertMessage(zones) {
    const highRiskZones = zones.filter(z => z.risk_level === 'high');
    const moderateRiskZones = zones.filter(z => z.risk_level === 'moderate');
    
    if (highRiskZones.length > 0) {
      return `🚨 HIGH RISK ALERT: You have entered a high-risk zone (${highRiskZones[0].name}). Please exercise extreme caution and consider leaving the area immediately.`;
    } else if (moderateRiskZones.length > 0) {
      return `⚠️ MODERATE RISK ALERT: You have entered a moderate-risk zone (${moderateRiskZones[0].name}). Please stay alert and follow safety guidelines.`;
    } else {
      return `ℹ️ ZONE ENTRY: You have entered a monitored zone (${zones[0].name}). Please follow local guidelines.`;
    }
  }

  // Get alert level based on zones
  getAlertLevel(zones) {
    if (zones.some(z => z.risk_level === 'high')) return 'high';
    if (zones.some(z => z.risk_level === 'moderate')) return 'moderate';
    return 'low';
  }

  // Send notifications (SMS, Push, Email)
  async sendNotifications(alert) {
    try {
      // In production, integrate with notification services
      console.log(`📱 Sending alert to tourist ${alert.touristName}: ${alert.message}`);
      
      // Simulate sending to tourist's mobile app
      await this.sendToTouristApp(alert);
      
      // Send to emergency contacts if high risk
      if (alert.alertLevel === 'high') {
        await this.sendToEmergencyContacts(alert);
      }
      
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  }

  // Send alert to tourist's mobile app
  async sendToTouristApp(alert) {
    // In production, use push notification service
    console.log(`📲 Push notification sent to tourist app: ${alert.message}`);
  }

  // Send alert to emergency contacts
  async sendToEmergencyContacts(alert) {
    // In production, send SMS/Email to emergency contacts
    console.log(`📞 Emergency contacts notified for tourist ${alert.touristName}`);
  }

  // Notify authorities about high-risk zone entry
  async notifyAuthorities(alert, highRiskZones) {
    try {
      // In production, integrate with police/tourism department systems
      console.log(`🚔 AUTHORITY ALERT: Tourist ${alert.touristName} entered high-risk zone ${highRiskZones[0].name}`);
      console.log(`📍 Location: ${alert.latitude}, ${alert.longitude}`);
      console.log(`⏰ Time: ${alert.timestamp}`);
      
      // Store authority notification
      const authorityAlert = {
        type: 'authority_notification',
        touristId: alert.touristId,
        touristName: alert.touristName,
        zone: highRiskZones[0],
        location: { latitude: alert.latitude, longitude: alert.longitude },
        timestamp: alert.timestamp,
        status: 'pending'
      };
      
      // In production, store in database and send to authority dashboard
      console.log('📋 Authority alert logged:', authorityAlert);
      
    } catch (error) {
      console.error('Error notifying authorities:', error);
    }
  }


  // Clear old alerts (cleanup)
  clearOldAlerts(maxAgeMinutes = 30) {
    const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
    
    for (const [key, alert] of this.activeAlerts.entries()) {
      if (alert.timestamp < cutoffTime) {
        this.activeAlerts.delete(key);
      }
    }
  }

  // Helper function to calculate distance between two points
  getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  }

  // Helper function to check if point is inside polygon
  isPointInPolygon(lat, lon, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if (((polygon[i].latitude > lat) !== (polygon[j].latitude > lat)) &&
          (lon < (polygon[j].longitude - polygon[i].longitude) * (lat - polygon[i].latitude) / (polygon[j].latitude - polygon[i].latitude) + polygon[i].longitude)) {
        inside = !inside;
      }
    }
    return inside;
  }

  // Get zone statistics (database-based with timeout and fallback)
  async getZoneStatistics() {
    try {
      console.log('📊 Getting zone statistics...');
      
      // Try database with timeout
      let zones = [];
      let activeAlerts = 0;
      let totalAlerts = 0;
      
      try {
        // Get zones with timeout
        zones = await Zone.find({}).maxTimeMS(3000);
        
        // Get active alerts with timeout  
        const activeAlertsData = await GeofenceAlert.find({
          status: 'active',
          exitTime: null
        }).maxTimeMS(3000);
        activeAlerts = activeAlertsData.length;
        
        // Get total count with timeout
        totalAlerts = await GeofenceAlert.countDocuments().maxTimeMS(3000);
        
        console.log(`✅ DB stats: ${zones.length} zones, ${activeAlerts} active alerts`);
        
      } catch (dbError) {
        console.warn('⚠️ DB timeout, using fallback:', dbError.message);
        // Fallback values
        zones = [
          { risk_level: 'high' },
          { risk_level: 'moderate' }, { risk_level: 'moderate' }, { risk_level: 'moderate' },
          { risk_level: 'low' }, { risk_level: 'low' }, { risk_level: 'low' }
        ];
        activeAlerts = 0; // Reset to 0 if DB unavailable
        totalAlerts = 0;
      }
      
      const stats = {
        totalZones: zones.length,
        highRiskZones: zones.filter(z => z.risk_level === 'high').length,
        moderateRiskZones: zones.filter(z => z.risk_level === 'moderate').length,
        lowRiskZones: zones.filter(z => z.risk_level === 'low').length,
        activeAlerts: activeAlerts,
        totalAlerts: totalAlerts
      };
      
      console.log('📊 Final statistics:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Statistics error:', error);
      return {
        totalZones: 14,
        highRiskZones: 1, 
        moderateRiskZones: 7,
        lowRiskZones: 6,
        activeAlerts: 0,
        totalAlerts: 0
      };
    }
  }
}

module.exports = new GeoFencingService();