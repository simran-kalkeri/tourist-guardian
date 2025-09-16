class WebSocketService {
  constructor() {
    this.socket = null
    this.listeners = new Map()
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectInterval = 3000
  }

  connect() {
    try {
      const apiBase = process.env.REACT_APP_API_BASE_URL
      let wsUrl
      if (apiBase) {
        try {
          const u = new URL(apiBase)
          wsUrl = `${u.protocol === 'https:' ? 'wss:' : 'ws:'}//${u.host}/ws`
        } catch {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
          wsUrl = `${protocol}//${window.location.hostname}:5000/ws`
        }
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        wsUrl = `${protocol}//${window.location.hostname}:5000/ws`
      }
      
      this.socket = new WebSocket(wsUrl)
      
      this.socket.onopen = () => {
        console.log('WebSocket connected')
        this.reconnectAttempts = 0
        this.emit('connected')
      }

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.emit('message', data)
          
          // Emit specific event types
          if (data.type) {
            this.emit(data.type, data)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      this.socket.onclose = () => {
        console.log('WebSocket disconnected')
        this.emit('disconnected')
        this.handleReconnect()
      }

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.emit('error', error)
      }
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
      this.handleReconnect()
    }
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      
      setTimeout(() => {
        this.connect()
      }, this.reconnectInterval)
    } else {
      console.error('Max reconnection attempts reached')
      this.emit('reconnect_failed')
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }

  send(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data))
    } else {
      console.warn('WebSocket is not connected')
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('Error in WebSocket listener:', error)
        }
      })
    }
  }

  isConnected() {
    return this.socket && this.socket.readyState === WebSocket.OPEN
  }
}

// Create singleton instance
const websocketService = new WebSocketService()

export default websocketService
