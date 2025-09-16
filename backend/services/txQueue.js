class TXQueueService {
  constructor(options = {}) {
    this.queue = []
    this.processing = false
    this.maxRetries = Number(process.env.TX_MAX_RETRIES || 3)
    this.retryDelay = Number(process.env.TX_RETRY_DELAY_MS || 2000)
    this.processingInterval = Number(process.env.TX_PROCESSING_INTERVAL_MS || 1000)
    this.blockchainService = null
    this.workerInterval = null
    this.stats = {
      processed: 0,
      failed: 0,
      pending: 0,
      retries: 0
    }
  }

  async initialize(blockchainService) {
    this.blockchainService = blockchainService
    console.log("Transaction queue service initialized")
    return true
  }

  // Add a transaction to the queue
  addTransaction(txData) {
    const transaction = {
      id: this.generateTxId(),
      data: txData,
      attempts: 0,
      status: 'pending',
      createdAt: new Date(),
      lastAttempt: null,
      error: null
    }
    
    this.queue.push(transaction)
    this.stats.pending++
    
    console.log(`Added transaction ${transaction.id} to queue. Queue size: ${this.queue.length}`)
    return transaction.id
  }

  // Enqueue a job (alias for addTransaction for server compatibility)
  enqueueJob(touristId, walletIndex, txType, payload) {
    const txData = {
      type: txType,
      touristId,
      walletIndex,
      payload,
      evidenceHash: require('crypto').createHash('sha256').update(JSON.stringify(payload)).digest('hex')
    }
    return this.addTransaction(txData)
  }

  // Start the worker that processes transactions
  startWorker() {
    if (this.workerInterval) {
      console.log("Transaction worker is already running")
      return
    }

    console.log("Starting transaction queue worker...")
    this.workerInterval = setInterval(async () => {
      await this.processQueue()
    }, this.processingInterval)
  }

  // Stop the worker
  stopWorker() {
    if (this.workerInterval) {
      clearInterval(this.workerInterval)
      this.workerInterval = null
      console.log("Transaction queue worker stopped")
    }
  }

  // Process pending transactions in the queue
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true
    const pendingTxs = this.queue.filter(tx => tx.status === 'pending')
    
    if (pendingTxs.length === 0) {
      this.processing = false
      return
    }

    console.log(`Processing ${pendingTxs.length} pending transactions...`)

    for (const tx of pendingTxs.slice(0, 5)) { // Process up to 5 at a time
      await this.processTransaction(tx)
    }

    this.processing = false
  }

  // Process a single transaction
  async processTransaction(tx) {
    tx.attempts++
    tx.lastAttempt = new Date()
    tx.status = 'processing'

    try {
      if (!this.blockchainService) {
        throw new Error("Blockchain service not available")
      }

      // Process different transaction types
      let result
      switch (tx.data.type) {
        case 'registration':
          // Prefer secure registration using Aadhaar hash when available
          if (typeof tx.data.payload.aadharHash === 'string') {
            result = await this.blockchainService.registerTouristSecure(
              tx.data.payload.aadharHash,
              tx.data.payload.name,
              Math.floor(new Date(tx.data.payload.tripStart).getTime() / 1000),
              Math.floor(new Date(tx.data.payload.tripEnd).getTime() / 1000),
              tx.data.payload.emergencyContact || '[REDACTED]'
            )
          } else {
            result = await this.blockchainService.registerTourist(
              tx.data.payload.name,
              tx.data.payload.aadharOrPassport || '[REDACTED]',
              Math.floor(new Date(tx.data.payload.tripStart).getTime() / 1000),
              Math.floor(new Date(tx.data.payload.tripEnd).getTime() / 1000),
              tx.data.payload.emergencyContact || '[REDACTED]'
            )
          }
          break
          
        case 'register_tourist':
          result = await this.blockchainService.registerTourist(
            tx.data.touristId,
            tx.data.walletAddress,
            tx.data.metadata || ''
          )
          break
        
        case 'update_location':
          result = await this.blockchainService.updateLocation(
            tx.data.touristId,
            tx.data.latitude,
            tx.data.longitude,
            tx.data.timestamp || Math.floor(Date.now() / 1000)
          )
          break
        
        case 'trigger_sos':
          result = await this.blockchainService.triggerSOS(
            tx.data.touristId,
            tx.data.latitude,
            tx.data.longitude,
            tx.data.message || 'Emergency SOS'
          )
          break
        
        case 'release_wallet':
          result = await this.blockchainService.releaseTourist(
            tx.data.touristId
          )
          break
        
        default:
          throw new Error(`Unknown transaction type: ${tx.data.type}`)
      }

      if (result && result.success) {
        tx.status = 'completed'
        tx.result = result
        this.stats.processed++
        this.stats.pending--
        console.log(`Transaction ${tx.id} completed successfully`)
      } else {
        throw new Error(result?.error || 'Transaction failed')
      }
    } catch (error) {
      console.error(`Transaction ${tx.id} failed:`, error.message)
      tx.error = error.message

      if (tx.attempts >= this.maxRetries) {
        tx.status = 'failed'
        this.stats.failed++
        this.stats.pending--
        console.log(`Transaction ${tx.id} failed permanently after ${tx.attempts} attempts`)
      } else {
        tx.status = 'pending'
        this.stats.retries++
        console.log(`Transaction ${tx.id} will be retried (attempt ${tx.attempts}/${this.maxRetries})`)
        
        // Add delay before retry
        setTimeout(() => {
          // Transaction will be picked up in next processing cycle
        }, this.retryDelay)
      }
    }
  }

  // Generate unique transaction ID
  generateTxId() {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Get queue status
  getQueueStatus() {
    const pending = this.queue.filter(tx => tx.status === 'pending').length
    const processing = this.queue.filter(tx => tx.status === 'processing').length
    const completed = this.queue.filter(tx => tx.status === 'completed').length
    const failed = this.queue.filter(tx => tx.status === 'failed').length

    return {
      total: this.queue.length,
      pending,
      processing,
      completed,
      failed,
      stats: this.stats,
      workerRunning: !!this.workerInterval
    }
  }

  // Get transaction details
  getTransaction(txId) {
    return this.queue.find(tx => tx.id === txId)
  }

  // Clean up old completed/failed transactions
  cleanup(maxAgeHours = 24) {
    const cutoffTime = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000))
    const initialLength = this.queue.length
    
    this.queue = this.queue.filter(tx => {
      if ((tx.status === 'completed' || tx.status === 'failed') && tx.createdAt < cutoffTime) {
        return false
      }
      return true
    })
    
    const cleaned = initialLength - this.queue.length
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} old transactions from queue`)
    }
    
    return cleaned
  }

  // Clear all transactions (use with caution)
  clearQueue() {
    const count = this.queue.length
    this.queue = []
    this.stats = {
      processed: 0,
      failed: 0,
      pending: 0,
      retries: 0
    }
    console.log(`Cleared ${count} transactions from queue`)
    return count
  }
}

module.exports = TXQueueService