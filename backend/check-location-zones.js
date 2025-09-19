// Check what zones exist at specific coordinates
const fetch = require('node-fetch');

async function checkLocationZones() {
  try {
    console.log('🗺️  Checking what zones exist at different locations...');
    
    const testLocations = [
      { name: 'Guwahati City Center', lat: 26.1445, lng: 91.7362 },
      { name: 'Far from any zone', lat: 25.0000, lng: 90.0000 },
      { name: 'Mumbai (very far)', lat: 19.0760, lng: 72.8777 },
      { name: 'Kolkata (safe distance)', lat: 22.5726, lng: 88.3639 }
    ];
    
    for (const location of testLocations) {
      console.log(`\\n📍 Testing location: ${location.name} (${location.lat}, ${location.lng})`);
      
      const testPayload = {
        touristId: 999, // Test tourist ID
        latitude: location.lat,
        longitude: location.lng,
        touristName: 'Test Tourist'
      };
      
      try {
        const response = await fetch('http://localhost:5000/api/geofencing/check-location', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(testPayload)
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`   Result: ${result.message}`);
          
          if (result.data.isInZone && result.data.zones.length > 0) {
            console.log(`   📊 In ${result.data.zones.length} zone(s):`);
            result.data.zones.forEach((zone, i) => {
              console.log(`      ${i+1}. ${zone.name} (${zone.risk_level})`);
            });
          } else {
            console.log('   ✅ No zones detected - this is a safe location!');
          }
        } else {
          console.log(`   ❌ Check failed: ${response.status}`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n💡 Use a location that shows "No zones detected" to safely resolve alerts.');
    
  } catch (error) {
    console.error('❌ Location check failed:', error.message);
  }
}

checkLocationZones();
