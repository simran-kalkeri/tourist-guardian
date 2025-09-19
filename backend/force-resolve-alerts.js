// Force resolve stale alerts by simulating tourist exits from zones
const fetch = require('node-fetch');

async function forceResolveStaleAlerts() {
  try {
    console.log('🚨 Force resolving stale critical alerts...');
    
    // Get current alerts
    const response = await fetch('http://localhost:5000/api/geofencing/critical-alerts');
    if (!response.ok) {
      throw new Error(`Failed to fetch alerts: ${response.status}`);
    }
    
    const data = await response.json();
    const alerts = data.alerts || [];
    
    console.log(`📊 Found ${alerts.length} stale alerts to resolve`);
    
    if (alerts.length === 0) {
      console.log('✅ No alerts to clean up!');
      return;
    }
    
    // For each alert, simulate the tourist moving outside all zones
    for (let i = 0; i < alerts.length; i++) {
      const alert = alerts[i];
      console.log(`\\n🔧 Resolving alert ${i+1}/${alerts.length}: ${alert.touristName}`);
      
      // Simulate tourist moving to a safe location (somewhere in Guwahati city center - safe zone)
      const safeLocation = {
        touristId: alert.touristId,
        latitude: 26.1445, // Guwahati city center - safe zone
        longitude: 91.7362,
        touristName: alert.touristName
      };
      
      console.log(`   📍 Moving ${alert.touristName} to safe location: ${safeLocation.latitude}, ${safeLocation.longitude}`);
      
      try {
        const checkResponse = await fetch('http://localhost:5000/api/geofencing/check-location', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(safeLocation)
        });
        
        if (checkResponse.ok) {
          const result = await checkResponse.json();
          console.log(`   ✅ Location update successful: ${result.message || 'Tourist moved to safe area'}`);
          
          if (result.data) {
            console.log(`   📊 Zones entered: ${result.data.enteredZones || 0}, Zones exited: ${result.data.exitedZones || 0}`);
          }
        } else {
          console.log(`   ❌ Location update failed: ${checkResponse.status}`);
        }
        
        // Small delay between updates
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (updateError) {
        console.log(`   ❌ Error updating ${alert.touristName}:`, updateError.message);
      }
    }
    
    // Wait for database updates to complete
    console.log('\\n⏳ Waiting for database updates to complete...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if alerts were resolved
    console.log('\\n🔍 Checking if alerts were resolved...');
    const finalResponse = await fetch('http://localhost:5000/api/geofencing/critical-alerts');
    if (finalResponse.ok) {
      const finalData = await finalResponse.json();
      const finalAlerts = finalData.alerts || [];
      
      console.log(`📊 Remaining critical alerts: ${finalAlerts.length}`);
      
      if (finalAlerts.length === 0) {
        console.log('🎉 SUCCESS! All stale alerts have been resolved!');
        console.log('The critical alerts section should now be empty on your frontend.');
      } else {
        console.log('⚠️  Some alerts still remain:');
        finalAlerts.forEach((alert, i) => {
          console.log(`   ${i+1}. ${alert.touristName} (${alert.timestamp})`);
        });
        
        console.log('\\n💡 If alerts still remain, the tourists may need to be moved even further from high-risk zones.');
      }
    }
    
  } catch (error) {
    console.error('❌ Force resolution failed:', error.message);
    console.log('\\n💡 Alternative approach: You can manually resolve these alerts in the database or admin panel.');
  }
}

forceResolveStaleAlerts();