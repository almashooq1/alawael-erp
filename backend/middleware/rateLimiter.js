/**
 * 🚦 Rate Limiter Middleware - تحديد معدل الطلبات
 * نظام ERP الألوائل - إصدار احترافي
 */

const { securityConfig, RateLimiter } = require('../config/security.config');

// إنشاء محددات المعدل
const limiters = {
  general: new RateLimiter(securityConfig.rateLimit.general),
  login: new RateLimiter(securityConfig.rateLimit.login),
  register: new RateLimiter(securityConfig.rateLimit.register),
  api: new RateLimiter(securityConfig.rateLimit.api),
  export: new RateLimiter(securityConfig.rateLimit.export)
};

/**
 * الحصول على معرف العميل
 */
const getClientIdentifier = (req) => {
  // استخدام IP + User ID إذا كان متوفراً
  const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
  const userId = req.user?.id || '';

  return userId ? `${ip}:${userId}` : ip;
};

/**
 * middleware عام لتحديد المعدل
 */
const generalLimiter = (req, res, next) => {
  // تخطي rate limiting في بيئة الاختبار
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  
  const identifier = getClientIdentifier(req);
  const result = limiters.general.check(identifier);

  // إضافة headers للحد
  res.setHeader('X-RateLimit-Limit', securityConfig.rateLimit.general.max);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', new Date(result.resetAt).toISOString());

  if (!result.allowed) {
    return res.status(429).json({
      success: false,
      message: securityConfig.rateLimit.general.message.error,
      retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000)
    });
  }

  next();
};

/**
 * middleware لتحديد معدل تسجيل الدخول
 */
const loginLimiter = (req, res, next) => {
  // تخطي rate limiting في بيئة الاختبار
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  
  const identifier = req.ip || req.connection.remoteAddress;
  const result = limiters.login.check(identifier);

  res.setHeader('X-RateLimit-Limit', securityConfig.rateLimit.login.max);
  res.setHeader('X-RateLimit-Remaining', result.remaining);

  if (!result.allowed) {
    // تسجيل محاولة مشبوهة
    console.warn(`🚨 Login rate limit exceeded for IP: ${identifier}`);

    return res.status(429).json({
      success: false,
      message: securityConfig.rateLimit.login.message.error,
      retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000)
    });
  }

  next();
};

/**
 * middleware لتحديد معدل إنشاء الحسابات
 */
const registerLimiter = (req, res, next) => {
  // تخطي rate limiting في بيئة الاختبار
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  
  const identifier = req.ip || req.connection.remoteAddress;
  const result = limiters.register.check(identifier);

  if (!result.allowed) {
    return res.status(429).json({
      success: false,
      message: securityConfig.rateLimit.register.message.error,
      retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000)
    });
  }

  next();
};

/**
 * middleware لتحديد معدل API
 */
const apiLimiter = (req, res, next) => {
  // تخطي rate limiting في بيئة الاختبار
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  
  const identifier = getClientIdentifier(req);
  const result = limiters.api.check(identifier);

  res.setHeader('X-RateLimit-Limit', securityConfig.rateLimit.api.max);
  res.setHeader('X-RateLimit-Remaining', result.remaining);

  if (!result.allowed) {
    return res.status(429).json({
      success: false,
      message: securityConfig.rateLimit.api.message.error,
      retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000)
    });
  }

  next();
};

/**
 * middleware لتحديد معدل التصدير
 */
const exportLimiter = (req, res, next) => {
  const identifier = getClientIdentifier(req);
  const result = limiters.export.check(identifier);

  if (!result.allowed) {
    return res.status(429).json({
      success: false,
      message: securityConfig.rateLimit.export.message.error,
      retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000)
    });
  }

  next();
};

/**
 * middleware لتحديد معدل مخصص
 */
const createCustomLimiter = (options = {}) => {
  const limiter = new RateLimiter({
    windowMs: options.windowMs || 60000,
    max: options.max || 100,
    message: options.message || { error: 'تجاوزت الحد المسموح من الطلبات' }
  });

  return (req, res, next) => {
    const identifier = options.keyGenerator
      ? options.keyGenerator(req)
      : getClientIdentifier(req);

    const result = limiter.check(identifier);

    res.setHeader('X-RateLimit-Limit', options.max || 100);
    res.setHeader('X-RateLimit-Remaining', result.remaining);

    if (!result.allowed) {
      return res.status(429).json({
        success: false,
        message: options.message?.error || 'تجاوزت الحد المسموح من الطلبات',
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000)
      });
    }

    next();
  };
};

/**
 * middleware لتحديد معدل بناء على المستخدم
 */
const userBasedLimiter = (maxRequests = 100, windowMs = 60000) => {
  const limiter = new RateLimiter({ windowMs, max: maxRequests });

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const identifier = `user:${req.user.id}`;
    const result = limiter.check(identifier);

    if (!result.allowed) {
      return res.status(429).json({
        success: false,
        message: 'تجاوزت الحد المسموح من الطلبات لهذا الحساب',
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000)
      });
    }

    next();
  };
};

/**
 * middleware لتحديد معدل بناء على الدور
 */
const roleBasedLimiter = (limits = {}) => {
  const limitersByRole = {};

  // إنشاء محدد لكل دور
  for (const [role, config] of Object.entries(limits)) {
    limitersByRole[role] = new RateLimiter({
      windowMs: config.windowMs || 60000,
      max: config.max || 100
    });
  }

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next();
    }

    const role = req.user.role;
    const config = limits[role];

    if (!config) {
      return next();
    }

    const limiter = limitersByRole[role];
    const identifier = `role:${role}:${req.user.id}`;
    const result = limiter.check(identifier);

    if (!result.allowed) {
      return res.status(429).json({
        success: false,
        message: `تجاوزت الحد المسموح لدور ${role}`,
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000)
      });
    }

    next();
  };
};

/**
 * middleware لتحديد معدل للعمليات الحساسة
 */
const sensitiveOperationLimiter = (req, res, next) => {
  const identifier = getClientIdentifier(req);
  const limiter = new RateLimiter({
    windowMs: 60 * 60 * 1000, // ساعة
    max: 5 // 5 عمليات فقط
  });

  const result = limiter.check(identifier);

  if (!result.allowed) {
    return res.status(429).json({
      success: false,
      message: 'تجاوزت الحد المسموح من العمليات الحساسة. يرجى المحاولة لاحقاً',
      retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000)
    });
  }

  next();
};

/**
 * middleware لإعادة تعيين الحد
 */
const resetLimiter = (type, identifier) => {
  if (limiters[type]) {
    limiters[type].reset(identifier);
  }
};

/**
 * middleware لفحص الحد دون منع
 */
const checkLimit = (type, identifier) => {
  if (limiters[type]) {
    const result = limiters[type].check(identifier);
    return {
      allowed: result.allowed,
      remaining: result.remaining,
      resetAt: result.resetAt
    };
  }
  return { allowed: true, remaining: Infinity, resetAt: null };
};

/**
 * middleware للحد التكيفي (يتكيف مع الحمل)
 */
const adaptiveLimiter = (baseMax = 100, windowMs = 60000) => {
  let currentMax = baseMax;
  let lastAdjustment = Date.now();

  const limiter = new RateLimiter({ windowMs, max: currentMax });

  // تعديل الحد بناء على حمل الخادم
  const adjustLimit = () => {
    const now = Date.now();
    if (now - lastAdjustment < 60000) return; // تعديل كل دقيقة

    const memoryUsage = process.memoryUsage();
    const heapUsedRatio = memoryUsage.heapUsed / memoryUsage.heapTotal;

    if (heapUsedRatio > 0.8) {
      // ضغط عالي - تقليل الحد
      currentMax = Math.max(Math.floor(baseMax * 0.5), 10);
    } else if (heapUsedRatio > 0.6) {
      // ضغط متوسط
      currentMax = Math.floor(baseMax * 0.75);
    } else {
      // ضغط منخفض - الحد الطبيعي
      currentMax = baseMax;
    }

    lastAdjustment = now;
  };

  return (req, res, next) => {
    adjustLimit();

    const identifier = getClientIdentifier(req);
    const result = limiter.check(identifier);

    res.setHeader('X-RateLimit-Limit', currentMax);
    res.setHeader('X-RateLimit-Remaining', result.remaining);

    if (!result.allowed) {
      return res.status(429).json({
        success: false,
        message: 'الخادم مشغول، يرجى المحاولة لاحقاً',
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000)
      });
    }

    next();
  };
};

// Aliases for backward compatibility
const authLimiter = loginLimiter;
const passwordLimiter = createCustomLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'تجاوزت الحد المسموح من محاولات تغيير كلمة المرور' }
});
const createAccountLimiter = registerLimiter;

module.exports = {
  // New exports
  generalLimiter,
  loginLimiter,
  registerLimiter,
  apiLimiter,
  exportLimiter,
  createCustomLimiter,
  userBasedLimiter,
  roleBasedLimiter,
  sensitiveOperationLimiter,
  resetLimiter,
  checkLimit,
  adaptiveLimiter,
  // Backward compatibility exports
  authLimiter,
  passwordLimiter,
  createAccountLimiter
};
