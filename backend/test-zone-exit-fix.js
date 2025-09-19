// Test the zone exit fix with debug logging
const fetch = require('node-fetch');

async function testZoneExitFix() {
  try {
    console.log('🧪 Testing zone exit detection fix...');
    
    // First get the current alert
    console.log('1️⃣ Getting current critical alert...');
    const alertResponse = await fetch('http://localhost:5000/api/geofencing/critical-alerts');
    const alertData = await alertResponse.json();
    const alerts = alertData.alerts || [];
    
    if (alerts.length === 0) {
      console.log('✅ No alerts to test with');
      return;
    }
    
    const alert = alerts[0];
    console.log(`📊 Testing with alert: ${alert.touristName} (ID: ${alert.touristId})`);
    console.log(`   Current alert from: ${alert.timestamp}`);
    
    // Test the fix by calling check-location
    console.log('\\n2️⃣ Calling check-location to trigger zone detection...');
    const locationUpdate = {
      touristId: alert.touristId,
      latitude: 25.0000, // Zone-free location
      longitude: 90.0000,
      touristName: alert.touristName
    };
    
    console.log(`📍 Location: ${locationUpdate.latitude}, ${locationUpdate.longitude}`);
    console.log(`👤 Tourist: ${locationUpdate.touristName} (ID: ${locationUpdate.touristId})`);
    
    const checkResponse = await fetch('http://localhost:5000/api/geofencing/check-location', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(locationUpdate)
    });
    
    if (checkResponse.ok) {
      const result = await checkResponse.json();
      console.log(`\\n📊 Check-location result:`);
      console.log(`   Message: ${result.message}`);
      console.log(`   Success: ${result.success}`);
      
      if (result.data) {
        console.log(`   Is in zone: ${result.data.isInZone}`);
        console.log(`   Zones entered: ${result.data.enteredZones}`);
        console.log(`   Zones exited: ${result.data.exitedZones}`);
        console.log(`   Alert required: ${result.data.alert_required}`);
        
        if (result.data.zones && result.data.zones.length > 0) {
          console.log(`   Current zones:`);
          result.data.zones.forEach((zone, i) => {
            console.log(`      ${i+1}. ${zone.name} (${zone.risk_level})`);
          });
        }
        
        if (result.data.exitedZones > 0) {
          console.log(`\n🎉 SUCCESS! Tourist exited ${result.data.exitedZones} zone(s)`);
          console.log('   The database should now have been updated.');
        } else {
          console.log(`\n⚠️  No zones were exited. This suggests:`);
          console.log('   1. The database connection is still failing');
          console.log('   2. The active alert loading from database didn\'t work');
          console.log('   3. The tourist\'s previous zones weren\'t loaded properly');
        }
      }
    } else {
      console.log(`❌ Check-location failed: ${checkResponse.status}`);
      const errorText = await checkResponse.text();
      console.log(`Error: ${errorText}`);
    }
    
    // Wait and check if the alert was resolved
    console.log('\n3️⃣ Waiting 3 seconds for database update...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n4️⃣ Checking if alert was resolved...');
    const finalAlertResponse = await fetch('http://localhost:5000/api/geofencing/critical-alerts');
    const finalAlertData = await finalAlertResponse.json();
    const finalAlerts = finalAlertData.alerts || [];
    
    console.log(`📊 Remaining alerts: ${finalAlerts.length}`);
    
    if (finalAlerts.length === 0) {
      console.log('🎉 SUCCESS! Alert has been resolved!');
    } else {
      console.log('⚠️  Alert still exists. The fix didn\'t work completely.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testZoneExitFix();
