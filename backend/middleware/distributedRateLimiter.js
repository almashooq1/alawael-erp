/**
 * 🔒 Distributed Rate Limiting with Redis
 *
 * Enterprise-grade rate limiting across multiple servers
 *
 * Features:
 * - Distributed rate limiting via Redis
 * - Multiple rate limit strategies
 * - Custom quota per user/IP
 * - Rate limit headers
 * - Graceful degradation when Redis is unavailable
 */

class DistributedRateLimiter {
  constructor(redisClient, options = {}) {
    this.redis = redisClient;

    // Configuration
    this.options = {
      globalLimit: options.globalLimit || 1000, // requests per window
      windowSize: options.windowSize || 900000, // 15 minutes in ms
      keyPrefix: options.keyPrefix || 'ratelimit:',
      fallbackToMemory: options.fallbackToMemory !== false,
    };

    // In-memory fallback (when Redis is down)
    this.memoryLimits = new Map();

    // Statistics
    this.stats = {
      totalChecks: 0,
      redisChecks: 0,
      memoryChecks: 0,
      limitExceeded: 0,
      redisErrors: 0,
    };
  }

  /**
   * Generate rate limit key
   */
  generateKey(userId, category = 'global') {
    return `${this.options.keyPrefix}${category}:${userId}`;
  }

  /**
   * Check if request is within rate limit
   */
  async checkLimit(userId, category = 'global', limit = null, windowSize = null) {
    limit = limit || this.options.globalLimit;
    windowSize = windowSize || this.options.windowSize;
    const key = this.generateKey(userId, category);

    this.stats.totalChecks++;

    try {
      // Try Redis first
      if (this.redis) {
        this.stats.redisChecks++;
        return await this.checkLimitRedis(key, limit, windowSize);
      }
    } catch (error) {
      console.error('[RateLimiter] Redis error:', error.message);
      this.stats.redisErrors++;

      // Fallback to memory if Redis fails
      if (this.options.fallbackToMemory) {
        return this.checkLimitMemory(key, limit, windowSize);
      }

      // If fallback disabled, allow request
      return { allowed: true, remaining: limit, resetAt: Date.now() + windowSize };
    }

    // Use memory as fallback
    if (!this.redis && this.options.fallbackToMemory) {
      this.stats.memoryChecks++;
      return this.checkLimitMemory(key, limit, windowSize);
    }

    // Default: allow
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowSize };
  }

  /**
   * Check limit using Redis
   */
  async checkLimitRedis(key, limit, windowSize) {
    // Use Redis INCR with TTL
    const current = await this.redis.incr(key);

    // Set expiration on first increment
    if (current === 1) {
      await this.redis.expire(key, Math.ceil(windowSize / 1000));
    }

    const remaining = Math.max(0, limit - current);
    const resetAt = Date.now() + (await this.redis.pttl(key));

    const allowed = current <= limit;

    if (!allowed) {
      this.stats.limitExceeded++;
    }

    return {
      allowed,
      current,
      limit,
      remaining,
      resetAt,
      resetIn: Math.ceil((resetAt - Date.now()) / 1000),
    };
  }

  /**
   * Check limit using memory (fallback)
   */
  checkLimitMemory(key, limit, windowSize) {
    const now = Date.now();

    if (!this.memoryLimits.has(key)) {
      this.memoryLimits.set(key, {
        count: 0,
        windowStart: now,
      });
    }

    const entry = this.memoryLimits.get(key);

    // Reset if window expired
    if (now - entry.windowStart > windowSize) {
      entry.count = 0;
      entry.windowStart = now;
    }

    entry.count++;
    const remaining = Math.max(0, limit - entry.count);
    const resetAt = entry.windowStart + windowSize;

    const allowed = entry.count <= limit;

    if (!allowed) {
      this.stats.limitExceeded++;
    }

    return {
      allowed,
      current: entry.count,
      limit,
      remaining,
      resetAt,
      resetIn: Math.ceil((resetAt - now) / 1000),
    };
  }

  /**
   * Get user quota (custom limits per user)
   */
  async getUserQuota(userId) {
    // Check if user has custom quota in Redis
    if (this.redis) {
      try {
        const quota = await this.redis.get(`${this.options.keyPrefix}quota:${userId}`);
        if (quota) {
          return JSON.parse(quota);
        }
      } catch (error) {
        console.error('[RateLimiter] Error getting quota:', error.message);
      }
    }

    // Default quota
    return {
      globalLimit: this.options.globalLimit,
      windowSize: this.options.windowSize,
    };
  }

  /**
   * Set user quota
   */
  async setUserQuota(userId, limit, windowSize = null) {
    windowSize = windowSize || this.options.windowSize;

    const quota = { limit, windowSize };

    if (this.redis) {
      try {
        // Store quota for 1 year
        await this.redis.setex(
          `${this.options.keyPrefix}quota:${userId}`,
          365 * 24 * 60 * 60, // 1 year
          JSON.stringify(quota)
        );
      } catch (error) {
        console.error('[RateLimiter] Error setting quota:', error.message);
      }
    }
  }

  /**
   * Reset user limit
   */
  async resetLimit(userId, category = 'global') {
    const key = this.generateKey(userId, category);

    if (this.redis) {
      try {
        await this.redis.del(key);
      } catch (error) {
        console.error('[RateLimiter] Error resetting limit:', error.message);
      }
    }

    // Reset memory
    this.memoryLimits.delete(key);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalChecks: this.stats.totalChecks,
      redisChecks: this.stats.redisChecks,
      memoryChecks: this.stats.memoryChecks,
      limitExceeded: this.stats.limitExceeded,
      redisErrors: this.stats.redisErrors,
      exceedRate: ((this.stats.limitExceeded / this.stats.totalChecks) * 100 || 0).toFixed(2) + '%',
      redisAvailable: !!this.redis,
      memoryLimitsSize: this.memoryLimits.size,
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalChecks: 0,
      redisChecks: 0,
      memoryChecks: 0,
      limitExceeded: 0,
      redisErrors: 0,
    };
  }
}

/**
 * Express middleware for distributed rate limiting
 */
function distributedRateLimiterMiddleware(limiter) {
  return async (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const category = req.route?.path || 'api';

    // Check rate limit
    const result = await limiter.checkLimit(userId, category);

    // Set rate limit headers
    res.set('X-RateLimit-Limit', result.limit);
    res.set('X-RateLimit-Remaining', result.remaining);
    res.set('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

    if (!result.allowed) {
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded',
        retryAfter: result.resetIn,
      });
    }

    next();
  };
}

/**
 * Create rate limiter for specific category
 */
function createCategoryLimiter(limiter, category, limit, windowSize) {
  return async (req, res, next) => {
    const userId = req.user?.id || req.ip;

    const result = await limiter.checkLimit(userId, category, limit, windowSize);

    res.set('X-RateLimit-Limit', result.limit);
    res.set('X-RateLimit-Remaining', result.remaining);
    res.set('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

    if (!result.allowed) {
      return res.status(429).json({
        success: false,
        message: `${category} rate limit exceeded`,
        retryAfter: result.resetIn,
      });
    }

    next();
  };
}

module.exports = {
  DistributedRateLimiter,
  distributedRateLimiterMiddleware,
  createCategoryLimiter,
};
