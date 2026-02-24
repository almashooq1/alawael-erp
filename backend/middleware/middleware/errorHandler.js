/**
 * =====================================================
 * ADVANCED ERROR HANDLER MIDDLEWARE - Phase 6
 * =====================================================
 * Global error handling with comprehensive logging
 */

const fs = require('fs');
const path = require('path');
const { ApiError } = require('../utils/apiResponse');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file path
const errorLogFile = path.join(logsDir, 'errors.log');

/**
 * Log error to file
 */
const logErrorToFile = (error, req) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    statusCode: error.statusCode || 500,
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    userAgent: req.get('user-agent'),
    userId: req.user?._id || 'anonymous',
  };

  const logMessage = `${timestamp} [${error.statusCode || 500}] ${req.method} ${req.originalUrl} - ${error.message}\n`;

  fs.appendFileSync(errorLogFile, logMessage);

  // Also write JSON for analysis
  const analyticsFile = path.join(logsDir, 'errors.json');
  const existingErrors = fs.existsSync(analyticsFile)
    ? JSON.parse(fs.readFileSync(analyticsFile, 'utf8'))
    : [];
  existingErrors.push(logEntry);
  // Keep only last 1000 errors
  const recentErrors = existingErrors.slice(-1000);
  fs.writeFileSync(analyticsFile, JSON.stringify(recentErrors, null, 2));
};

/**
 * Format error response
 */
const formatErrorResponse = (error, req, isDevelopment = false) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';
  let errors = error.errors || [];

  // Handle different error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    errors = Object.values(error.errors || {})
      .map((e) => e.message)
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

  let response = {
    success: false,
    statusCode,
    message,
    error: message,
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
module.exports = (err, req, res, _next) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Ensure error is an Error instance
  if (!(err instanceof Error)) {
    err = new Error(String(err));
  }

  // Log error
  console.error(`\n❌ ERROR: ${err.message}`);
  console.error(`📍 Route: ${req.method} ${req.originalUrl}`);
  console.error(`👤 User: ${req.user?._id || 'anonymous'}`);
  console.error(`🔗 IP: ${req.ip || req.connection.remoteAddress}`);

  if (isDevelopment) {
    console.error(`\n${err.stack}`);
  }

  // Log to file
  try {
    logErrorToFile(err, req);
  } catch (fileError) {
    console.error('Failed to log error to file:', fileError);
  }

  // Format and send response
  const response = formatErrorResponse(err, req, isDevelopment);

  // Set response headers
  res.set('X-Error-Id', `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  res.set('X-Error-Timestamp', new Date().toISOString());

  // Send response
  res.status(response.statusCode).json(response);
};

/**
 * Export ApiError for throwing custom errors
 */
module.exports.ApiError = ApiError;
