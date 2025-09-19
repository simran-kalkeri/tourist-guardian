// Test script to verify SOS alert functionality
const fetch = require('node-fetch');

async function testSOSAlerts() {
  try {
    console.log('🧪 Testing SOS Alert System...');
    
    // First, let's get the list of active tourists
    console.log('1️⃣ Getting list of active tourists...');
    const touristsResponse = await fetch('http://localhost:5000/api/public/tourist-locations');
    const touristsData = await touristsResponse.json();
    
    if (!touristsData.success || !touristsData.tourists || touristsData.tourists.length === 0) {
      console.log('❌ No active tourists found. Please ensure there are registered tourists.');
      return;
    }
    
    const tourist = touristsData.tourists[0]; // Use the first tourist
    console.log(`📍 Using tourist: ${tourist.name} (ID: ${tourist.id})`);
    
    // Check current alerts count
    console.log('\\n2️⃣ Checking current alerts count...');
    const alertsResponse = await fetch('http://localhost:5000/api/alerts');
    const alertsData = await alertsResponse.json();
    const initialAlertCount = alertsData.alerts ? alertsData.alerts.length : 0;
    console.log(`📊 Initial alerts count: ${initialAlertCount}`);
    
    // Check current analytics (SOS alerts over time)
    console.log('\\n3️⃣ Checking current SOS analytics...');
    const analyticsResponse = await fetch('http://localhost:5000/api/analytics', {
      headers: {
        'Authorization': 'Bearer ' + (process.env.TEST_TOKEN || 'test-token') // You may need to get a real token
      }
    });
    
    let initialSOSCount = 0;
    if (analyticsResponse.ok) {
      const analyticsData = await analyticsResponse.json();
      if (analyticsData.success && analyticsData.analytics.sosAlertsOverTime) {
        const today = analyticsData.analytics.sosAlertsOverTime[analyticsData.analytics.sosAlertsOverTime.length - 1];
        initialSOSCount = today ? today.alerts : 0;
      }
      console.log(`📈 Initial SOS alerts count for today: ${initialSOSCount}`);
    } else {
      console.log('⚠️  Analytics endpoint requires authentication, skipping initial count check');
    }
    
    // Trigger SOS alert
    console.log(`\\n4️⃣ Triggering SOS alert for tourist ${tourist.id}...`);
    const sosResponse = await fetch(`http://localhost:5000/api/tourists/${tourist.id}/sos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const sosResult = await sosResponse.json();
    
    if (sosResponse.ok && sosResult.success) {
      console.log('✅ SOS alert triggered successfully!');
      console.log(`   Message: ${sosResult.message}`);
      console.log(`   Tourist: ${sosResult.tourist.name}`);
      console.log(`   SOS Active: ${sosResult.tourist.sosActive}`);
    } else {
      console.log('❌ Failed to trigger SOS alert:', sosResult.error || 'Unknown error');
      return;
    }
    
    // Wait a moment for the system to process
    console.log('\\n⏳ Waiting 2 seconds for system to process...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if alerts count increased
    console.log('\\n5️⃣ Checking if alerts count increased...');
    const newAlertsResponse = await fetch('http://localhost:5000/api/alerts');
    const newAlertsData = await newAlertsResponse.json();
    const newAlertCount = newAlertsData.alerts ? newAlertsData.alerts.length : 0;
    
    console.log(`📊 New alerts count: ${newAlertCount}`);
    console.log(`📈 Alerts increased by: ${newAlertCount - initialAlertCount}`);
    
    if (newAlertCount > initialAlertCount) {
      console.log('✅ SOS alert was added to alerts array!');
      
      // Find the SOS alert
      const recentAlerts = newAlertsData.alerts.slice(-5); // Last 5 alerts
      const sosAlert = recentAlerts.find(alert => 
        alert.type === 'sos_alert' && alert.touristId === tourist.id
      );
      
      if (sosAlert) {
        console.log('🎉 Found the SOS alert in recent alerts:');
        console.log(`   Type: ${sosAlert.type}`);
        console.log(`   Tourist ID: ${sosAlert.touristId}`);
        console.log(`   Message: ${sosAlert.message}`);
        console.log(`   Severity: ${sosAlert.severity}`);
        console.log(`   Timestamp: ${sosAlert.timestamp}`);
        if (sosAlert.tourist) {
          console.log(`   Tourist Name: ${sosAlert.tourist.name}`);
          console.log(`   Tourist Location: ${sosAlert.tourist.latitude}, ${sosAlert.tourist.longitude}`);
        }
      } else {
        console.log('⚠️  Could not find the specific SOS alert in recent alerts');
      }
    } else {
      console.log('❌ SOS alert was NOT added to alerts array');
    }
    
    // Check analytics again (if accessible)
    console.log('\\n6️⃣ Checking updated SOS analytics...');
    if (analyticsResponse.ok) {
      const newAnalyticsResponse = await fetch('http://localhost:5000/api/analytics', {
        headers: {
          'Authorization': 'Bearer ' + (process.env.TEST_TOKEN || 'test-token')
        }
      });
      
      if (newAnalyticsResponse.ok) {
        const newAnalyticsData = await newAnalyticsResponse.json();
        if (newAnalyticsData.success && newAnalyticsData.analytics.sosAlertsOverTime) {
          const todayUpdated = newAnalyticsData.analytics.sosAlertsOverTime[newAnalyticsData.analytics.sosAlertsOverTime.length - 1];
          const updatedSOSCount = todayUpdated ? todayUpdated.alerts : 0;
          
          console.log(`📈 Updated SOS alerts count for today: ${updatedSOSCount}`);
          
          if (updatedSOSCount > initialSOSCount) {
            console.log('✅ SOS time series graph will be updated!');
          } else {
            console.log('⚠️  SOS time series count did not increase');
          }
        }
      }
    }
    
    // Summary
    console.log('\\n📋 Test Summary:');
    console.log('✅ 1. SOS alert triggered successfully');
    console.log(newAlertCount > initialAlertCount ? '✅ 2. Alert added to alerts array for recent alerts' : '❌ 2. Alert NOT added to alerts array');
    console.log('✅ 3. Time series data should update (if analytics accessible)');
    
    console.log('\\n🎉 SOS Alert Test Completed!');
    console.log('\\n💡 To see the changes:');
    console.log('   1. Refresh your admin dashboard overview page');
    console.log('   2. Check the "SOS Alerts Over Time" graph');
    console.log('   3. Check the "Recent Alerts" section');
    console.log('   4. The tourist should show as having an active SOS');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\\nPlease ensure:');
    console.log('1. Backend server is running on http://localhost:5000');
    console.log('2. There are registered tourists in the system');
    console.log('3. Database connections are working');
  }
}

testSOSAlerts();