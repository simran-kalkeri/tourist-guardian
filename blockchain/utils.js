const { ethers } = require("ethers")
const fs = require("fs")
const path = require("path")

class BlockchainService {
  constructor() {
    this.provider = null
    this.contract = null
    this.adminWallet = null
    this.contractAddress = null
    this.contractABI = null
  }

  async initialize() {
    try {
      // Load deployment info
      const deploymentPath = path.join(__dirname, "deployment.json")
      if (fs.existsSync(deploymentPath)) {
        const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"))
        this.contractAddress = deployment.contractAddress
        this.contractABI = deployment.abi
      }

      // Connect to Ganache
      this.provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545")

      // Initialize admin wallet - Use the first Ganache account that has 1000 ETH
      const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY || "0xfe6f5790ddc08d50dd09ce0debe3ecb52e5defcb1c47c2a836a6be6a0ceb56a3"; // Ganache account[0]
      this.adminWallet = new ethers.Wallet(adminPrivateKey, this.provider);
      
      // Verify wallet has funds
      const balance = await this.adminWallet.provider.getBalance(this.adminWallet.address);
      console.log("Admin wallet address:", this.adminWallet.address);
      console.log("Expected address should be: 0x5f2B25F34c18E67D417416112A83116d2750cBDF");
      console.log("Admin wallet balance:", ethers.formatEther(balance), "ETH");
      
      if (balance === 0n) {
        throw new Error("Admin wallet has no funds. Please ensure Ganache is running with the correct account.");
      }

      // Initialize contract
      if (this.contractAddress && this.contractABI) {
        this.contract = new ethers.Contract(this.contractAddress, this.contractABI, this.adminWallet)
      }

      console.log("Blockchain service initialized successfully")
      return true
    } catch (error) {
      console.error("Blockchain initialization failed:", error)
      return false
    }
  }

  async registerTourist(name, aadharOrPassport, tripStart, tripEnd, emergencyContact) {
    try {
      if (!this.contract) {
        throw new Error("Contract not initialized")
      }

      // Check wallet balance
      const balance = await this.adminWallet.provider.getBalance(this.adminWallet.address)
      console.log("Wallet balance:", ethers.formatEther(balance), "ETH")

      if (balance === 0n) {
        throw new Error("Insufficient funds. Wallet has no ETH.")
      }

      // Use default gas settings instead of estimation to avoid issues
      const tx = await this.contract.registerTourist(name, aadharOrPassport, tripStart, tripEnd, emergencyContact, {
        gasLimit: 500000, // Fixed gas limit for registration
        gasPrice: ethers.parseUnits("20", "gwei") // Fixed gas price
      })

      const receipt = await tx.wait()

      // Extract tourist ID from event
      const event = receipt.logs.find((log) => {
        try {
          const parsed = this.contract.interface.parseLog(log)
          return parsed.name === "TouristRegistered"
        } catch {
          return false
        }
      })

      if (event) {
        const parsed = this.contract.interface.parseLog(event)
        return {
          success: true,
          touristId: Number(parsed.args[0]),
          transactionHash: receipt.hash,
        }
      }

      throw new Error("Tourist registration event not found")
    } catch (error) {
      console.error("Blockchain registration error:", error)
      return { success: false, error: error.message }
    }
  }

  async updateLocation(touristId, latitude, longitude) {
    try {
      if (!this.contract) {
        throw new Error("Contract not initialized")
      }

      // Convert coordinates to blockchain format (multiply by 1000000 for precision)
      const lat = Math.floor(latitude * 1000000)
      const lng = Math.floor(longitude * 1000000)

      // Check wallet balance
      const balance = await this.adminWallet.provider.getBalance(this.adminWallet.address)
      console.log("Wallet balance:", ethers.formatEther(balance), "ETH")

      if (balance === 0n) {
        throw new Error("Insufficient funds. Wallet has no ETH.")
      }

      // Use default gas settings instead of estimation to avoid issues
      const tx = await this.contract.updateLocation(touristId, lat, lng, {
        gasLimit: 200000, // Fixed gas limit
        gasPrice: ethers.parseUnits("20", "gwei") // Fixed gas price
      })
      const receipt = await tx.wait()

      return {
        success: true,
        transactionHash: receipt.hash,
      }
    } catch (error) {
      console.error("Blockchain location update error:", error)
      return { success: false, error: error.message }
    }
  }

  async triggerSOS(touristId) {
    try {
      if (!this.contract) {
        throw new Error("Contract not initialized")
      }

      const tx = await this.contract.triggerSOS(touristId)
      const receipt = await tx.wait()

      return {
        success: true,
        transactionHash: receipt.hash,
      }
    } catch (error) {
      console.error("Blockchain SOS trigger error:", error)
      return { success: false, error: error.message }
    }
  }

  async resetSOS(touristId) {
    try {
      if (!this.contract) {
        throw new Error("Contract not initialized")
      }

      const tx = await this.contract.resetSOS(touristId)
      const receipt = await tx.wait()

      return {
        success: true,
        transactionHash: receipt.hash,
      }
    } catch (error) {
      console.error("Blockchain SOS reset error:", error)
      return { success: false, error: error.message }
    }
  }

  async getTourist(touristId) {
    try {
      if (!this.contract) {
        return { success: false, error: "Contract not initialized" }
      }

      const tourist = await this.contract.getTourist(touristId)

      return {
        success: true,
        tourist: {
          id: Number(tourist.id),
          name: tourist.name,
          aadharOrPassport: tourist.aadharOrPassport,
          tripStart: Number(tourist.tripStart),
          tripEnd: Number(tourist.tripEnd),
          emergencyContact: tourist.emergencyContact,
          isRegistered: tourist.isRegistered,
          sosActive: tourist.sosActive,
          latitude: Number(tourist.latitude) / 1000000,
          longitude: Number(tourist.longitude) / 1000000,
        },
      }
    } catch (error) {
      console.error("Blockchain get tourist error:", error)
      return { success: false, error: error.message }
    }
  }

  async getAllTourists() {
    try {
      if (!this.contract) {
        return { success: false, error: "Contract not initialized" }
      }

      const tourists = await this.contract.getAllTourists()

      return {
        success: true,
        tourists: tourists.map((tourist) => ({
          id: Number(tourist.id),
          name: tourist.name,
          aadharOrPassport: tourist.aadharOrPassport,
          tripStart: Number(tourist.tripStart),
          tripEnd: Number(tourist.tripEnd),
          emergencyContact: tourist.emergencyContact,
          isRegistered: tourist.isRegistered,
          sosActive: tourist.sosActive,
          latitude: Number(tourist.latitude) / 1000000,
          longitude: Number(tourist.longitude) / 1000000,
        })),
      }
    } catch (error) {
      console.error("Blockchain get all tourists error:", error)
      return { success: false, error: error.message }
    }
  }

  async deleteTourist(touristId) {
    try {
      if (!this.contract) {
        throw new Error("Contract not initialized")
      }

      const tx = await this.contract.deleteTourist(touristId)
      const receipt = await tx.wait()

      return {
        success: true,
        transactionHash: receipt.hash,
      }
    } catch (error) {
      console.error("Blockchain delete tourist error:", error)
      return { success: false, error: error.message }
    }
  }

  async getContractInfo() {
    try {
      if (!this.contract) {
        return { success: false, error: "Contract not initialized" }
      }

      const admin = await this.contract.admin()
      const touristCount = await this.contract.touristCount()

      return {
        success: true,
        contractAddress: this.contractAddress,
        admin,
        touristCount: Number(touristCount),
      }
    } catch (error) {
      console.error("Get contract info error:", error)
      return { success: false, error: error.message }
    }
  }
}

module.exports = BlockchainService
