/**
 * Enhanced Error Handler Middleware
 * معالج الأخطاء المحسّن
 */

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
  console.error('ERROR 💥', err);

  res.status(err.statusCode || 500).json({
    success: false,
    statusCode: err.statusCode || 500,
    code: err.code || 'INTERNAL_ERROR',
    message: err.message,
    error: err,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Send error response in production
 */
const sendErrorProd = (err, req, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      code: err.code,
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }
  // Programming or other unknown error: don't leak error details
  else {
    console.error('ERROR 💥', err);

    res.status(500).json({
      success: false,
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
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
    timestamp: new Date().toISOString(),
  });
};

/**
 * Unhandled Rejection Handler
 */
const unhandledRejectionHandler = () => {
  process.on('unhandledRejection', err => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    console.error(err.stack);

    // Give time for logs to flush
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
};

/**
 * Uncaught Exception Handler
 */
const uncaughtExceptionHandler = () => {
  process.on('uncaughtException', err => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    console.error(err.stack);

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
};
