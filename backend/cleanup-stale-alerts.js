// Clean up stale active alerts that should have been resolved
const fetch = require('node-fetch');

async function cleanupStaleAlerts() {
  try {
    console.log('🧹 Starting cleanup of stale active alerts...');
    
    // First, let's see what alerts we have
    const alertsResponse = await fetch('http://localhost:5000/api/geofencing/critical-alerts');
    
    if (!alertsResponse.ok) {
      throw new Error(`Failed to fetch critical alerts: ${alertsResponse.status}`);
    }
    
    const alertsData = await alertsResponse.json();
    const alerts = alertsData.alerts || [];
    
    console.log(`📊 Found ${alerts.length} active critical alerts to analyze:`);
    
    for (let i = 0; i < alerts.length; i++) {
      const alert = alerts[i];
      console.log(`   ${i+1}. ${alert.touristName} in zone (entered: ${alert.timestamp})`);
      
      // Check how long ago this alert was created
      const alertTime = new Date(alert.timestamp);
      const now = new Date();
      const hoursAgo = (now - alertTime) / (1000 * 60 * 60);
      
      console.log(`      Alert is ${hoursAgo.toFixed(1)} hours old`);
      
      if (hoursAgo > 1) { // If alert is older than 1 hour, it's likely stale
        console.log(`      ⚠️  This alert seems stale (over 1 hour old)`);
      }
    }
    
    // If alerts are stale, let's clean them up by calling the cleanup endpoint
    if (alerts.length > 0) {
      console.log(`\\n🧹 Attempting to clean up stale alerts...`);
      
      const cleanupResponse = await fetch('http://localhost:5000/api/geofencing/alerts/cleanup?maxAgeMinutes=60', {
        method: 'DELETE'
      });
      
      if (cleanupResponse.ok) {
        console.log('✅ Cleanup request sent successfully');
      } else {
        console.log('❌ Cleanup request failed:', cleanupResponse.status);
      }
      
      // Wait a moment for cleanup to complete
      console.log('⏳ Waiting for cleanup to complete...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check alerts again
      const afterResponse = await fetch('http://localhost:5000/api/geofencing/critical-alerts');
      if (afterResponse.ok) {
        const afterData = await afterResponse.json();
        const afterAlerts = afterData.alerts || [];
        
        console.log(`\\n📊 After cleanup: ${afterAlerts.length} critical alerts remaining`);
        
        if (afterAlerts.length === 0) {
          console.log('🎉 All stale alerts have been cleaned up successfully!');
          console.log('The critical alerts section should now be empty on the frontend.');
        } else {
          console.log('⚠️  Some alerts still remain:');
          afterAlerts.forEach((alert, i) => {
            console.log(`   ${i+1}. ${alert.touristName}`);
          });
        }
      }
    } else {
      console.log('✅ No critical alerts found - the system is clean!');
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    
    // Manual cleanup approach - mark specific alerts as resolved
    console.log('\\n🔄 Trying manual cleanup approach...');
    await manualCleanup();
  }
}

async function manualCleanup() {
  try {
    console.log('📝 Manual cleanup: Marking known stale alerts as resolved...');
    
    // This would ideally connect directly to the database to update the alerts
    // For now, let's suggest the manual steps
    console.log('\\n💡 Manual cleanup steps:');
    console.log('1. These tourists appear to have stale alerts:');
    console.log('   - "amaan" (entered high-risk zone but never properly exited)'); 
    console.log('   - "Amya bhadya" (entered high-risk zone but never properly exited)');
    console.log('\\n2. These alerts need to be marked as resolved in the database');
    console.log('3. Or simulate their exit by sending location updates outside the high-risk zones');
    
  } catch (error) {
    console.error('❌ Manual cleanup failed:', error.message);
  }
}

cleanupStaleAlerts();