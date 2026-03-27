/**
 * 🚦 Rate Limiter Middleware - تحديد معدل الطلبات
 * نظام ERP الألوائل - إصدار احترافي
 *
 * Redis-backed (via express-rate-limit + rate-limit-redis) for K8s HPA multi-pod.
 * Falls back to in-memory store when Redis is unavailable or in test/dev.
 */

const rateLimit = require('express-rate-limit');
const { securityConfig, RateLimiter } = require('../config/security.config');
const logger = require('../utils/logger');

// ─── Redis Store Factory ────────────────────────────────────────────────────
let _redisStoreAvailable = null; // null = not checked yet

/**
 * Try to create a RedisStore for express-rate-limit.
 * Returns undefined when Redis is not available → express-rate-limit uses built-in MemoryStore.
 */
const getRedisStore = (prefix = 'rl:') => {
  // Skip Redis in test mode or when explicitly disabled
  if (
    process.env.NODE_ENV === 'test' ||
    process.env.USE_MOCK_DB === 'true' ||
    process.env.DISABLE_REDIS === 'true'
  ) {
    return undefined;
  }

  try {
    if (_redisStoreAvailable === false) return undefined;

    const { RedisStore } = require('rate-limit-redis');
    const { getRedisClient } = require('../config/redis.config');
    const client = getRedisClient();

    if (!client || client.status === 'end') {
      _redisStoreAvailable = false;
      return undefined;
    }

    _redisStoreAvailable = true;
    return new RedisStore({
      // ioredis-compatible sendCommand: command name + args array
      sendCommand: (...args) => client.call(...args),
      prefix,
    });
  } catch (err) {
    if (_redisStoreAvailable === null) {
      logger.warn(`Rate limiter Redis store unavailable, using memory: ${err.message}`);
      _redisStoreAvailable = false;
    }
    return undefined;
  }
};

// ─── Client Identifier ──────────────────────────────────────────────────────
/**
 * الحصول على معرف العميل (IP + optional User ID)
 */
const getClientIdentifier = req => {
  const ip = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || '0.0.0.0';
  const userId = req.user?.id || '';
  return userId ? `${ip}:${userId}` : ip;
};

// ─── Shared Handler ─────────────────────────────────────────────────────────
const rateLimitHandler = message => (_req, res) => {
  res.status(429).json({
    success: false,
    message,
    retryAfter: Math.ceil(res.getHeader('Retry-After') || 60),
  });
};

// ─── Standard rate-limit factories ──────────────────────────────────────────

/**
 * Build an express-rate-limit middleware from config.
 * @param {object} cfg - { windowMs, max, message }
 * @param {object} [opts] - additional options
 */
const buildLimiter = (cfg, opts = {}) => {
  const skip = opts.skipEnvs || ['test'];
  return rateLimit({
    windowMs: cfg.windowMs,
    max: cfg.max,
    standardHeaders: true, // RateLimit-* headers (draft-6)
    legacyHeaders: true, // X-RateLimit-* headers
    store: getRedisStore(opts.prefix),
    keyGenerator: opts.keyGenerator || getClientIdentifier,
    skip: _req => skip.includes(process.env.NODE_ENV),
    handler: rateLimitHandler(cfg.message?.error || 'تجاوزت الحد المسموح من الطلبات'),
    validate: { keyGeneratorIpFallback: false }, // We handle IP extraction ourselves
    ...opts.extra,
  });
};

// ─── Pre-built Limiters ─────────────────────────────────────────────────────

/** middleware عام لتحديد المعدل — 100 req / 15 min */
const generalLimiter = buildLimiter(securityConfig.rateLimit.general, {
  prefix: 'rl:general:',
});

/** middleware لتحديد معدل تسجيل الدخول — 5 req / 15 min */
const loginLimiter = buildLimiter(securityConfig.rateLimit.login, {
  prefix: 'rl:login:',
  skipEnvs: ['test', 'development'],
  keyGenerator: req => req.ip || req.connection?.remoteAddress || '0.0.0.0',
});

/** middleware لتحديد معدل إنشاء الحسابات — 3 req / 1h */
const registerLimiter = buildLimiter(securityConfig.rateLimit.register, {
  prefix: 'rl:register:',
  keyGenerator: req => req.ip || req.connection?.remoteAddress || '0.0.0.0',
});

/** middleware لتحديد معدل API — 60 req / 1 min */
const apiLimiter = buildLimiter(securityConfig.rateLimit.api, {
  prefix: 'rl:api:',
});

/** middleware لتحديد معدل التصدير — 10 req / 1h */
const exportLimiter = buildLimiter(securityConfig.rateLimit.export, {
  prefix: 'rl:export:',
  skipEnvs: [], // enforce always
});

// ─── Dynamic / Parameterized Limiters ───────────────────────────────────────

/**
 * middleware لتحديد معدل مخصص
 */
const createCustomLimiter = (options = {}) => {
  return buildLimiter(
    {
      windowMs: options.windowMs || 60000,
      max: options.max || 100,
      message: options.message || { error: 'تجاوزت الحد المسموح من الطلبات' },
    },
    {
      prefix: options.prefix || 'rl:custom:',
      keyGenerator: options.keyGenerator || getClientIdentifier,
      skipEnvs: options.skipEnvs || ['test'],
    }
  );
};

/**
 * middleware لتحديد معدل بناء على المستخدم
 */
const userBasedLimiter = (maxRequests = 100, windowMs = 60000) => {
  return buildLimiter(
    {
      windowMs,
      max: maxRequests,
      message: { error: 'تجاوزت الحد المسموح من الطلبات لهذا الحساب' },
    },
    {
      prefix: 'rl:user:',
      keyGenerator: req => (req.user ? `user:${req.user.id}` : getClientIdentifier(req)),
      extra: {
        skip: req => !req.user || process.env.NODE_ENV === 'test',
      },
    }
  );
};

/**
 * middleware لتحديد معدل بناء على الدور
 * @param {Object} limits - { admin: {max, windowMs}, user: {max, windowMs}, ... }
 */
const roleBasedLimiter = (limits = {}) => {
  // Pre-build one limiter per role
  const limitersByRole = {};
  for (const [role, cfg] of Object.entries(limits)) {
    limitersByRole[role] = buildLimiter(
      {
        windowMs: cfg.windowMs || 60000,
        max: cfg.max || 100,
        message: { error: `تجاوزت الحد المسموح لدور ${role}` },
      },
      {
        prefix: `rl:role:${role}:`,
        keyGenerator: req => `role:${role}:${req.user?.id || 'anon'}`,
      }
    );
  }

  return (req, res, next) => {
    if (!req.user?.role || !limitersByRole[req.user.role]) {
      return next();
    }
    return limitersByRole[req.user.role](req, res, next);
  };
};

/**
 * middleware لتحديد معدل للعمليات الحساسة — 5 req / 1h (singleton, NOT per-request)
 */
const sensitiveOperationLimiter = buildLimiter(
  {
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { error: 'تجاوزت الحد المسموح من العمليات الحساسة. يرجى المحاولة لاحقاً' },
  },
  {
    prefix: 'rl:sensitive:',
    skipEnvs: [], // enforce always
  }
);

// ─── Utility Functions ──────────────────────────────────────────────────────

// In-memory RateLimiter instances for resetLimiter/checkLimit backward compat
const _legacyLimiters = {
  general: new RateLimiter(securityConfig.rateLimit.general),
  login: new RateLimiter(securityConfig.rateLimit.login),
  register: new RateLimiter(securityConfig.rateLimit.register),
  api: new RateLimiter(securityConfig.rateLimit.api),
  export: new RateLimiter(securityConfig.rateLimit.export),
};

/**
 * إعادة تعيين الحد for a specific identifier (best-effort)
 */
const resetLimiter = (type, identifier) => {
  if (_legacyLimiters[type]) {
    _legacyLimiters[type].reset(identifier);
  }
};

/**
 * فحص الحد دون منع (read-only check)
 */
const checkLimit = (type, identifier) => {
  if (_legacyLimiters[type]) {
    const result = _legacyLimiters[type].check(identifier);
    return {
      allowed: result.allowed,
      remaining: result.remaining,
      resetAt: result.resetAt,
    };
  }
  return { allowed: true, remaining: Infinity, resetAt: null };
};

/**
 * middleware للحد التكيفي (يتكيف مع حمل الخادم)
 * Dynamically adjusts max based on heap usage every 60s.
 */
const adaptiveLimiter = (baseMax = 100, windowMs = 60000) => {
  let currentMax = baseMax;
  let lastAdjustment = Date.now();

  // Create an express-rate-limit instance; max is mutated on the returned middleware
  const limiter = rateLimit({
    windowMs,
    max: () => currentMax, // dynamic getter — express-rate-limit v7+ supports function
    standardHeaders: true,
    legacyHeaders: true,
    store: getRedisStore('rl:adaptive:'),
    keyGenerator: getClientIdentifier,
    skip: () => process.env.NODE_ENV === 'test',
    handler: rateLimitHandler('الخادم مشغول، يرجى المحاولة لاحقاً'),
    validate: { keyGeneratorIpFallback: false },
  });

  // Adjust limit based on server load
  const adjustLimit = () => {
    const now = Date.now();
    if (now - lastAdjustment < 60000) return;

    const mem = process.memoryUsage();
    const ratio = mem.heapUsed / mem.heapTotal;

    if (ratio > 0.8) {
      currentMax = Math.max(Math.floor(baseMax * 0.5), 10);
    } else if (ratio > 0.6) {
      currentMax = Math.floor(baseMax * 0.75);
    } else {
      currentMax = baseMax;
    }
    lastAdjustment = now;
  };

  return (req, res, next) => {
    adjustLimit();
    return limiter(req, res, next);
  };
};

// ─── Backward Compatibility Aliases ─────────────────────────────────────────
const authLimiter = loginLimiter;
const passwordLimiter = createCustomLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  prefix: 'rl:password:',
  message: { error: 'تجاوزت الحد المسموح من محاولات تغيير كلمة المرور' },
});
const createAccountLimiter = registerLimiter;

module.exports = {
  // Primary exports
  generalLimiter,
  loginLimiter,
  registerLimiter,
  apiLimiter,
  exportLimiter,
  createCustomLimiter,
  userBasedLimiter,
  roleBasedLimiter,
  sensitiveOperationLimiter,
  resetLimiter,
  checkLimit,
  adaptiveLimiter,
  // Backward compatibility exports
  authLimiter,
  passwordLimiter,
  createAccountLimiter,
};
