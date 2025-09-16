const fs = require('fs')
const path = require('path')

// Audit log configuration
const AUDIT_LOG_DIR = process.env.AUDIT_LOG_DIR || './logs'
const AUDIT_LOG_FILE = path.join(AUDIT_LOG_DIR, 'audit.log')

// Ensure audit log directory exists
if (!fs.existsSync(AUDIT_LOG_DIR)) {
  fs.mkdirSync(AUDIT_LOG_DIR, { recursive: true })
}

// Audit log levels
const AUDIT_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
}

// Audit log entry structure
const createAuditEntry = (req, action, details = {}) => {
  return {
    timestamp: new Date().toISOString(),
    level: details.level || AUDIT_LEVELS.INFO,
    action,
    user: req.user ? {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    } : null,
    apiKey: req.apiKey ? 'present' : null,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    method: req.method,
    url: req.originalUrl,
    body: sanitizeRequestBody(req.body),
    query: req.query,
    params: req.params,
    details: details.data || {},
    success: details.success !== false
  }
}

// Sanitize request body to remove sensitive data
const sanitizeRequestBody = (body) => {
  if (!body || typeof body !== 'object') return body

  const sanitized = { ...body }
  const sensitiveFields = ['password', 'privateKey', 'secret', 'token', 'aadharOrPassport']

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]'
    }
  })

  return sanitized
}

// Write audit entry to file
const writeAuditLog = (entry) => {
  try {
    const logLine = JSON.stringify(entry) + '\n'
    fs.appendFileSync(AUDIT_LOG_FILE, logLine)
  } catch (error) {
    console.error('Failed to write audit log:', error)
  }
}

// Audit middleware factory
const createAuditMiddleware = (action, options = {}) => {
  return (req, res, next) => {
    const originalSend = res.send

    res.send = function(data) {
      // Create audit entry
      const auditEntry = createAuditEntry(req, action, {
        level: options.level || AUDIT_LEVELS.INFO,
        success: res.statusCode < 400,
        data: options.data || {}
      })

      // Write to audit log
      writeAuditLog(auditEntry)

      // Call original send
      originalSend.call(this, data)
    }

    next()
  }
}

// Specific audit middlewares for common actions
const auditLogin = createAuditMiddleware('LOGIN', { level: AUDIT_LEVELS.INFO })
const auditLogout = createAuditMiddleware('LOGOUT', { level: AUDIT_LEVELS.INFO })
const auditRegistration = createAuditMiddleware('TOURIST_REGISTRATION', { level: AUDIT_LEVELS.INFO })
const auditSOS = createAuditMiddleware('SOS_TRIGGER', { level: AUDIT_LEVELS.WARN })
const auditWalletRelease = createAuditMiddleware('WALLET_RELEASE', { level: AUDIT_LEVELS.INFO })
const auditDataAccess = createAuditMiddleware('DATA_ACCESS', { level: AUDIT_LEVELS.INFO })
const auditAdminAction = createAuditMiddleware('ADMIN_ACTION', { level: AUDIT_LEVELS.INFO })

// Security event audit middleware
const auditSecurityEvent = (event, details = {}) => {
  return (req, res, next) => {
    const auditEntry = createAuditEntry(req, `SECURITY_${event}`, {
      level: AUDIT_LEVELS.WARN,
      data: details
    })

    writeAuditLog(auditEntry)
    next()
  }
}

// Failed authentication audit
const auditFailedAuth = (req, res, next) => {
  const auditEntry = createAuditEntry(req, 'FAILED_AUTHENTICATION', {
    level: AUDIT_LEVELS.WARN,
    success: false,
    data: {
      reason: 'Invalid credentials or token',
      endpoint: req.originalUrl
    }
  })

  writeAuditLog(auditEntry)
  next()
}

// PII access audit
const auditPIIAccess = (req, res, next) => {
  const auditEntry = createAuditEntry(req, 'PII_ACCESS', {
    level: AUDIT_LEVELS.INFO,
    data: {
      accessedFields: ['aadharOrPassport', 'emergencyContact', 'name'],
      purpose: 'Administrative access'
    }
  })

  writeAuditLog(auditEntry)
  next()
}

// Blockchain transaction audit
const auditBlockchainTx = (txType, txHash, success) => {
  return (req, res, next) => {
    const auditEntry = createAuditEntry(req, `BLOCKCHAIN_${txType.toUpperCase()}`, {
      level: success ? AUDIT_LEVELS.INFO : AUDIT_LEVELS.ERROR,
      success,
      data: {
        txType,
        txHash,
        touristId: req.params.id || req.body.touristId
      }
    })

    writeAuditLog(auditEntry)
    next()
  }
}

// Get audit logs (admin only)
const getAuditLogs = (req, res) => {
  try {
    const { limit = 100, level, action, startDate, endDate } = req.query
    
    let logs = []
    if (fs.existsSync(AUDIT_LOG_FILE)) {
      const logContent = fs.readFileSync(AUDIT_LOG_FILE, 'utf8')
      logs = logContent.split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line))
        .reverse() // Most recent first
    }

    // Apply filters
    if (level) {
      logs = logs.filter(log => log.level === level)
    }
    if (action) {
      logs = logs.filter(log => log.action.includes(action))
    }
    if (startDate) {
      logs = logs.filter(log => new Date(log.timestamp) >= new Date(startDate))
    }
    if (endDate) {
      logs = logs.filter(log => new Date(log.timestamp) <= new Date(endDate))
    }

    // Apply limit
    logs = logs.slice(0, parseInt(limit))

    res.json({
      success: true,
      logs,
      total: logs.length,
      filters: { level, action, startDate, endDate, limit }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit logs',
      message: error.message
    })
  }
}

module.exports = {
  createAuditMiddleware,
  auditLogin,
  auditLogout,
  auditRegistration,
  auditSOS,
  auditWalletRelease,
  auditDataAccess,
  auditAdminAction,
  auditSecurityEvent,
  auditFailedAuth,
  auditPIIAccess,
  auditBlockchainTx,
  getAuditLogs,
  AUDIT_LEVELS
}







