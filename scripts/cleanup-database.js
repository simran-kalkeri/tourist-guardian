const mongoose = require("mongoose")

// MongoDB Connection
const MONGODB_URI =
  "mongodb+srv://siteadmin:officer123@cluster0.l6busjy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

async function cleanupDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })

    console.log("Connected to MongoDB")

    // Get the database
    const db = mongoose.connection.db

    // Check if tokenId index exists and drop it
    try {
      const indexes = await db.collection("tourists").indexes()
      console.log(
        "Current indexes:",
        indexes.map((idx) => idx.name),
      )

      const tokenIdIndex = indexes.find((idx) => idx.name === "tokenId_1")
      if (tokenIdIndex) {
        await db.collection("tourists").dropIndex("tokenId_1")
        console.log("✅ Dropped tokenId_1 index successfully")
      } else {
        console.log("ℹ️  tokenId_1 index not found")
      }
    } catch (error) {
      console.log("ℹ️  tokenId index doesn't exist or already dropped:", error.message)
    }

    // Ensure blockchainId index exists and is unique
    try {
      await db.collection("tourists").createIndex({ blockchainId: 1 }, { unique: true })
      console.log("✅ Created unique blockchainId index")
    } catch (error) {
      console.log("ℹ️  blockchainId index already exists:", error.message)
    }

    console.log("✅ Database cleanup completed successfully")
    process.exit(0)
  } catch (error) {
    console.error("❌ Database cleanup failed:", error)
    process.exit(1)
  }
}

cleanupDatabase()
