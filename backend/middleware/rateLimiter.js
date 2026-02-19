const rateLimit = require('express-rate-limit');

const isDemo = process.env.USE_MOCK_DB === 'true' || process.env.NODE_ENV === 'test';
const isTestMode =
  process.env.NODE_ENV === 'test' ||
  process.env.SKIP_RATE_LIMIT === 'true' ||
  !!process.env.JEST_WORKER_ID;

// Helper to create permissive limiters for demo mode
const createPermissiveLimiter = () => {
  if (isTestMode) {
    // In test mode, completely bypass rate limiting
    return (req, res, next) => next();
  }

  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10000,
    message: { success: false, message: 'Rate limited' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req, res) => process.env.SKIP_RATE_LIMIT === 'true' || req.test === true,
  });
};

// General API rate limiter
const apiLimiter = isTestMode
  ? (req, res, next) => next()
  : isDemo
    ? rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10000,
        message: { success: false, message: 'Rate limited' },
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req, res) => process.env.SKIP_RATE_LIMIT === 'true' || req.test === true,
      })
    : rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: {
          success: false,
          message: 'Too many requests from this IP, please try again after 15 minutes',
        },
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        skip: (req, res) => process.env.SKIP_RATE_LIMIT === 'true' || req.test === true,
      });

// Strict rate limiter for auth endpoints
const authLimiter = isTestMode
  ? (req, res, next) => next()
  : isDemo
    ? rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // limit each IP to 5 requests per windowMs
        message: {
          success: false,
          message: 'Too many authentication attempts, please try again after 15 minutes',
        },
        skipSuccessfulRequests: true, // Don't count successful requests
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req, res) => process.env.SKIP_RATE_LIMIT === 'true' || req.test === true,
      })
    : rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // limit each IP to 5 requests per windowMs
        message: {
          success: false,
          message: 'Too many authentication attempts, please try again after 15 minutes',
        },
        skipSuccessfulRequests: true, // Don't count successful requests
        standardHeaders: true,
        legacyHeaders: false,
      });

// Password reset limiter (very strict)
const passwordLimiter = isTestMode
  ? (req, res, next) => next()
  : isDemo
    ? rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // limit each IP to 3 requests per hour
        message: {
          success: false,
          message: 'Too many password change attempts, please try again after 1 hour',
        },
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req, res) => process.env.SKIP_RATE_LIMIT === 'true' || req.test === true,
      })
    : rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // limit each IP to 3 requests per hour
        message: {
          success: false,
          message: 'Too many password change attempts, please try again after 1 hour',
        },
        standardHeaders: true,
        legacyHeaders: false,
      });

// Create account limiter
const createAccountLimiter = isTestMode
  ? (req, res, next) => next()
  : isDemo
    ? rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // limit each IP to 3 account creations per hour
        message: {
          success: false,
          message: 'Too many accounts created from this IP, please try again after 1 hour',
        },
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req, res) => process.env.SKIP_RATE_LIMIT === 'true' || req.test === true,
      })
    : rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // limit each IP to 3 account creations per hour
        message: {
          success: false,
          message: 'Too many accounts created from this IP, please try again after 1 hour',
        },
        standardHeaders: true,
        legacyHeaders: false,
      });

// During tests, skip strict rate limiting to avoid flakiness
let exportAuthLimiter = authLimiter;
let exportPasswordLimiter = passwordLimiter;
let exportCreateAccountLimiter = createAccountLimiter;

if (process.env.NODE_ENV === 'test') {
  exportAuthLimiter = (req, res, next) => next();
  exportPasswordLimiter = (req, res, next) => next();
  exportCreateAccountLimiter = (req, res, next) => next();
}

module.exports = {
  apiLimiter,
  authLimiter: exportAuthLimiter,
  passwordLimiter: exportPasswordLimiter,
  createAccountLimiter: exportCreateAccountLimiter,
};
