/**
 * Advanced Error Handler
 * معالج أخطاء متقدم مع تصنيفات وعمليات الاسترجاع
 */

class AppError extends Error {
  constructor(message, statusCode, code = null, details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error types
const ErrorTypes = {
  // Client errors (4xx)
  BAD_REQUEST: { code: 'BAD_REQUEST', status: 400 },
  UNAUTHORIZED: { code: 'UNAUTHORIZED', status: 401 },
  FORBIDDEN: { code: 'FORBIDDEN', status: 403 },
  NOT_FOUND: { code: 'NOT_FOUND', status: 404 },
  CONFLICT: { code: 'CONFLICT', status: 409 },
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', status: 422 },
  RATE_LIMIT: { code: 'RATE_LIMIT_EXCEEDED', status: 429 },

  // Server errors (5xx)
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', status: 500 },
  SERVICE_UNAVAILABLE: { code: 'SERVICE_UNAVAILABLE', status: 503 },
  DATABASE_ERROR: { code: 'DATABASE_ERROR', status: 500 },

  // Custom errors
  AUTH_ERROR: { code: 'AUTH_ERROR', status: 401 },
  PERMISSION_ERROR: { code: 'PERMISSION_ERROR', status: 403 },
};

/**
 * Create typed error
 */
function createError(message, type, details = {}) {
  const errorType = ErrorTypes[type] || ErrorTypes.INTERNAL_ERROR;
  return new AppError(message, errorType.status, errorType.code, details);
}

/**
 * Global error handler
 */
const globalErrorHandler = (err, req, res, next) => {
  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'An unexpected error occurred';
  let code = err.code || 'INTERNAL_ERROR';
  let details = err.details || {};

  // Log error
  console.error(`[ERROR] ${code}: ${message}`, {
    statusCode,
    stack: err.stack?.split('\n').slice(0, 3),
    method: req.method,
    url: req.originalUrl,
    body: req.body,
    ...details,
  });

  // Validation errors
  if (err.name === 'ValidationError') {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = Object.keys(err.errors || {}).reduce((acc, key) => {
      acc[key] = err.errors[key].message;
      return acc;
    }, {});
  }

  // MongoDB errors
  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    if (err.code === 11000) {
      statusCode = 409;
      code = 'CONFLICT';
      message = 'Duplicate key error';
    } else {
      statusCode = 500;
      code = 'DATABASE_ERROR';
      message = 'Database operation failed';
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = 'Token expired';
  }

  // Response
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details,
      }),
    },
  });
};

/**
 * Async error wrapper
 */
const asyncHandler = fn => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Not found handler
 */
const notFoundHandler = (req, res, next) => {
  const err = new AppError(`Cannot ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND');
  next(err);
};

/**
 * Error recovery middleware
 */
const errorRecovery = (err, req, res, next) => {
  // Attempt recovery for specific errors
  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Service temporarily unavailable. Retrying...',
        retryAfter: 5,
      },
    });
  }

  next(err);
};

module.exports = {
  AppError,
  ErrorTypes,
  createError,
  globalErrorHandler,
  asyncHandler,
  notFoundHandler,
  errorRecovery,
};
