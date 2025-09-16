const mongoose = require("mongoose");
require("dotenv").config({ path: "../backend/.env" });

// Tourist Schema (simplified for cleanup)
const touristSchema = new mongoose.Schema({
  blockchainId: { type: Number, required: true, unique: true },
  walletAddress: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  // ... other fields don't matter for cleanup
});

const Tourist = mongoose.model("Tourist", touristSchema);

const MONGODB_URI = process.env.MONGODB_URI || 
  "mongodb+srv://siteadmin:officer123@cluster0.l6busjy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function cleanupTourists() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Get count of existing tourists
    const count = await Tourist.countDocuments();
    console.log(`Found ${count} existing tourists`);

    if (count > 0) {
      // Delete all tourists
      const result = await Tourist.deleteMany({});
      console.log(`Deleted ${result.deletedCount} tourists`);
      
      // Also clear any wallet pool assignments and tx queue entries
      const WalletPool = mongoose.model("WalletPool", new mongoose.Schema({}));
      const TXQueue = mongoose.model("TXQueue", new mongoose.Schema({}));
      
      const walletResult = await WalletPool.deleteMany({});
      console.log(`Deleted ${walletResult.deletedCount} wallet pool entries`);
      
      const txResult = await TXQueue.deleteMany({});
      console.log(`Deleted ${txResult.deletedCount} tx queue entries`);
    } else {
      console.log("No tourists found to delete");
    }

    console.log("Cleanup completed successfully!");
  } catch (error) {
    console.error("Cleanup failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
  }
}

// Run the cleanup
cleanupTourists();