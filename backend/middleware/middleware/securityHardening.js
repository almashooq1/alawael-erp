/**
 * Advanced Security Hardening Module
 * Implements multiple layers of protection
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

class SecurityHardening {
  /**
   * Initialize security features
   */
  constructor() {
    this.threatlog = [];
    this.suspiciousIPs = new Map();
    this.failedAttempts = new Map();
    this.MAX_FAILED_ATTEMPTS = 5;
    this.LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Sanitize user input
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    const sanitized = input
      .replace(/[<>\"']/g, (char) => {
        const map = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
        return map[char] || char;
      })
      .trim();

    return sanitized;
  }

  /**
   * Validate email format
   */
  validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  /**
   * Validate password strength
   */
  validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*]/.test(password);

    return {
      isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar,
      requirements: {
        minLength: password.length >= minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumbers,
        hasSpecialChar
      }
    };
  }

  /**
   * Log security event
   */
  logSecurityEvent(event, details) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      event,
      details,
      severity: details.severity || 'info'
    };

    this.threatlog.push(logEntry);
    console.log(`🔐 [${event}]`, JSON.stringify(details));

    // Keep log size manageable
    if (this.threatlog.length > 10000) {
      this.threatlog = this.threatlog.slice(-5000);
    }
  }

  /**
   * Rate limiting per IP
   */
  checkRateLimit(ip, limit = 100, window = 60000) {
    if (!this.failedAttempts.has(ip)) {
      this.failedAttempts.set(ip, []);
    }

    const attempts = this.failedAttempts.get(ip);
    const now = Date.now();

    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(time => now - time < window);

    if (recentAttempts.length >= limit) {
      this.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        ip,
        attempts: recentAttempts.length,
        severity: 'warning'
      });
      return false;
    }

    recentAttempts.push(now);
    this.failedAttempts.set(ip, recentAttempts);
    return true;
  }

  /**
   * Track failed login attempts
   */
  trackFailedLogin(username, ip) {
    const key = `${username}:${ip}`;

    if (!this.suspiciousIPs.has(key)) {
      this.suspiciousIPs.set(key, {
        attempts: 0,
        firstAttempt: Date.now(),
        locked: false
      });
    }

    const data = this.suspiciousIPs.get(key);
    data.attempts++;

    this.logSecurityEvent('FAILED_LOGIN', {
      username,
      ip,
      attempts: data.attempts,
      severity: data.attempts >= this.MAX_FAILED_ATTEMPTS ? 'critical' : 'warning'
    });

    if (data.attempts >= this.MAX_FAILED_ATTEMPTS) {
      data.locked = true;
      data.lockedUntil = Date.now() + this.LOCKOUT_TIME;
    }

    return data.locked;
  }

  /**
   * Check if login is locked out
   */
  isLockedOut(username, ip) {
    const key = `${username}:${ip}`;
    const data = this.suspiciousIPs.get(key);

    if (!data) return false;
    if (!data.locked) return false;

    const now = Date.now();
    if (now > data.lockedUntil) {
      // Unlock after timeout
      data.locked = false;
      data.attempts = 0;
      return false;
    }

    return true;
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash sensitive data
   */
  hashData(data, algorithm = 'sha256') {
    return crypto
      .createHash(algorithm)
      .update(data)
      .digest('hex');
  }

  /**
   * Encrypt sensitive field
   */
  encryptField(data, encryptionKey) {
    try {
      const algorithm = 'aes-256-cbc';
      const key = Buffer.from(encryptionKey, 'base64');
      const iv = crypto.randomBytes(16);

      const cipher = crypto.createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Return iv + encrypted data (needed for decryption)
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      return null;
    }
  }

  /**
   * Decrypt sensitive field
   */
  decryptField(encryptedData, encryptionKey) {
    try {
      const algorithm = 'aes-256-cbc';
      const key = Buffer.from(encryptionKey, 'base64');
      const [ivHex, encrypted] = encryptedData.split(':');
      const iv = Buffer.from(ivHex, 'hex');

      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  }

  /**
   * Validate JWT token
   */
  validateToken(token, secret) {
    try {
      const decoded = jwt.verify(token, secret);
      return { valid: true, decoded };
    } catch (error) {
      this.logSecurityEvent('INVALID_TOKEN', {
        error: error.message,
        severity: 'warning'
      });
      return { valid: false, error: error.message };
    }
  }

  /**
   * Get security report
   */
  getSecurityReport() {
    return {
      totalEvents: this.threatlog.length,
      recentEvents: this.threatlog.slice(-50),
      activeThreats: Array.from(this.suspiciousIPs.entries()).filter(([_, data]) => data.locked),
      summary: {
        criticalEvents: this.threatlog.filter(e => e.severity === 'critical').length,
        warningEvents: this.threatlog.filter(e => e.severity === 'warning').length,
        infoEvents: this.threatlog.filter(e => e.severity === 'info').length
      }
    };
  }

  /**
   * Security middleware for Express
   */
  securityMiddleware() {
    return (req, res, next) => {
      // Add security headers
      res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
      });

      // Rate limiting
      const clientIP = req.ip || req.connection.remoteAddress;
      if (!this.checkRateLimit(clientIP)) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests. Please try again later.'
        });
      }

      next();
    };
  }
}

module.exports = new SecurityHardening();
