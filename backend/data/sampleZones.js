// SAMPLE ZONES FOR TESTING THE OLD GEOFENCING SYSTEM
// This provides some demo zones that can be loaded into the system

const Zone = require('../models/zone');

const sampleZones = [
  {
    zone_id: 'high-risk-01',
    name: 'Delhi Red Fort Restricted Area',
    latitude: 28.6562,
    longitude: 77.2410,
    radius: 500, // 500 meters
    zone_type: 'circle',
    safety_score: 3,
    risk_level: 'high',
    description: 'High security zone around Red Fort - restricted access during certain hours',
    state: 'Delhi',
    district: 'Central Delhi',
    zone_category: 'urban',
    alert_enabled: true,
    alert_message: '🚨 You have entered a high security zone. Please follow all security guidelines.',
    auto_notify_authorities: true,
    recommendations: [
      'Carry valid identification',
      'Follow security personnel instructions',
      'Do not photograph restricted areas',
      'Stay with authorized groups'
    ],
    safety_factors: {
      locationRisk: 8,
      seasonalRisk: 5,
      incidentRisk: 6,
      weatherRisk: 2,
      timeRisk: 7
    }
  },
  {
    zone_id: 'moderate-risk-01',
    name: 'Assam-Meghalaya Border Area',
    latitude: 25.8000,
    longitude: 91.8800,
    radius: 2000, // 2 km
    zone_type: 'circle',
    safety_score: 6,
    risk_level: 'moderate',
    description: 'Border area with occasional political tensions - exercise caution',
    state: 'Assam',
    district: 'Kamrup',
    zone_category: 'border',
    alert_enabled: true,
    alert_message: '⚠️ You are near a border area. Please carry proper documentation.',
    auto_notify_authorities: false,
    recommendations: [
      'Carry passport/valid ID',
      'Stay on main roads',
      'Avoid traveling at night',
      'Inform local authorities of travel plans'
    ],
    safety_factors: {
      locationRisk: 6,
      seasonalRisk: 4,
      incidentRisk: 5,
      weatherRisk: 3,
      timeRisk: 7
    }
  },
  {
    zone_id: 'polygon-zone-01',
    name: 'Kaziranga National Park Buffer Zone',
    latitude: 26.5775,
    longitude: 93.1713,
    radius: 1000, // fallback for circle calculations
    zone_type: 'polygon',
    polygon_coordinates: [
      { latitude: 26.5700, longitude: 93.1600 },
      { latitude: 26.5850, longitude: 93.1600 },
      { latitude: 26.5850, longitude: 93.1800 },
      { latitude: 26.5700, longitude: 93.1800 },
      { latitude: 26.5700, longitude: 93.1600 }
    ],
    safety_score: 7,
    risk_level: 'moderate',
    description: 'Wildlife area - elephants and other animals may be present',
    state: 'Assam',
    district: 'Golaghat',
    zone_category: 'forest',
    alert_enabled: true,
    alert_message: '🐘 Wildlife Alert: You are in a protected forest area. Stay alert for wild animals.',
    auto_notify_authorities: false,
    recommendations: [
      'Stay with authorized guides',
      'Do not exit vehicles in wildlife areas',
      'Keep noise to minimum',
      'Follow park regulations strictly',
      'Carry emergency whistle'
    ],
    safety_factors: {
      locationRisk: 7,
      seasonalRisk: 8,
      incidentRisk: 4,
      weatherRisk: 5,
      timeRisk: 9
    }
  },
  {
    zone_id: 'low-risk-01',
    name: 'Guwahati City Center Tourist Zone',
    latitude: 26.1445,
    longitude: 91.7362,
    radius: 1500,
    zone_type: 'circle',
    safety_score: 9,
    risk_level: 'low',
    description: 'Main tourist area of Guwahati - generally safe with good facilities',
    state: 'Assam',
    district: 'Kamrup Metro',
    zone_category: 'urban',
    alert_enabled: true,
    alert_message: 'ℹ️ Welcome to Guwahati tourist area. Enjoy your visit!',
    auto_notify_authorities: false,
    recommendations: [
      'Explore local markets safely',
      'Try local Assamese cuisine',
      'Visit Kamakhya Temple',
      'Take boat rides on Brahmaputra',
      'Respect local customs'
    ],
    safety_factors: {
      locationRisk: 2,
      seasonalRisk: 3,
      incidentRisk: 2,
      weatherRisk: 4,
      timeRisk: 3
    }
  },
  {
    zone_id: 'seasonal-high-risk-01',
    name: 'Monsoon Flood Prone Area - Majuli',
    latitude: 27.0000,
    longitude: 94.2000,
    radius: 3000,
    zone_type: 'circle',
    safety_score: 4,
    risk_level: 'high',
    description: 'River island prone to seasonal flooding during monsoons',
    state: 'Assam',
    district: 'Majuli',
    zone_category: 'coastal',
    alert_enabled: true,
    alert_message: '🌊 Flood Risk Zone: Heavy rains may cause flooding. Monitor weather closely.',
    auto_notify_authorities: true,
    recommendations: [
      'Check weather forecasts regularly',
      'Have evacuation plan ready',
      'Stay near higher ground',
      'Keep emergency supplies',
      'Follow local admin advisories'
    ],
    safety_factors: {
      locationRisk: 6,
      seasonalRisk: 9,
      incidentRisk: 7,
      weatherRisk: 9,
      timeRisk: 5
    }
  }
];

// Function to seed sample zones
async function seedSampleZones() {
  try {
    // Check if zones already exist
    const existingCount = await Zone.countDocuments();
    if (existingCount > 0) {
      console.log(`${existingCount} zones already exist. Skipping sample zone seeding.`);
      return false;
    }

    // Insert sample zones
    const insertedZones = await Zone.insertMany(sampleZones);
    console.log(`✅ Successfully seeded ${insertedZones.length} sample zones:`);
    insertedZones.forEach(zone => {
      console.log(`   - ${zone.name} (${zone.risk_level} risk)`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error seeding sample zones:', error);
    return false;
  }
}

// Function to clear all zones (for testing)
async function clearAllZones() {
  try {
    const result = await Zone.deleteMany({});
    console.log(`🗑️ Deleted ${result.deletedCount} zones`);
    return true;
  } catch (error) {
    console.error('❌ Error clearing zones:', error);
    return false;
  }
}

module.exports = {
  sampleZones,
  seedSampleZones,
  clearAllZones
};