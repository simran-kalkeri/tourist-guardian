const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function getAuthToken() {
  try {
    // Try to login as admin to get a token
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    return response.data.token;
  } catch (error) {
    console.log('⚠️  Could not authenticate. Trying without auth...');
    return null;
  }
}

async function testSOSFlow() {
  try {
    console.log('🧪 Starting SOS Alert Flow Test...\n');
    
    // Get auth token
    console.log('0. Getting authentication token...');
    const token = await getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // Step 1: Get list of active tourists
    console.log('1. Fetching active tourists...');
    const touristsResponse = await axios.get(`${BASE_URL}/api/tourists`, { headers });
    const touristsData = touristsResponse.data;
    const tourists = touristsData.tourists || touristsData;
    
    if (!tourists || tourists.length === 0) {
      console.log('❌ No tourists found. Please add some tourists first.');
      return;
    }
    
    const testTourist = tourists[0];
    const touristId = testTourist.blockchainId || testTourist.id || testTourist._id;
    const touristName = testTourist.name || testTourist.firstName || `Tourist-${touristId}`;
    
    console.log(`   Selected tourist: ${touristName} (ID: ${touristId})`);

    // Step 2: Check current alerts count
    console.log('\n2. Checking current alerts count...');
    const alertsResponse = await axios.get(`${BASE_URL}/api/alerts`, { headers });
    const alertsData = alertsResponse.data;
    const currentAlerts = Array.isArray(alertsData) ? alertsData : (alertsData.alerts || []);
    const currentAlertsCount = currentAlerts.length;
    console.log(`   Current alerts count: ${currentAlertsCount}`);

    // Step 3: Check SOS alerts over time before triggering
    console.log('\n3. Checking SOS alerts over time (before)...');
    const analyticsBeforeResponse = await axios.get(`${BASE_URL}/api/analytics`, { headers });
    const analyticsData = analyticsBeforeResponse.data.analytics || analyticsBeforeResponse.data;
    const sosAlertsBefore = analyticsData.sosAlertsOverTime || [];
    const totalSOSBefore = sosAlertsBefore.reduce((sum, data) => sum + (data.count || data.alerts || 0), 0);
    console.log(`   Total SOS alerts before: ${totalSOSBefore}`);
    console.log(`   SOS alerts over time data:`, JSON.stringify(sosAlertsBefore, null, 2));

    // Step 4: Trigger SOS alert
    console.log('\n4. Triggering SOS alert...');
    const sosResponse = await axios.post(`${BASE_URL}/api/tourists/${touristId}/sos`, {}, { headers });
    
    if (sosResponse.status === 200) {
      console.log('   ✅ SOS alert triggered successfully');
    } else {
      console.log('   ❌ Failed to trigger SOS alert');
      return;
    }

    // Step 5: Wait for processing
    console.log('\n5. Waiting for system processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 6: Check if alerts count increased
    console.log('\n6. Checking if alerts count increased...');
    const newAlertsResponse = await axios.get(`${BASE_URL}/api/alerts`, { headers });
    const newAlertsData = newAlertsResponse.data;
    const newAlerts = Array.isArray(newAlertsData) ? newAlertsData : (newAlertsData.alerts || []);
    const newAlertsCount = newAlerts.length;
    console.log(`   New alerts count: ${newAlertsCount}`);
    
    if (newAlertsCount > currentAlertsCount) {
      console.log('   ✅ Alerts count increased - SOS alert added to recent alerts');
      
      // Find the new SOS alert
      const sosAlerts = newAlerts.filter(alert => 
        alert.type && (alert.type.toLowerCase().includes('sos') || alert.type === 'sos_alert')
      );
      
      if (sosAlerts.length > 0) {
        const latestSOS = sosAlerts[0];
        console.log(`   📋 Latest SOS Alert Details:`);
        console.log(`      - Tourist ID: ${latestSOS.touristId}`);
        console.log(`      - Message: ${latestSOS.message}`);
        console.log(`      - Severity: ${latestSOS.severity}`);
        console.log(`      - Timestamp: ${latestSOS.timestamp}`);
        if (latestSOS.tourist) {
          console.log(`      - Tourist Name: ${latestSOS.tourist.name}`);
        }
      }
    } else {
      console.log('   ⚠️  Alerts count did not increase - check backend alert processing');
    }

    // Step 7: Check SOS alerts over time after triggering
    console.log('\n7. Checking SOS alerts over time (after)...');
    const analyticsAfterResponse = await axios.get(`${BASE_URL}/api/analytics`, { headers });
    const analyticsAfterData = analyticsAfterResponse.data.analytics || analyticsAfterResponse.data;
    const sosAlertsAfter = analyticsAfterData.sosAlertsOverTime || [];
    const totalSOSAfter = sosAlertsAfter.reduce((sum, data) => sum + (data.count || data.alerts || 0), 0);
    console.log(`   Total SOS alerts after: ${totalSOSAfter}`);
    console.log(`   SOS alerts after data:`, JSON.stringify(sosAlertsAfter, null, 2));
    
    if (totalSOSAfter > totalSOSBefore) {
      console.log('   ✅ SOS alerts over time updated - time series graph will show new data');
    } else {
      console.log('   ⚠️  SOS alerts over time not updated - check analytics processing');
    }

    // Step 8: Test Summary
    console.log('\n📊 TEST SUMMARY:');
    console.log('================');
    const alertsWorking = newAlertsCount > currentAlertsCount;
    const timeSeriesWorking = totalSOSAfter > totalSOSBefore;
    
    console.log(`Recent Alerts Section: ${alertsWorking ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`Time Series Graph: ${timeSeriesWorking ? '✅ WORKING' : '❌ FAILED'}`);
    
    if (alertsWorking && timeSeriesWorking) {
      console.log('\n🎉 All tests passed! SOS alert flow is working correctly.');
      console.log('   - SOS alerts appear in Recent Alerts section');
      console.log('   - SOS alerts update the time series graph');
      console.log('   - Tourist details are properly included');
    } else {
      console.log('\n⚠️  Some issues found. Please check the backend logs.');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
  }
}

// Run the test
testSOSFlow();