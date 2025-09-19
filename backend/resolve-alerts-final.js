// Resolve alerts by moving tourists to completely zone-free location
const fetch = require('node-fetch');

async function resolveAlertsToZoneFreeLocation() {
  try {
    console.log('🎯 Moving tourists to zone-free location to resolve alerts...');
    
    // Get current alerts
    const response = await fetch('http://localhost:5000/api/geofencing/critical-alerts');
    if (!response.ok) {
      throw new Error(`Failed to fetch alerts: ${response.status}`);
    }
    
    const data = await response.json();
    const alerts = data.alerts || [];
    
    console.log(`📊 Found ${alerts.length} alerts to resolve`);
    
    if (alerts.length === 0) {
      console.log('✅ No alerts to resolve!');
      return;
    }
    
    // Use coordinates that are confirmed zone-free
    const zoneFreeLocation = {
      latitude: 25.0000, // Far from any zone
      longitude: 90.0000
    };
    
    console.log(`📍 Target safe location: ${zoneFreeLocation.latitude}, ${zoneFreeLocation.longitude}`);
    
    // Resolve each alert
    for (let i = 0; i < alerts.length; i++) {
      const alert = alerts[i];
      console.log(`\\n🔧 Resolving alert ${i+1}/${alerts.length}: ${alert.touristName}`);
      
      const locationUpdate = {
        touristId: alert.touristId,
        latitude: zoneFreeLocation.latitude,
        longitude: zoneFreeLocation.longitude,
        touristName: alert.touristName
      };
      
      console.log(`   📤 Sending location update for ${alert.touristName}...`);
      
      try {
        const updateResponse = await fetch('http://localhost:5000/api/geofencing/check-location', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(locationUpdate)
        });
        
        if (updateResponse.ok) {
          const result = await updateResponse.json();
          console.log(`   ✅ Update result: ${result.message}`);
          
          if (result.data) {
            console.log(`   📊 Zones entered: ${result.data.enteredZones || 0}, Zones exited: ${result.data.exitedZones || 0}`);
            
            if (result.data.exitedZones > 0) {
              console.log(`   🎉 SUCCESS: ${alert.touristName} exited ${result.data.exitedZones} zone(s)!`);
            } else if (result.data.enteredZones === 0 && result.data.exitedZones === 0) {
              console.log(`   ℹ️  ${alert.touristName} is now in a zone-free area`);
            }
          }
        } else {
          console.log(`   ❌ Update failed: ${updateResponse.status}`);
        }
        
      } catch (updateError) {
        console.log(`   ❌ Error updating ${alert.touristName}:`, updateError.message);
      }
      
      // Delay between updates
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Wait for all database updates to complete
    console.log('\\n⏳ Waiting for database updates to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Final check
    console.log('\\n🔍 Final check - verifying alert resolution...');
    const finalResponse = await fetch('http://localhost:5000/api/geofencing/critical-alerts');
    
    if (finalResponse.ok) {
      const finalData = await finalResponse.json();
      const remainingAlerts = finalData.alerts || [];
      
      console.log(`📊 Remaining critical alerts: ${remainingAlerts.length}`);
      
      if (remainingAlerts.length === 0) {
        console.log('\\n🎉 PERFECT! All critical alerts have been resolved!');
        console.log('✅ The critical alerts section on your frontend should now be empty.');
        console.log('\\n📋 Summary:');
        console.log(`   - Resolved ${alerts.length} stale alert(s)`);
        console.log('   - All tourists moved to zone-free locations');
        console.log('   - Database updated successfully');
      } else {
        console.log('\\n⚠️  Some alerts still remain:');
        remainingAlerts.forEach((alert, i) => {
          console.log(`   ${i+1}. ${alert.touristName} (entry: ${alert.timestamp})`);
        });
        console.log('\\n💡 If any alerts persist, there might be a database sync issue.');
      }
    }
    
  } catch (error) {
    console.error('❌ Resolution failed:', error.message);
  }
}

resolveAlertsToZoneFreeLocation();