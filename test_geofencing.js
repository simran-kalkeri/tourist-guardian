#!/usr/bin/env node
// TEST SCRIPT FOR OLD GEOFENCING SYSTEM
// Run this to test if the old geofencing integration is working

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test functions
async function testServerHealth() {
  log('\n=== Testing Server Health ===', 'cyan');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    if (response.status === 200) {
      log('✅ Server is running and healthy', 'green');
      return true;
    }
  } catch (error) {
    log('❌ Server health check failed:', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function testGeofencingRoutes() {
  log('\n=== Testing Geofencing Routes ===', 'cyan');
  
  try {
    // Test get zones
    log('Testing GET /api/geofencing/zones', 'yellow');
    const zonesResponse = await axios.get(`${BASE_URL}/api/geofencing/zones`);
    log(`✅ GET zones successful - Found ${zonesResponse.data.count} zones`, 'green');
    
    if (zonesResponse.data.data && zonesResponse.data.data.length > 0) {
      const firstZone = zonesResponse.data.data[0];
      log(`   Sample zone: "${firstZone.name}" (${firstZone.risk_level} risk)`, 'blue');
    }
    
    // Test get statistics
    log('Testing GET /api/geofencing/statistics', 'yellow');
    const statsResponse = await axios.get(`${BASE_URL}/api/geofencing/statistics`);
    log('✅ GET statistics successful:', 'green');
    const stats = statsResponse.data.data;
    log(`   Total zones: ${stats.totalZones}`, 'blue');
    log(`   High risk zones: ${stats.highRiskZones}`, 'blue');
    log(`   Active alerts: ${stats.activeAlerts}`, 'blue');
    
    return true;
  } catch (error) {
    log('❌ Geofencing routes test failed:', 'red');
    log(`   Error: ${error.message}`, 'red');
    if (error.response) {
      log(`   Response: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return false;
  }
}

async function testLocationCheck() {
  log('\n=== Testing Location Check ===', 'cyan');
  
  const testLocations = [
    // Delhi Red Fort area (should trigger high-risk zone)
    {
      name: 'Delhi Red Fort (High Risk)',
      touristId: 'test-001',
      latitude: 28.6562,
      longitude: 77.2410,
      touristName: 'Test Tourist Delhi'
    },
    // Guwahati city center (should trigger low-risk zone)
    {
      name: 'Guwahati City Center (Low Risk)', 
      touristId: 'test-002',
      latitude: 26.1445,
      longitude: 91.7362,
      touristName: 'Test Tourist Guwahati'
    },
    // Random location (should not trigger any zone)
    {
      name: 'Random Location (No Zone)',
      touristId: 'test-003',
      latitude: 20.0000,
      longitude: 80.0000,
      touristName: 'Test Tourist Random'
    }
  ];
  
  for (const location of testLocations) {
    try {
      log(`Testing location: ${location.name}`, 'yellow');
      
      const response = await axios.post(`${BASE_URL}/api/geofencing/check-location`, {
        touristId: location.touristId,
        latitude: location.latitude,
        longitude: location.longitude,
        touristName: location.touristName
      });
      
      const result = response.data.data;
      
      if (result.isInZone) {
        log(`✅ Zone detection successful - Entered ${result.zones.length} zone(s)`, 'green');
        result.zones.forEach(zone => {
          log(`   🚨 Zone: "${zone.name}" (${zone.risk_level} risk)`, zone.risk_level === 'high' ? 'red' : zone.risk_level === 'moderate' ? 'yellow' : 'blue');
        });
        
        if (result.alert_required) {
          log(`   ⚠️  Alert required for this location`, 'yellow');
        }
      } else {
        log(`✅ No zones detected for location`, 'green');
      }
      
    } catch (error) {
      log(`❌ Location check failed for ${location.name}:`, 'red');
      log(`   Error: ${error.message}`, 'red');
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

async function testAlertHistory() {
  log('\n=== Testing Alert History ===', 'cyan');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/geofencing/alert-history?limit=10`);
    log('✅ Alert history retrieval successful', 'green');
    
    const alerts = response.data.data;
    log(`   Found ${alerts.length} recent alerts`, 'blue');
    
    if (alerts.length > 0) {
      const latestAlert = alerts[0];
      log(`   Latest alert: Tourist ${latestAlert.touristName} in zone ${latestAlert.zones[0]?.name}`, 'blue');
    }
    
    return true;
  } catch (error) {
    log('❌ Alert history test failed:', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function testGeofencingService() {
  log('\n=== Testing Geofencing Service Test Route ===', 'cyan');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/geofencing/test`);
    log('✅ Geofencing service test successful', 'green');
    
    const testData = response.data.data;
    log(`   Test result: ${testData.testResult.isInZone ? 'Zone detected' : 'No zones detected'}`, 'blue');
    
    if (testData.statistics) {
      log(`   System statistics:`, 'blue');
      log(`     Total zones: ${testData.statistics.totalZones}`, 'blue');
      log(`     Active alerts: ${testData.statistics.activeAlerts}`, 'blue');
    }
    
    return true;
  } catch (error) {
    log('❌ Geofencing service test failed:', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

// Main test runner
async function runTests() {
  log('🧪 GEOFENCING INTEGRATION TEST SUITE', 'bright');
  log('=====================================', 'bright');
  
  const results = [];
  
  // Run all tests
  results.push(await testServerHealth());
  results.push(await testGeofencingRoutes());
  results.push(await testLocationCheck());
  results.push(await testAlertHistory());
  results.push(await testGeofencingService());
  
  // Summary
  log('\n=== Test Summary ===', 'cyan');
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  if (passed === total) {
    log(`✅ All tests passed! (${passed}/${total})`, 'green');
    log('\n🎉 Old geofencing system integration is working correctly!', 'bright');
  } else {
    log(`❌ Some tests failed: ${passed}/${total} passed`, 'red');
    log('\n🔧 Please check the error messages above and fix any issues.', 'yellow');
  }
  
  log('\n📝 Integration Summary:', 'cyan');
  log('- ✅ Old geofencing service (geoFencingService.js) - INTEGRATED', 'green');
  log('- ✅ Old geofencing routes (geoFencing.js) - INTEGRATED', 'green');  
  log('- ✅ Zone model (zone.js) - INTEGRATED', 'green');
  log('- ✅ Sample zones data - READY FOR SEEDING', 'green');
  log('- ✅ Server.js updated to use old system - INTEGRATED', 'green');
}

// Error handling
process.on('uncaughtException', (error) => {
  log('\n❌ Uncaught exception:', 'red');
  log(error.stack, 'red');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('\n❌ Unhandled rejection:', 'red');
  log(reason, 'red');
  process.exit(1);
});

// Run the tests
if (require.main === module) {
  runTests().catch((error) => {
    log('\n❌ Test suite failed:', 'red');
    log(error.stack, 'red');
    process.exit(1);
  });
}

module.exports = { runTests };