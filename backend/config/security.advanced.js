/**
 * Advanced Security Middleware
 * إعدادات الأمان المتقدمة
 */

const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const logger = require('../utils/logger');

// Check if we're in test mode
const isTestMode = () => {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.SKIP_RATE_LIMIT === 'true' ||
    !!process.env.JEST_WORKER_ID
  );
};

// Enhanced Rate Limiting
const createRateLimiter = (options = {}) => {
  // Return pass-through middleware in test mode
  if (isTestMode()) {
    return (req, res, next) => next();
  }

  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests from this IP, please try again later.',
    standardHeaders = true,
    legacyHeaders = false,
    ...restOptions
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
      code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders,
    legacyHeaders,
    ...restOptions,
  });
};

// Strict rate limiter for auth endpoints
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 15 : 50, // 15 in prod (shared IPs), relaxed in dev
  message: 'Too many login attempts, please try again after 15 minutes.',
  skipSuccessfulRequests: true,
});

// API rate limiter
const apiRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'API rate limit exceeded.',
});

// MongoDB injection protection
const mongoSanitizeMiddleware = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn(`Potential NoSQL injection detected: ${key} from ${req.ip}`);
  },
});

// IP whitelist middleware
const ipWhitelist = (whitelist = []) => {
  return (req, res, next) => {
    if (whitelist.length === 0) {
      return next();
    }

    // Normalize IPv6-mapped IPv4 addresses (::ffff:127.0.0.1 → 127.0.0.1)
    let clientIp = req.ip || req.connection.remoteAddress || '';
    if (clientIp.startsWith('::ffff:')) {
      clientIp = clientIp.slice(7);
    }

    if (whitelist.includes(clientIp)) {
      return next();
    }

    logger.warn(`Blocked IP: ${clientIp}`);
    return res.status(403).json({
      success: false,
      message: 'Access denied',
      code: 'IP_BLOCKED',
    });
  };
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // XSS Protection — disabled (deprecated, can introduce XSS in legacy IE)
  res.setHeader('X-XSS-Protection', '0');

  // Content-Security-Policy — baseline restrictive policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: ws:; frame-ancestors 'none'"
  );

  // HSTS
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Prevent cross-domain policy files (Flash/PDF)
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  next();
};

// Request logging middleware. 4xx/5xx responses log at warn so they
// surface in the warn-filtered tail; 2xx/3xx only log when LOG_LEVEL=debug
// (a successful-request line per request would drown the file).
//
// Capture req.originalUrl up-front: by the time `res.on('finish')` fires
// the URL may have been rewritten by sub-routers (Express resets req.url
// when entering a mounted router), so `req.path` was logging "/" for
// every request through /api/v1/*.
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const originalUrl = req.originalUrl || req.url;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const isWarning = res.statusCode >= 400;
    const message = `${req.method} ${originalUrl} ${res.statusCode} ${duration}ms - ${req.ip}`;

    if (isWarning) {
      logger.warn(message);
    } else if (process.env.LOG_LEVEL === 'debug') {
      logger.info(message);
    }
  });

  next();
};

module.exports = {
  createRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  mongoSanitizeMiddleware,
  ipWhitelist,
  securityHeaders,
  requestLogger,
};
