/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Unified Error Handler Middleware
 * معالج الأخطاء الموحّد
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Single centralized middleware that handles ALL error types:
 *  - AppError subclasses (operational errors)
 *  - Mongoose errors (CastError, ValidationError, duplicate key)
 *  - JWT errors (invalid token, expired token)
 *  - Rate limit / timeout errors
 *  - Unknown / programming errors
 *
 * Features:
 *  - Error frequency tracking (circuit-breaker style alerting)
 *  - Request correlation via requestId
 *  - Production-safe messages (no stack leak)
 *  - Structured logging via logger
 */

'use strict';

const logger = require('../utils/logger');
const { AppError } = require('./AppError');

// ─── Error Frequency Tracking ────────────────────────────────────────────────

const errorFrequency = {
  counts: new Map(),
  windowMs: 60_000,
  threshold: 50,
  lastReset: Date.now(),
};

const trackError = code => {
  const now = Date.now();
  if (now - errorFrequency.lastReset > errorFrequency.windowMs) {
    errorFrequency.counts.clear();
    errorFrequency.lastReset = now;
  }
  // Cap map size to prevent memory exhaustion under DDoS / error-cascade
  if (errorFrequency.counts.size > 10000) return;
  const count = (errorFrequency.counts.get(code) || 0) + 1;
  errorFrequency.counts.set(code, count);
  if (count === errorFrequency.threshold) {
    logger.error(`⚠️ ERROR SPIKE: ${code} reached ${count} occurrences in 1 minute`);
  }
};

const getErrorStats = () => Object.fromEntries(errorFrequency.counts);

// ─── Mongoose / JWT → AppError Classifiers ───────────────────────────────────

const classifyError = err => {
  // Already an AppError — pass through
  if (err instanceof AppError) return err;

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new AppError(message, 400, 'INVALID_ID');
  }

  // Mongoose duplicate key (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : 'unknown';
    return new AppError(`Duplicate value for ${field}: ${value}`, 409, 'DUPLICATE_KEY');
  }

  // Mongoose ValidationError
  if (err.name === 'ValidationError' && err.errors) {
    const messages = Object.values(err.errors).map(e => e.message);
    const appErr = new AppError(
      `Validation failed: ${messages.join('. ')}`,
      400,
      'VALIDATION_ERROR'
    );
    appErr.errors = messages;
    return appErr;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return new AppError('Invalid token. Please log in again.', 401, 'INVALID_TOKEN');
  }
  if (err.name === 'TokenExpiredError') {
    return new AppError('Token expired. Please log in again.', 401, 'TOKEN_EXPIRED');
  }

  // Rate limit (from express-rate-limit)
  if (err.statusCode === 429 || err.status === 429) {
    return new AppError(err.message || 'Too many requests', 429, 'RATE_LIMIT_EXCEEDED');
  }

  // Timeout
  if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
    return new AppError('Request timed out', 408, 'REQUEST_TIMEOUT');
  }

  // Unknown — wrap in AppError but mark as non-operational
  const wrapped = new AppError(err.message || 'Internal Server Error', err.statusCode || 500);
  wrapped.isOperational = false;
  wrapped.originalError = err;
  return wrapped;
};

// ─── Error Handler Middleware (4-arg) ────────────────────────────────────────

const errorHandler = (err, req, res, _next) => {
  const classified = classifyError(err);
  const isProd = process.env.NODE_ENV === 'production';

  // Track for alerting
  trackError(classified.code);

  // Structured logging
  const logPayload = {
    code: classified.code,
    statusCode: classified.statusCode,
    route: `${req.method} ${req.originalUrl}`,
    requestId: req.id || req.headers?.['x-request-id'],
    user: req.user?._id || 'anonymous',
    ip: req.ip || req.socket?.remoteAddress,
    ...(!isProd && { stack: (err.stack || classified.stack || '').split('\n').slice(0, 5) }),
  };

  if (classified.statusCode >= 500) {
    logger.error(`❌ ${classified.message}`, logPayload);
  } else {
    logger.warn(`⚠️ ${classified.message}`, logPayload);
  }

  // Production: mask 5xx messages to prevent info leakage
  const safeMessage =
    isProd && classified.statusCode >= 500 ? 'حدث خطأ داخلي في الخادم' : classified.message;

  // Build response
  const response = {
    success: false,
    statusCode: classified.statusCode,
    code: classified.code,
    message: safeMessage,
    ...(classified.errors && { errors: classified.errors }),
    timestamp: new Date().toISOString(),
    ...(!isProd && {
      path: req.originalUrl,
      stack: (err.stack || '').split('\n').slice(0, 3),
    }),
  };

  // Error tracing headers (safe — res.set may not exist in minimal mocks)
  if (typeof res.set === 'function') {
    res.set('X-Error-Code', classified.code);
    if (req.id) res.set('X-Request-Id', req.id);
  }

  res.status(classified.statusCode).json(response);
};

// ─── 404 Not Found Handler ───────────────────────────────────────────────────

const notFoundHandler = (req, res, _next) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.status(404).json({
    success: false,
    statusCode: 404,
    code: 'NOT_FOUND',
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    ...(!isProd && { hint: 'Check /api-docs for available endpoints' }),
    timestamp: new Date().toISOString(),
  });
};

// ─── Async Handler (wrap async route handlers) ───────────────────────────────

const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ─── Process-Level Handlers ──────────────────────────────────────────────────

const uncaughtExceptionHandler = () => {
  process.on('uncaughtException', err => {
    logger.error('💥 UNCAUGHT EXCEPTION:', { message: err.message, stack: err.stack });
    // Give time for logger to flush, then exit
    setTimeout(() => process.exit(1), 1000);
  });
};

const unhandledRejectionHandler = () => {
  process.on('unhandledRejection', (reason, _promise) => {
    logger.error('💥 UNHANDLED REJECTION:', {
      reason: reason?.message || reason,
      stack: reason?.stack,
    });
    // In production, unhandled rejections indicate serious bugs.
    // Exit after logging to avoid undefined state (Node 15+ does this by default).
    if (process.env.NODE_ENV === 'production') {
      setTimeout(() => process.exit(1), 1000);
    }
  });
};

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  catchAsync: asyncHandler,
  classifyError,
  getErrorStats,
  uncaughtExceptionHandler,
  unhandledRejectionHandler,
};
