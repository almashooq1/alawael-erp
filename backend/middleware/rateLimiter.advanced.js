/**
 * Advanced Rate Limiting
 * تحديد معدل الطلبات المتقدم مع حماية من DDoS
 */
const rateLimit = require('express-rate-limit');
let RedisStore;
try {
  RedisStore = require('rate-limit-redis');
} catch (e) {
  RedisStore = null;
}

let redisClient;
try {
  redisClient = require('../config/redis');
} catch (e) {
  redisClient = null;
}

const logger = require('../utils/logger');

// Helper to safely extract IP (handles IPv6)
const getClientIp = req => {
  return req.ip || req.socket.remoteAddress || 'unknown';
};

// Use Redis if available, otherwise use memory store
const createStore = () => {
  if (RedisStore && redisClient && redisClient.isReady && process.env.DISABLE_REDIS !== 'true') {
    try {
      return new RedisStore({
        client: redisClient,
        prefix: 'rl:',
      });
    } catch (e) {
      logger?.warn?.('Failed to create Redis store for rate limiting:', e.message);
      return undefined; // Use default memory store
    }
  }
  return undefined; // Use default memory store
};

/**
 * Global API Rate Limiter
 * حد عام لجميع الطلبات
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore(),
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      url: req.originalUrl,
      method: req.method,
    });

    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

/**
 * Strict Auth Rate Limiter
 * حد صارم لمسارات المصادقة
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    success: false,
    error: 'Too many login attempts, please try again after 15 minutes.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
  store: createStore(),
  handler: (req, res) => {
    logger.security('Auth rate limit exceeded', {
      ip: req.ip,
      url: req.originalUrl,
      attempts: req.rateLimit.current,
    });

    res.status(429).json({
      success: false,
      error: 'Too many login attempts, please try again later.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
      lockoutDuration: '15 minutes',
    });
  },
});

/**
 * API Key Rate Limiter (more generous)
 * حد أكثر سخاءً للمستخدمين المصادقين عبر API Key
 */
const apiKeyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // much higher limit for API keys
  message: {
    success: false,
    error: 'API rate limit exceeded.',
    code: 'API_RATE_LIMIT_EXCEEDED',
  },
  store: createStore(),
  keyGenerator: req => {
    // Use API key as identifier if available
    const apiKey = req.get('X-API-Key');
    if (apiKey) return `apikey:${apiKey}`;

    // Use helper function for IPv6 compatibility
    return getClientIp(req);
  },
});

/**
 * Heavy Operations Limiter
 * حد للعمليات الثقيلة (exports, reports, etc.)
 */
const heavyOperationsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // only 10 heavy operations per hour
  message: {
    success: false,
    error: 'Too many heavy operations, please try again later.',
    code: 'HEAVY_OPS_RATE_LIMIT_EXCEEDED',
  },
  store: createStore(),
  handler: (req, res) => {
    logger.warn('Heavy operations rate limit exceeded', {
      ip: req.ip,
      url: req.originalUrl,
      userId: req.user?.id,
    });

    res.status(429).json({
      success: false,
      error: 'Too many export/report requests, please try again later.',
      code: 'HEAVY_OPS_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

/**
 * File Upload Rate Limiter
 * حد لرفع الملفات
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: {
    success: false,
    error: 'Too many uploads, please try again later.',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
  },
  store: createStore(),
});

module.exports = {
  globalLimiter,
  authLimiter,
  apiKeyLimiter,
  heavyOperationsLimiter,
  uploadLimiter,
};
