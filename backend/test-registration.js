const axios = require('axios');

async function testTouristRegistration() {
  try {
    const touristData = {
      name: "Test User",
      aadharOrPassport: "TEST123456789",
      tripStart: "2025-01-15T10:00:00.000Z",
      tripEnd: "2025-01-20T18:00:00.000Z",
      emergencyContact: "+91-9876543210",
      itinerary: [
        {
          name: "Guwahati",
          expectedArrival: "2025-01-15T14:00:00.000Z",
          expectedDeparture: "2025-01-16T10:00:00.000Z"
        },
        {
          name: "Kaziranga National Park", 
          expectedArrival: "2025-01-16T15:00:00.000Z",
          expectedDeparture: "2025-01-18T12:00:00.000Z"
        }
      ]
    };

    console.log('🧪 Testing tourist registration...');
    console.log('Tourist data:', JSON.stringify(touristData, null, 2));

    const response = await axios.post('http://localhost:5000/api/tourists/register', touristData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Registration successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('❌ Registration failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    return null;
  }
}

async function testGetAllTourists() {
  try {
    console.log('\n🔍 Testing get all tourists...');
    const response = await axios.get('http://localhost:5000/api/tourists');
    
    console.log('✅ Get all tourists successful!');
    console.log(`Found ${response.data.length} tourists`);
    response.data.forEach((tourist, index) => {
      console.log(`Tourist ${index + 1}:`, {
        id: tourist.blockchainId,
        name: tourist.name,
        walletAddress: tourist.walletAddress,
        registrationStatus: tourist.blockchainStatus?.registrationTx?.status
      });
    });
    
  } catch (error) {
    console.error('❌ Get all tourists failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting tourism safety system tests...\n');
  
  // Test registration
  await testTouristRegistration();
  
  // Wait a moment for registration to complete
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test get all tourists
  await testGetAllTourists();
  
  console.log('\n✨ Tests completed!');
}

runTests();