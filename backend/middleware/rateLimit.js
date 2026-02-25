const rateLimit = require('express-rate-limit');

// Helper to create permissive limiters for demo mode
const createPermissiveLimiter = () =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10000,
    message: { success: false, message: 'Rate limited' },
    standardHeaders: true,
    legacyHeaders: false,
  });

const isDemo = process.env.USE_MOCK_DB === 'true' || process.env.NODE_ENV === 'test';

// General API rate limiter
const apiLimiter = isDemo
  ? createPermissiveLimiter()
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes',
      },
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    });

// Strict rate limiter for auth endpoints
const authLimiter = isDemo
  ? createPermissiveLimiter()
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
const passwordLimiter = isDemo
  ? createPermissiveLimiter()
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
const createAccountLimiter = isDemo
  ? createPermissiveLimiter()
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
