class WalletQueueService {
  constructor() {
    this.availableWallets = [
      {
        address: "0x5f2B25F34c18E67D417416112A83116d2750cBDF",
        privateKey: "0xfe6f5790ddc08d50dd09ce0debe3ecb52e5defcb1c47c2a836a6be6a0ceb56a3",
        index: 0
      },
      {
        address: "0x6A79A72ED767378AC4918f95244e69E36ccF47Fd",
        privateKey: "0xde541b7ea5fb15577b937e42d2a369eab139cf9a57ac45e671f4cf093972bd43",
        index: 1
      },
      {
        address: "0x4C00b68B76a1aac10c99172bC3EB706e775C06C3",
        privateKey: "0x52236ceb8ad02d002ca2722676cf9bbd239b0fa72346a8c1863716b45126eda5",
        index: 2
      },
      {
        address: "0xFCe8B845505463173fB15614829B493b1f2E829d",
        privateKey: "0x82b0f33b66447ba1533e9ace5c176727b34c17afe1dc3f0db3d6d9d8e075c846",
        index: 3
      },
      {
        address: "0x5Ce886F8A9eFbeC3AA61dBd39e42FD9E86090184",
        privateKey: "0x9a038ba7bc8743a779d9a1e616476b398d1e28a67273ae974b46c12b73c13823",
        index: 4
      },
      {
        address: "0x722F4B0FbF5bb3Dde0d1A9C5c11dc14dD2e055B7",
        privateKey: "0x7d538789f82306f07afbcf2e021ad0f2e8da1e43f8a6cbedd03ae01cebb2250f",
        index: 5
      },
      {
        address: "0x446f2ce74164d200Fe7734648F33bbd850bA1424",
        privateKey: "0x0ed06956d133e122f0c6826ae861eed0765144d286edfd443c955d89d3480343",
        index: 6
      },
      {
        address: "0x2FCdE1d1B7a2f383f3B6AeC006F2dD29083Cd408",
        privateKey: "0xacea6633ec9b83016a5cecb5d3ec144aca48d0248a68294cd801f686e977228e",
        index: 7
      },
      {
        address: "0x2E64368C83080217C08aE4e3069311828Da331bc",
        privateKey: "0xde10838e95a1ca52f0d8779effd3cd57cde9eda16363284cc23492c3b464e130",
        index: 8
      },
      {
        address: "0xDF3525B8e5b0B94CCeB4f00FC9c23D52553D42a4",
        privateKey: "0xfb0a2e5187fab0c558871264631c1e24ac39c85f2e2c51237cf787b558c5a05a",
        index: 9
      }
    ]
    
    this.assignedWallets = new Map() // Map of walletAddress -> { touristId, assignedAt, expiresAt }
    this.queue = [...this.availableWallets] // Copy of available wallets
  }

  // Get next available wallet
  getNextWallet() {
    if (this.queue.length === 0) {
      throw new Error("No available wallets in queue")
    }
    
    const wallet = this.queue.shift() // Remove from queue
    return wallet
  }

  // Assign wallet to tourist
  assignWallet(touristId, tripEndDate) {
    const wallet = this.getNextWallet()
    const expiresAt = new Date(tripEndDate)
    
    this.assignedWallets.set(wallet.address, {
      touristId,
      assignedAt: new Date(),
      expiresAt,
      wallet
    })
    
    console.log(`Assigned wallet ${wallet.address} to tourist ${touristId}`)
    return wallet
  }

  // Release wallet back to queue
  releaseWallet(walletAddress) {
    const assignment = this.assignedWallets.get(walletAddress)
    if (assignment) {
      this.assignedWallets.delete(walletAddress)
      this.queue.push(assignment.wallet) // Add back to queue
      console.log(`Released wallet ${walletAddress} back to queue`)
      return true
    }
    return false
  }

  // Check for expired assignments and release them
  checkExpiredAssignments() {
    const now = new Date()
    const expiredWallets = []
    
    for (const [walletAddress, assignment] of this.assignedWallets) {
      if (now > assignment.expiresAt) {
        expiredWallets.push(walletAddress)
      }
    }
    
    expiredWallets.forEach(walletAddress => {
      this.releaseWallet(walletAddress)
    })
    
    return expiredWallets.length
  }

  // Get queue status
  getQueueStatus() {
    return {
      available: this.queue.length,
      assigned: this.assignedWallets.size,
      total: this.availableWallets.length,
      assignedWallets: Array.from(this.assignedWallets.entries()).map(([address, data]) => ({
        address,
        touristId: data.touristId,
        assignedAt: data.assignedAt,
        expiresAt: data.expiresAt
      }))
    }
  }

  // Get wallet by address
  getWalletByAddress(address) {
    return this.assignedWallets.get(address)
  }

  // Get wallet by tourist ID
  getWalletByTouristId(touristId) {
    for (const [address, assignment] of this.assignedWallets) {
      if (assignment.touristId === touristId) {
        return { address, ...assignment }
      }
    }
    return null
  }
}

module.exports = WalletQueueService

