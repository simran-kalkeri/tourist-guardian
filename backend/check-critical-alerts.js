// Check what critical alerts are currently being returned
const fetch = require('node-fetch');

async function checkCriticalAlerts() {
  try {
    console.log('🔍 Checking critical alerts API...');
    
    const response = await fetch('http://localhost:5000/api/geofencing/critical-alerts');
    
    if (response.ok) {
      const data = await response.json();
      const alerts = data.alerts || data;
      
      console.log(`📊 Total critical alerts returned: ${alerts.length}`);
      
      if (alerts.length > 0) {
        console.log('\n🚨 Current critical alerts:');
        alerts.forEach((alert, i) => {
          console.log(`   ${i+1}. ${alert.touristName || alert.tourist_name} in ${alert.zoneName || alert.zone_name}`);
          console.log(`      Status: ${alert.status}`);
          console.log(`      Entry Time: ${alert.entryTime || alert.timestamp}`);
          console.log(`      Exit Time: ${alert.exitTime || 'null'}`);
          console.log(`      Zone Risk: ${alert.zoneRiskLevel || alert.risk_level || alert.severity}`);
          console.log('');
        });
        
        // Count by status
        const activeCount = alerts.filter(a => a.status === 'active').length;
        const resolvedCount = alerts.filter(a => a.status === 'resolved').length;
        
        console.log(`📈 Status breakdown:`);
        console.log(`   Active alerts: ${activeCount}`);
        console.log(`   Resolved alerts: ${resolvedCount}`);
        
        if (resolvedCount > 0) {
          console.log('\n⚠️ PROBLEM: Resolved alerts are being returned in critical alerts!');
          console.log('The API should only return active alerts for tourists currently in high-risk zones.');
        }
      } else {
        console.log('\n✅ No critical alerts (this is correct if no tourists are in high-risk zones)');
      }
      
    } else {
      console.log('❌ Failed to fetch critical alerts:', response.status, response.statusText);
    }
    
  } catch (error) {
    console.error('❌ Error checking critical alerts:', error.message);
  }
}

checkCriticalAlerts();