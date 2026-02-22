/**
 * Advanced Security Logging Middleware
 * Logs security events, suspicious activities, and audit trails
 * Integrates with monitoring systems
 */

const fs = require('fs');
const path = require('path');

// Color codes for console output
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Security Event Types
 */
const EVENT_TYPES = {
  // Authentication events
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGIN_LOCKED: 'LOGIN_LOCKED',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_USED: 'PASSWORD_RESET_USED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Authorization events
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  UNAUTHORIZED_ACCESS_ATTEMPT: 'UNAUTHORIZED_ACCESS_ATTEMPT',
  ROLE_CHANGED: 'ROLE_CHANGED',

  // Data access events
  SENSITIVE_DATA_ACCESSED: 'SENSITIVE_DATA_ACCESSED',
  DATA_EXPORTED: 'DATA_EXPORTED',
  BULK_DELETE: 'BULK_DELETE',
  DELETE_ACCOUNT: 'DELETE_ACCOUNT',

  // System events
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_PATTERN_DETECTED: 'SUSPICIOUS_PATTERN_DETECTED',
  SQL_INJECTION_ATTEMPT: 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT: 'XSS_ATTEMPT',
  API_ERROR: 'API_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',

  // Admin events
  USER_CREATED: 'USER_CREATED',
  USER_DELETED: 'USER_DELETED',
  USER_SUSPENDED: 'USER_SUSPENDED',
  CONFIGURATION_CHANGED: 'CONFIGURATION_CHANGED'
};

/**
 * Security event logger
 */
class SecurityLogger {
  constructor(logDir = './logs/security') {
    this.logDir = logDir;
    this.ensureLogDirectory();
    this.eventQueue = [];
    this.maxQueueSize = 1000;
    
    // Start periodic flush to disk
    this.flushInterval = setInterval(() => this.flushToDisk(), 5000);
  }

  /**
   * Ensure log directory exists
   */
  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Log security event
   */
  logEvent(eventType, data = {}) {
    const event = {
      timestamp: new Date().toISOString(),
      eventType,
      userId: data.userId || null,
      username: data.username || null,
      ip: data.ip,
      userAgent: data.userAgent,
      action: data.action,
      resource: data.resource,
      method: data.method,
      statusCode: data.statusCode,
      details: data.details,
      severity: this.getEventSeverity(eventType)
    };

    // Log to console if critical
    if (event.severity === 'CRITICAL') {
      this.logToConsole(event);
      this.triggerAlert(event);
    }

    // Add to queue
    this.eventQueue.push(event);

    // Flush if queue is full
    if (this.eventQueue.length >= this.maxQueueSize) {
      this.flushToDisk();
    }

    return event;
  }

  /**
   * Get event severity level
   */
  getEventSeverity(eventType) {
    const severityMap = {
      // Critical
      LOGIN_LOCKED: 'CRITICAL',
      UNAUTHORIZED_ACCESS_ATTEMPT: 'CRITICAL',
      SQL_INJECTION_ATTEMPT: 'CRITICAL',
      XSS_ATTEMPT: 'CRITICAL',
      DELETE_ACCOUNT: 'CRITICAL',

      // High
      LOGIN_FAILED: 'HIGH',
      PERMISSION_DENIED: 'HIGH',
      RATE_LIMIT_EXCEEDED: 'HIGH',
      SUSPICIOUS_PATTERN_DETECTED: 'HIGH',

      // Medium
      LOGOUT: 'MEDIUM',
      PASSWORD_CHANGED: 'MEDIUM',
      PASSWORD_RESET_REQUESTED: 'MEDIUM',
      ROLE_CHANGED: 'MEDIUM',

      // Low
      LOGIN_SUCCESS: 'LOW',
      SENSITIVE_DATA_ACCESSED: 'LOW',
      API_ERROR: 'LOW'
    };

    return severityMap[eventType] || 'MEDIUM';
  }

  /**
   * Log to console with colors
   */
  logToConsole(event) {
    const severityColors = {
      CRITICAL: COLORS.red,
      HIGH: COLORS.red,
      MEDIUM: COLORS.yellow,
      LOW: COLORS.blue
    };

    const color = severityColors[event.severity] || COLORS.reset;
    
    console.log(
      `${color}[SECURITY] ${event.severity} - ${event.eventType}${COLORS.reset}`
    );
    console.log(`  User: ${event.username || event.userId} | IP: ${event.ip}`);
    console.log(`  Action: ${event.action} on ${event.resource}`);
    console.log(`  Details: ${JSON.stringify(event.details)}`);
  }

  /**
   * Flush queued events to disk
   */
  flushToDisk() {
    if (this.eventQueue.length === 0) return;

    const date = new Date().toISOString().split('T')[0];
    const filename = path.join(this.logDir, `security-${date}.log`);

    const logData = this.eventQueue.map(event => 
      JSON.stringify(event)
    ).join('\n') + '\n';

    fs.appendFileSync(filename, logData, 'utf8');
    console.log(`${COLORS.green}[LOG] Flushed ${this.eventQueue.length} events to disk${COLORS.reset}`);

    this.eventQueue = [];
  }

  /**
   * Trigger alert for critical events
   */
  triggerAlert(event) {
    // Implementation depends on your monitoring system
    // Could send to Slack, PagerDuty, Sentry, etc.
    
    if (event.severity === 'CRITICAL') {
      // Example: Send to monitoring service
      console.log(`${COLORS.red}🚨 CRITICAL SECURITY EVENT - ALERT${COLORS.reset}`);
      
      // TODO: Implement your alert integration
      // this.sendSlackAlert(event);
      // this.sendEmailAlert(event);
      // this.sendToSIEM(event);
    }
  }

  /**
   * Query events by filter
   */
  queryEvents(filter = {}, limit = 100) {
    const results = [];
    
    // Read all log files in directory
    const files = fs.readdirSync(this.logDir).filter(f => f.startsWith('security-'));
    
    for (const file of files) {
      const content = fs.readFileSync(path.join(this.logDir, file), 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      
      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          
          // Apply filters
          if (this.matchesFilter(event, filter)) {
            results.push(event);
            if (results.length >= limit) {
              return results;
            }
          }
        } catch (e) {
          // Skip malformed lines
        }
      }
    }
    
    return results;
  }

  /**
   * Check if event matches filter criteria
   */
  matchesFilter(event, filter) {
    if (filter.eventType && event.eventType !== filter.eventType) return false;
    if (filter.severity && event.severity !== filter.severity) return false;
    if (filter.userId && event.userId !== filter.userId) return false;
    if (filter.ip && event.ip !== filter.ip) return false;
    if (filter.startDate && new Date(event.timestamp) < new Date(filter.startDate)) return false;
    if (filter.endDate && new Date(event.timestamp) > new Date(filter.endDate)) return false;
    return true;
  }

  /**
   * Get security statistics
   */
  getStatistics(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const events = this.queryEvents({ startDate }, 10000);
    
    const stats = {
      totalEvents: events.length,
      eventsByType: {},
      eventsBySeverity: {},
      eventsByUser: {},
      eventsByIP: {},
      averageEventsPerDay: events.length / days
    };

    for (const event of events) {
      // Count by type
      stats.eventsByType[event.eventType] = (stats.eventsByType[event.eventType] || 0) + 1;
      
      // Count by severity
      stats.eventsBySeverity[event.severity] = (stats.eventsBySeverity[event.severity] || 0) + 1;
      
      // Count by user
      const user = event.username || event.userId || 'unknown';
      stats.eventsByUser[user] = (stats.eventsByUser[user] || 0) + 1;
      
      // Count by IP
      const ip = event.ip || 'unknown';
      stats.eventsByIP[ip] = (stats.eventsByIP[ip] || 0) + 1;
    }

    return stats;
  }

  /**
   * Cleanup old logs (older than days)
   */
  cleanupOldLogs(days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const files = fs.readdirSync(this.logDir);
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(this.logDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }

    console.log(`${COLORS.green}Deleted ${deletedCount} old security logs${COLORS.reset}`);
  }

  /**
   * Destroy logger (flush and stop interval)
   */
  destroy() {
    this.flushToDisk();
    clearInterval(this.flushInterval);
  }
}

// Create global logger instance
const logger = new SecurityLogger();

/**
 * Express middleware for security logging
 */
const securityLoggingMiddleware = (req, res, next) => {
  // Capture original send function
  const originalSend = res.send;

  // Wrap send to capture response
  res.send = function(data) {
    // Log security-relevant requests
    if (isSecurityRelevantRequest(req)) {
      logger.logEvent('API_REQUEST', {
        userId: req.user?.id,
        username: req.user?.username,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        method: req.method,
        resource: req.path,
        action: `${req.method} ${req.path}`,
        statusCode: res.statusCode,
        details: {
          query: req.query,
          body: req.method !== 'GET' ? req.body : undefined
        }
      });
    }

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Determine if request is security-relevant
 */
const isSecurityRelevantRequest = (req) => {
  const sensitiveRoutes = [
    '/auth',
    '/admin',
    '/users',
    '/roles',
    '/permissions',
    '/export'
  ];

  return sensitiveRoutes.some(route => req.path.includes(route));
};

/**
 * Middleware to log authentication attempts
 */
const logAuthAttempt = (success, userId, username, ip) => {
  logger.logEvent(
    success ? EVENT_TYPES.LOGIN_SUCCESS : EVENT_TYPES.LOGIN_FAILED,
    {
      userId,
      username,
      ip,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      details: {
        attempt: success ? 'successful' : 'failed'
      }
    }
  );
};

/**
 * Middleware to log permission denials
 */
const logPermissionDenied = (userId, username, ip, action, resource, reason) => {
  logger.logEvent(EVENT_TYPES.PERMISSION_DENIED, {
    userId,
    username,
    ip,
    action,
    resource,
    details: {
      reason
    }
  });
};

/**
 * Middleware to detect and log suspicious patterns
 */
const detectSuspiciousActivity = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  
  // Track requests per IP
  if (!global.requestTracker) {
    global.requestTracker = {};
  }

  if (!global.requestTracker[ip]) {
    global.requestTracker[ip] = [];
  }

  const now = Date.now();
  global.requestTracker[ip] = global.requestTracker[ip].filter(t => now - t < 60000); // 1 minute window
  global.requestTracker[ip].push(now);

  // Log if too many requests (rate limiting already enforces this, but log here too)
  if (global.requestTracker[ip].length > 100) {
    logger.logEvent(EVENT_TYPES.SUSPICIOUS_PATTERN_DETECTED, {
      ip,
      action: 'Unusual request frequency',
      details: {
        requestsPerMinute: global.requestTracker[ip].length
      }
    });
  }

  next();
};

module.exports = {
  // Logger class and instance
  SecurityLogger,
  logger,

  // Event types
  EVENT_TYPES,

  // Middleware
  securityLoggingMiddleware,
  detectSuspiciousActivity,

  // Helper functions
  logAuthAttempt,
  logPermissionDenied
};
