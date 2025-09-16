const { ethers } = require("ethers")

class WalletQueueService {
  constructor(options = {}) {
    this.mnemonic = process.env.GANACHE_MNEMONIC ||
      "myth like bonus scare over problem client lizard pioneer submit female collect"
    this.numWallets = Number(process.env.WALLET_POOL_SIZE || 10)
    this.hdPath = process.env.WALLET_DERIVATION_PATH || "m/44'/60'/0'/0"
    this.available = []
    this.assignedWallets = new Map() // address -> { address, privateKey, assignedAt, expiresAt, touristId }
    this._initializePool()
  }

  _initializePool() {
    try {
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
      
      const keysToUse = Math.min(this.numWallets, ganachePrivateKeys.length)
      
      for (let i = 0; i < keysToUse; i++) {
        const wallet = new ethers.Wallet(ganachePrivateKeys[i])
        this.available.push({ address: wallet.address, privateKey: wallet.privateKey })
      }
      
      // If we need more wallets than predefined keys, create random ones
      for (let i = keysToUse; i < this.numWallets; i++) {
        const wallet = ethers.Wallet.createRandom()
        this.available.push({ address: wallet.address, privateKey: wallet.privateKey })
      }
    } catch (e) {
      // Fallback: generate random wallets (not funded; blockchain ops may fail)
      for (let i = 0; i < this.numWallets; i++) {
        const w = ethers.Wallet.createRandom()
        this.available.push({ address: w.address, privateKey: w.privateKey })
      }
    }
  }

  assignWallet(touristId = 0, tripEnd) {
    const wallet = this.available.shift()
    if (!wallet) throw new Error("No wallets available")
    const expiresAt = tripEnd ? new Date(tripEnd) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    this.assignedWallets.set(wallet.address, {
      ...wallet,
      assignedAt: new Date(),
      expiresAt,
      touristId,
    })
    return wallet
  }

  releaseWallet(address) {
    const entry = this.assignedWallets.get(address)
    if (!entry) return false
    this.assignedWallets.delete(address)
    this.available.push({ address: entry.address, privateKey: entry.privateKey })
    return true
  }

  checkExpiredAssignments() {
    const now = new Date()
    let released = 0
    for (const [address, entry] of Array.from(this.assignedWallets.entries())) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.releaseWallet(address)
        released += 1
      }
    }
    return released
  }

  getQueueStatus() {
    return {
      available: this.available.length,
      assigned: this.assignedWallets.size,
      total: this.available.length + this.assignedWallets.size,
      assignedWallets: Array.from(this.assignedWallets.values()).map((w) => ({
        address: w.address,
        touristId: w.touristId,
        assignedAt: w.assignedAt,
        expiresAt: w.expiresAt,
      })),
    }
  }
}

module.exports = WalletQueueService




