const axios = require('axios');

async function testRegistration() {
  try {
    console.log('🧪 Testing tourist registration...');
    
    const testTourist = {
      name: "John Doe",
      aadharOrPassport: "123456789012",
      tripStart: "2025-01-15",
      tripEnd: "2025-01-20", 
      emergencyContact: "+91-9876543210",
      itinerary: [
        { name: "Guwahati" },
        { name: "Kaziranga National Park" }
      ]
    };

    const response = await axios.post('http://localhost:5000/api/tourists/register', testTourist);
    
    console.log('✅ Registration successful!');
    console.log('Tourist ID:', response.data.tourist.id);
    console.log('Wallet Address:', response.data.tourist.walletAddress);
    console.log('Transaction Hash:', response.data.tourist.transactionHash);
    
  } catch (error) {
    console.error('❌ Registration failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Give server time to start
setTimeout(testRegistration, 2000);