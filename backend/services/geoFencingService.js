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
      const previousZones = this.touristZoneStatus.get(touristKey) || new Set();
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
      // Find active alert in database and mark as exited
      const activeAlert = await GeofenceAlert.findOne({
        touristId,
        zoneId,
        status: 'active',
        exitTime: null
      }).sort({ entryTime: -1 });
      
      if (activeAlert) {
        // Mark as exited
        await activeAlert.markAsExited({ latitude, longitude });
        
        console.log(`✅ Zone exit: ${touristName} left zone ${activeAlert.zoneName} (${activeAlert.zoneRiskLevel}-risk)`);
        
        // Create exit event record
        const exitAlert = new GeofenceAlert({
          touristId,
          touristName,
          latitude,
          longitude,
          zoneId,
          zoneName: activeAlert.zoneName,
          zoneRiskLevel: activeAlert.zoneRiskLevel,
          alertType: 'geofence_alert',
          eventType: 'zone_exit',
          severity: 'low', // Exit events are low severity
          status: 'resolved',
          message: `Tourist ${touristName} has left ${activeAlert.zoneName}`,
          description: `Tourist ${touristName} exited ${activeAlert.zoneRiskLevel}-risk zone: ${activeAlert.zoneName}`,
          entryTime: new Date(), // For exit events, entryTime is the exit time
          exitTime: null,
          zoneDetails: activeAlert.zoneDetails
        });
        
        await exitAlert.save();
        
        return {
          type: 'zone_exit',
          touristId,
          touristName,
          zoneId,
          zoneName: activeAlert.zoneName,
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

  // Get zone statistics
  async getZoneStatistics() {
    try {
      const zones = await Zone.find({});
      const stats = {
        totalZones: zones.length,
        highRiskZones: zones.filter(z => z.risk_level === 'high').length,
        moderateRiskZones: zones.filter(z => z.risk_level === 'moderate').length,
        lowRiskZones: zones.filter(z => z.risk_level === 'low').length,
        activeAlerts: this.activeAlerts.size,
        totalAlerts: this.alertHistory.length
      };
      return stats;
    } catch (error) {
      console.error('Error getting zone statistics:', error);
      return null;
    }
  }
}

module.exports = new GeoFencingService();