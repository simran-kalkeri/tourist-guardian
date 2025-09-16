const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret-change-in-production'
const API_KEY = process.env.API_KEY || 'default-api-key-change-in-production'

// JWT Authentication Middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      message: 'Please provide a valid JWT token in Authorization header'
    })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        error: 'Invalid or expired token',
        message: 'Please login again to get a fresh token'
      })
    }

    req.user = user
    next()
  })
}

// API Key Authentication Middleware
const authenticateAPIKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key']

  if (!apiKey) {
    return res.status(401).json({ 
      error: 'API key required',
      message: 'Please provide a valid API key in X-API-KEY header'
    })
  }

  if (apiKey !== API_KEY) {
    return res.status(403).json({ 
      error: 'Invalid API key',
      message: 'The provided API key is not valid'
    })
  }

  req.apiKey = apiKey
  next()
}

// Role-based Authorization Middleware
const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `This action requires one of: ${roles.join(', ')}`
      })
    }

    next()
  }
}

// Generate JWT Token
const generateToken = (user) => {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiry
  }

  return jwt.sign(payload, JWT_SECRET)
}

// Generate Refresh Token
const generateRefreshToken = (user) => {
  const payload = {
    id: user.id,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days expiry
  }

  return jwt.sign(payload, JWT_SECRET)
}

// Verify Refresh Token
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type')
    }
    return decoded
  } catch (error) {
    throw new Error('Invalid refresh token')
  }
}

// Optional Authentication (for public endpoints that can benefit from user context)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) {
        req.user = user
      }
    })
  }

  next()
}

module.exports = {
  authenticateJWT,
  authenticateAPIKey,
  authorizeRole,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  optionalAuth
}







