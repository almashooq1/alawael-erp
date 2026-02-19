// ===================================================================
// AlAwael ERP - Security Hardening Middleware
// ===================================================================

const helmet = require('helmet');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('mongo-sanitize');
const xss = require('xss-clean');

/**
 * Security Configuration Module
 * Implements:
 * - OWASP Top 10 protections
 * - Rate limiting
 * - CSRF token validation
 * - Input sanitization
 * - Header security
 */

// ===================================================================
// HELMET SECURITY HEADERS
// ===================================================================
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.yourdomain.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : undefined,
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: {
    policy: 'no-referrer-when-downgrade',
  },
  permissionsPolicy: {
    geolocation: [],
    microphone: [],
    camera: [],
    payment: [],
    usb: [],
    magnetometer: [],
    gyroscope: [],
    accelerometer: [],
  },
  noSniff: true,
  xssFilter: true,
  frameguard: {
    action: 'deny',
  },
};

// ===================================================================
// RATE LIMITING ZONES
// ===================================================================
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => {
    // Skip health checks
    return req.path === '/health' || req.path === '/metrics';
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 uploads per hour
  message: 'Too many file uploads, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ===================================================================
// SECURITY MIDDLEWARE CONFIGURATION
// ===================================================================
const securityMiddleware = [
  // Helmet - Set security HTTP headers
  helmet(helmetConfig),

  // HPP - Protect against parameter pollution
  hpp({
    whitelist: ['sort', 'fields', 'page', 'limit', 'search', 'filter', 'startDate', 'endDate'],
  }),

  // XSS Protection
  xss(),

  // MongoDB Injection Prevention
  mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      console.warn(`Potential NoSQL injection detected in ${key}`);
    },
  }),

  // General rate limiting
  generalLimiter,
];

// ===================================================================
// ENDPOINT-SPECIFIC SECURITY
// ===================================================================

/**
 * Authentication route limiter
 * Usage: router.post('/auth/login', authLimiter, controller)
 */
const getAuthLimiter = () => authLimiter;

/**
 * File upload limiter
 * Usage: router.post('/upload', uploadLimiter, controller)
 */
const getUploadLimiter = () => uploadLimiter;

/**
 * API endpoint limiter
 * Usage: router.get('/api/resource', apiLimiter, controller)
 */
const getApiLimiter = () => apiLimiter;

// ===================================================================
// CSRF PROTECTION
// ===================================================================
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

const csrfProtection = csrf({ cookie: true });

const csrfMiddleware = [cookieParser(), csrfProtection];

/**
 * CSRF Token Generation
 * Used on forms to generate CSRF tokens
 */
const getCsrfToken = (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
};

// ===================================================================
// CORS CONFIGURATION
// ===================================================================
const corsConfig = {
  origin: (origin, callback) => {
    const whitelist = [
      'https://yourdomain.com',
      'https://www.yourdomain.com',
      'https://admin.yourdomain.com',
      process.env.NODE_ENV === 'development' && 'http://localhost:3000',
      process.env.NODE_ENV === 'development' && 'http://localhost:3001',
    ].filter(Boolean);

    if (whitelist.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-ID', 'X-API-Key'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // 24 hours
};

// ===================================================================
// INPUT VALIDATION & SANITIZATION
// ===================================================================
const { body, validationResult } = require('express-validator');

const sanitizeInput = [body('*').trim().escape()];

/**
 * Validate request and handle errors
 */
const validationErrorHandler = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

// ===================================================================
// DATA ENCRYPTION
// ===================================================================
const crypto = require('crypto');

/**
 * Encrypt sensitive data
 */
const encryptData = (data, key) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

/**
 * Decrypt sensitive data
 */
const decryptData = (data, key) => {
  const parts = data.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
  let decrypted = decipher.update(parts[1], 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// ===================================================================
// PASSWORD SECURITY
// ===================================================================
const bcrypt = require('bcrypt');

/**
 * Password hashing settings
 */
const passwordConfig = {
  saltRounds: 12,
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

/**
 * Hash password
 */
const hashPassword = async password => {
  if (password.length < passwordConfig.minLength) {
    throw new Error(`Password must be at least ${passwordConfig.minLength} characters`);
  }
  return bcrypt.hash(password, passwordConfig.saltRounds);
};

/**
 * Validate password
 */
const validatePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * Check password strength
 */
const checkPasswordStrength = password => {
  const issues = [];

  if (password.length < passwordConfig.minLength) {
    issues.push(`Minimum ${passwordConfig.minLength} characters required`);
  }
  if (!/[A-Z]/.test(password) && passwordConfig.requireUppercase) {
    issues.push('Must contain uppercase letter');
  }
  if (!/[a-z]/.test(password) && passwordConfig.requireLowercase) {
    issues.push('Must contain lowercase letter');
  }
  if (!/[0-9]/.test(password) && passwordConfig.requireNumbers) {
    issues.push('Must contain number');
  }
  if (
    !new RegExp(`[${passwordConfig.specialChars}]`).test(password) &&
    passwordConfig.requireSpecialChars
  ) {
    issues.push('Must contain special character');
  }

  return {
    isStrong: issues.length === 0,
    issues,
    strength: Math.max(0, 100 - issues.length * 20),
  };
};

// ===================================================================
// JWT SECURITY
// ===================================================================
const jwt = require('jsonwebtoken');

const jwtConfig = {
  algorithm: 'HS512',
  expiresIn: process.env.JWT_EXPIRY || '2h',
  issuer: process.env.JWT_ISSUER || 'alawael-erp',
  audience: process.env.JWT_AUDIENCE || 'alawael-users',
};

/**
 * Generate JWT token
 */
const generateToken = payload => {
  return jwt.sign(payload, process.env.JWT_SECRET, jwtConfig);
};

/**
 * Verify JWT token
 */
const verifyToken = token => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: [jwtConfig.algorithm],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    }
    throw new Error('Invalid token');
  }
};

/**
 * Token rotation middleware
 */
const tokenRotationMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return next();

  try {
    const decoded = jwt.decode(token);
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = decoded.exp;
    const timeUntilExpiry = expiresAt - now;

    // Refresh if less than 15 minutes left
    if (timeUntilExpiry < 900) {
      const newToken = generateToken({
        userId: decoded.userId,
        email: decoded.email,
        roles: decoded.roles,
      });
      res.setHeader('X-New-Token', newToken);
    }
  } catch (error) {
    // Ignore token parsing errors
  }

  next();
};

// ===================================================================
// AUDIT LOGGING
// ===================================================================

/**
 * Security event logging
 */
const logSecurityEvent = (type, details, req) => {
  const event = {
    timestamp: new Date(),
    type,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
    details,
  };

  console.log('[SECURITY]', JSON.stringify(event));
  // TODO: Store in audit log database
};

// ===================================================================
// EXPORT CONFIGURATION
// ===================================================================
module.exports = {
  // Middleware packages
  securityMiddleware,
  helmetConfig,
  corsConfig,
  csrfMiddleware,
  csrfProtection,
  getCsrfToken,

  // Rate limiters
  getAuthLimiter,
  getUploadLimiter,
  getApiLimiter,

  // Input validation
  sanitizeInput,
  validationErrorHandler,

  // Encryption
  encryptData,
  decryptData,

  // Password security
  hashPassword,
  validatePassword,
  checkPasswordStrength,
  passwordConfig,

  // JWT security
  generateToken,
  verifyToken,
  tokenRotationMiddleware,
  jwtConfig,

  // Audit logging
  logSecurityEvent,
};
