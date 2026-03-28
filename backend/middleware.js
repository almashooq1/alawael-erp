/* eslint-disable no-unused-vars */
/**
 * Core Middleware for Supply Chain Management System
 * - Authentication
 * - Error Handling
 * - Request Processing
 */

const jwt = require('jsonwebtoken');
const logger = require('./utils/logger');

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
 * NOTE: This middleware MARKS requests as authenticated/unauthenticated.
 * Use requireAuth() on protected routes to enforce authentication.
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      req.userId = null;
      req.user = null;
      return next();
    }

    try {
      const { jwtSecret } = require('./config/secrets');
      const decoded = jwt.verify(token, jwtSecret);
      req.userId = decoded.userId || decoded.sub || decoded.id || null;
      req.user = decoded;
    } catch (err) {
      req.userId = null;
      req.user = null;
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Require Authentication Middleware
 * Rejects unauthenticated requests with 401.
 * Mount AFTER authMiddleware on protected routes.
 */
const requireAuth = (req, res, next) => {
  if (!req.userId) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }
  next();
};

/**
 * Error Handler Middleware
 * Centralized error handling with structured logging
 */
const errorHandler = (err, _req, res, _next) => {
  logger.error('Request error:', {
    name: err.name,
    message: err.message,
    status: err.status,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });

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

  // Default error response — hide internal details in production
  const isProduction = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).json({
    success: false,
    error: err.name || 'Server Error',
    message: isProduction ? 'Internal server error' : err.message || 'Internal server error',
  });
};

/**
 * CORS Middleware
 * Handles cross-origin requests with proper origin validation
 */
const corsMiddleware = (req, res, next) => {
  const allowedOrigins = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const origin = req.headers.origin;

  // In production, validate origin; in dev, allow localhost
  if (allowedOrigins.length > 0 && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV !== 'production') {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  // In production with no matching origin: no ACAO header → browser blocks

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
};

/**
 * Request Logger Middleware
 * Logs all incoming requests using structured logger
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
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
 * In-memory rate limiting (suitable for single-process; use express-rate-limit
 * with Redis store for cluster mode)
 */
const rateLimit = (windowMs = 60000, maxRequests = 100) => {
  const requests = new Map();

  // Evict stale IPs every 5 minutes to prevent memory leak
  const cleanupInterval = setInterval(
    () => {
      const now = Date.now();
      const windowStart = now - windowMs;
      for (const [key, times] of requests.entries()) {
        const recent = times.filter(t => t > windowStart);
        if (recent.length === 0) requests.delete(key);
        else requests.set(key, recent);
      }
    },
    5 * 60 * 1000
  );
  if (cleanupInterval.unref) cleanupInterval.unref();

  return (req, res, next) => {
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
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
  requireAuth,
  errorHandler,
  corsMiddleware,
  requestLogger,
  validateRequest,
  rateLimit,
  requestIdMiddleware,
};
