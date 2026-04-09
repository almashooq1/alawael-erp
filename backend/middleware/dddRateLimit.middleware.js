/**
 * DDD Rate Limiting — الحد من طلبات الدومينات
 *
 * Per-domain rate limits with tiered configuration.
 * Uses existing rateLimiter infrastructure (express-rate-limit + Redis store).
 *
 * Usage:
 *   const { dddRateLimit } = require('../middleware/dddRateLimit.middleware');
 *   router.use(dddRateLimit('sessions'));        // Default limits
 *   router.use(dddRateLimit('batch', 'strict')); // Strict limits
 *
 * @module middleware/dddRateLimit
 */

'use strict';

let rateLimit;
try {
  rateLimit = require('express-rate-limit');
} catch {
  // Graceful fallback if not installed
  rateLimit = null;
}

let RedisStore;
try {
  const rateLimitRedis = require('rate-limit-redis');
  RedisStore = rateLimitRedis.default || rateLimitRedis;
} catch {
  RedisStore = null;
}

let redisClient;
try {
  const { getRedisClient } = require('../config/redis');
  redisClient = getRedisClient ? getRedisClient() : null;
} catch {
  redisClient = null;
}

// ── Tier configurations ─────────────────────────────────────────────────

const TIERS = {
  // Normal API endpoints
  default: { windowMs: 60 * 1000, max: 120 },
  // Read-heavy (search, dashboards)
  relaxed: { windowMs: 60 * 1000, max: 200 },
  // Write-heavy or expensive (batch, export)
  strict: { windowMs: 60 * 1000, max: 30 },
  // Very expensive (AI, analytics)
  compute: { windowMs: 60 * 1000, max: 15 },
};

// Domain → tier mapping
const DOMAIN_TIERS = {
  core: 'default',
  episodes: 'default',
  timeline: 'relaxed',
  assessments: 'default',
  'care-plans': 'default',
  sessions: 'default',
  goals: 'default',
  workflow: 'default',
  programs: 'default',
  'ai-recommendations': 'compute',
  quality: 'default',
  family: 'default',
  reports: 'strict',
  'group-therapy': 'default',
  'tele-rehab': 'default',
  'ar-vr': 'default',
  behavior: 'default',
  research: 'default',
  'field-training': 'default',
  dashboards: 'relaxed',
  // Special routes
  search: 'relaxed',
  batch: 'strict',
  export: 'strict',
  platform: 'relaxed',
};

// ── Limiter cache (one instance per domain+tier) ────────────────────────

const limiterCache = new Map();

/**
 * Create or retrieve a rate limiter for the given domain/tier.
 *
 * @param {string} domain    - Domain name (e.g. 'sessions', 'batch')
 * @param {string} [tier]    - Override tier ('default'|'relaxed'|'strict'|'compute')
 * @returns {Function}       - Express middleware
 */
function dddRateLimit(domain, tier) {
  // If express-rate-limit isn't available, return passthrough
  if (!rateLimit) {
    return (_req, _res, next) => next();
  }

  const resolvedTier = tier || DOMAIN_TIERS[domain] || 'default';
  const cacheKey = `${domain}:${resolvedTier}`;

  if (limiterCache.has(cacheKey)) {
    return limiterCache.get(cacheKey);
  }

  const config = TIERS[resolvedTier] || TIERS.default;

  const limiterOptions = {
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: req => {
      const userId = req.user?._id || req.user?.id || req.ip;
      return `ddd:${domain}:${userId}`;
    },
    handler: (_req, res) => {
      return res.status(429).json({
        success: false,
        message: 'تم تجاوز الحد الأقصى للطلبات — Rate limit exceeded',
        message_en: `Rate limit exceeded for ${domain} (${config.max} requests per ${config.windowMs / 1000}s)`,
        retryAfter: Math.ceil(config.windowMs / 1000),
      });
    },
  };

  // Use Redis store if available for distributed rate-limiting
  if (RedisStore && redisClient) {
    try {
      limiterOptions.store = new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
        prefix: `rl:ddd:${domain}:`,
      });
    } catch {
      // Fall back to in-memory
    }
  }

  const limiter = rateLimit(limiterOptions);
  limiterCache.set(cacheKey, limiter);
  return limiter;
}

/**
 * Auto-detect domain from route path and apply rate limiting
 */
function dddAutoRateLimit() {
  return (req, res, next) => {
    if (!rateLimit) return next();

    // Extract domain from path like /api/v1/ddd/sessions/...
    const match = req.path.match(/\/ddd\/([^/]+)/);
    if (match) {
      const domain = match[1];
      const limiter = dddRateLimit(domain);
      return limiter(req, res, next);
    }
    next();
  };
}

module.exports = {
  dddRateLimit,
  dddAutoRateLimit,
  TIERS,
  DOMAIN_TIERS,
};
