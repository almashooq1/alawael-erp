/**
 * Advanced Security Middleware
 * إعدادات الأمان المتقدمة
 */

const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

// Enhanced Rate Limiting
const createRateLimiter = (options = {}) => {
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
  max: 5, // 5 requests per window
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
    console.warn(`⚠️  Potential NoSQL injection detected: ${key} from ${req.ip}`);
  },
});

// IP whitelist middleware
const ipWhitelist = (whitelist = []) => {
  return (req, res, next) => {
    if (whitelist.length === 0) {
      return next();
    }

    const clientIp = req.ip || req.connection.remoteAddress;

    if (whitelist.includes(clientIp)) {
      return next();
    }

    console.warn(`⚠️  Blocked IP: ${clientIp}`);
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

  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // HSTS
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'WARN' : 'INFO';

    if (process.env.LOG_LEVEL === 'debug' || logLevel === 'WARN') {
      console.log(
        `[${logLevel}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms - ${req.ip}`
      );
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
