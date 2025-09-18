// OLD GEOFENCING ROUTES FROM tourist-guardian-old
// This replaces the new geofencing routes with the proven working version
const express = require('express');
const router = express.Router();
const GeoFencingService = require('../services/geoFencingService');
const Zone = require('../models/zone');

// Route to check tourist location and trigger alerts
router.post('/check-location', async (req, res) => {
  try {
    const { touristId, latitude, longitude, touristName } = req.body;

    if (!touristId || !latitude || !longitude) {
      return res.status(400).json({
        error: 'Missing required fields: touristId, latitude, longitude'
      });
    }

    const result = await GeoFencingService.checkTouristLocation(
      touristId, 
      parseFloat(latitude), 
      parseFloat(longitude), 
      touristName
    );

    res.json({
      success: true,
      data: result,
      message: result.isInZone 
        ? `Tourist entered ${result.zones.length} zone(s)`
        : 'Tourist not in any monitored zones'
    });
  } catch (error) {
    console.error('Error in check-location route:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Route to get active alerts for a tourist
router.get('/alerts/:touristId', async (req, res) => {
  try {
    const { touristId } = req.params;
    const alerts = GeoFencingService.getActiveAlerts(touristId);

    res.json({
      success: true,
      data: alerts,
      count: alerts.length
    });
  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Route to get alert history
router.get('/alert-history', async (req, res) => {
  try {
    const { limit } = req.query;
    const history = GeoFencingService.getAlertHistory(limit ? parseInt(limit) : 100);

    res.json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error) {
    console.error('Error getting alert history:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Route to get zone statistics
router.get('/statistics', async (req, res) => {
  try {
    const stats = await GeoFencingService.getZoneStatistics();

    if (!stats) {
      return res.status(500).json({
        error: 'Failed to retrieve zone statistics'
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Route to clear old alerts (cleanup)
router.delete('/alerts/cleanup', async (req, res) => {
  try {
    const { maxAgeMinutes } = req.query;
    GeoFencingService.clearOldAlerts(maxAgeMinutes ? parseInt(maxAgeMinutes) : 30);

    res.json({
      success: true,
      message: 'Old alerts cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing alerts:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Route to get all zones (for admin dashboard)
router.get('/zones', async (req, res) => {
  try {
    const zones = await Zone.find({});
    res.json({
      success: true,
      data: zones,
      count: zones.length
    });
  } catch (error) {
    console.error('Error getting zones:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Route to create a new zone
router.post('/zones', async (req, res) => {
  try {
    const zoneData = req.body;

    // Validate required fields
    if (!zoneData.name || !zoneData.zone_type) {
      return res.status(400).json({
        error: 'Missing required fields: name, zone_type'
      });
    }

    if (zoneData.zone_type === 'circle' && (!zoneData.latitude || !zoneData.longitude || !zoneData.radius)) {
      return res.status(400).json({
        error: 'For circle zones, latitude, longitude, and radius are required'
      });
    }

    if (zoneData.zone_type === 'polygon' && (!zoneData.polygon_coordinates || zoneData.polygon_coordinates.length < 3)) {
      return res.status(400).json({
        error: 'For polygon zones, at least 3 coordinate points are required'
      });
    }

    const zone = new Zone(zoneData);
    await zone.save();

    res.status(201).json({
      success: true,
      data: zone,
      message: 'Zone created successfully'
    });
  } catch (error) {
    console.error('Error creating zone:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Route to update a zone
router.put('/zones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const zone = await Zone.findByIdAndUpdate(id, updateData, { new: true });

    if (!zone) {
      return res.status(404).json({
        error: 'Zone not found'
      });
    }

    res.json({
      success: true,
      data: zone,
      message: 'Zone updated successfully'
    });
  } catch (error) {
    console.error('Error updating zone:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Route to delete a zone
router.delete('/zones/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const zone = await Zone.findByIdAndDelete(id);

    if (!zone) {
      return res.status(404).json({
        error: 'Zone not found'
      });
    }

    res.json({
      success: true,
      message: 'Zone deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting zone:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Route to toggle zone alert status
router.patch('/zones/:id/toggle-alert', async (req, res) => {
  try {
    const { id } = req.params;

    const zone = await Zone.findById(id);

    if (!zone) {
      return res.status(404).json({
        error: 'Zone not found'
      });
    }

    zone.alert_enabled = !zone.alert_enabled;
    await zone.save();

    res.json({
      success: true,
      data: zone,
      message: `Zone alerts ${zone.alert_enabled ? 'enabled' : 'disabled'}`
    });
  } catch (error) {
    console.error('Error toggling zone alert:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Route to get zones by risk level
router.get('/zones/risk/:riskLevel', async (req, res) => {
  try {
    const { riskLevel } = req.params;

    if (!['low', 'moderate', 'high'].includes(riskLevel)) {
      return res.status(400).json({
        error: 'Invalid risk level. Must be: low, moderate, or high'
      });
    }

    const zones = await Zone.find({ risk_level: riskLevel });

    res.json({
      success: true,
      data: zones,
      count: zones.length
    });
  } catch (error) {
    console.error('Error getting zones by risk level:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Route to test geofencing with sample data
router.post('/test', async (req, res) => {
  try {
    console.log('🧪 Testing geofencing system...');

    // Test with sample tourist location
    const testResult = await GeoFencingService.checkTouristLocation(
      'test_tourist_001',
      28.6139, // Delhi coordinates
      77.2090,
      'Test Tourist'
    );

    const stats = await GeoFencingService.getZoneStatistics();

    res.json({
      success: true,
      message: 'Geofencing test completed',
      data: {
        testResult,
        statistics: stats,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error in geofencing test:', error);
    res.status(500).json({
      error: 'Test failed',
      details: error.message
    });
  }
});

module.exports = router;