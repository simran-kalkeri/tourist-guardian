// Script to seed all 5 zones into the database
const mongoose = require('mongoose');
const { sampleZones, seedSampleZones, clearAllZones } = require('./data/sampleZones');

async function seedAllZones() {
  try {
    console.log('🌍 Starting zone seeding process...');
    
    // Connect to database
    const dbURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tourist-guardian';
    console.log('🔌 Connecting to database:', dbURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    
    await mongoose.connect(dbURI);
    console.log('✅ Connected to database');
    
    const Zone = require('./models/zone');
    
    // Check current zones
    const existingZones = await Zone.find({});
    console.log(`📊 Current zones in database: ${existingZones.length}`);
    
    if (existingZones.length > 0) {
      console.log('Existing zones:');
      existingZones.forEach((zone, i) => {
        console.log(`   ${i+1}. ${zone.name} (${zone.risk_level}) - ID: ${zone.zone_id}`);
      });
      
      console.log('\n🔄 Clearing existing zones and reseeding all 5 zones...');
      await clearAllZones();
    }
    
    // Seed all 5 sample zones
    console.log('\n📥 Seeding all 5 sample zones...');
    const success = await seedSampleZones();
    
    if (success) {
      // Verify all zones were created
      const finalZones = await Zone.find({});
      console.log(`\n✅ Zone seeding completed! Total zones: ${finalZones.length}`);
      
      console.log('\n📋 All zones in database:');
      finalZones.forEach((zone, i) => {
        console.log(`   ${i+1}. ${zone.name}`);
        console.log(`      Risk Level: ${zone.risk_level}`);
        console.log(`      Category: ${zone.zone_category}`);
        console.log(`      Location: ${zone.state}, ${zone.district}`);
        console.log(`      Alert Enabled: ${zone.alert_enabled}`);
        console.log('');
      });
      
      console.log('🎉 All 5 zones should now appear on the live map page!');
    } else {
      console.log('❌ Failed to seed zones');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Zone seeding failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n⚠️  Database connection failed. Trying fallback approach...');
      console.log('This might mean MongoDB is not running or connection string is incorrect.');
      
      // Try to add zones via the API endpoint instead
      console.log('\n🔄 Attempting to add zones via API...');
      await seedViaAPI();
    }
    
    process.exit(1);
  }
}

// Fallback: try to seed via API if database connection fails
async function seedViaAPI() {
  try {
    const fetch = require('node-fetch');
    const serverURL = 'http://localhost:5000';
    
    console.log('🌐 Adding zones via API endpoints...');
    
    for (let i = 0; i < sampleZones.length; i++) {
      const zone = sampleZones[i];
      console.log(`📤 Adding zone ${i+1}/5: ${zone.name}`);
      
      const response = await fetch(`${serverURL}/api/geofencing/zones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(zone)
      });
      
      if (response.ok) {
        console.log(`   ✅ Successfully added: ${zone.name}`);
      } else {
        console.log(`   ❌ Failed to add: ${zone.name} - ${response.status}`);
      }
    }
    
    // Verify zones via API
    const zonesResponse = await fetch(`${serverURL}/api/geofencing/zones`);
    if (zonesResponse.ok) {
      const zones = await zonesResponse.json();
      console.log(`\n✅ API seeding completed! Total zones: ${zones.length}`);
    }
    
  } catch (apiError) {
    console.error('❌ API seeding also failed:', apiError.message);
    console.log('\n💡 Manual steps:');
    console.log('1. Make sure your backend server is running (npm start)');
    console.log('2. Check database connection in your server');
    console.log('3. Try running this script again');
  }
}

seedAllZones();