// Check if alerts are being stored in the database
const mongoose = require('mongoose');

async function checkDatabaseStorage() {
  try {
    console.log('🔍 Checking database storage...');
    
    // Connect using the same connection as the server
    // This should automatically connect to the same database
    console.log('🔌 Connecting to database...');
    
    // Wait a bit for connection to establish
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try to use existing connection or connect
    const GeofenceAlert = require('./backend/models/GeofenceAlert.js');
    
    console.log('📊 Checking geofence alerts collection...');
    
    // Check total documents
    const totalAlerts = await GeofenceAlert.countDocuments();
    console.log(`Total alerts in database: ${totalAlerts}`);
    
    // Check active alerts
    const activeAlerts = await GeofenceAlert.find({ 
      status: 'active', 
      exitTime: null 
    });
    console.log(`Active alerts in database: ${activeAlerts.length}`);
    
    // Check resolved alerts
    const resolvedAlerts = await GeofenceAlert.countDocuments({ 
      status: 'resolved' 
    });
    console.log(`Resolved alerts in database: ${resolvedAlerts}`);
    
    // Show recent 5 alerts
    console.log('\n📋 Recent 5 alerts:');
    const recentAlerts = await GeofenceAlert.find({})
      .sort({ entryTime: -1 })
      .limit(5);
    
    if (recentAlerts.length === 0) {
      console.log('   No alerts found in database');
    } else {
      recentAlerts.forEach((alert, i) => {
        console.log(`   ${i+1}. ${alert.touristName} - ${alert.eventType} - ${alert.status}`);
        console.log(`      Zone: ${alert.zoneName} (${alert.zoneRiskLevel})`);
        console.log(`      Time: ${alert.entryTime}`);
        if (alert.exitTime) {
          console.log(`      Exit: ${alert.exitTime}`);
        }
        console.log('');
      });
    }
    
    console.log('✅ Database check completed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    
    if (error.message.includes('buffering timed out')) {
      console.log('\n⚠️  MongoDB connection timeout - database might not be connected');
      console.log('This could mean:');
      console.log('1. MongoDB Atlas connection is not properly configured');
      console.log('2. Network issues preventing database access');
      console.log('3. Database credentials are incorrect');
    }
    
    process.exit(1);
  }
}

checkDatabaseStorage();