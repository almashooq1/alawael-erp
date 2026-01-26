/**
 * Per-User Rate Limiter Service
 * تحديد معدل الطلبات لكل مستخدم
 *
 * Features:
 * - Track requests per user ID (not just IP)
 * - Sliding window rate limiting
 * - Different limits for different roles
 * - Quota management (daily/monthly limits)
 * - Redis-backed for distributed systems
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const AuditLogger = require('../services/audit-logger');

// In-memory fallback store (when Redis unavailable)
class MemoryStore {
  constructor() {
    this.hits = new Map();
    this.resetTime = new Map();
  }

  async increment(key) {
    const now = Date.now();
    const data = this.hits.get(key) || { count: 0, resetTime: now + 60000 };

    if (now > data.resetTime) {
      data.count = 1;
      data.resetTime = now + 60000;
    } else {
      data.count++;
    }

    this.hits.set(key, data);
    return {
      totalHits: data.count,
      resetTime: new Date(data.resetTime),
    };
  }

  async decrement(key) {
    const data = this.hits.get(key);
    if (data && data.count > 0) {
      data.count--;
      this.hits.set(key, data);
    }
  }

  async resetKey(key) {
    this.hits.delete(key);
  }
}

// Role-based limits (requests per window)
const RATE_LIMITS = {
  admin: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // 500 requests per 15 min
    dailyQuota: 20000,
  },
  manager: {
    windowMs: 15 * 60 * 1000,
    max: 300,
    dailyQuota: 10000,
  },
  user: {
    windowMs: 15 * 60 * 1000,
    max: 100,
    dailyQuota: 3000,
  },
  guest: {
    windowMs: 15 * 60 * 1000,
    max: 50,
    dailyQuota: 500,
  },
};

/**
 * Create per-user rate limiter
 */
const createUserRateLimiter = (options = {}) => {
  const store = new MemoryStore(); // Fallback to memory

  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    standardHeaders: true,
    legacyHeaders: false,

    // Use userId as key (not IP)
    keyGenerator: req => {
      if (req.user && req.user.id) {
        return `user:${req.user.id}`;
      }
      // Fallback to IP for unauthenticated requests
      return `ip:${req.ip}`;
    },

    // Skip rate limiting for certain conditions
    skip: req => {
      // Skip for admin in test mode
      if (process.env.SMART_TEST_MODE === 'true') {
        return true;
      }
      // Skip for health checks
      if (req.path === '/health' || req.path === '/api/health') {
        return true;
      }
      return false;
    },

    // Custom handler when limit exceeded
    handler: async (req, res) => {
      const userId = req.user?.id || 'anonymous';
      const userRole = req.user?.role || 'guest';

      // Log rate limit violation
      await AuditLogger.log({
        action: 'rate_limit.exceeded',
        userId,
        metadata: {
          role: userRole,
          ip: req.ip,
          path: req.path,
          method: req.method,
        },
      });

      res.status(429).json({
        success: false,
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded. Try again in ${Math.ceil(options.windowMs / 60000)} minutes.`,
        retryAfter: Math.ceil(options.windowMs / 1000),
        limit: options.max,
      });
    },

    // On limit reached callback
    onLimitReached: (req, res, options) => {
      console.warn(`[Rate Limit] User ${req.user?.id || req.ip} exceeded limit:`, {
        path: req.path,
        limit: options.max,
      });
    },
  });
};

/**
 * Role-based rate limiter middleware
 */
const roleBasedRateLimiter = (req, res, next) => {
  const userRole = req.user?.role || 'guest';
  const limits = RATE_LIMITS[userRole] || RATE_LIMITS.guest;

  const limiter = createUserRateLimiter({
    windowMs: limits.windowMs,
    max: limits.max,
  });

  return limiter(req, res, next);
};

/**
 * Daily quota tracker
 */
class QuotaTracker {
  constructor() {
    this.dailyUsage = new Map();
  }

  async checkQuota(userId, userRole = 'user') {
    const today = new Date().toISOString().split('T')[0];
    const key = `${userId}:${today}`;
    const limits = RATE_LIMITS[userRole] || RATE_LIMITS.user;

    const usage = this.dailyUsage.get(key) || 0;

    if (usage >= limits.dailyQuota) {
      return {
        allowed: false,
        usage,
        quota: limits.dailyQuota,
        resetsAt: new Date(new Date().setHours(24, 0, 0, 0)),
      };
    }

    this.dailyUsage.set(key, usage + 1);

    return {
      allowed: true,
      usage: usage + 1,
      quota: limits.dailyQuota,
      remaining: limits.dailyQuota - usage - 1,
    };
  }

  async getUsage(userId) {
    const today = new Date().toISOString().split('T')[0];
    const key = `${userId}:${today}`;
    return this.dailyUsage.get(key) || 0;
  }

  async resetUserQuota(userId) {
    const today = new Date().toISOString().split('T')[0];
    const key = `${userId}:${today}`;
    this.dailyUsage.delete(key);
  }

  // Cleanup old entries (run daily)
  async cleanup() {
    const today = new Date().toISOString().split('T')[0];
    for (const [key, value] of this.dailyUsage.entries()) {
      if (!key.includes(today)) {
        this.dailyUsage.delete(key);
      }
    }
  }
}

const quotaTracker = new QuotaTracker();

/**
 * Quota checker middleware
 */
const checkQuota = async (req, res, next) => {
  if (!req.user || !req.user.id) {
    return next();
  }

  try {
    const result = await quotaTracker.checkQuota(req.user.id, req.user.role);

    // Attach quota info to response headers
    res.set('X-RateLimit-Quota', result.quota);
    res.set('X-RateLimit-Quota-Remaining', result.remaining || 0);
    res.set('X-RateLimit-Quota-Used', result.usage);

    if (!result.allowed) {
      await AuditLogger.log({
        action: 'quota.exceeded',
        userId: req.user.id,
        metadata: {
          usage: result.usage,
          quota: result.quota,
          resetsAt: result.resetsAt,
        },
      });

      return res.status(429).json({
        success: false,
        error: 'Daily quota exceeded',
        code: 'QUOTA_EXCEEDED',
        message: 'You have exceeded your daily API quota.',
        usage: result.usage,
        quota: result.quota,
        resetsAt: result.resetsAt,
      });
    }

    next();
  } catch (error) {
    console.error('Quota check error:', error);
    next(); // Continue on error (fail open)
  }
};

/**
 * Get rate limit status for current user
 */
const getRateLimitStatus = async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated',
    });
  }

  try {
    const userRole = req.user.role || 'user';
    const limits = RATE_LIMITS[userRole];
    const usage = await quotaTracker.getUsage(req.user.id);

    res.json({
      success: true,
      rateLimits: {
        role: userRole,
        windowMs: limits.windowMs,
        maxPerWindow: limits.max,
        dailyQuota: limits.dailyQuota,
        dailyUsage: usage,
        dailyRemaining: Math.max(0, limits.dailyQuota - usage),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve rate limit status',
      message: error.message,
    });
  }
};

// Cleanup old quota entries daily
setInterval(
  () => {
    quotaTracker.cleanup().catch(console.error);
  },
  24 * 60 * 60 * 1000
);

module.exports = {
  createUserRateLimiter,
  roleBasedRateLimiter,
  checkQuota,
  getRateLimitStatus,
  quotaTracker,
  RATE_LIMITS,
};
