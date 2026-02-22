/**
 * OWASP Top 10 Compliance - التوافق مع أواسب
 * Professional Security Hardening for Alawael ERP
 */

const helmet = require('helmet');
const crypto = require('crypto');
const { URL } = require('url');

/**
 * OWASP Top 10 (2021) Compliance Module
 * 
 * A01:2021 – Broken Access Control
 * A02:2021 – Cryptographic Failures
 * A03:2021 – Injection
 * A04:2021 – Insecure Design
 * A05:2021 – Security Misconfiguration
 * A06:2021 – Vulnerable and Outdated Components
 * A07:2021 – Identification and Authentication Failures
 * A08:2021 – Software and Data Integrity Failures
 * A09:2021 – Security Logging and Monitoring Failures
 * A10:2021 – Server-Side Request Forgery (SSRF)
 */

// ==================== A01: Broken Access Control ====================

/**
 * Access Control Middleware
 */
const accessControlMiddleware = (options = {}) => {
  const {
    strictMode = true,
    allowPublicRoutes = ['/health', '/metrics', '/api/auth/login', '/api/auth/register'],
  } = options;
  
  return (req, res, next) => {
    // Check if route is public
    const isPublic = allowPublicRoutes.some(route => 
      req.path.startsWith(route) || req.path === route
    );
    
    if (isPublic) {
      return next();
    }
    
    // Check authentication
    if (!req.user && strictMode) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }
    
    // Check authorization
    if (req.user && req.requiredPermission && !req.user.permissions?.includes(req.requiredPermission)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
      });
    }
    
    // Prevent IDOR (Insecure Direct Object References)
    if (req.params.id && req.user) {
      const requestedId = req.params.id;
      const userId = req.user._id?.toString() || req.user.id;
      
      // If accessing user-specific resource, verify ownership
      if (req.route?.path?.includes('users') && requestedId !== userId) {
        if (!req.user.roles?.includes('admin')) {
          return res.status(403).json({
            success: false,
            code: 'ACCESS_DENIED',
            message: 'Cannot access other user resources',
          });
        }
      }
    }
    
    next();
  };
};

/**
 * RBAC (Role-Based Access Control)
 */
const createRBAC = (roles) => {
  const rolePermissions = new Map(Object.entries(roles));
  
  const checkPermission = (requiredPermission) => {
    return (req, res, next) => {
      const userRole = req.user?.role;
      
      if (!userRole) {
        return res.status(401).json({
          success: false,
          code: 'UNAUTHORIZED',
          message: 'No role assigned',
        });
      }
      
      const permissions = rolePermissions.get(userRole) || [];
      
      if (!permissions.includes(requiredPermission) && !permissions.includes('*')) {
        return res.status(403).json({
          success: false,
          code: 'FORBIDDEN',
          message: 'Permission denied',
          required: requiredPermission,
        });
      }
      
      next();
    };
  };
  
  const checkRole = (...allowedRoles) => {
    return (req, res, next) => {
      const userRole = req.user?.role;
      
      if (!userRole || !allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          code: 'FORBIDDEN',
          message: 'Role not authorized',
        });
      }
      
      next();
    };
  };
  
  return { checkPermission, checkRole };
};

// ==================== A02: Cryptographic Failures ====================

/**
 * Encryption Utilities
 */
const encryption = {
  // Algorithm
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 16,
  saltLength: 64,
  tagLength: 16,
  
  /**
   * Generate encryption key from password
   */
  deriveKey(password, salt) {
    return crypto.pbkdf2Sync(
      password,
      salt,
      100000,
      this.keyLength,
      'sha512'
    );
  },
  
  /**
   * Encrypt data
   */
  encrypt(plaintext, password) {
    const salt = crypto.randomBytes(this.saltLength);
    const iv = crypto.randomBytes(this.ivLength);
    const key = this.deriveKey(password, salt);
    
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  },
  
  /**
   * Decrypt data
   */
  decrypt(encryptedData, password) {
    const { encrypted, salt, iv, tag } = encryptedData;
    
    const key = this.deriveKey(
      password,
      Buffer.from(salt, 'hex')
    );
    
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      key,
      Buffer.from(iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  },
  
  /**
   * Hash password
   */
  hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(
      password,
      salt,
      100000,
      64,
      'sha512'
    ).toString('hex');
    
    return `${salt}:${hash}`;
  },
  
  /**
   * Verify password
   */
  verifyPassword(password, storedHash) {
    const [salt, hash] = storedHash.split(':');
    const verifyHash = crypto.pbkdf2Sync(
      password,
      salt,
      100000,
      64,
      'sha512'
    ).toString('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(verifyHash, 'hex')
    );
  },
  
  /**
   * Generate secure random token
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  },
  
  /**
   * Generate API key
   */
  generateApiKey() {
    const prefix = 'alw'; // Alawael prefix
    const random = crypto.randomBytes(24).toString('base64url');
    return `${prefix}_${random}`;
  },
};

// ==================== A03: Injection ====================

/**
 * SQL/NoSQL Injection Protection
 */
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    // Remove dangerous patterns
    return input
      .replace(/\$where/gi, '')
      .replace(/\$regex/gi, '')
      .replace(/\$gt/gi, '')
      .replace(/\$lt/gi, '')
      .replace(/\$ne/gi, '')
      .replace(/\$or/gi, '')
      .replace(/\$and/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (input && typeof input === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      // Skip dangerous keys
      if (key.startsWith('$') || key.includes('.')) {
        continue;
      }
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
};

/**
 * Input Sanitization Middleware
 */
const sanitizationMiddleware = (req, res, next) => {
  req.body = sanitizeInput(req.body);
  req.query = sanitizeInput(req.query);
  req.params = sanitizeInput(req.params);
  next();
};

/**
 * NoSQL Injection Protection Middleware
 */
const noSqlInjectionProtection = (req, res, next) => {
  const checkObject = (obj) => {
    if (!obj || typeof obj !== 'object') return false;
    
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$')) {
        return true;
      }
      if (typeof obj[key] === 'object' && checkObject(obj[key])) {
        return true;
      }
    }
    return false;
  };
  
  if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_INPUT',
      message: 'Invalid input detected',
    });
  }
  
  next();
};

// ==================== A05: Security Misconfiguration ====================

/**
 * Security Headers Configuration
 */
const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: ["'self'", 'https://api.alawael.sa'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  
  // Cross-Origin policies
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-origin' },
  
  // DNS Prefetch
  dnsPrefetchControl: { allow: false },
  
  // Frame protection
  frameguard: { action: 'deny' },
  
  // Hide powered-by header
  hidePoweredBy: true,
  
  // HSTS
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  
  // IE No Open
  ieNoOpen: true,
  
  // No Sniff
  noSniff: true,
  
  // Origin Agent Cluster
  originAgentCluster: true,
  
  // Permissions Policy
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  
  // Referrer Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  
  // XSS Filter
  xssFilter: true,
});

/**
 * CORS Configuration
 */
const corsConfig = {
  origin: (origin, callback) => {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
    
    // Allow requests with no origin (mobile apps, postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Request-ID',
    'X-API-Key',
  ],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400,
};

// ==================== A07: Authentication Failures ====================

/**
 * Password Policy
 */
const passwordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true,
  preventCommonPasswords: true,
  preventUserInfoInPassword: true,
  
  /**
   * Validate password against policy
   */
  validate(password, userInfo = {}) {
    const errors = [];
    
    if (password.length < this.minLength) {
      errors.push(`Password must be at least ${this.minLength} characters`);
    }
    
    if (this.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain uppercase letter');
    }
    
    if (this.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain lowercase letter');
    }
    
    if (this.requireNumbers && !/[0-9]/.test(password)) {
      errors.push('Password must contain number');
    }
    
    if (this.requireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain special character');
    }
    
    // Check if password contains user info
    if (this.preventUserInfoInPassword && userInfo) {
      const lowerPassword = password.toLowerCase();
      const forbidden = [
        userInfo.email?.split('@')[0],
        userInfo.username,
        userInfo.firstName,
        userInfo.lastName,
      ].filter(Boolean);
      
      for (const info of forbidden) {
        if (lowerPassword.includes(info.toLowerCase())) {
          errors.push('Password cannot contain personal information');
          break;
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  },
  
  /**
   * Check common passwords
   */
  commonPasswords: new Set([
    'password123', '123456789', 'qwerty123', 'Password1!',
    'admin123', 'letmein', 'welcome', 'monkey123',
  ]),
  
  isCommon(password) {
    return this.commonPasswords.has(password.toLowerCase());
  },
};

/**
 * Session Management
 */
const sessionConfig = {
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  maxConcurrentSessions: 5,
  cookieName: 'alawael_session',
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'strict',
  
  /**
   * Generate session ID
   */
  generateSessionId() {
    return crypto.randomBytes(32).toString('base64url');
  },
};

/**
 * Account Lockout Configuration
 */
const lockoutConfig = {
  maxAttempts: 5,
  lockoutDuration: 30 * 60 * 1000, // 30 minutes
  resetAfter: 60 * 60 * 1000, // 1 hour
};

/**
 * Account Lockout Manager
 */
class AccountLockout {
  constructor() {
    this.attempts = new Map();
  }
  
  /**
   * Record failed attempt
   */
  recordFailure(identifier) {
    const now = Date.now();
    const record = this.attempts.get(identifier) || {
      count: 0,
      firstAttempt: now,
      lockedUntil: null,
    };
    
    // Reset if outside window
    if (now - record.firstAttempt > lockoutConfig.resetAfter) {
      record.count = 0;
      record.firstAttempt = now;
    }
    
    record.count++;
    
    // Lock account if exceeded
    if (record.count >= lockoutConfig.maxAttempts) {
      record.lockedUntil = now + lockoutConfig.lockoutDuration;
    }
    
    this.attempts.set(identifier, record);
    return record;
  }
  
  /**
   * Record successful attempt
   */
  recordSuccess(identifier) {
    this.attempts.delete(identifier);
  }
  
  /**
   * Check if account is locked
   */
  isLocked(identifier) {
    const record = this.attempts.get(identifier);
    if (!record) return false;
    
    if (record.lockedUntil && Date.now() < record.lockedUntil) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Get remaining lockout time
   */
  getRemainingLockout(identifier) {
    const record = this.attempts.get(identifier);
    if (!record || !record.lockedUntil) return 0;
    
    return Math.max(0, record.lockedUntil - Date.now());
  }
}

// ==================== A09: Logging and Monitoring ====================

/**
 * Security Audit Logger
 */
const securityLogger = {
  events: [],
  maxSize: 10000,
  
  /**
   * Log security event
   */
  log(event) {
    const entry = {
      timestamp: new Date().toISOString(),
      ...event,
    };
    
    this.events.push(entry);
    
    // Keep only recent events
    if (this.events.length > this.maxSize) {
      this.events = this.events.slice(-this.maxSize);
    }
    
    // Send to monitoring service if available
    if (process.env.SECURITY_WEBHOOK_URL) {
      this.sendToWebhook(entry);
    }
  },
  
  /**
   * Log failed login
   */
  logFailedLogin(identifier, ip, userAgent) {
    this.log({
      type: 'FAILED_LOGIN',
      identifier,
      ip,
      userAgent,
      severity: 'MEDIUM',
    });
  },
  
  /**
   * Log successful login
   */
  logSuccessfulLogin(userId, ip, userAgent) {
    this.log({
      type: 'SUCCESSFUL_LOGIN',
      userId,
      ip,
      userAgent,
      severity: 'INFO',
    });
  },
  
  /**
   * Log suspicious activity
   */
  logSuspiciousActivity(type, details) {
    this.log({
      type: 'SUSPICIOUS_ACTIVITY',
      subType: type,
      details,
      severity: 'HIGH',
    });
  },
  
  /**
   * Send to webhook
   */
  async sendToWebhook(entry) {
    try {
      const axios = require('axios');
      await axios.post(process.env.SECURITY_WEBHOOK_URL, entry, {
        timeout: 5000,
      });
    } catch (error) {
      console.error('Failed to send security event to webhook:', error.message);
    }
  },
  
  /**
   * Get events
   */
  getEvents(filter = {}) {
    let events = [...this.events];
    
    if (filter.type) {
      events = events.filter(e => e.type === filter.type);
    }
    
    if (filter.severity) {
      events = events.filter(e => e.severity === filter.severity);
    }
    
    if (filter.startTime) {
      events = events.filter(e => new Date(e.timestamp) >= filter.startTime);
    }
    
    return events;
  },
};

// ==================== A10: SSRF ====================

/**
 * SSRF Protection
 */
const ssrfProtection = {
  blockedIPs: new Set([
    '127.0.0.1',
    '0.0.0.0',
    'localhost',
    '::1',
  ]),
  
  blockedRanges: [
    // Private IPv4 ranges
    { start: '10.0.0.0', end: '10.255.255.255' },
    { start: '172.16.0.0', end: '172.31.255.255' },
    { start: '192.168.0.0', end: '192.168.255.255' },
    { start: '169.254.0.0', end: '169.254.255.255' },
  ],
  
  /**
   * Validate URL for SSRF
   */
  async validateUrl(urlString) {
    try {
      const url = new URL(urlString);
      
      // Block non-HTTP protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { valid: false, reason: 'Invalid protocol' };
      }
      
      // Resolve DNS
      const dns = require('dns').promises;
      const addresses = await dns.resolve4(url.hostname).catch(() => []);
      
      // Check each resolved IP
      for (const ip of addresses) {
        if (this.isBlockedIP(ip)) {
          return { valid: false, reason: 'Blocked IP address' };
        }
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, reason: error.message };
    }
  },
  
  /**
   * Check if IP is blocked
   */
  isBlockedIP(ip) {
    if (this.blockedIPs.has(ip)) return true;
    
    const ipNum = this.ipToNumber(ip);
    
    for (const range of this.blockedRanges) {
      const start = this.ipToNumber(range.start);
      const end = this.ipToNumber(range.end);
      
      if (ipNum >= start && ipNum <= end) {
        return true;
      }
    }
    
    return false;
  },
  
  /**
   * Convert IP to number
   */
  ipToNumber(ip) {
    return ip.split('.').reduce((acc, octet) => {
      return (acc << 8) + parseInt(octet, 10);
    }, 0) >>> 0;
  },
};

/**
 * SSRF Protection Middleware
 */
const ssrfMiddleware = (req, res, next) => {
  const urlParam = req.query.url || req.body.url;
  
  if (urlParam) {
    ssrfProtection.validateUrl(urlParam).then(result => {
      if (!result.valid) {
        return res.status(400).json({
          success: false,
          code: 'SSRF_BLOCKED',
          message: 'URL validation failed',
          reason: result.reason,
        });
      }
      next();
    }).catch(error => {
      res.status(500).json({
        success: false,
        code: 'SSRF_ERROR',
        message: 'URL validation error',
      });
    });
  } else {
    next();
  }
};

// ==================== Export ====================

module.exports = {
  // A01: Broken Access Control
  accessControlMiddleware,
  createRBAC,
  
  // A02: Cryptographic Failures
  encryption,
  
  // A03: Injection
  sanitizeInput,
  sanitizationMiddleware,
  noSqlInjectionProtection,
  
  // A05: Security Misconfiguration
  securityHeaders,
  corsConfig,
  
  // A07: Authentication Failures
  passwordPolicy,
  sessionConfig,
  lockoutConfig,
  AccountLockout,
  
  // A09: Logging and Monitoring
  securityLogger,
  
  // A10: SSRF
  ssrfProtection,
  ssrfMiddleware,
};