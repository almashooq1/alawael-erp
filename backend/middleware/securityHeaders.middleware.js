/**
 * Security Headers Middleware — OWASP Top 10 Protection
 *
 * يُضيف رؤوس HTTP الأمنية الضرورية ويحمي من:
 * - XSS (Cross-Site Scripting)
 * - Clickjacking (X-Frame-Options)
 * - MIME Sniffing
 * - SQL Injection detection
 * - Information disclosure
 *
 * @module middleware/securityHeaders
 */
'use strict';

const logger = require('../utils/logger');

// ─── رؤوس الأمان ─────────────────────────────────────────────────────────────
const securityHeaders = (req, res, next) => {
  // منع تضمين الصفحة في إطار (Clickjacking)
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // منع تخمين نوع المحتوى
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // حماية XSS للمتصفحات القديمة
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // سياسة المرجع
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // قيود الصلاحيات
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

  // منع النطاقات المشتركة
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  // سياسة أمان المحتوى (CSP)
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'self'",
    ].join('; ')
  );

  // HSTS — فقط في الإنتاج
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // إزالة الرؤوس الكاشفة
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  next();
};

// ─── كشف SQL Injection ───────────────────────────────────────────────────────
const SQL_INJECTION_PATTERNS = [
  /(\bunion\b.*\bselect\b)/i,
  /(\bselect\b.*\bfrom\b.*\bwhere\b)/i,
  /(\binsert\b.*\binto\b)/i,
  /(\bdelete\b.*\bfrom\b)/i,
  /(\bdrop\b.*\btable\b)/i,
  /(\bexec\b|\bexecute\b)/i,
  /('|"|;|--|#|\/\*|\*\/)/,
  /(\bxp_\w+)/i,
  /(\bsp_\w+)/i,
];

const sqlInjectionProtection = (req, res, next) => {
  const checkValue = value => {
    if (typeof value !== 'string') return false;
    return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(value));
  };

  const checkObject = obj => {
    if (!obj || typeof obj !== 'object') return false;
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (typeof val === 'string' && checkValue(val)) return true;
      if (typeof val === 'object' && checkObject(val)) return true;
    }
    return false;
  };

  const inputs = [req.body, req.query, req.params].filter(Boolean);
  const isSuspicious = inputs.some(checkObject);

  if (isSuspicious) {
    logger.warn('[Security] Potential SQL Injection detected', {
      ip: req.ip,
      url: req.originalUrl,
      method: req.method,
    });
    return res.status(403).json({
      success: false,
      message: 'طلب غير مسموح به',
      code: 'SUSPICIOUS_INPUT',
    });
  }

  next();
};

// ─── حماية XSS في body ────────────────────────────────────────────────────────
const XSS_PATTERNS = [
  /<script\b[^>]*>[\s\S]*?<\/script>/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /javascript\s*:/gi,
  /data\s*:\s*text\/html/gi,
];

const xssProtection = (req, res, next) => {
  const sanitize = value => {
    if (typeof value !== 'string') return value;
    let sanitized = value;
    for (const pattern of XSS_PATTERNS) {
      if (pattern.test(sanitized)) {
        logger.warn('[Security] XSS attempt detected', { ip: req.ip, url: req.originalUrl });
        sanitized = sanitized.replace(pattern, '');
      }
    }
    return sanitized;
  };

  const sanitizeObject = obj => {
    if (!obj || typeof obj !== 'object') return obj;
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitize(obj[key]);
      } else if (typeof obj[key] === 'object') {
        obj[key] = sanitizeObject(obj[key]);
      }
    }
    return obj;
  };

  if (req.body) req.body = sanitizeObject(req.body);
  next();
};

// ─── Rate Limit Headers (إضافي) ──────────────────────────────────────────────
const addRateLimitInfo = (req, res, next) => {
  // يمكن تخصيصه مع express-rate-limit
  res.setHeader('X-Request-Id', req.headers['x-request-id'] || `req-${Date.now()}`);
  next();
};

// ─── مجموعة الوسائط (Composite) ──────────────────────────────────────────────
const applyAllSecurityMiddleware = [
  securityHeaders,
  sqlInjectionProtection,
  xssProtection,
  addRateLimitInfo,
];

module.exports = {
  securityHeaders,
  sqlInjectionProtection,
  xssProtection,
  addRateLimitInfo,
  applyAllSecurityMiddleware,
};
