// OLD GEOFENCING SERVICE FROM tourist-guardian-old
// This replaces the new geofencing logic with the proven working version
const Zone = require('../models/zone');

class GeoFencingService {
  constructor() {
    this.activeAlerts = new Map(); // Store active alerts for tourists
    this.alertHistory = []; // Store alert history
  }

  // Check if tourist location is in any zone and trigger alerts
  async checkTouristLocation(touristId, latitude, longitude, touristName = 'Unknown') {
    try {
      const zones = await Zone.find({ alert_enabled: true });
      const matchingZones = [];
      
      for (const zone of zones) {
        let isInZone = false;
        
        if (zone.zone_type === 'circle') {
          // Check if point is within circular zone
          const distance = this.getDistanceFromLatLonInMeters(
            latitude, longitude, zone.latitude, zone.longitude
          );
          isInZone = distance <= zone.radius;
        } else if (zone.zone_type === 'polygon' && zone.polygon_coordinates.length > 0) {
          // Check if point is within polygon zone
          isInZone = this.isPointInPolygon(latitude, longitude, zone.polygon_coordinates);
        }
        
        if (isInZone) {
          matchingZones.push({
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
      
      // Process alerts for matching zones
      if (matchingZones.length > 0) {
        await this.processAlerts(touristId, latitude, longitude, touristName, matchingZones);
      }
      
      return {
        isInZone: matchingZones.length > 0,
        zones: matchingZones,
        alert_required: matchingZones.some(z => z.risk_level === 'high')
      };
    } catch (error) {
      console.error('Error checking tourist location:', error);
      return { isInZone: false, zones: [], alert_required: false };
    }
  }

  // Process alerts for tourist entering zones
  async processAlerts(touristId, latitude, longitude, touristName, zones) {
    const alertKey = `${touristId}_${zones[0].zone_id}`;
    const currentTime = new Date();
    
    // Check if alert already exists and is recent (within 5 minutes)
    if (this.activeAlerts.has(alertKey)) {
      const lastAlert = this.activeAlerts.get(alertKey);
      const timeDiff = currentTime - lastAlert.timestamp;
      if (timeDiff < 5 * 60 * 1000) { // 5 minutes
        return; // Don't send duplicate alert
      }
    }
    
    // Create alert
    const alert = {
      touristId,
      touristName,
      latitude,
      longitude,
      zones,
      timestamp: currentTime,
      alertLevel: this.getAlertLevel(zones),
      message: this.generateAlertMessage(zones)
    };
    
    // Store active alert
    this.activeAlerts.set(alertKey, alert);
    
    // Add to history
    this.alertHistory.push(alert);
    
    // Send notifications
    await this.sendNotifications(alert);
    
    // Auto-notify authorities for high-risk zones
    const highRiskZones = zones.filter(z => z.risk_level === 'high' && z.auto_notify_authorities);
    if (highRiskZones.length > 0) {
      await this.notifyAuthorities(alert, highRiskZones);
    }
    
    console.log(`🚨 Geo-fence alert triggered for tourist ${touristName} in ${zones[0].name}`);
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

  // Get active alerts for a tourist
  getActiveAlerts(touristId) {
    const alerts = [];
    for (const [key, alert] of this.activeAlerts.entries()) {
      if (alert.touristId === touristId) {
        alerts.push(alert);
      }
    }
    return alerts;
  }

  // Get alert history
  getAlertHistory(limit = 100) {
    return this.alertHistory
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
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