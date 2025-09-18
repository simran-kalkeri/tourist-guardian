const axios = require('axios');

async function testGeofencingSystem() {
  console.log('🔍 Testing Enhanced Geofencing System with Database Persistence\n');
  
  try {
    // Test 1: Check current critical alerts (should show active alerts only)
    console.log('📊 Step 1: Checking current critical alerts...');
    let response = await axios.get('http://localhost:5000/api/geofencing/critical-alerts');
    console.log(`Current critical alerts: ${response.data.count}`);
    console.log('Sample alert:', response.data.alerts[0] || 'None');
    
    // Test 2: Move tourist into high-risk zone
    console.log('\n🚨 Step 2: Moving tourist into high-risk zone...');
    const entryBody = {
      touristId: 999,
      latitude: 26.617, // High-risk zone coordinates
      longitude: 92.189,
      touristName: "Test Tourist"
    };
    
    let locationResponse = await axios.post('http://localhost:5000/api/geofencing/check-location', entryBody);
    console.log('Zone entry result:', locationResponse.data.message);
    console.log('Zones entered:', locationResponse.data.data.enteredZones || 'Check data structure');
    
    // Test 3: Check critical alerts again (should increase)
    console.log('\n📈 Step 3: Checking critical alerts after entry...');
    response = await axios.get('http://localhost:5000/api/geofencing/critical-alerts');
    console.log(`Critical alerts after entry: ${response.data.count}`);
    
    // Test 4: Move tourist OUT of high-risk zone
    console.log('\n✅ Step 4: Moving tourist OUT of high-risk zone...');
    const exitBody = {
      touristId: 999,
      latitude: 25.0, // Safe zone coordinates
      longitude: 90.0,
      touristName: "Test Tourist"
    };
    
    locationResponse = await axios.post('http://localhost:5000/api/geofencing/check-location', exitBody);
    console.log('Zone exit result:', locationResponse.data.message);
    console.log('Zones exited:', locationResponse.data.data.exitedZones || 'Check data structure');
    
    // Test 5: Check critical alerts again (should decrease)
    console.log('\n📉 Step 5: Checking critical alerts after exit...');
    response = await axios.get('http://localhost:5000/api/geofencing/critical-alerts');
    console.log(`Critical alerts after exit: ${response.data.count}`);
    
    // Test 6: Get alert history to see database persistence
    console.log('\n📚 Step 6: Checking alert history (database persistence)...');
    const historyResponse = await axios.get('http://localhost:5000/api/geofencing/alert-history?limit=10');
    console.log(`Total alerts in history: ${historyResponse.data.count}`);
    
    if (historyResponse.data.data.length > 0) {
      console.log('Most recent alert:', {
        tourist: historyResponse.data.data[0].touristName,
        zone: historyResponse.data.data[0].zones?.[0]?.name,
        eventType: historyResponse.data.data[0].eventType,
        timestamp: historyResponse.data.data[0].timestamp
      });
    }
    
    console.log('\n✅ Geofencing system test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testGeofencingSystem();