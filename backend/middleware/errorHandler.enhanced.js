// @deprecated — Prefer importing from 'errors/errorHandler' for new code
/**
 * Enhanced Error Handler Middleware
 * معالج الأخطاء المحسّن
 *
 * Features:
 *  - Structured error classification
 *  - Request correlation via requestId
 *  - Rate limit & timeout error detection
 *  - Error frequency tracking (circuit-breaker style)
 *  - Production-safe messages (no stack leak)
 */

const logger = require('../utils/logger');

// Track error frequency for alerting
const errorFrequency = {
  counts: new Map(),
  windowMs: 60000, // 1 minute window
  threshold: 50, // alert if >50 errors/min
  lastReset: Date.now(),
};

const trackError = code => {
  const now = Date.now();
  if (now - errorFrequency.lastReset > errorFrequency.windowMs) {
    errorFrequency.counts.clear();
    errorFrequency.lastReset = now;
  }
  const count = (errorFrequency.counts.get(code) || 0) + 1;
  errorFrequency.counts.set(code, count);
  if (count === errorFrequency.threshold) {
    logger.error(`⚠️ ERROR SPIKE: ${code} reached ${count} occurrences in 1 minute`);
  }
};

const getErrorStats = () => {
  return Object.fromEntries(errorFrequency.counts);
};

/**
 * Custom Application Error
 * خطأ مخصص للتطبيق
 */
class AppError extends Error {
  constructor(message, statusCode, code = 'APP_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async error wrapper
 * غلاف للأخطاء غير المتزامنة
 */
const asyncHandler = fn => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle MongoDB Cast Errors
 */
const handleCastError = err => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400, 'INVALID_ID');
};

/**
 * Handle MongoDB Duplicate Key Errors
 */
const handleDuplicateKeyError = err => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate value for ${field}: ${value}`;
  return new AppError(message, 409, 'DUPLICATE_KEY');
};

/**
 * Handle MongoDB Validation Errors
 */
const handleValidationError = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Validation failed: ${errors.join('. ')}`;
  return new AppError(message, 400, 'VALIDATION_ERROR');
};

/**
 * Handle JWT Errors
 */
const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again.', 401, 'INVALID_TOKEN');
};

/**
 * Handle JWT Expired Errors
 */
const handleJWTExpiredError = () => {
  return new AppError('Token expired. Please log in again.', 401, 'TOKEN_EXPIRED');
};

/**
 * Send error response in development
 */
const sendErrorDev = (err, req, res) => {
  logger.error('DEV ERROR', {
    message: err.message,
    path: req.path,
    requestId: req.id,
  });

  res.status(err.statusCode || 500).json({
    success: false,
    statusCode: err.statusCode || 500,
    code: err.code || 'INTERNAL_ERROR',
    message: err.message || 'حدث خطأ داخلي',
    stack: err.stack,
    path: req.path,
    method: req.method,
    requestId: req.id || undefined,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Send error response in production
 */
const sendErrorProd = (err, req, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational || (err.statusCode && err.statusCode < 500)) {
    res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      code: err.code || err.name || 'APP_ERROR',
      message: err.message,
      requestId: req.id || undefined,
      timestamp: new Date().toISOString(),
    });
  }
  // Programming or other unknown error: don't leak error details
  else {
    logger.error('PROD ERROR (non-operational)', {
      message: 'حدث خطأ داخلي',
      path: req.path,
      requestId: req.id,
    });

    res.status(500).json({
      success: false,
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
      requestId: req.id || undefined,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Global Error Handler Middleware
 * معالج الأخطاء العام
 */
const errorHandler = (err, req, res, _next) => {
  err.statusCode = err.statusCode || 500;
  err.code = err.code || 'INTERNAL_ERROR';

  // Track error frequency
  trackError(err.code);

  // Handle specific framework errors
  if (err.type === 'entity.too.large') {
    err.statusCode = 413;
    err.code = 'PAYLOAD_TOO_LARGE';
    err.message = 'حجم الطلب كبير جدًا';
    err.isOperational = true;
  }

  if (err.code === 'EBADCSRFTOKEN') {
    err.statusCode = 403;
    err.code = 'CSRF_ERROR';
    err.message = 'Invalid CSRF token';
    err.isOperational = true;
  }

  if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
    err.statusCode = 408;
    err.code = 'REQUEST_TIMEOUT';
    err.message = 'انتهت مهلة الطلب';
    err.isOperational = true;
  }

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;

    // MongoDB Cast Error (invalid ObjectId)
    if (err.name === 'CastError') {
      error = handleCastError(error);
    }

    // MongoDB Duplicate Key Error
    if (err.code === 11000) {
      error = handleDuplicateKeyError(error);
    }

    // MongoDB Validation Error
    if (err.name === 'ValidationError') {
      error = handleValidationError(error);
    }

    // JWT Error
    if (err.name === 'JsonWebTokenError') {
      error = handleJWTError();
    }

    // JWT Expired Error
    if (err.name === 'TokenExpiredError') {
      error = handleJWTExpiredError();
    }

    // Rate limit exceeded
    if (err.statusCode === 429) {
      error = new AppError('تم تجاوز الحد الأقصى للطلبات', 429, 'RATE_LIMIT_EXCEEDED');
    }

    sendErrorProd(error, req, res);
  }
};

/**
 * 404 Not Found Handler
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    code: 'NOT_FOUND',
    message: `Cannot ${req.method} ${req.url}`,
    path: req.path,
    requestId: req.id || undefined,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Unhandled Rejection Handler
 */
const unhandledRejectionHandler = () => {
  process.on('unhandledRejection', err => {
    logger.error('UNHANDLED REJECTION — shutting down', {
      name: err?.name || 'Unknown',
      message: 'حدث خطأ داخلي',
      stack: err?.stack,
    });

    // Give time for logs to flush, then exit
    setTimeout(() => {
      process.exit(1);
    }, 2000);
  });
};

/**
 * Uncaught Exception Handler
 */
const uncaughtExceptionHandler = () => {
  process.on('uncaughtException', err => {
    logger.error('UNCAUGHT EXCEPTION — shutting down', {
      name: err?.name || 'Unknown',
      message: 'حدث خطأ داخلي',
      stack: err?.stack,
    });

    // Immediate exit for uncaught exceptions — state is unreliable
    process.exit(1);
  });
};

module.exports = {
  AppError,
  asyncHandler,
  errorHandler,
  notFoundHandler,
  unhandledRejectionHandler,
  uncaughtExceptionHandler,
  getErrorStats,
};
