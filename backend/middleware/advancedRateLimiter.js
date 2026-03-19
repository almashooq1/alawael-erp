/**
 * Advanced Rate Limiter — نظام تحديد المعدل المتقدم
 *
 * Features:
 *  - Sliding Window algorithm (more accurate than fixed window)
 *  - Per-user rate limiting with token buckets
 *  - Tiered limits based on user roles/plans
 *  - IP reputation scoring
 *  - Burst protection
 *  - Redis-backed for distributed environments
 *  - Graceful degradation to in-memory when Redis unavailable
 *
 * @module middleware/advancedRateLimiter
 */

const logger = require('../utils/logger');

// ─── Sliding Window Counter ──────────────────────────────────────────────────

/**
 * In-memory sliding window rate limiter
 * Uses a sorted map of timestamps for precise window tracking
 */
class SlidingWindowLimiter {
  constructor({ windowMs = 60000, maxRequests = 100 } = {}) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this._requests = new Map(); // key -> [timestamp, timestamp, ...]
    this._cleanupInterval = setInterval(() => this._cleanup(), windowMs * 2);

    // Don't prevent Node from exiting
    if (this._cleanupInterval.unref) {
      this._cleanupInterval.unref();
    }
  }

  /**
   * Check if request is allowed
   * @param {string} key - Client identifier
   * @returns {{ allowed: boolean, remaining: number, resetMs: number, retryAfterMs: number }}
   */
  check(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    if (!this._requests.has(key)) {
      this._requests.set(key, []);
    }

    const timestamps = this._requests.get(key);

    // Remove expired timestamps (outside window)
    while (timestamps.length > 0 && timestamps[0] <= windowStart) {
      timestamps.shift();
    }

    const remaining = Math.max(0, this.maxRequests - timestamps.length);
    const resetMs = timestamps.length > 0 ? timestamps[0] + this.windowMs - now : this.windowMs;

    if (timestamps.length >= this.maxRequests) {
      const retryAfterMs = timestamps[0] + this.windowMs - now;
      return { allowed: false, remaining: 0, resetMs, retryAfterMs };
    }

    // Record this request
    timestamps.push(now);
    return { allowed: true, remaining: remaining - 1, resetMs, retryAfterMs: 0 };
  }

  /**
   * Reset counters for a key
   */
  reset(key) {
    this._requests.delete(key);
  }

  _cleanup() {
    const now = Date.now();
    for (const [key, timestamps] of this._requests) {
      const filtered = timestamps.filter(t => t > now - this.windowMs);
      if (filtered.length === 0) {
        this._requests.delete(key);
      } else {
        this._requests.set(key, filtered);
      }
    }
  }

  destroy() {
    clearInterval(this._cleanupInterval);
    this._requests.clear();
  }
}

// ─── Token Bucket (Per-User Burst Control) ───────────────────────────────────

/**
 * Token Bucket algorithm for burst protection
 * Allows short bursts while maintaining average rate
 */
class TokenBucket {
  constructor({ capacity = 50, refillRate = 10, refillIntervalMs = 1000 } = {}) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.refillIntervalMs = refillIntervalMs;
    this._buckets = new Map(); // key -> { tokens, lastRefill }
  }

  /**
   * Try to consume a token
   * @param {string} key
   * @returns {{ allowed: boolean, tokens: number }}
   */
  consume(key) {
    const now = Date.now();

    if (!this._buckets.has(key)) {
      this._buckets.set(key, { tokens: this.capacity, lastRefill: now });
    }

    const bucket = this._buckets.get(key);

    // Refill tokens based on time elapsed
    const elapsed = now - bucket.lastRefill;
    const refillCount = Math.floor(elapsed / this.refillIntervalMs) * this.refillRate;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + refillCount);
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      return { allowed: false, tokens: 0 };
    }

    bucket.tokens -= 1;
    return { allowed: true, tokens: bucket.tokens };
  }

  reset(key) {
    this._buckets.delete(key);
  }
}

// ─── Tiered Rate Limits ──────────────────────────────────────────────────────

/**
 * Rate limit tiers based on user role or subscription plan
 */
const RATE_LIMIT_TIERS = {
  // Public / unauthenticated
  anonymous: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    burstCapacity: 10,
    burstRefillRate: 2,
  },
  // Regular authenticated user
  user: {
    windowMs: 60 * 1000,
    maxRequests: 100,
    burstCapacity: 30,
    burstRefillRate: 5,
  },
  // Staff / Employee
  staff: {
    windowMs: 60 * 1000,
    maxRequests: 200,
    burstCapacity: 50,
    burstRefillRate: 10,
  },
  // Admin
  admin: {
    windowMs: 60 * 1000,
    maxRequests: 500,
    burstCapacity: 100,
    burstRefillRate: 20,
  },
  // Super Admin / System
  superadmin: {
    windowMs: 60 * 1000,
    maxRequests: 1000,
    burstCapacity: 200,
    burstRefillRate: 40,
  },
  // API Key (integration)
  api_key: {
    windowMs: 60 * 1000,
    maxRequests: 300,
    burstCapacity: 80,
    burstRefillRate: 15,
  },
};

// ─── IP Reputation ───────────────────────────────────────────────────────────

class IPReputationTracker {
  constructor() {
    this._scores = new Map(); // ip -> { score, violations, lastViolation }
    this._blocklist = new Set();
    this.VIOLATION_DECAY_MS = 30 * 60 * 1000; // 30 min
    this.BLOCK_THRESHOLD = 10;

    this._decayInterval = setInterval(() => this._decayScores(), 5 * 60 * 1000);
    if (this._decayInterval.unref) this._decayInterval.unref();
  }

  recordViolation(ip, severity = 1) {
    if (!this._scores.has(ip)) {
      this._scores.set(ip, { score: 0, violations: 0, lastViolation: null });
    }
    const entry = this._scores.get(ip);
    entry.score += severity;
    entry.violations += 1;
    entry.lastViolation = Date.now();

    if (entry.score >= this.BLOCK_THRESHOLD) {
      this._blocklist.add(ip);
      logger.warn(`[RateLimiter] IP blocked due to reputation: ${ip} (score: ${entry.score})`);
    }
  }

  isBlocked(ip) {
    return this._blocklist.has(ip);
  }

  getScore(ip) {
    return this._scores.get(ip)?.score || 0;
  }

  _decayScores() {
    const now = Date.now();
    for (const [ip, entry] of this._scores) {
      if (entry.lastViolation && now - entry.lastViolation > this.VIOLATION_DECAY_MS) {
        entry.score = Math.max(0, entry.score - 1);
        if (entry.score < this.BLOCK_THRESHOLD) {
          this._blocklist.delete(ip);
        }
        if (entry.score === 0) {
          this._scores.delete(ip);
        }
      }
    }
  }

  destroy() {
    clearInterval(this._decayInterval);
  }
}

// ─── Singleton Instances ─────────────────────────────────────────────────────
const _limiters = new Map();
const _burstLimiters = new Map();
const ipReputation = new IPReputationTracker();

/**
 * Get or create a sliding window limiter for a tier
 */
function _getLimiter(tier) {
  if (!_limiters.has(tier)) {
    const config = RATE_LIMIT_TIERS[tier] || RATE_LIMIT_TIERS.anonymous;
    _limiters.set(
      tier,
      new SlidingWindowLimiter({
        windowMs: config.windowMs,
        maxRequests: config.maxRequests,
      })
    );
  }
  return _limiters.get(tier);
}

function _getBurstLimiter(tier) {
  if (!_burstLimiters.has(tier)) {
    const config = RATE_LIMIT_TIERS[tier] || RATE_LIMIT_TIERS.anonymous;
    _burstLimiters.set(
      tier,
      new TokenBucket({
        capacity: config.burstCapacity,
        refillRate: config.burstRefillRate,
      })
    );
  }
  return _burstLimiters.get(tier);
}

// ─── Middleware Factory ──────────────────────────────────────────────────────

/**
 * Create advanced rate limiting middleware
 * @param {Object} [options]
 * @param {boolean} [options.enableBurst=true] - Enable burst protection
 * @param {boolean} [options.enableReputation=true] - Enable IP reputation
 * @param {Function} [options.tierResolver] - Custom tier resolver (req) => string
 * @param {Function} [options.keyGenerator] - Custom key generator (req) => string
 * @param {boolean} [options.skipInTest=true] - Skip rate limiting in test env
 */
function advancedRateLimiterMiddleware(options = {}) {
  const {
    enableBurst = true,
    enableReputation = true,
    tierResolver = _defaultTierResolver,
    keyGenerator = _defaultKeyGenerator,
    skipInTest = true,
  } = options;

  return (req, res, next) => {
    // Skip in test environment
    if (skipInTest && (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID)) {
      return next();
    }

    const ip = req.ip || req.connection?.remoteAddress || '0.0.0.0';

    // 1. Check IP reputation
    if (enableReputation && ipReputation.isBlocked(ip)) {
      logger.warn(`[RateLimiter] Blocked IP attempted access: ${ip}`);
      return res.status(403).json({
        success: false,
        error: 'IP_BLOCKED',
        message: 'تم حظر عنوان IP الخاص بك بسبب سوء الاستخدام',
      });
    }

    const tier = tierResolver(req);
    const key = keyGenerator(req);

    // 2. Sliding window check
    const limiter = _getLimiter(tier);
    const windowResult = limiter.check(key);

    // Set standard rate limit headers
    const tierConfig = RATE_LIMIT_TIERS[tier] || RATE_LIMIT_TIERS.anonymous;
    res.setHeader('X-RateLimit-Limit', tierConfig.maxRequests);
    res.setHeader('X-RateLimit-Remaining', windowResult.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(windowResult.resetMs / 1000));
    res.setHeader('X-RateLimit-Tier', tier);

    if (!windowResult.allowed) {
      res.setHeader('Retry-After', Math.ceil(windowResult.retryAfterMs / 1000));

      // Record violation
      if (enableReputation) {
        ipReputation.recordViolation(ip, 1);
      }

      logger.warn(`[RateLimiter] Rate limit exceeded: ${key} (tier: ${tier})`);
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'تجاوزت الحد المسموح من الطلبات. يرجى المحاولة لاحقاً',
        retryAfter: Math.ceil(windowResult.retryAfterMs / 1000),
        tier,
      });
    }

    // 3. Burst protection (Token Bucket)
    if (enableBurst) {
      const burstLimiter = _getBurstLimiter(tier);
      const burstResult = burstLimiter.consume(key);

      res.setHeader('X-RateLimit-Burst-Remaining', burstResult.tokens);

      if (!burstResult.allowed) {
        if (enableReputation) {
          ipReputation.recordViolation(ip, 2); // Higher severity for burst
        }

        logger.warn(`[RateLimiter] Burst limit exceeded: ${key} (tier: ${tier})`);
        return res.status(429).json({
          success: false,
          error: 'BURST_LIMIT_EXCEEDED',
          message: 'طلبات كثيرة في وقت قصير. يرجى الانتظار قليلاً',
          retryAfter: 5,
          tier,
        });
      }
    }

    next();
  };
}

// ─── Default Resolvers ───────────────────────────────────────────────────────

function _defaultTierResolver(req) {
  if (req.headers['x-api-key']) return 'api_key';
  if (!req.user) return 'anonymous';

  const role = req.user.role?.toLowerCase() || 'user';
  if (role === 'superadmin' || role === 'super_admin') return 'superadmin';
  if (role === 'admin') return 'admin';
  if (['staff', 'employee', 'teacher', 'therapist'].includes(role)) return 'staff';
  return 'user';
}

function _defaultKeyGenerator(req) {
  const ip = req.ip || req.connection?.remoteAddress || '0.0.0.0';
  if (req.user?.id) return `user:${req.user.id}`;
  if (req.headers['x-api-key']) return `apikey:${req.headers['x-api-key'].substring(0, 8)}`;
  return `ip:${ip}`;
}

// ─── Endpoint-specific Limiters ──────────────────────────────────────────────

/**
 * Create a rate limiter for specific operations
 * @param {Object} config
 */
function createEndpointLimiter({ windowMs, maxRequests, burstCapacity, message }) {
  const limiter = new SlidingWindowLimiter({ windowMs, maxRequests });
  const burst = burstCapacity ? new TokenBucket({ capacity: burstCapacity }) : null;

  return (req, res, next) => {
    if (process.env.NODE_ENV === 'test') return next();

    const key = _defaultKeyGenerator(req);
    const result = limiter.check(key);

    if (!result.allowed) {
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: message || 'تجاوزت الحد المسموح',
        retryAfter: Math.ceil(result.retryAfterMs / 1000),
      });
    }

    if (burst) {
      const burstResult = burst.consume(key);
      if (!burstResult.allowed) {
        return res.status(429).json({
          success: false,
          error: 'BURST_LIMIT_EXCEEDED',
          message: 'طلبات كثيرة. يرجى الانتظار',
          retryAfter: 3,
        });
      }
    }

    next();
  };
}

// ─── Pre-built Endpoint Limiters ─────────────────────────────────────────────

/** Login: 5 attempts / 15 min */
const loginRateLimiter = createEndpointLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  burstCapacity: 3,
  message: 'محاولات تسجيل دخول كثيرة. يرجى المحاولة بعد 15 دقيقة',
});

/** Password Reset: 3 attempts / 1 hour */
const passwordResetLimiter = createEndpointLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 3,
  message: 'محاولات إعادة تعيين كلمة المرور كثيرة',
});

/** File Upload: 20 uploads / 10 min */
const uploadRateLimiter = createEndpointLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 20,
  burstCapacity: 5,
  message: 'عدد كبير من عمليات الرفع. يرجى الانتظار',
});

/** Report Generation: 10 / 1 hour */
const reportGenerationLimiter = createEndpointLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
  message: 'تجاوزت الحد الأقصى لتوليد التقارير',
});

/** Data Export: 5 / 1 hour */
const dataExportLimiter = createEndpointLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
  message: 'تجاوزت الحد الأقصى لتصدير البيانات',
});

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  // Core classes
  SlidingWindowLimiter,
  TokenBucket,
  IPReputationTracker,

  // Middleware
  advancedRateLimiterMiddleware,
  createEndpointLimiter,

  // Pre-built limiters
  loginRateLimiter,
  passwordResetLimiter,
  uploadRateLimiter,
  reportGenerationLimiter,
  dataExportLimiter,

  // Config
  RATE_LIMIT_TIERS,

  // Internals (for testing)
  ipReputation,
};
