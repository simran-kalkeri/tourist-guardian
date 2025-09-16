const { ethers } = require("ethers")

class WalletPoolService {
  constructor(options = {}) {
    this.poolSize = Number(process.env.WALLET_POOL_SIZE || 20)
    this.mnemonic = process.env.GANACHE_MNEMONIC ||
      "myth like bonus scare over problem client lizard pioneer submit female collect"
    this.hdPath = process.env.WALLET_DERIVATION_PATH || "m/44'/60'/0'/0"
    this.walletPool = []
    this.activeWallets = new Map() // address -> wallet info
    this.initialized = false
  }

  async initialize() {
    try {
      console.log(`Initializing wallet pool with ${this.poolSize} wallets...`)
      
      // Use predefined private keys from Ganache for reliability
      const ganachePrivateKeys = [
        "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d",
        "0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1",
        "0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c",
        "0x646f1ce2fdad0e6deeeb5c7e8e5543bdde65e86029e2fd9fc169899c440a7913",
        "0xadd53f9a7e588d003326d1cbf9e4a43c061aadd9bc938c843a79e7b4fd2ad743",
        "0x395df67f0c2d2d9fe1ad08d1bc8b6627011959b79c53d7dd6a3536a33ab8a4fd",
        "0xe485d098507f54e7733a205420dfddbe58db035fa577fc294ebd14db90767a52",
        "0xa453611d9419d0e56f499079478fd72c37b251a94bfde4d19872c44cf65386e3",
        "0x829e924fdf021ba3dbbc4225edfece9aca04b929d6e75613329ca6f1d31c0bb4",
        "0xb0057716d5917badaf911b193b12b910811c1497b5bada8d7711f758981c3773"
      ]
      
      // Limit pool strictly to available Ganache accounts by default
      const keysToUse = Math.min(this.poolSize, ganachePrivateKeys.length)
      
      for (let i = 0; i < keysToUse; i++) {
        const wallet = new ethers.Wallet(ganachePrivateKeys[i])
        
        this.walletPool.push({
          address: wallet.address,
          privateKey: wallet.privateKey,
          index: i,
          available: true,
          createdAt: new Date()
        })
      }
      
      // Do NOT create random wallets by default to avoid unfunded addresses
      // If you explicitly want more, set WALLET_POOL_ALLOW_RANDOM=true
      if (process.env.WALLET_POOL_ALLOW_RANDOM === 'true') {
        for (let i = keysToUse; i < this.poolSize; i++) {
          const wallet = ethers.Wallet.createRandom()
          this.walletPool.push({
            address: wallet.address,
            privateKey: wallet.privateKey,
            index: i,
            available: true,
            createdAt: new Date()
          })
        }
      } else {
        // Adjust pool size to keysToUse when random is not allowed
        this.poolSize = keysToUse
      }
      
      this.initialized = true
      console.log(`Wallet pool initialized with ${this.walletPool.length} wallets`)
      return true
    } catch (error) {
      console.error("Failed to initialize wallet pool:", error)
      
      // Fallback: create random wallets
      console.log("Falling back to random wallet generation...")
      for (let i = 0; i < this.poolSize; i++) {
        const wallet = ethers.Wallet.createRandom()
        this.walletPool.push({
          address: wallet.address,
          privateKey: wallet.privateKey,
          index: i,
          available: true,
          createdAt: new Date()
        })
      }
      
      this.initialized = true
      console.log(`Fallback wallet pool created with ${this.walletPool.length} random wallets`)
      return true
    }
  }

  getAvailableWallet() {
    const availableWallet = this.walletPool.find(w => w.available)
    if (!availableWallet) {
      throw new Error("No available wallets in pool")
    }
    
    availableWallet.available = false
    availableWallet.assignedAt = new Date()
    
    this.activeWallets.set(availableWallet.address, availableWallet)
    
    return {
      address: availableWallet.address,
      privateKey: availableWallet.privateKey
    }
  }

  assignWallet(touristId = 0, tripEnd) {
    const availableWallet = this.walletPool.find(w => w.available)
    if (!availableWallet) {
      throw new Error("No available wallets in pool")
    }
    
    availableWallet.available = false
    availableWallet.assignedAt = new Date()
    availableWallet.expiresAt = tripEnd ? new Date(tripEnd) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    availableWallet.touristId = touristId
    
    this.activeWallets.set(availableWallet.address, availableWallet)
    
    return {
      address: availableWallet.address,
      privateKey: availableWallet.privateKey,
      index: availableWallet.index,
      assignedAt: availableWallet.assignedAt,
      expiresAt: availableWallet.expiresAt
    }
  }

  releaseWallet(address) {
    const wallet = this.walletPool.find(w => w.address === address)
    if (wallet) {
      wallet.available = true
      wallet.assignedAt = null
      wallet.expiresAt = null
      wallet.touristId = null
      this.activeWallets.delete(address)
      return true
    }
    return false
  }

  getWalletInfo(address) {
    return this.walletPool.find(w => w.address === address)
  }

  getPoolStats() {
    const available = this.walletPool.filter(w => w.available).length
    const active = this.walletPool.length - available
    
    return {
      total: this.walletPool.length,
      available,
      active,
      assigned: active,
      utilization: ((active / this.walletPool.length) * 100).toFixed(2) + '%',
      initialized: this.initialized
    }
  }

  // Clean up expired wallet assignments
  cleanupExpiredWallets(maxAgeHours = 24) {
    const cutoffTime = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000))
    const now = new Date()
    let cleaned = 0
    
    this.walletPool.forEach(wallet => {
      if (!wallet.available) {
        // Check if wallet has explicit expiration time or fallback to age-based cleanup
        const shouldExpire = wallet.expiresAt ? wallet.expiresAt < now : 
                            wallet.assignedAt && wallet.assignedAt < cutoffTime
        
        if (shouldExpire) {
          wallet.available = true
          wallet.assignedAt = null
          wallet.expiresAt = null
          wallet.touristId = null
          this.activeWallets.delete(wallet.address)
          cleaned++
        }
      }
    })
    
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired wallet assignments`)
    }
    
    return cleaned
  }

  // Check for expired assignments and clean them up (alias for cleanupExpiredWallets)
  checkExpiredAssignments() {
    return this.cleanupExpiredWallets()
  }

  // Get all active wallet assignments
  getActiveAssignments() {
    return Array.from(this.activeWallets.values()).map(wallet => ({
      address: wallet.address,
      index: wallet.index,
      assignedAt: wallet.assignedAt,
      expiresAt: wallet.expiresAt,
      touristId: wallet.touristId
    }))
  }
}

module.exports = WalletPoolService