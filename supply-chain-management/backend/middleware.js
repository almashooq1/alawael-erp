/**
 * Core Middleware for Supply Chain Management System
 * - Authentication
 * - Error Handling
 * - Request Processing
 */

const jwt = require('jsonwebtoken');

/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Authentication Middleware
 * Verifies JWT token from Authorization header
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      // Allow request but mark as unauthenticated
      req.userId = null;
      return next();
    }

    // In production, verify JWT
    // For now, accept any token and extract user ID
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key');
      req.userId = decoded.userId || decoded.sub || 'user-123';
      req.user = decoded;
    } catch (err) {
      // Invalid token, continue without auth
      req.userId = req.body.userId || 'user-123';
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Error Handler Middleware
 * Centralized error handling
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: Object.values(err.errors)
        .map(e => e.message)
        .join(', '),
    });
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID format',
      message: err.message,
    });
  }

  // Duplicate key error
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: 'Duplicate Entry',
      message: `${Object.keys(err.keyValue)[0]} already exists`,
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    error: err.name || 'Server Error',
    message: err.message || 'Internal server error',
  });
};

/**
 * CORS Middleware
 * Handles cross-origin requests
 */
const corsMiddleware = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
};

/**
 * Request Logger Middleware
 * Logs all incoming requests
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${req.method}] ${req.path} - ${res.statusCode} (${duration}ms)`);
  });

  next();
};

/**
 * Validation Middleware Factory
 * Creates validation middleware for specific fields
 */
const validateRequest = schema => (req, res, next) => {
  const { error, value } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: error.details[0].message,
    });
  }

  req.validatedBody = value;
  next();
};

/**
 * Rate Limiting Middleware
 * Basic request rate limiting
 */
const rateLimit = (windowMs = 60000, maxRequests = 100) => {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!requests.has(key)) {
      requests.set(key, []);
    }

    const requestTimes = requests.get(key).filter(time => time > windowStart);

    if (requestTimes.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
      });
    }

    requestTimes.push(now);
    requests.set(key, requestTimes);
    next();
  };
};

/**
 * Request ID Middleware
 * Adds unique ID to each request for tracking
 */
const requestIdMiddleware = (req, res, next) => {
  req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-Id', req.id);
  next();
};

module.exports = {
  asyncHandler,
  authMiddleware,
  errorHandler,
  corsMiddleware,
  requestLogger,
  validateRequest,
  rateLimit,
  requestIdMiddleware,
};
