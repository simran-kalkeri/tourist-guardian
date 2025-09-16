const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI || 
  "mongodb+srv://siteadmin:officer123@cluster0.l6busjy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function cleanup() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Get database
    const db = mongoose.connection.db;
    
    // Clear all collections
    const collections = ["tourists", "walletpools", "txqueues"];
    
    for (const collectionName of collections) {
      try {
        const result = await db.collection(collectionName).deleteMany({});
        console.log(`Deleted ${result.deletedCount} documents from ${collectionName}`);
      } catch (error) {
        console.log(`Collection ${collectionName} might not exist: ${error.message}`);
      }
    }

    console.log("✅ Cleanup completed successfully!");
    
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
  }
}

cleanup();