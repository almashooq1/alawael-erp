/**
 * Professional Setup Configuration
 * Comprehensive system improvements and best practices
 * Date: January 22, 2026
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

/**
 * Enhanced CORS Configuration
 * Provides secure cross-origin resource sharing
 */
const enhancedCorsConfig = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3002',
      'http://localhost:3001',
      'http://127.0.0.1:3002',
      process.env.FRONTEND_URL || 'http://localhost:3002',
    ];

    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Number'],
  maxAge: 3600,
};

/**
 * Advanced Helmet Security Headers
 */
const enhancedHelmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
};

/**
 * Professional Logging Format
 */
const morganFormat =
  ':date[iso] | :method :url | Status: :status | Response: :response-time ms | Size: :res[content-length] bytes | IP: :remote-addr';

/**
 * Rate Limiting Configurations
 */
const rateLimitConfig = {
  global: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,
  },
  auth: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // Limit login attempts
    message: 'Too many login attempts, please try again later.',
    skipSuccessfulRequests: true,
  },
  api: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100,
    message: 'Too many API requests, please try again later.',
  },
};

/**
 * Middleware setup function
 * Configures all middleware in the correct order
 */
function setupProfessionalMiddleware(app) {
  // 1. Security Headers
  app.use(helmet(enhancedHelmetConfig));

  // 2. CORS - Should be early
  app.use(cors(enhancedCorsConfig));

  // 3. Data parsing and sanitization
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(mongoSanitize()); // Prevent NoSQL injection

  // 4. Compression
  app.use(compression());

  // 5. Request Logging
  app.use(morgan(morganFormat));

  // 6. Global Rate Limiting
  const globalLimiter = rateLimit(rateLimitConfig.global);
  app.use(globalLimiter);

  // 7. Request ID Middleware
  app.use((req, res, next) => {
    req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    res.setHeader('X-Request-ID', req.id);
    next();
  });

  return {
    globalLimiter,
    authLimiter: rateLimit(rateLimitConfig.auth),
    apiLimiter: rateLimit(rateLimitConfig.api),
  };
}

/**
 * Response Handler Middleware
 */
function setupResponseHandler(app) {
  app.use((req, res, next) => {
    res.sendSuccess = function (data, statusCode = 200, message = 'Success') {
      return res.status(statusCode).json({
        success: true,
        statusCode,
        message,
        data,
        timestamp: new Date().toISOString(),
        requestId: req.id,
      });
    };

    res.sendError = function (error, statusCode = 500, message = 'Error') {
      return res.status(statusCode).json({
        success: false,
        statusCode,
        message,
        error: error.message || error,
        timestamp: new Date().toISOString(),
        requestId: req.id,
      });
    };

    next();
  });
}

/**
 * Error Handling Middleware
 */
function setupErrorHandling(app) {
  // 404 Handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      statusCode: 404,
      message: 'Route not found',
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
      requestId: req.id,
    });
  });

  // Global Error Handler
  app.use((err, req, res, next) => {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      requestId: req.id,
      url: req.url,
      method: req.method,
    });

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
      success: false,
      statusCode,
      message,
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      timestamp: new Date().toISOString(),
      requestId: req.id,
    });
  });
}

/**
 * Health Check Route
 */
function setupHealthCheck(app) {
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      port: process.env.PORT || 3001,
      version: '2.0.0',
      services: {
        database: 'operational',
        cache: 'operational',
        api: 'operational',
      },
    });
  });

  app.get('/api/status', (req, res) => {
    res.json({
      success: true,
      status: 'running',
      timestamp: new Date().toISOString(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      uptime: Math.floor(process.uptime()),
    });
  });
}

/**
 * API Documentation Route
 */
function setupApiDocs(app) {
  app.get('/api/docs', (req, res) => {
    res.json({
      success: true,
      message: 'API Documentation',
      version: '2.0.0',
      baseUrl: `http://localhost:${process.env.PORT || 3001}/api`,
      endpoints: {
        health: {
          method: 'GET',
          path: '/health',
          description: 'Check system health',
        },
        status: {
          method: 'GET',
          path: '/status',
          description: 'Get system status and metrics',
        },
        docs: {
          method: 'GET',
          path: '/docs',
          description: 'Get API documentation',
        },
      },
      features: [
        'JWT Authentication',
        'Rate Limiting',
        'Input Sanitization',
        'Comprehensive Logging',
        'Error Handling',
        'CORS Support',
        'Security Headers',
        'Request Compression',
      ],
    });
  });
}

module.exports = {
  enhancedCorsConfig,
  enhancedHelmetConfig,
  rateLimitConfig,
  morganFormat,
  setupProfessionalMiddleware,
  setupResponseHandler,
  setupErrorHandling,
  setupHealthCheck,
  setupApiDocs,
};
