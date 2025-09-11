const { ethers } = require("ethers")

class WalletQueueService {
  constructor(options = {}) {
    this.mnemonic = process.env.GANACHE_MNEMONIC ||
      "bonus predict custom timber never advice casual glove predict hand burger away"
    this.numWallets = Number(process.env.WALLET_POOL_SIZE || 10)
    this.hdPath = process.env.WALLET_DERIVATION_PATH || "m/44'/60'/0'/0/"
    this.available = []
    this.assignedWallets = new Map() // address -> { address, privateKey, assignedAt, expiresAt, touristId }
    this._initializePool()
  }

  _initializePool() {
    try {
      const hd = ethers.Mnemonic.fromPhrase(this.mnemonic)
      const root = ethers.HDNodeWallet.fromMnemonic(hd)
      for (let i = 0; i < this.numWallets; i++) {
        const child = root.derivePath(this.hdPath + i)
        const wallet = new ethers.Wallet(child.privateKey)
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




