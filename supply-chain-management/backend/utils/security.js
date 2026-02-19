/**
 * Security & Utility Functions
 * Password hashing, email validation, JWT handling, etc.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Password Management
 */
export const passwordUtils = {
  /**
   * Hash password with bcrypt
   */
  async hash(password) {
    try {
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      return hashedPassword;
    } catch (error) {
      throw new Error(`Password hashing failed: ${error.message}`);
    }
  },

  /**
   * Compare password with hash
   */
  async compare(password, hash) {
    try {
      const isMatch = await bcrypt.compare(password, hash);
      return isMatch;
    } catch (error) {
      throw new Error(`Password comparison failed: ${error.message}`);
    }
  },

  /**
   * Check password strength
   */
  isStrong(password) {
    const minLength = 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    return {
      isStrong:
        password.length >= minLength &&
        hasUppercase &&
        hasLowercase &&
        hasNumbers &&
        hasSpecialChar,
      minLength: password.length >= minLength,
      hasUppercase,
      hasLowercase,
      hasNumbers,
      hasSpecialChar,
      score: [
        password.length >= minLength,
        hasUppercase,
        hasLowercase,
        hasNumbers,
        hasSpecialChar,
      ].filter(Boolean).length,
    };
  },

  /**
   * Generate temporary password
   */
  generateTemporary(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  },
};

/**
 * JWT Token Management
 */
export const tokenUtils = {
  /**
   * Generate JWT token
   */
  generate(payload, expiresIn = JWT_EXPIRES_IN) {
    try {
      const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn,
        issuer: 'supply-chain-api',
        subject: payload.userId || payload._id?.toString(),
      });
      return token;
    } catch (error) {
      throw new Error(`Token generation failed: ${error.message}`);
    }
  },

  /**
   * Verify JWT token
   */
  verify(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'supply-chain-api',
      });
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw new Error(`Token verification failed: ${error.message}`);
    }
  },

  /**
   * Decode token without verification (use with caution)
   */
  decode(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      throw new Error(`Token decoding failed: ${error.message}`);
    }
  },

  /**
   * Refresh token
   */
  refresh(token) {
    try {
      const decoded = this.decode(token);
      return this.generate({
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      });
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  },
};

/**
 * Email Validation
 */
export const emailUtils = {
  /**
   * Validate email format
   */
  isValid(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  },

  /**
   * Normalize email (lowercase and trim)
   */
  normalize(email) {
    return email.toLowerCase().trim();
  },

  /**
   * Extract domain from email
   */
  getDomain(email) {
    const normalized = this.normalize(email);
    return normalized.split('@')[1] || null;
  },

  /**
   * Check if email is from disposable domain
   */
  isDisposable(email) {
    const disposableDomains = [
      'tempmail.com',
      'guerrillamail.com',
      '10minutemail.com',
      'mailinator.com',
    ];
    const domain = this.getDomain(email);
    return disposableDomains.includes(domain?.toLowerCase());
  },
};

/**
 * Data Encryption & Hashing
 */
export const encryptionUtils = {
  /**
   * SHA256 hash
   */
  sha256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  },

  /**
   * Generate random token
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  },

  /**
   * Generate OTP (One Time Password)
   */
  generateOTP(length = 6) {
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += Math.floor(Math.random() * 10);
    }
    return otp;
  },

  /**
   * Hash sensitive data for audit logs
   */
  hashSensitive(data) {
    return this.sha256(JSON.stringify(data));
  },
};

/**
 * Input Sanitization
 */
export const sanitizationUtils = {
  /**
   * Remove HTML tags
   */
  removeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/<[^>]*>/g, '').trim();
  },

  /**
   * Escape special characters
   */
  escapeHtml(str) {
    if (typeof str !== 'string') return str;
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return str.replace(/[&<>"']/g, char => map[char]);
  },

  /**
   * Sanitize user input
   */
  sanitize(input) {
    if (typeof input === 'string') {
      return this.removeHtml(input).trim();
    }
    if (typeof input === 'object' && input !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitize(value);
      }
      return sanitized;
    }
    return input;
  },
};

/**
 * Rate Limiting Helper
 */
export const rateLimitUtils = {
  /**
   * Check if IP is rate limited
   */
  isRateLimited(attempts, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    return attempts >= maxAttempts;
  },

  /**
   * Calculate remaining time for rate limit
   */
  getRemainingTime(lastAttempt, windowMs = 15 * 60 * 1000) {
    const remaining = windowMs - (Date.now() - lastAttempt);
    return Math.max(0, remaining);
  },
};

/**
 * Audit Trail Helper
 */
export const auditUtils = {
  /**
   * Generate audit event
   */
  generateEvent(user, action, entity, entityId, details = {}) {
    return {
      userId: user._id || user.id,
      userEmail: user.email,
      action,
      entity,
      entityId,
      details,
      timestamp: new Date(),
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
    };
  },

  /**
   * Format audit log for display
   */
  formatLog(log) {
    return {
      id: log._id,
      user: log.userEmail,
      action: log.action,
      entity: log.entity,
      when: log.timestamp.toLocaleString(),
      what: JSON.stringify(log.details).substring(0, 100) + '...',
    };
  },
};

/**
 * Request Validation Helpers
 */
export const validationHelpers = {
  /**
   * Validate MongoDB ObjectId
   */
  isValidObjectId(id) {
    return /^[0-9a-fA-F]{24}$/.test(id);
  },

  /**
   * Validate phone number
   */
  isValidPhone(phone) {
    return /^\+?1?\d{9,15}$/.test(phone.replace(/\D/g, ''));
  },

  /**
   * Validate URL
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate pagination params
   */
  validatePagination(page = 1, limit = 10) {
    const validPage = Math.max(1, parseInt(page) || 1);
    const validLimit = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (validPage - 1) * validLimit;
    return { page: validPage, limit: validLimit, skip };
  },
};

export default {
  passwordUtils,
  tokenUtils,
  emailUtils,
  encryptionUtils,
  sanitizationUtils,
  rateLimitUtils,
  auditUtils,
  validationHelpers,
};
