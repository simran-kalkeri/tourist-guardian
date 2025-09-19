// Quick cleanup to reset the geofence alert system
const mongoose = require('mongoose');

// Connect directly to your MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://your-connection-string';

async function quickCleanup() {
  try {
    // Connect to the same database as your server
    console.log('🔌 Connecting to database...');
    
    // If using MongoDB Atlas or local MongoDB
    const connectUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tourist-guardian';
    
    await mongoose.connect(connectUri);
    console.log('✅ Connected to MongoDB');
    
    // Define the alert schema quickly
    const alertSchema = new mongoose.Schema({}, { strict: false });
    const Alert = mongoose.model('GeofenceAlert', alertSchema, 'geofence_alerts');
    
    // Get current active alerts
    const activeAlerts = await Alert.find({ status: 'active', exitTime: null });
    console.log(`📊 Found ${activeAlerts.length} active alerts`);
    
    if (activeAlerts.length > 0) {
      console.log('🗑️ Removing all active alerts...');
      
      // Mark all as resolved
      await Alert.updateMany(
        { status: 'active', exitTime: null },
        { 
          status: 'resolved',
          exitTime: new Date(),
          lastUpdated: new Date()
        }
      );
      
      console.log('✅ All alerts marked as resolved');
    }
    
    // Verify cleanup
    const remainingActive = await Alert.countDocuments({ status: 'active', exitTime: null });
    console.log(`📊 Remaining active alerts: ${remainingActive}`);
    
    console.log('✅ Cleanup completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    
    // Fallback: Just log instructions
    console.log(`
📝 Manual cleanup instructions:
1. Open MongoDB Compass or your MongoDB client
2. Navigate to the 'geofence_alerts' collection  
3. Update all documents where: { status: 'active', exitTime: null }
4. Set: { status: 'resolved', exitTime: new Date() }

OR try restarting the backend server - it should handle the cleanup automatically.
`);
    
    process.exit(1);
  }
}

quickCleanup();