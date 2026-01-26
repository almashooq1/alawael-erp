/**
 * Advanced Security Middleware
 * مستودع الحماية المتقدمة
 *
 * Features:
 * - Request Signing Validation
 * - API Key Rotation
 * - DDoS Detection
 * - Suspicious Activity Detection
 * - Security Headers Enhancement
 */

const crypto = require('crypto');

/**
 * Request Signature Validator
 */
class RequestSignatureValidator {
  /**
   * Generate Signature
   */
  static generateSignature(payload, secret) {
    return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  }

  /**
   * Verify Signature
   */
  static verifySignature(payload, signature, secret) {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  /**
   * Middleware for Request Validation
   */
  static middleware(req, res, next) {
    const signature = req.headers['x-signature'];
    const timestamp = req.headers['x-timestamp'];

    if (!signature || !timestamp) {
      return res.status(401).json({ error: 'Missing signature headers' });
    }

    // Check timestamp freshness (5 minutes)
    const requestTime = parseInt(timestamp);
    const currentTime = Date.now();
    if (currentTime - requestTime > 300000) {
      return res.status(401).json({ error: 'Request timestamp expired' });
    }

    try {
      const payload = {
        method: req.method,
        path: req.path,
        timestamp,
      };

      const secret = process.env.API_SECRET || 'default-secret';
      const isValid = this.verifySignature(payload, signature, secret);

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid request signature' });
      }

      next();
    } catch (error) {
      res.status(401).json({ error: 'Signature validation failed' });
    }
  }
}

/**
 * API Key Management
 */
class APIKeyManager {
  constructor() {
    this.keys = new Map();
  }

  /**
   * Generate API Key
   */
  generateKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create API Key
   */
  createKey(name, permissions = []) {
    const key = this.generateKey();
    const hashedKey = crypto.createHash('sha256').update(key).digest('hex');

    this.keys.set(hashedKey, {
      name,
      permissions,
      created: new Date(),
      lastUsed: null,
      active: true,
      rotations: 0,
    });

    return {
      key, // Return once for storage
      hashedKey,
      name,
      permissions,
    };
  }

  /**
   * Verify API Key
   */
  verifyKey(key) {
    const hashedKey = crypto.createHash('sha256').update(key).digest('hex');
    const keyData = this.keys.get(hashedKey);

    if (!keyData) {
      return null;
    }

    if (!keyData.active) {
      return null;
    }

    // Update last used
    keyData.lastUsed = new Date();

    return keyData;
  }

  /**
   * Rotate API Key
   */
  rotateKey(oldKey) {
    const hashedOldKey = crypto.createHash('sha256').update(oldKey).digest('hex');
    const keyData = this.keys.get(hashedOldKey);

    if (!keyData) {
      return null;
    }

    const newKey = this.generateKey();
    const hashedNewKey = crypto.createHash('sha256').update(newKey).digest('hex');

    // Copy data to new key
    this.keys.set(hashedNewKey, {
      ...keyData,
      rotations: keyData.rotations + 1,
    });

    // Deactivate old key after grace period
    setTimeout(() => {
      this.keys.delete(hashedOldKey);
    }, 3600000); // 1 hour grace period

    return {
      newKey,
      oldKeyGracePeriod: '1 hour',
    };
  }

  /**
   * Middleware
   */
  middleware() {
    return (req, res, next) => {
      const apiKey = req.headers['x-api-key'];

      if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
      }

      const keyData = this.verifyKey(apiKey);

      if (!keyData) {
        return res.status(401).json({ error: 'Invalid API key' });
      }

      req.apiKey = {
        ...keyData,
        key: apiKey,
      };

      next();
    };
  }
}

/**
 * DDoS Protection
 */
class DDoSProtection {
  constructor() {
    this.requests = new Map();
    this.blockedIPs = new Map();
    this.threshold = 100; // Requests per minute
  }

  /**
   * Check Request Rate
   */
  checkRequestRate(ip) {
    const now = Date.now();
    const minute = Math.floor(now / 60000);

    if (!this.requests.has(ip)) {
      this.requests.set(ip, {});
    }

    const ipData = this.requests.get(ip);

    if (!ipData[minute]) {
      ipData[minute] = 0;
    }

    ipData[minute]++;

    // Cleanup old data
    Object.keys(ipData).forEach(key => {
      if (parseInt(key) < minute - 5) {
        delete ipData[key];
      }
    });

    const requestCount = ipData[minute];

    if (requestCount > this.threshold) {
      this.blockIP(ip);
      return { allowed: false, reason: 'Rate limit exceeded' };
    }

    return { allowed: true, count: requestCount };
  }

  /**
   * Block IP
   */
  blockIP(ip, duration = 3600000) {
    this.blockedIPs.set(ip, Date.now() + duration);
  }

  /**
   * Check if IP is Blocked
   */
  isIPBlocked(ip) {
    const blockTime = this.blockedIPs.get(ip);

    if (!blockTime) {
      return false;
    }

    if (Date.now() > blockTime) {
      this.blockedIPs.delete(ip);
      return false;
    }

    return true;
  }

  /**
   * Middleware
   */
  middleware() {
    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress;

      if (this.isIPBlocked(ip)) {
        return res.status(429).json({
          error: 'Too many requests from your IP',
          retryAfter: 3600,
        });
      }

      const rateCheck = this.checkRequestRate(ip);

      if (!rateCheck.allowed) {
        return res.status(429).json({
          error: rateCheck.reason,
          retryAfter: 60,
        });
      }

      res.setHeader('X-RateLimit-Remaining', this.threshold - rateCheck.count);

      next();
    };
  }
}

/**
 * Security Headers Enhancement
 */
class SecurityHeaders {
  /**
   * Apply Enhanced Headers
   */
  static middleware(req, res, next) {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    );

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy (formerly Feature-Policy)
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');

    // HTTP Strict Transport Security
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // Remove X-Powered-By
    res.removeHeader('X-Powered-By');

    next();
  }
}

/**
 * Request Validation & Sanitization
 */
class AdvancedValidation {
  /**
   * Validate JSON Payload
   */
  static validatePayload(req, res, next) {
    if (!req.is('application/json')) {
      return next();
    }

    if (req.body && typeof req.body === 'object') {
      // Recursive sanitization
      req.body = this.sanitizeObject(req.body);
    }

    next();
  }

  /**
   * Sanitize Object Recursively
   */
  static sanitizeObject(obj) {
    const sanitized = {};

    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'string') {
        // Remove potential XSS
        sanitized[key] = value
          .replace(/[<>]/g, '')
          .replace(/javascript:/gi, '')
          .trim();
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  /**
   * Validate Against Schema
   */
  static validateSchema(schema) {
    return (req, res, next) => {
      try {
        // Simple validation (in production, use joi or yup)
        const errors = [];

        Object.entries(schema).forEach(([field, rules]) => {
          const value = req.body[field];

          if (rules.required && !value) {
            errors.push(`${field} is required`);
          }

          if (rules.type && value && typeof value !== rules.type) {
            errors.push(`${field} must be ${rules.type}`);
          }

          if (rules.min && value && value.length < rules.min) {
            errors.push(`${field} must be at least ${rules.min} characters`);
          }

          if (rules.max && value && value.length > rules.max) {
            errors.push(`${field} must be at most ${rules.max} characters`);
          }
        });

        if (errors.length > 0) {
          return res.status(400).json({ errors });
        }

        next();
      } catch (error) {
        res.status(400).json({ error: 'Validation failed' });
      }
    };
  }
}

module.exports = {
  RequestSignatureValidator,
  APIKeyManager,
  DDoSProtection,
  SecurityHeaders,
  AdvancedValidation,
};
