// Quick check to see current alerts state
const fetch = require('node-fetch');

async function checkAlertsNow() {
  try {
    console.log('🔍 Checking current alerts state...');
    
    // Check alerts endpoint
    const response = await fetch('http://localhost:5000/api/alerts');
    const data = await response.json();
    
    console.log(`📊 Total alerts in system: ${data.alerts ? data.alerts.length : 0}`);
    
    if (data.alerts && data.alerts.length > 0) {
      console.log('\n📋 Recent 5 alerts:');
      const recentAlerts = data.alerts.slice(-5);
      recentAlerts.forEach((alert, i) => {
        console.log(`   ${i+1}. Type: ${alert.type}`);
        console.log(`      Tourist ID: ${alert.touristId}`);
        console.log(`      Message: ${alert.message}`);
        console.log(`      Time: ${alert.timestamp}`);
        console.log(`      Severity: ${alert.severity}`);
        if (alert.tourist) {
          console.log(`      Tourist Name: ${alert.tourist.name}`);
        }
        console.log('');
      });
      
      // Check for SOS alerts specifically
      const sosAlerts = data.alerts.filter(a => 
        a.type === 'sos_alert' || a.type === 'sos' || 
        (a.type && a.type.toLowerCase().includes('sos'))
      );
      console.log(`🚨 SOS alerts found: ${sosAlerts.length}`);
      
      if (sosAlerts.length > 0) {
        console.log('SOS alerts:');
        sosAlerts.slice(-3).forEach((alert, i) => {
          console.log(`   ${i+1}. ${alert.tourist?.name || 'Unknown'} (ID: ${alert.touristId}) - ${alert.timestamp}`);
        });
      }
      
    } else {
      console.log('\n❌ No alerts found in the system');
      console.log('This means either:');
      console.log('1. No SOS alerts have been triggered');
      console.log('2. The server needs to be restarted to pick up code changes');
      console.log('3. There is an issue with the alert storage');
    }
    
  } catch (error) {
    console.error('❌ Failed to check alerts:', error.message);
    console.log('Make sure the backend server is running on http://localhost:5000');
  }
}

checkAlertsNow();