const redis = require('redis');
const logger = require('../utils/logger');

// Simple in-memory store used when USE_MOCK_CACHE=true
const createMemoryStore = () => {
  const store = new Map();
  return {
    async incr(key) {
      const current = (store.get(key) || 0) + 1;
      store.set(key, current);
      return current;
    },
    async expire(key, seconds) {
      // Basic expiry using timeout; good enough for local mock
      setTimeout(() => store.delete(key), seconds * 1000).unref?.();
      return true;
    },
    async del(key) {
      store.delete(key);
      return true;
    },
    async get(key) {
      return store.get(key) || null;
    },
  };
};

class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60 * 1000; // 1 minute
    this.maxRequests = options.maxRequests || 100;
    this.message = options.message || 'Too many requests';
    this.statusCode = options.statusCode || 429;

    const client =
      options.client ||
      (process.env.USE_MOCK_CACHE === 'true' ? createMemoryStore() : redis.createClient());

    // Ensure Redis clients attempt a connection; mock store is synchronous
    if (client.connect) {
      client.connect().catch(err => logger.warn('Redis connect error:', err.message));
    }

    this.client = client;
  }

  // Generate rate limit key
  getKey(req) {
    const identifier = req.user?.id || req.ip || req.socket.remoteAddress;
    return `ratelimit:${identifier}`;
  }

  // Check rate limit
  middleware = async (req, res, next) => {
    try {
      const key = this.getKey(req);
      const current = await this.client.incr(key);

      if (current === 1) {
        await this.client.expire(key, Math.ceil(this.windowMs / 1000));
      }

      res.set('X-RateLimit-Limit', this.maxRequests);
      res.set('X-RateLimit-Remaining', Math.max(0, this.maxRequests - current));

      if (current > this.maxRequests) {
        return res.status(this.statusCode).json({
          error: this.message,
          retryAfter: Math.ceil(this.windowMs / 1000),
        });
      }

      next();
    } catch (error) {
      logger.error('Rate limit error:', error);
      next(); // Continue on error
    }
  };

  // Reset rate limit for user
  reset = async req => {
    try {
      const key = this.getKey(req);
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Rate limit reset error:', error);
      return false;
    }
  };

  // Get current rate limit status
  getStatus = async req => {
    try {
      const key = this.getKey(req);
      const current = await this.client.get(key);
      return {
        current: parseInt(current) || 0,
        limit: this.maxRequests,
        remaining: Math.max(0, this.maxRequests - (parseInt(current) || 0)),
      };
    } catch (error) {
      logger.error('Rate limit getStatus error:', error);
      return null;
    }
  };
}

// Pre-configured rate limiters
const limiters = {
  // General API rate limiter
  api: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many API requests',
  }),

  // Login attempts rate limiter
  login: new RateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    message: 'Too many login attempts',
  }),

  // Password reset rate limiter
  passwordReset: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    message: 'Too many password reset attempts',
  }),

  // File upload rate limiter
  upload: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50,
    message: 'Too many file uploads',
  }),

  // Strict rate limiter for sensitive operations
  strict: new RateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    message: 'Too many requests for this operation',
  }),
};

module.exports = { RateLimiter, limiters };
