const mongoose = require('mongoose');

// MongoDB Atlas Connection
const MONGODB_URI = process.env.MONGODB_URI ||
  "mongodb+srv://siteadmin:officer123@cluster0.l6busjy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Tourist Schema
const touristSchema = new mongoose.Schema({
  blockchainId: { type: Number, required: true, unique: true },
  walletAddress: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  aadharOrPassport: { type: String, required: true },
  tripStart: { type: Date, required: true },
  tripEnd: { type: Date, required: true },
  emergencyContact: { type: String, required: true },
  itinerary: [
    {
      name: { type: String },
      lat: { type: Number, required: false },
      lng: { type: Number, required: false },
      expectedArrival: { type: Date, required: false },
      expectedDeparture: { type: Date, required: false },
    },
  ],
  simulationMode: { type: Boolean, default: false },
  simulationState: {
    currentSegmentIndex: { type: Number, default: 0 },
    lastSimTickAt: { type: Date, default: null },
    simulatedSpeedMps: { type: Number, default: 12 },
    simulatedPathId: { type: String, default: null },
  },
  latitude: { type: Number, default: 0 },
  longitude: { type: Number, default: 0 },
  rawLatitude: { type: Number, default: 0 },
  rawLongitude: { type: Number, default: 0 },
  displayLatitude: { type: Number, default: 26.2006 },
  displayLongitude: { type: Number, default: 92.9376 },
  sosActive: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  locationSource: { type: String, enum: ['simulation', 'device'], default: 'simulation' },
  deviceTracked: { type: Boolean, default: false },
  lastDeviceFixAt: { type: Date, default: null },
  assignedWallet: {
    address: { type: String, default: null },
    index: { type: Number, default: null },
    assignedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
  },
  blockchainStatus: {
    registrationTx: {
      status: { type: String, default: 'pending' },
      txHash: { type: String, default: null },
      triedAt: { type: [Date], default: [] },
    },
    lastEventTx: {
      status: { type: String, default: null },
      txHash: { type: String, default: null },
      triedAt: { type: [Date], default: [] },
    },
  },
  flags: { simulated: { type: Boolean, default: false } },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Tourist = mongoose.model("Tourist", touristSchema);

async function checkAndFixTourists() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 0,
      connectTimeoutMS: 30000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true,
      heartbeatFrequencyMS: 10000,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Get all tourists
    const allTourists = await Tourist.find({});
    console.log(`\n📊 Found ${allTourists.length} tourists in database:`);
    
    const now = new Date();
    let activeCount = 0;
    let expiredCount = 0;
    let touristsToFix = [];
    
    allTourists.forEach(tourist => {
      const isExpired = tourist.tripEnd < now;
      const status = tourist.isActive ? 'Active' : 'Inactive';
      const expiredText = isExpired ? '⚠️ EXPIRED' : '✅ Valid';
      
      console.log(`  - ${tourist.name} (ID: ${tourist.blockchainId}) - ${status} - Trip End: ${tourist.tripEnd.toISOString()} ${expiredText}`);
      
      if (tourist.isActive) activeCount++;
      if (isExpired && tourist.isActive) {
        expiredCount++;
        touristsToFix.push(tourist);
      }
    });
    
    console.log(`\n📈 Summary:`);
    console.log(`  - Total tourists: ${allTourists.length}`);
    console.log(`  - Active tourists: ${activeCount}`);
    console.log(`  - Expired but still active: ${expiredCount}`);
    
    if (touristsToFix.length > 0) {
      console.log(`\n🔧 Fixing ${touristsToFix.length} expired tourists...`);
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // Extend trip by 30 days
      
      for (const tourist of touristsToFix) {
        await Tourist.findByIdAndUpdate(tourist._id, {
          tripEnd: futureDate,
          updatedAt: new Date()
        });
        console.log(`  ✅ Extended trip end date for ${tourist.name} to ${futureDate.toISOString()}`);
      }
      
      console.log(`\n🎉 Fixed ${touristsToFix.length} tourists! They should now appear in the simulation.`);
    } else {
      console.log(`\n✅ All active tourists have valid trip end dates.`);
    }
    
    // Also check for inactive tourists that could be reactivated
    const inactiveTourists = await Tourist.find({ isActive: false });
    if (inactiveTourists.length > 0) {
      console.log(`\n🔄 Found ${inactiveTourists.length} inactive tourists. Reactivating them...`);
      
      for (const tourist of inactiveTourists) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        
        await Tourist.findByIdAndUpdate(tourist._id, {
          isActive: true,
          tripEnd: futureDate,
          updatedAt: new Date()
        });
        console.log(`  ✅ Reactivated ${tourist.name} with trip end date ${futureDate.toISOString()}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkAndFixTourists();