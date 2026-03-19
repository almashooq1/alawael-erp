/* eslint-disable no-unused-vars */
/**
 * ============================================
 * ADVANCED RATE LIMITING SYSTEM
 * نظام تحديد معدل الطلب المتقدم
 * ============================================
 */

const redis = require('redis');
const logger = require('../utils/logger');

class RateLimitingService {
  constructor() {
    this.redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
    });

    this.limits = this.initializeLimits();
  }

  /**
   * 1️⃣ RATE LIMIT CONFIGURATION
   */

  initializeLimits() {
    return {
      // General API endpoints
      general: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 100,
        message: 'Too many requests, please try again later.',
      },

      // Authentication endpoints (strict)
      auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5, // 5 attempts
        skipSuccessfulRequests: true,
        message: 'Too many login attempts, please try again later.',
      },

      // 2FA verification
      '2fa': {
        windowMs: 10 * 60 * 1000, // 10 minutes
        maxRequests: 3, // 3 attempts
        message: '2FA verification attempts exceeded.',
      },

      // Password reset
      passwordReset: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 3,
        message: 'Too many password reset attempts.',
      },

      // Payment endpoints (strict)
      payment: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 10,
        message: 'Payment processing rate limit exceeded.',
      },

      // API key endpoints
      apiKey: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 20,
        message: 'API key endpoint rate limit exceeded.',
      },

      // Public endpoints (generous)
      public: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 1000,
        message: 'Rate limit exceeded.',
      },

      // Premium users (higher limit)
      premium: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 1000,
        message: 'Premium rate limit exceeded.',
      },

      // Admin endpoints
      admin: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 10000, // Very high for admins
        message: 'Admin rate limit exceeded.',
      },
    };
  }

  /**
   * 2️⃣ IP-BASED RATE LIMITING
   */

  async checkIPLimit(ip, endpoint) {
    try {
      const key = `rate-limit:ip:${ip}:${endpoint}`;
      const limit = this.limits[endpoint] || this.limits.general;

      // Get current count
      const count = await new Promise((resolve, reject) => {
        this.redisClient.get(key, (err, val) => {
          if (err) reject(err);
          resolve(parseInt(val) || 0);
        });
      });

      if (count >= limit.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: limit.windowMs,
        };
      }

      // Increment counter
      await new Promise((resolve, reject) => {
        this.redisClient.incr(key, err => {
          if (err) reject(err);
          resolve();
        });
      });

      // Set expiration
      await new Promise((resolve, reject) => {
        this.redisClient.expire(key, Math.ceil(limit.windowMs / 1000), err => {
          if (err) reject(err);
          resolve();
        });
      });

      return {
        allowed: true,
        remaining: limit.maxRequests - count - 1,
        resetTime: limit.windowMs,
      };
    } catch (error) {
      logger.error(`Rate limit check error: ${error.message}`);
      // Fail open - allow request if Redis is down
      return { allowed: true };
    }
  }

  /**
   * 3️⃣ USER-BASED RATE LIMITING
   */

  async checkUserLimit(userId, endpoint) {
    try {
      const key = `rate-limit:user:${userId}:${endpoint}`;
      const limit = this.limits[endpoint] || this.limits.general;

      const count = await this.getRedisValue(key);

      if (count >= limit.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: limit.windowMs,
        };
      }

      await this.incrRedisValue(key);
      await this.expireRedisKey(key, limit.windowMs);

      return {
        allowed: true,
        remaining: limit.maxRequests - count - 1,
        resetTime: limit.windowMs,
      };
    } catch (error) {
      logger.error(`User rate limit check error: ${error.message}`);
      return { allowed: true };
    }
  }

  /**
   * 4️⃣ API KEY-BASED RATE LIMITING
   */

  async checkAPIKeyLimit(apiKey, endpoint) {
    try {
      const key = `rate-limit:api-key:${apiKey}:${endpoint}`;
      const limit = this.limits.apiKey;

      const count = await this.getRedisValue(key);

      if (count >= limit.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: limit.windowMs,
        };
      }

      await this.incrRedisValue(key);
      await this.expireRedisKey(key, limit.windowMs);

      return {
        allowed: true,
        remaining: limit.maxRequests - count - 1,
        resetTime: limit.windowMs,
      };
    } catch (error) {
      logger.error(`API key rate limit check error: ${error.message}`);
      return { allowed: true };
    }
  }

  /**
   * 5️⃣ MIDDLEWARE: GENERAL RATE LIMITING
   */

  generalRateLimit() {
    return async (req, res, next) => {
      try {
        const ip = req.ip || req.connection.remoteAddress;
        const result = await this.checkIPLimit(ip, 'general');

        // Set response headers
        res.set('X-RateLimit-Limit', this.limits.general.maxRequests);
        res.set('X-RateLimit-Remaining', result.remaining);
        res.set('X-RateLimit-Reset', new Date(Date.now() + result.resetTime));

        if (!result.allowed) {
          return res.status(429).json({
            error: this.limits.general.message,
            retryAfter: result.resetTime,
          });
        }

        next();
      } catch (error) {
        // Fail open
        next();
      }
    };
  }

  /**
   * 6️⃣ MIDDLEWARE: AUTH RATE LIMITING
   */

  authRateLimit() {
    return async (req, res, next) => {
      try {
        const ip = req.ip || req.connection.remoteAddress;
        const email = req.body.email || 'unknown';
        const key = `rate-limit:auth:${ip}:${email}`;

        const limit = this.limits.auth;
        const count = await this.getRedisValue(key);

        if (count >= limit.maxRequests) {
          return res.status(429).json({
            error: limit.message,
            retryAfter: limit.windowMs,
          });
        }

        // Pass count to route for logging
        req.attemptCount = count;

        next();
      } catch (error) {
        next();
      }
    };
  }

  /**
   * 7️⃣ MIDDLEWARE: PAYMENT RATE LIMITING
   */

  paymentRateLimit() {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const result = await this.checkUserLimit(req.user.id, 'payment');

        res.set('X-RateLimit-Limit', this.limits.payment.maxRequests);
        res.set('X-RateLimit-Remaining', result.remaining);

        if (!result.allowed) {
          logger.warn(`Payment rate limit exceeded for user ${req.user.id}`);
          return res.status(429).json({
            error: this.limits.payment.message,
            retryAfter: result.resetTime,
          });
        }

        next();
      } catch (error) {
        next();
      }
    };
  }

  /**
   * 8️⃣ MIDDLEWARE: API KEY RATE LIMITING
   */

  apiKeyRateLimit() {
    return async (req, res, next) => {
      try {
        const apiKey = req.get('X-API-Key');

        if (!apiKey) {
          return next();
        }

        const result = await this.checkAPIKeyLimit(apiKey, 'apiKey');

        res.set('X-RateLimit-Limit', this.limits.apiKey.maxRequests);
        res.set('X-RateLimit-Remaining', result.remaining);

        if (!result.allowed) {
          return res.status(429).json({
            error: this.limits.apiKey.message,
            retryAfter: result.resetTime,
          });
        }

        next();
      } catch (error) {
        next();
      }
    };
  }

  /**
   * 9️⃣ ROLE-BASED RATE LIMITING
   */

  roleBasedRateLimit(allowedRoles = []) {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        let endpoint = 'general';

        if (req.user.role === 'admin') {
          endpoint = 'admin';
        } else if (req.user.subscription === 'premium') {
          endpoint = 'premium';
        }

        const result = await this.checkUserLimit(req.user.id, endpoint);

        res.set('X-RateLimit-Limit', this.limits[endpoint].maxRequests);
        res.set('X-RateLimit-Remaining', result.remaining);

        if (!result.allowed) {
          return res.status(429).json({
            error: this.limits[endpoint].message,
            retryAfter: result.resetTime,
          });
        }

        next();
      } catch (error) {
        next();
      }
    };
  }

  /**
   * 🔟 SLIDING WINDOW ALGORITHM
   */

  async checkSlidingWindow(key, maxRequests, windowMs) {
    try {
      const now = Date.now();
      const windowStart = now - windowMs;

      // Get all requests in window
      const requests = await new Promise((resolve, reject) => {
        this.redisClient.zrangebyscore(key, windowStart, now, (err, val) => {
          if (err) reject(err);
          resolve(val ? val.length : 0);
        });
      });

      if (requests >= maxRequests) {
        return { allowed: false, remaining: 0 };
      }

      // Add current request
      await new Promise((resolve, reject) => {
        this.redisClient.zadd(key, now, now, err => {
          if (err) reject(err);
          resolve();
        });
      });

      // Set expiration
      await new Promise((resolve, reject) => {
        this.redisClient.expire(key, Math.ceil(windowMs / 1000), err => {
          if (err) reject(err);
          resolve();
        });
      });

      return { allowed: true, remaining: maxRequests - requests - 1 };
    } catch (error) {
      logger.error(`Sliding window check error: ${error.message}`);
      return { allowed: true };
    }
  }

  /**
   * 1️⃣1️⃣ WHITELIST MANAGEMENT
   */

  async addToWhitelist(identifier, type = 'ip') {
    // Skip rate limiting for whitelisted IPs/users
    const key = `whitelist:${type}:${identifier}`;
    await new Promise((resolve, reject) => {
      this.redisClient.set(key, 'true', err => {
        if (err) reject(err);
        resolve();
      });
    });
  }

  async isWhitelisted(identifier, type = 'ip') {
    return new Promise((resolve, reject) => {
      this.redisClient.exists(`whitelist:${type}:${identifier}`, (err, val) => {
        if (err) reject(err);
        resolve(val === 1);
      });
    });
  }

  /**
   * 1️⃣2️⃣ STATISTICS & MONITORING
   */

  async getRateLimitStats() {
    // Get statistics on rate limiting
    return {
      totalRequests: 0,
      blockedRequests: 0,
      topBlockedIPs: [],
      topBlockedEndpoints: [],
    };
  }

  /**
   * REDIS HELPER FUNCTIONS
   */

  async getRedisValue(key) {
    return new Promise((resolve, reject) => {
      this.redisClient.get(key, (err, val) => {
        if (err) reject(err);
        resolve(parseInt(val) || 0);
      });
    });
  }

  async incrRedisValue(key) {
    return new Promise((resolve, reject) => {
      this.redisClient.incr(key, err => {
        if (err) reject(err);
        resolve();
      });
    });
  }

  async expireRedisKey(key, milliseconds) {
    return new Promise((resolve, reject) => {
      this.redisClient.expire(key, Math.ceil(milliseconds / 1000), err => {
        if (err) reject(err);
        resolve();
      });
    });
  }
}

module.exports = new RateLimitingService();
