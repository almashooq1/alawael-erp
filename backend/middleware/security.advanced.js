/**
 * Security Enhancement Middleware
 * مجموعة متقدمة من إجراءات الأمان
 */

const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

/**
 * CSRF Protection Middleware
 * حماية من هجمات Cross-Site Request Forgery
 */
const csrfProtection = () => {
  return (req, res, next) => {
    // Skip for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // Skip for API key authentication
    if (req.headers['x-api-key']) {
      return next();
    }

    const token = req.headers['x-csrf-token'] || req.body._csrf;
    const sessionToken = req.session?.csrfToken;

    if (!token || !sessionToken || token !== sessionToken) {
      return res.status(403).json({
        success: false,
        message: 'Invalid CSRF token',
        messageAr: 'رمز الأمان غير صالح',
      });
    }

    next();
  };
};

/**
 * Generate CSRF Token
 * توليد رمز حماية CSRF
 */
const generateCsrfToken = (req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
};

/**
 * XSS Protection Headers
 * رؤوس حماية من XSS
 */
const xssProtection = () => {
  return (req, res, next) => {
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  };
};

/**
 * Content Security Policy
 * سياسة أمان المحتوى
 */
const contentSecurityPolicy = () => {
  return (req, res, next) => {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');

    res.setHeader('Content-Security-Policy', csp);
    next();
  };
};

/**
 * IP Whitelist Middleware
 * قائمة بيضاء للـ IP
 */
const ipWhitelist = allowedIPs => {
  return (req, res, next) => {
    // تعطيل في التطوير
    if (process.env.NODE_ENV === 'development') {
      return next();
    }

    const clientIP =
      req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || req.ip;

    const normalizedIP = clientIP.replace('::ffff:', '');

    if (!allowedIPs.includes(normalizedIP)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        messageAr: 'الوصول مرفوض',
      });
    }

    next();
  };
};

/**
 * Advanced Rate Limiter
 * محدد معدل متقدم
 */
const advancedRateLimiter = options => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100,
    message = 'Too many requests',
    messageAr = 'عدد كبير جداً من الطلبات',
  } = options || {};

  return rateLimit({
    windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message,
        messageAr,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
    skip: req => {
      // Skip for health checks
      return req.path === '/api/health' || req.path === '/health';
    },
  });
};

/**
 * Request Size Limiter
 * محدد حجم الطلب
 */
const requestSizeLimiter = maxSize => {
  const maxBytes = parseSize(maxSize);

  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'], 10);

    if (contentLength && contentLength > maxBytes) {
      return res.status(413).json({
        success: false,
        message: 'Request entity too large',
        messageAr: 'حجم الطلب كبير جداً',
        maxSize,
      });
    }

    next();
  };
};

/**
 * Parse size string (e.g., "10mb", "1gb")
 */
function parseSize(size) {
  if (typeof size === 'number') return size;

  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+)([a-z]+)$/);
  if (!match) return 0;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  return value * (units[unit] || 1);
}

/**
 * SQL Injection Protection
 * حماية من SQL Injection
 */
const sqlInjectionProtection = () => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(union.*select)/gi,
    /(;.*--)/gi,
    /('.*or.*'.*=.*')/gi,
  ];

  return (req, res, next) => {
    const checkForSQLInjection = obj => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          for (const pattern of sqlPatterns) {
            if (pattern.test(obj[key])) {
              return true;
            }
          }
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          if (checkForSQLInjection(obj[key])) {
            return true;
          }
        }
      }
      return false;
    };

    if (checkForSQLInjection(req.query) || checkForSQLInjection(req.body)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request',
        messageAr: 'طلب غير صالح',
      });
    }

    next();
  };
};

/**
 * Secure Headers Middleware
 * رؤوس HTTP آمنة
 */
const secureHeaders = () => {
  return (req, res, next) => {
    // Remove sensitive headers
    res.removeHeader('X-Powered-By');

    // Add security headers
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    next();
  };
};

module.exports = {
  csrfProtection,
  generateCsrfToken,
  xssProtection,
  contentSecurityPolicy,
  ipWhitelist,
  advancedRateLimiter,
  requestSizeLimiter,
  sqlInjectionProtection,
  secureHeaders,
};
