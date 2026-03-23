// @deprecated — Prefer importing from 'errors/errorHandler' for new code
/* eslint-disable no-unused-vars */
/**
 * =====================================================
 * ADVANCED ERROR HANDLER MIDDLEWARE - Phase 6
 * =====================================================
 * Global error handling with comprehensive logging
 */

const fs = require('fs');
const path = require('path');
const { appendFile } = require('fs').promises;
const { ApiError } = require('../utils/apiResponse');
const logger = require('../utils/logger');

// Ensure logs directory exists (sync at startup is fine — runs once)
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file paths
const errorLogFile = path.join(logsDir, 'errors.log');
const analyticsFile = path.join(logsDir, 'errors.jsonl');

/**
 * Log error to file (async — non-blocking)
 */
const logErrorToFile = async (error, req) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.socket?.remoteAddress,
    statusCode: error.statusCode || 500,
    message: 'An internal error occurred',
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    userAgent: req.get('user-agent'),
    userId: req.user?._id || 'anonymous',
  };

  const logMessage = `${timestamp} [${error.statusCode || 500}] ${req.method} ${req.originalUrl} - ${'An internal error occurred'}\n`;

  await appendFile(errorLogFile, logMessage);
  // Append as JSONL (one JSON object per line) — avoids reading/parsing entire file
  await appendFile(analyticsFile, JSON.stringify(logEntry) + '\n');
};

/**
 * Format error response
 */
const formatErrorResponse = (error, req, isDevelopment = false) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';
  let errors = error.errors || [];

  // For 500 errors in production, use generic message to prevent information leakage
  const isProduction = !isDevelopment;
  const isServerError = statusCode >= 500;

  // Handle different error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    errors = Object.values(error.errors || {})
      .map(e => e.message)
      .join(', ');
    message = 'Validation Error';
  }

  if (error.code === 11000) {
    statusCode = 409;
    const field = Object.keys(error.keyPattern)[0];
    message = `Duplicate value for field: ${field}`;
    errors = [`${field} already exists`];
  }

  if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    errors = ['The provided ID is not valid'];
  }

  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    errors = ['Your authentication token is invalid or expired'];
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    errors = ['Your authentication token has expired. Please login again'];
  }

  // In production, mask server error details from client
  const safeMessage = isProduction && isServerError ? 'حدث خطأ داخلي في الخادم' : message;

  const response = {
    success: false,
    statusCode,
    message: safeMessage,
    error: safeMessage,
    timestamp: new Date().toISOString(),
  };

  // Add detailed errors in development
  if (isDevelopment) {
    response.errors = Array.isArray(errors) ? errors : [errors];
    response.path = req.originalUrl;
    response.stack = error.stack;
  } else {
    // In production, only include specific error field if exists
    if (error.errors) {
      response.errors = Array.isArray(errors) ? errors : [errors];
    }
  }

  return response;
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, _next) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Ensure error is an Error instance
  if (!(err instanceof Error)) {
    err = new Error(String(err));
  }

  // Log error
  logger.error(`${err.message}`, {
    route: `${req.method} ${req.originalUrl}`,
    user: req.user?._id || 'anonymous',
    ip: req.ip || req.socket?.remoteAddress,
    ...(isDevelopment && { stack: err.stack }),
  });

  // Log to file (async, fire-and-forget)
  logErrorToFile(err, req).catch(fileError => {
    logger.warn('Failed to log error to file:', fileError.message);
  });

  // Format and send response
  const response = formatErrorResponse(err, req, isDevelopment);

  // Set response headers
  res.set('X-Error-Id', `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  res.set('X-Error-Timestamp', new Date().toISOString());

  // Send response
  res.status(response.statusCode).json(response);
};

/**
 * 404 Not Found handler middleware
 */
const notFound = (req, res) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  const response = {
    success: false,
    message: 'Route not found',
    statusCode: 404,
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  };

  if (isDevelopment) {
    response.availableRoutes = '/api/docs';
  }

  res.status(404).json(response);
};

/**
 * Export error handlers
 */

// Custom error classes expected by route files
class ValidationError extends Error {
  constructor(message = 'Validation Error') {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.isOperational = true;
  }
}

class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
    this.isOperational = true;
  }
}

class TooManyRequestsError extends Error {
  constructor(message = 'Too Many Requests') {
    super(message);
    this.name = 'TooManyRequestsError';
    this.statusCode = 429;
    this.isOperational = true;
  }
}

module.exports = {
  errorHandler,
  notFound,
  ValidationError,
  UnauthorizedError,
  TooManyRequestsError,
};
module.exports.ApiError = ApiError;
