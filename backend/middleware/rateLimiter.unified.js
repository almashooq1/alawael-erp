/**
 * ⏱️ Unified Rate Limiter Middleware - موحد تحديد معدل الطلبات
 * يجمع كل وظائف تحديد المعدل في ملف واحد
 * @version 2.0.0
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

// ============================================
// 1. الإعدادات الأساسية
// ============================================

const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 دقيقة
const DEFAULT_MAX_REQUESTS = 100;
const DEFAULT_AUTH_MAX = 5;
const DEFAULT_API_MAX = 300;

// إعداد Redis (اختياري)
let redisClient = null;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const initRedis = async () => {
  try {
    redisClient = redis.createClient({ url: REDIS_URL });
    await redisClient.connect();
    console.log('✅ Redis connected for rate limiting');
    return true;
  } catch (error) {
    console.warn('⚠️ Redis not available, using memory store');
    return false;
  }
};

// ============================================
// 2. إنشاء Rate Limiter أساسي
// ============================================

/**
 * إنشاء rate limiter مع إعدادات مخصصة
 */
const createRateLimiter = (options = {}) => {
  const {
    windowMs = DEFAULT_WINDOW_MS,
    max = DEFAULT_MAX_REQUESTS,
    message = 'طلبات كثيرة جداً، يرجى المحاولة لاحقاً',
    keyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    standardHeaders = true,
    legacyHeaders = false,
  } = options;

  const limiterOptions = {
    windowMs,
    max,
    message: {
      success: false,
      message,
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders,
    legacyHeaders,
    skipSuccessfulRequests,
    skipFailedRequests,
  };

  // استخدام Redis إذا كان متاحاً
  if (redisClient && redisClient.isOpen) {
    limiterOptions.store = new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
    });
  }

  if (keyGenerator) {
    limiterOptions.keyGenerator = keyGenerator;
  }

  return rateLimit(limiterOptions);
};

// ============================================
// 3. أنواع Rate Limiters
// ============================================

/**
 * Rate limiter عام لجميع الطلبات
 */
const generalLimiter = createRateLimiter({
  windowMs: DEFAULT_WINDOW_MS,
  max: DEFAULT_MAX_REQUESTS,
  message: 'طلبات كثيرة جداً، يرجى الانتظار 15 دقيقة'
});

/**
 * Rate limiter للمصادقة (أكثر صرامة)
 */
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: DEFAULT_AUTH_MAX,
  message: 'محاولات تسجيل دخول كثيرة، يرجى المحاولة بعد 15 دقيقة',
  skipSuccessfulRequests: true, // لا تحسب الطلبات الناجحة
});

/**
 * Rate limiter لتسجيل الدخول
 */
const loginLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // ساعة
  max: 5,
  message: 'محاولات تسجيل دخول فاشلة كثيرة، يرجى المحاولة بعد ساعة',
  keyGenerator: (req) => {
    // استخدام IP + البريد الإلكتروني
    return `${req.ip}-${req.body?.email || 'unknown'}`;
  }
});

/**
 * Rate limiter للـ API
 */
const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // دقيقة
  max: DEFAULT_API_MAX,
  message: 'تجاوزت حد الطلبات المسموح'
});

/**
 * Rate limiter لإنشاء المحتوى
 */
const createLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // ساعة
  max: 50,
  message: 'تجاوزت حد إنشاء المحتوى'
});

/**
 * Rate limiter لرفع الملفات
 */
const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // ساعة
  max: 20,
  message: 'تجاوزت حد رفع الملفات'
});

/**
 * Rate limiter للبحث
 */
const searchLimiter = createRateLimiter({
  windowMs: 60 * 1000, // دقيقة
  max: 30,
  message: 'طلبات بحث كثيرة، يرجى التريث'
});

/**
 * Rate limiter للإشعارات
 */
const notificationLimiter = createRateLimiter({
  windowMs: 60 * 1000, // دقيقة
  max: 60,
  message: 'طلبات إشعارات كثيرة'
});

// ============================================
// 4. Rate Limiter ديناميكي
// ============================================

/**
 * Rate limiter بناءً على دور المستخدم
 */
const roleBasedLimiter = (limits = {}) => {
  const defaultLimits = {
    admin: 1000,
    manager: 500,
    employee: 200,
    user: 100,
    guest: 50
  };

  const mergedLimits = { ...defaultLimits, ...limits };

  return createRateLimiter({
    windowMs: 60 * 1000, // دقيقة
    max: (req) => {
      const role = req.user?.role || 'guest';
      return mergedLimits[role] || mergedLimits.guest;
    },
    keyGenerator: (req) => {
      return req.user?.id || req.ip;
    }
  });
};

/**
 * Rate limiter بناءً على IP
 */
const ipLimiter = (max = 100, windowMs = 60000) => {
  return createRateLimiter({
    windowMs,
    max,
    keyGenerator: (req) => req.ip
  });
};

/**
 * Rate limiter بناءً على المستخدم
 */
const userLimiter = (max = 200, windowMs = 60000) => {
  return createRateLimiter({
    windowMs,
    max,
    keyGenerator: (req) => {
      return req.user?.id || req.ip;
    }
  });
};

// ============================================
// 5. Rate Limiter للعمليات الحساسة
// ============================================

/**
 * Rate limiter لإعادة تعيين كلمة المرور
 */
const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // ساعة
  max: 3,
  message: 'طلبات إعادة تعيين كلمة المرور كثيرة، يرجى المحاولة لاحقاً',
  keyGenerator: (req) => {
    return `${req.ip}-${req.body?.email || 'unknown'}`;
  }
});

/**
 * Rate limiter لإرسال الرسائل
 */
const messagingLimiter = createRateLimiter({
  windowMs: 60 * 1000, // دقيقة
  max: 10,
  message: 'رسائل كثيرة، يرجى التريث'
});

/**
 * Rate limiter للتقارير
 */
const reportLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // ساعة
  max: 30,
  message: 'طلبات تقارير كثيرة'
});

/**
 * Rate limiter للتصدير
 */
const exportLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // ساعة
  max: 10,
  message: 'عمليات تصدير كثيرة'
});

// ============================================
// 6. Rate Limiter للـ API Keys
// ============================================

/**
 * Rate limiter للـ API Keys
 */
const apiKeyLimiter = (limits = {}) => {
  const defaultLimits = {
    standard: 1000,
    premium: 5000,
    enterprise: 50000
  };

  const mergedLimits = { ...defaultLimits, ...limits };

  return createRateLimiter({
    windowMs: 60 * 1000, // دقيقة
    max: (req) => {
      // تحديد نوع الاشتراك من الـ API Key
      const tier = req.apiKeyTier || 'standard';
      return mergedLimits[tier] || mergedLimits.standard;
    },
    keyGenerator: (req) => {
      return req.apiKey || req.ip;
    }
  });
};

// ============================================
// 7. Rate Limiter موزع (Distributed)
// ============================================

/**
 * إنشاء rate limiter موزع باستخدام Redis
 */
const createDistributedLimiter = async (options = {}) => {
  const redisReady = await initRedis();

  if (!redisReady) {
    console.warn('Falling back to memory-based rate limiter');
    return createRateLimiter(options);
  }

  return createRateLimiter({
    ...options,
    store: new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
    })
  });
};

// ============================================
// 8. Rate Limiter للـ WebSocket
// ============================================

/**
 * Rate limiter للـ WebSocket connections
 */
const wsRateLimiter = () => {
  const connections = new Map();

  return (socket, next) => {
    const ip = socket.handshake.address;
    const now = Date.now();
    const windowMs = 60000; // دقيقة
    const maxConnections = 10;

    // تنظيف الاتصالات القديمة
    for (const [key, timestamp] of connections.entries()) {
      if (now - timestamp > windowMs) {
        connections.delete(key);
      }
    }

    // التحقق من الحد
    const ipConnections = Array.from(connections.entries())
      .filter(([key]) => key.startsWith(ip))
      .length;

    if (ipConnections >= maxConnections) {
      return next(new Error('Rate limit exceeded'));
    }

    // تسجيل الاتصال الجديد
    connections.set(`${ip}-${now}`, now);

    next();
  };
};

// ============================================
// 9. Helper Functions
// ============================================

/**
 * التحقق من حالة Rate Limit
 */
const checkRateLimit = async (key, max, windowMs) => {
  // يمكن تنفيذ هذا باستخدام Redis
  return { allowed: true, remaining: max };
};

/**
 * إعادة تعيين Rate Limit
 */
const resetRateLimit = async (key) => {
  // يمكن تنفيذ هذا باستخدام Redis
  return true;
};

/**
 * الحصول على إحصائيات Rate Limit
 */
const getRateLimitStats = async (key) => {
  // يمكن تنفيذ هذا باستخدام Redis
  return {
    total: 0,
    remaining: 0,
    reset: null
  };
};

// ============================================
// 10. Middleware للتخطي عن IP معينة
// ============================================

/**
 * إنشاء rate limiter مع whitelist
 */
const createWhitelistedLimiter = (whitelist = [], options = {}) => {
  const limiter = createRateLimiter(options);

  return (req, res, next) => {
    // تخطي Rate Limit للـ IPs المسموحة
    if (whitelist.includes(req.ip)) {
      return next();
    }
    return limiter(req, res, next);
  };
};

// ============================================
// التصدير - Exports
// ============================================

module.exports = {
  // Basic limiter creator
  createRateLimiter,
  createDistributedLimiter,

  // Pre-configured limiters
  generalLimiter,
  authLimiter,
  loginLimiter,
  apiLimiter,
  createLimiter,
  uploadLimiter,
  searchLimiter,
  notificationLimiter,

  // Dynamic limiters
  roleBasedLimiter,
  ipLimiter,
  userLimiter,
  apiKeyLimiter,

  // Sensitive operation limiters
  passwordResetLimiter,
  messagingLimiter,
  reportLimiter,
  exportLimiter,

  // WebSocket
  wsRateLimiter,

  // Whitelist
  createWhitelistedLimiter,

  // Helpers
  checkRateLimit,
  resetRateLimit,
  getRateLimitStats,
  initRedis,

  // Aliases for backward compatibility
  rateLimit,
  limiter: generalLimiter,
  authenticateLimiter: authLimiter,
};
