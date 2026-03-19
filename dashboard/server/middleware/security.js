/**
 * Security Middleware for ALAWAEL Dashboard
 * Implements security best practices
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

/**
 * Configure security headers
 */
function configureSecurityHeaders(app) {
  // Use Helmet for basic security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'ws:', 'wss:'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    })
  );

  // Additional security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
  });
}

/**
 * API Rate Limiter - Prevent abuse
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for expensive operations
 */
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: 'Too many requests. This endpoint is rate-limited.',
    retryAfter: '1 minute',
  },
});

/**
 * Authentication middleware (basic API key check)
 */
function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.API_KEY;

  // Skip auth if no API_KEY is configured (development)
  if (!validApiKey) {
    return next();
  }

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing API key',
    });
  }

  next();
}

/**
 * Input validation middleware
 */
function validateInput(req, res, next) {
  // Sanitize request body
  if (req.body) {
    try {
      // Remove potentially dangerous characters
      const sanitized = JSON.parse(JSON.stringify(req.body).replace(/[<>]/g, ''));
      req.body = sanitized;
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Request body contains invalid characters',
      });
    }
  }

  // Validate query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        // Remove dangerous characters
        req.query[key] = req.query[key].replace(/[<>]/g, '');
      }
    });
  }

  next();
}

/**
 * CORS configuration for production
 */
function configureCORS() {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      // If no allowed origins configured, allow all (development)
      if (allowedOrigins.length === 0) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
  };
}

/**
 * Request size limiter
 */
function configureRequestLimits(app) {
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
}

module.exports = {
  configureSecurityHeaders,
  apiLimiter,
  strictLimiter,
  authenticateApiKey,
  validateInput,
  configureCORS,
  configureRequestLimits,
};
