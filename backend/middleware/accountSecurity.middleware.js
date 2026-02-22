/**
 * Advanced Account Security Middleware
 * Implements account lockout, session management, and device tracking
 */

const crypto = require('crypto');

/**
 * Account Security Manager
 */
class AccountSecurityManager {
  constructor() {
    // In-memory storage (replace with Redis for production)
    this.loginAttempts = new Map();
    this.sessionsPerDevice = new Map();
    this.suspiciousLoginAttempts = new Map();
    
    // Configuration
    this.config = {
      maxLoginAttempts: 5,
      lockoutDurationMinutes: 15,
      sessionTimeoutMinutes: 30,
      maxSessionsPerUser: 3,
      passwordChangeIntervalDays: 90,
      suspiciousLoginWindow: 10 // failed attempts in minutes
    };
  }

  /**
   * Check if account is locked
   */
  isAccountLocked(userId) {
    const key = `lock_${userId}`;
    const lockData = this.loginAttempts.get(key);
    
    if (!lockData) return false;
    
    const elapsedMinutes = (Date.now() - lockData.lockedAt) / 60000;
    
    if (elapsedMinutes > this.config.lockoutDurationMinutes) {
      // Unlock account
      this.loginAttempts.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Get remaining lockout time in seconds
   */
  getRemainingLockoutTime(userId) {
    const key = `lock_${userId}`;
    const lockData = this.loginAttempts.get(key);
    
    if (!lockData) return 0;
    
    const elapsedMs = Date.now() - lockData.lockedAt;
    const remainingMs = (this.config.lockoutDurationMinutes * 60 * 1000) - elapsedMs;
    
    return Math.max(0, Math.ceil(remainingMs / 1000));
  }

  /**
   * Record failed login attempt
   */
  recordFailedLogin(userId, ip, userAgent) {
    const key = `attempts_${userId}`;
    let attempts = this.loginAttempts.get(key) || {
      count: 0,
      attempts: [],
      lastAttempt: null
    };

    attempts.count++;
    attempts.attempts.push({
      timestamp: Date.now(),
      ip,
      userAgent
    });
    attempts.lastAttempt = Date.now();

    // Keep only last 10 attempts
    attempts.attempts = attempts.attempts.slice(-10);

    // Lock account if max attempts reached
    if (attempts.count >= this.config.maxLoginAttempts) {
      this.lockAccount(userId, ip);
      this.flagSuspiciousActivity(userId, ip, `Multiple failed login attempts (${attempts.count})`);
    }

    this.loginAttempts.set(key, attempts);
    
    return {
      attemptNumber: attempts.count,
      remainingAttempts: Math.max(0, this.config.maxLoginAttempts - attempts.count),
      willLock: attempts.count >= this.config.maxLoginAttempts
    };
  }

  /**
   * Record successful login
   */
  recordSuccessfulLogin(userId, ip, userAgent, deviceId) {
    // Clear failed login attempts
    this.loginAttempts.delete(`attempts_${userId}`);
    
    // Register device session
    return this.registerSession(userId, ip, userAgent, deviceId);
  }

  /**
   * Lock account temporarily
   */
  lockAccount(userId, ip) {
    const key = `lock_${userId}`;
    this.loginAttempts.set(key, {
      lockedAt: Date.now(),
      ip,
      reason: 'Multiple failed login attempts'
    });
  }

  /**
   * Unlock account (admin only)
   */
  unlockAccount(userId) {
    this.loginAttempts.delete(`lock_${userId}`);
    this.loginAttempts.delete(`attempts_${userId}`);
  }

  /**
   * Register user session
   */
  registerSession(userId, ip, userAgent, deviceId) {
    const sessionKey = `session_${userId}`;
    const sessions = this.sessionsPerDevice.get(sessionKey) || [];

    // Create new session
    const sessionId = crypto.randomBytes(32).toString('hex');
    const session = {
      sessionId,
      deviceId,
      ip,
      userAgent,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      isActive: true
    };

    sessions.push(session);

    // Check max sessions per user
    if (sessions.length > this.config.maxSessionsPerUser) {
      // Remove oldest session
      const oldestSession = sessions.shift();
      console.log(`Session limit reached for user ${userId}, removing oldest session`);
    }

    this.sessionsPerDevice.set(sessionKey, sessions);

    return {
      sessionId,
      sessionCount: sessions.length,
      warning: sessions.length > this.config.maxSessionsPerUser ? 'Session limit reached' : null
    };
  }

  /**
   * Verify session is active and valid
   */
  verifySession(userId, sessionId) {
    const sessionKey = `session_${userId}`;
    const sessions = this.sessionsPerDevice.get(sessionKey) || [];

    const session = sessions.find(s => s.sessionId === sessionId);
    
    if (!session) {
      return { valid: false, reason: 'Session not found' };
    }

    if (!session.isActive) {
      return { valid: false, reason: 'Session inactive' };
    }

    // Check session timeout
    const ageMinutes = (Date.now() - session.lastActivityAt) / 60000;
    if (ageMinutes > this.config.sessionTimeoutMinutes) {
      session.isActive = false;
      return { valid: false, reason: 'Session expired' };
    }

    // Update last activity
    session.lastActivityAt = Date.now();

    return {
      valid: true,
      session
    };
  }

  /**
   * Get user sessions
   */
  getUserSessions(userId) {
    const sessionKey = `session_${userId}`;
    const sessions = this.sessionsPerDevice.get(sessionKey) || [];

    return sessions.map(s => ({
      sessionId: s.sessionId,
      deviceId: s.deviceId,
      ip: s.ip,
      createdAt: new Date(s.createdAt),
      lastActivityAt: new Date(s.lastActivityAt),
      isActive: s.isActive,
      ageMinutes: Math.round((Date.now() - s.createdAt) / 60000)
    }));
  }

  /**
   * Terminate session
   */
  terminateSession(userId, sessionId) {
    const sessionKey = `session_${userId}`;
    const sessions = this.sessionsPerDevice.get(sessionKey) || [];

    const session = sessions.find(s => s.sessionId === sessionId);
    if (session) {
      session.isActive = false;
      return { success: true };
    }

    return { success: false, reason: 'Session not found' };
  }

  /**
   * Terminate all sessions for user (logout all devices)
   */
  terminateAllSessions(userId) {
    const sessionKey = `session_${userId}`;
    const sessions = this.sessionsPerDevice.get(sessionKey) || [];

    sessions.forEach(s => {
      s.isActive = false;
    });

    return { terminatedCount: sessions.length };
  }

  /**
   * Flag suspicious activity
   */
  flagSuspiciousActivity(userId, ip, reason) {
    const key = `suspicious_${userId}`;
    let activity = this.suspiciousLoginAttempts.get(key) || {
      alerts: []
    };

    activity.alerts.push({
      timestamp: Date.now(),
      ip,
      reason
    });

    // Keep only last 30 days of alerts
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    activity.alerts = activity.alerts.filter(a => a.timestamp > thirtyDaysAgo);

    this.suspiciousLoginAttempts.set(key, activity);

    // Alert if multiple suspicious activities in short time
    const recentAlerts = activity.alerts.filter(
      a => a.timestamp > Date.now() - (this.config.suspiciousLoginWindow * 60 * 1000)
    );

    return {
      flagged: true,
      alertCount: recentAlerts.length,
      requiresInvestigation: recentAlerts.length > 2
    };
  }

  /**
   * Get security report for user
   */
  getSecurityReport(userId) {
    return {
      accountStatus: {
        isLocked: this.isAccountLocked(userId),
        lockoutTimeRemaining: this.getRemainingLockoutTime(userId),
        failedLoginAttempts: this.loginAttempts.get(`attempts_${userId}`)?.count || 0
      },
      sessions: this.getUserSessions(userId),
      suspiciousActivity: this.suspiciousLoginAttempts.get(`suspicious_${userId}`) || { alerts: [] },
      recommendations: this.getSecurityRecommendations(userId)
    };
  }

  /**
   * Get security recommendations
   */
  getSecurityRecommendations(userId) {
    const recommendations = [];
    const sessions = this.getUserSessions(userId);

    if (sessions.length > this.config.maxSessionsPerUser) {
      recommendations.push('Consider logging out unused sessions');
    }

    if (sessions.length === 0) {
      recommendations.push('Enable 2FA for added security');
    }

    const suspiciousActivity = this.suspiciousLoginAttempts.get(`suspicious_${userId}`);
    if (suspiciousActivity && suspiciousActivity.alerts.length > 0) {
      recommendations.push('Review recent suspicious login attempts');
    }

    return recommendations;
  }

  /**
   * Clean up old data
   */
  cleanup() {
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

    // Clean old suspicious activity records
    for (const [key, value] of this.suspiciousLoginAttempts.entries()) {
      value.alerts = value.alerts.filter(a => a.timestamp > thirtyDaysAgo);
      if (value.alerts.length === 0) {
        this.suspiciousLoginAttempts.delete(key);
      }
    }

    // Clean inactive sessions older than 90 days
    for (const [key, sessions] of this.sessionsPerDevice.entries()) {
      const filtered = sessions.filter(s => s.createdAt > thirtyDaysAgo);
      if (filtered.length === 0) {
        this.sessionsPerDevice.delete(key);
      } else {
        this.sessionsPerDevice.set(key, filtered);
      }
    }
  }
}

/**
 * Express middleware for account security
 */
const accountSecurityMiddleware = (req, res, next) => {
  // Attach security manager to request
  if (!res.locals.securityManager) {
    res.locals.securityManager = new AccountSecurityManager();
  }

  // Check if account is locked
  if (req.user) {
    const manager = res.locals.securityManager;
    
    if (manager.isAccountLocked(req.user.id)) {
      return res.status(403).json({
        error: 'Account is locked due to too many failed login attempts',
        remainingLockoutSeconds: manager.getRemainingLockoutTime(req.user.id),
        contactSupport: true
      });
    }
  }

  next();
};

/**
 * Middleware to check session validity
 */
const sessionValidationMiddleware = (req, res, next) => {
  if (!req.user || !req.session?.sessionId) {
    return next();
  }

  const manager = res.locals.securityManager || new AccountSecurityManager();
  const validation = manager.verifySession(req.user.id, req.session.sessionId);

  if (!validation.valid) {
    req.session = null;
    return res.status(401).json({
      error: 'Session invalid or expired',
      reason: validation.reason
    });
  }

  next();
};

// Create global instance
const securityManager = new AccountSecurityManager();

// Cleanup interval (every hour)
setInterval(() => {
  securityManager.cleanup();
}, 60 * 60 * 1000);

module.exports = {
  // Manager class and instance
  AccountSecurityManager,
  securityManager,

  // Middleware
  accountSecurityMiddleware,
  sessionValidationMiddleware
};
