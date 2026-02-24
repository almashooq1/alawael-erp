/**
 * Advanced Security Middleware - Middleware متقدمة للأمان
 * تشفير، تصديق، تفويض، تحديد معدل، منع CSRF وغيرها
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

// ============= أدوات مساعدة =============

const encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);

/**
 * تشفير البيانات الحساسة
 */
exports.encryptSensitiveData = data => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    encrypted,
    iv: iv.toString('hex'),
  };
};

/**
 * فك تشفير البيانات
 */
exports.decryptSensitiveData = (encrypted, iv) => {
  const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
};

// ============= التحقق من JWT =============

/**
 * التحقق من صحة JWT Token
 */
exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'لم يتم توفير JWT Token',
      code: 'NO_TOKEN',
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'انتهى صلاحية Token',
          code: 'TOKEN_EXPIRED',
        });
      }

      if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({
          error: 'Token غير صحيح',
          code: 'INVALID_TOKEN',
        });
      }

      return res.status(403).json({ error: 'فشل التحقق', code: 'VERIFICATION_FAILED' });
    }

    // التحقق من أن المستخدم نشط
    if (!user.active) {
      return res.status(403).json({
        error: 'المستخدم غير نشط',
        code: 'USER_INACTIVE',
      });
    }

    req.user = user;
    next();
  });
};

// ============= مراقبة المعدل (Rate Limiting) =============

/**
 * تحديد معدل الطلبات العام
 */
exports.globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100, // الحد الأقصى 100 طلب لكل 15 دقيقة
  message: 'عدد طلباتك كثير جداً، يرجى المحاولة لاحقاً',
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => {
    // تخطي معدل الحد للطلبات الآمنة (GET)
    return req.method === 'GET';
  },
});

/**
 * تحديد معدل الطلبات الصارم
 */
exports.strictRateLimiter = rateLimit({
  windowMs: 60 * 1000, // دقيقة واحدة
  max: 10, // الحد الأقصى 10 طلب
  skipSuccessfulRequests: true, // تخطي الطلبات الناجحة
  message: 'عدد محاولات كثير جداً',
});

/**
 * تحديد معدل معين للمسارات
 */
exports.createRateLimiter = (windowMs = 60000, maxRequests = 30) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// ============= التفويض (Authorization) =============

/**
 * التحقق من الأدوار
 */
exports.authorizeRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'غير مصرح',
        code: 'UNAUTHORIZED',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'ممنوع الوصول: لا توجد صلاحيات كافية',
        code: 'FORBIDDEN',
        requiredRoles: allowedRoles,
        currentRole: req.user.role,
      });
    }

    next();
  };
};

/**
 * التحقق من الأذونات الدقيقة
 */
exports.authorizePermissions = (requiredPermissions = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'غير مصرح' });
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = requiredPermissions.every(perm => userPermissions.includes(perm));

    if (!hasPermission) {
      return res.status(403).json({
        error: 'لا توجد صلاحيات كافية',
        requiredPermissions,
      });
    }

    next();
  };
};

// ============= منع CSRF =============

/**
 * توليد CSRF Token
 */
exports.generateCSRFToken = (req, res, next) => {
  const token = crypto.randomBytes(32).toString('hex');
  req.csrfToken = token;
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  next();
};

/**
 * التحقق من CSRF Token
 */
exports.verifyCSRFToken = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const cookieToken = req.cookies['XSRF-TOKEN'];

  if (!token || !cookieToken || token !== cookieToken) {
    return res.status(403).json({
      error: 'CSRF Token غير صحيح',
      code: 'CSRF_INVALID',
    });
  }

  next();
};

// ============= تسجيل وتدقيق الأمان =============

/**
 * تسجيل نشاط الأمان
 */
exports.logSecurityEvent = async (req, res, next) => {
  const SecurityLog = require('../models/securityLog.model');

  const originalSend = res.send;

  res.send = function (data) {
    // تسجيل الطلب بعد الرد
    if (req.user) {
      const logEntry = new SecurityLog({
        userId: req.user.userId,
        action: `${req.method} ${req.path}`,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        statusCode: res.statusCode,
        timestamp: new Date(),
        details: {
          body: req.method !== 'GET' ? req.body : null,
          query: req.query,
        },
      });

      logEntry.save().catch(err => console.error('خطأ في تسجيل الأمان:', err));
    }

    originalSend.call(this, data);
  };

  next();
};

// ============= التحقق من IP =============

/**
 * قائمة بيضاء/سوداء للـ IP
 */
exports.ipWhitelistBlacklist = (whitelist = [], blacklist = []) => {
  return (req, res, next) => {
    const clientIp = req.ip;

    if (blacklist.length > 0 && blacklist.includes(clientIp)) {
      return res.status(403).json({
        error: 'عنوان IP محجوب',
        code: 'IP_BLOCKED',
      });
    }

    if (whitelist.length > 0 && !whitelist.includes(clientIp)) {
      return res.status(403).json({
        error: 'عنوان IP غير مصرح',
        code: 'IP_NOT_ALLOWED',
      });
    }

    next();
  };
};

// ============= التحقق من الإدخال (Input Validation) =============

/**
 * تعقيم الإدخال وفحصه
 */
exports.sanitizeInput = (req, res, next) => {
  const sanitize = obj => {
    if (typeof obj === 'string') {
      // إزالة الرموز الخطيرة
      return obj
        .replace(/[<>\"']/g, '') // إزالة HTML tags
        .trim();
    }
    if (obj !== null && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        obj[key] = sanitize(obj[key]);
      });
    }
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  next();
};

/**
 * التحقق من صيغة الإدخال
 */
exports.validateInput = schema => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body);

      if (error) {
        return res.status(400).json({
          error: 'بيانات غير صحيحة',
          details: error.details.map(d => ({
            field: d.context.key,
            message: d.message,
          })),
        });
      }

      req.validatedBody = value;
      next();
    } catch (_err) {
      res.status(400).json({ error: 'خطأ في التحقق' });
    }
  };
};

// ============= حماية البيانات الحساسة =============

/**
 * تجنب الوصول إلى الملفات (Path Traversal)
 */
exports.preventPathTraversal = (req, res, next) => {
  const filePath = req.query.file || req.body.path || '';

  if (filePath.includes('..') || filePath.includes('~') || filePath.startsWith('/')) {
    return res.status(400).json({
      error: 'مسار ملف غير صحيح',
      code: 'INVALID_PATH',
    });
  }

  next();
};

/**
 * إخفاء البيانات الحساسة من الردود
 */
exports.maskSensitiveData = (req, res, next) => {
  const originalJson = res.json;

  res.json = function (data) {
    const maskData = obj => {
      if (!obj) return obj;

      const sensitiveFields = [
        'password',
        'pin',
        'ssn',
        'bankAccount',
        'creditCard',
        'secretKey',
        'refreshToken',
      ];

      Object.keys(obj).forEach(key => {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          obj[key] = '***MASKED***';
        } else if (typeof obj[key] === 'object') {
          maskData(obj[key]);
        }
      });

      return obj;
    };

    return originalJson.call(this, maskData(data));
  };

  next();
};

// ============= رؤوس الأمان =============

/**
 * إضافة رؤوس الأمان
 */
exports.securityHeaders = (req, res, next) => {
  // منع Clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // منع MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // تفعيل XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Strict Transport Security (HTTPS)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  );

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'no-referrer');

  // Feature Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
};

// ============= معالجة الأخطاء الآمنة =============

/**
 * معالجة الأخطاء دون كشف معلومات حساسة
 */
exports.secureErrorHandler = (err, req, res, _next) => {
  console.error('خطأ:', err);

  let statusCode = 500;
  let message = 'حدث خطأ في الخادم';

  // عدم كشف تفاصيل الخطأ للمستخدم
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'معرف غير صحيح';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'بيانات غير صحيحة';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token غير صحيح';
  }

  res.status(statusCode).json({
    error: message,
    code: err.code || 'UNKNOWN_ERROR',
    // في الإنتاج، لا نعيد تفاصيل الخطأ
    ...(process.env.NODE_ENV !== 'production' && { details: err.message }),
  });
};

// ============= Middleware مركبة =============

/**
 * مجموعة أمان شاملة
 */
exports.securityMiddlewareStack = [
  exports.securityHeaders,
  exports.sanitizeInput,
  exports.preventPathTraversal,
  exports.maskSensitiveData,
  exports.globalRateLimiter,
];

module.exports = exports;
