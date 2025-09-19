// Simple script to check how many zones are currently in the system
const fetch = require('node-fetch');

async function checkZonesCount() {
  try {
    console.log('🔍 Checking zones count...');
    
    const response = await fetch('http://localhost:5000/api/geofencing/zones');
    
    if (response.ok) {
      const data = await response.json();
      const zones = data.data || data;
      
      console.log(`📊 Total zones in system: ${zones.length}`);
      
      if (zones.length > 0) {
        console.log('\n📋 Zone names:');
        zones.forEach((zone, i) => {
          console.log(`   ${i+1}. ${zone.name} (${zone.risk_level})`);
        });
      }
      
      if (zones.length === 5) {
        console.log('\n✅ Perfect! All 5 zones are now in the system.');
        console.log('🎉 The live map page should now show "5" for Areas count.');
      } else {
        console.log(`\n⚠️  Expected 5 zones but found ${zones.length}.`);
      }
      
    } else {
      console.log('❌ Failed to fetch zones:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Error checking zones:', error.message);
    console.log('Make sure your backend server is running on http://localhost:5000');
  }
}

checkZonesCount();