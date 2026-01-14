// backend/utils/errorHandler.js

class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date().toISOString();
  }
}

const errorHandler = (err, req, res, next) => {
  // Default error
  let error = {
    success: false,
    statusCode: err.statusCode || 500,
    message: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_SERVER_ERROR',
    timestamp: new Date().toISOString(),
  };

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    error = {
      ...error,
      statusCode: 400,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: messages,
    };
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    error = {
      ...error,
      statusCode: 409,
      message: `${field} already exists`,
      code: 'DUPLICATE_FIELD',
    };
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    error = {
      ...error,
      statusCode: 400,
      message: 'Invalid ID format',
      code: 'INVALID_ID',
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      ...error,
      statusCode: 401,
      message: 'Invalid token',
      code: 'INVALID_TOKEN',
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      ...error,
      statusCode: 401,
      message: 'Token expired',
      code: 'TOKEN_EXPIRED',
    };
  }

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', {
      message: err.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: err.stack,
    });
  }

  res.status(error.statusCode).json(error);
};

const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  AppError,
  errorHandler,
  asyncHandler,
};
