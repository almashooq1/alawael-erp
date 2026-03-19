/**
 * 🔒 Security Configuration - تكوين الأمان المحسن
 * نظام ERP الألوائل - إصدار احترافي
 */

const securityConfig = {
  // Logger loaded lazily to avoid circular deps
  _getLogger() {
    return require('../utils/logger');
  },
  // إعدادات JWT
  jwt: {
    secret: require('./secrets').jwtSecret,
    refreshSecret: require('./secrets').jwtRefreshSecret,
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    issuer: 'alawael-erp',
    audience: 'alawael-users',
    algorithm: 'HS256',
  },

  // إعدادات المصادقة المتعددة العوامل (MFA)
  mfa: {
    enabled: process.env.MFA_ENABLED === 'true',
    issuer: 'Alawael ERP',
    digits: 6,
    period: 30,
    window: 1,
    backupCodesCount: 10,
    // طرق المصادقة المتاحة
    methods: {
      totp: true, // Google Authenticator / Authy
      sms: true, // SMS
      email: true, // Email OTP
      backup: true, // Backup Codes
    },
  },

  // إعدادات كلمة المرور
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    // منع كلمات المرور الشائعة
    commonPasswords: [
      'password',
      '123456',
      '12345678',
      'qwerty',
      'abc123',
      'monkey',
      'master',
      'dragon',
      'letmein',
      'login',
    ],
    // تاريخ كلمات المرور (منع إعادة استخدام آخر 5)
    historyCount: 5,
    // فترة انتهاء صلاحية كلمة المرور (بالأيام)
    expiryDays: 90,
    // تأمين الحساب بعد عدد محاولات فاشلة
    maxAttempts: 5,
    lockoutDuration: 30, // دقيقة
  },

  // إعدادات Rate Limiting
  rateLimit: {
    // الحد العام
    general: {
      windowMs: 15 * 60 * 1000, // 15 دقيقة
      max: 100, // 100 طلب لكل IP
      message: {
        error: 'تجاوزت الحد المسموح من الطلبات، يرجى المحاولة لاحقاً',
      },
    },
    // حد تسجيل الدخول
    login: {
      windowMs: 15 * 60 * 1000, // 15 دقيقة
      max: 5, // 5 محاولات
      message: {
        error: 'تجاوزت الحد المسموح من محاولات تسجيل الدخول',
      },
    },
    // حد إنشاء الحساب
    register: {
      windowMs: 60 * 60 * 1000, // ساعة
      max: 3, // 3 محاولات
      message: {
        error: 'تجاوزت الحد المسموح من إنشاء الحسابات',
      },
    },
    // حد API
    api: {
      windowMs: 60 * 1000, // دقيقة
      max: 60, // 60 طلب
      message: {
        error: 'تجاوزت الحد المسموح من طلبات API',
      },
    },
    // حد تصدير البيانات
    export: {
      windowMs: 60 * 60 * 1000, // ساعة
      max: 10, // 10 عمليات
      message: {
        error: 'تجاوزت الحد المسموح من عمليات التصدير',
      },
    },
  },

  // إعدادات CORS
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Request-ID',
      'X-API-Key',
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    credentials: true,
    maxAge: 86400, // 24 ساعة
    preflightContinue: false,
    optionsSuccessStatus: 204,
  },

  // إعدادات Helmet للأمان
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: ["'self'", 'https://api.alawael.com'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: 'same-origin' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
  },

  // إعدادات الجلسة
  session: {
    name: 'alawael.session',
    secret: require('./secrets').sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // يوم واحد
    },
  },

  // إعدادات تسجيل الدخول
  login: {
    // طريقة تسجيل الدخول المتاحة
    methods: {
      email: true,
      phone: true,
      username: true,
      nationalId: true,
    },
    // تذكر الجهاز
    rememberDevice: {
      enabled: true,
      duration: 30, // يوم
    },
    // اكتشاف الأجهزة الجديدة
    newDeviceAlert: true,
    // إنهاء الجلسات الأخرى
    revokeOtherSessions: true,
  },

  // إعدادات API Keys
  apiKeys: {
    prefix: 'alw_live_',
    testPrefix: 'alw_test_',
    length: 32,
    headerName: 'X-API-Key',
    rateLimit: {
      windowMs: 60 * 1000, // دقيقة
      max: 100, // 100 طلب
    },
  },

  // إعدادات التحقق من المدخلات
  validation: {
    // تطهير المدخلات
    sanitize: true,
    // إزالة المسافات الزائدة
    trim: true,
    // تحويل للأحرف الصغيرة (للبريد الإلكتروني)
    lowerCase: ['email'],
    // الحد الأقصى للنصوص
    maxTextLength: 10000,
    // الحد الأقصى للملفات
    maxFileSize: 10 * 1024 * 1024, // 10 MB
    // أنواع الملفات المسموحة
    allowedFileTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  },

  // إعدادات التشفير
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    saltLength: 64,
    iterations: 100000,
    // الحقول المشفرة في قاعدة البيانات
    encryptedFields: ['nationalId', 'bankAccount', 'creditCard', 'medicalInfo', 'address'],
  },

  // إعدادات Audit Log
  auditLog: {
    enabled: true,
    // الأحداث المسجلة
    events: [
      'login',
      'logout',
      'loginFailed',
      'passwordChange',
      'passwordReset',
      'mfaEnabled',
      'mfaDisabled',
      'profileUpdate',
      'emailChange',
      'apiCall',
      'dataExport',
      'dataImport',
      'userCreate',
      'userUpdate',
      'userDelete',
      'roleChange',
      'permissionChange',
    ],
    // حفظ IP و User Agent
    captureIpAddress: true,
    captureUserAgent: true,
    // فترة الاحتفاظ بالسجلات (بالأيام)
    retentionDays: 90,
  },

  // إعدادات حماية CSRF
  csrf: {
    enabled: process.env.NODE_ENV === 'production',
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    },
  },

  // قائمة IP المحظورة
  ipBlacklist: {
    enabled: true,
    // IP محظورة بشكل دائم
    permanent: [],
    // حظر تلقائي بعد محاولات فاشلة
    autoBlock: {
      enabled: true,
      threshold: 10,
      duration: 24, // ساعة
    },
  },

  // قائمة الدول المسموحة (اختياري)
  countryWhitelist: {
    enabled: false,
    countries: ['SA', 'AE', 'KW', 'BH', 'QA', 'OM'], // دول الخليج
  },
};

// فئة SecurityService
class SecurityService {
  constructor() {
    this.config = securityConfig;
    this.failedAttempts = new Map();
    this.blockedIPs = new Map();
  }

  /**
   * التحقق من قوة كلمة المرور
   */
  validatePassword(password) {
    const result = {
      valid: true,
      errors: [],
      strength: 0,
    };

    const { password: pwdConfig } = this.config;

    // التحقق من الطول
    if (password.length < pwdConfig.minLength) {
      result.errors.push(`كلمة المرور يجب أن تكون ${pwdConfig.minLength} أحرف على الأقل`);
      result.valid = false;
    }

    // التحقق من الأحرف الكبيرة
    if (pwdConfig.requireUppercase && !/[A-Z]/.test(password)) {
      result.errors.push('كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل');
      result.valid = false;
    }

    // التحقق من الأحرف الصغيرة
    if (pwdConfig.requireLowercase && !/[a-z]/.test(password)) {
      result.errors.push('كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل');
      result.valid = false;
    }

    // التحقق من الأرقام
    if (pwdConfig.requireNumbers && !/[0-9]/.test(password)) {
      result.errors.push('كلمة المرور يجب أن تحتوي على رقم واحد على الأقل');
      result.valid = false;
    }

    // التحقق من الأحرف الخاصة
    if (
      pwdConfig.requireSpecialChars &&
      !new RegExp(`[${pwdConfig.specialChars}]`).test(password)
    ) {
      result.errors.push('كلمة المرور يجب أن تحتوي على حرف خاص واحد على الأقل');
      result.valid = false;
    }

    // التحقق من كلمات المرور الشائعة
    if (pwdConfig.commonPasswords.includes(password.toLowerCase())) {
      result.errors.push('كلمة المرور هذه شائعة جداً، يرجى اختيار كلمة مرور أقوى');
      result.valid = false;
    }

    // حساب قوة كلمة المرور
    result.strength = this.calculatePasswordStrength(password);

    return result;
  }

  /**
   * حساب قوة كلمة المرور (0-100)
   */
  calculatePasswordStrength(password) {
    let strength = 0;

    // الطول
    strength += Math.min(password.length * 4, 40);

    // الأحرف الكبيرة
    if (/[A-Z]/.test(password)) strength += 10;
    if (/[A-Z].*[A-Z]/.test(password)) strength += 5;

    // الأحرف الصغيرة
    if (/[a-z]/.test(password)) strength += 10;
    if (/[a-z].*[a-z]/.test(password)) strength += 5;

    // الأرقام
    if (/[0-9]/.test(password)) strength += 10;
    if (/[0-9].*[0-9]/.test(password)) strength += 5;

    // الأحرف الخاصة
    if (new RegExp(`[${this.config.password.specialChars}]`).test(password)) strength += 15;
    if (
      new RegExp(
        `[${this.config.password.specialChars}].*[${this.config.password.specialChars}]`
      ).test(password)
    )
      strength += 10;

    // تنوع الأحرف
    const uniqueChars = new Set(password).size;
    strength += Math.min(uniqueChars * 2, 20);

    return Math.min(strength, 100);
  }

  /**
   * تسجيل محاولة فاشلة
   */
  recordFailedAttempt(ip) {
    const attempts = this.failedAttempts.get(ip) || 0;
    this.failedAttempts.set(ip, attempts + 1);

    if (attempts + 1 >= this.config.ipBlacklist.autoBlock.threshold) {
      this.blockIP(ip, this.config.ipBlacklist.autoBlock.duration);
    }

    return attempts + 1;
  }

  /**
   * إعادة تعيين المحاولات الفاشلة
   */
  resetFailedAttempts(ip) {
    this.failedAttempts.delete(ip);
  }

  /**
   * حظر IP
   */
  blockIP(ip, durationHours = 24) {
    const unblockAt = Date.now() + durationHours * 60 * 60 * 1000;
    this.blockedIPs.set(ip, unblockAt);
    const logger = require('../utils/logger');
    logger.info(`IP blocked: ${ip} until ${new Date(unblockAt)}`);
  }

  /**
   * التحقق من حظر IP
   */
  isIPBlocked(ip) {
    const unblockAt = this.blockedIPs.get(ip);
    if (!unblockAt) return false;

    if (Date.now() > unblockAt) {
      this.blockedIPs.delete(ip);
      return false;
    }

    return true;
  }

  /**
   * إنشاء API Key
   */
  generateAPIKey(isTest = false) {
    const prefix = isTest ? this.config.apiKeys.testPrefix : this.config.apiKeys.prefix;
    const crypto = require('crypto');
    const key = crypto.randomBytes(this.config.apiKeys.length / 2).toString('hex');
    return prefix + key;
  }

  /**
   * التحقق من صلاحيات المستخدم
   */
  checkPermission(user, resource, action) {
    if (!user || !user.role) return false;

    const { permissions } = user.role;
    if (!permissions) return false;

    const resourcePermission = permissions[resource];
    if (!resourcePermission) return false;

    return resourcePermission.includes(action) || resourcePermission.includes('*');
  }

  /**
   * تشفير بيانات حساسة
   */
  encrypt(text, key = null) {
    const crypto = require('crypto');
    if (!key && !process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY environment variable must be set for encryption operations');
    }
    const encryptionKey = key || Buffer.from(process.env.ENCRYPTION_KEY, 'utf-8').slice(0, 32);
    const iv = crypto.randomBytes(this.config.encryption.ivLength);

    const cipher = crypto.createCipheriv(this.config.encryption.algorithm, encryptionKey, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  /**
   * فك تشفير بيانات حساسة
   */
  decrypt(encryptedData, key = null) {
    const crypto = require('crypto');
    if (!key && !process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY environment variable must be set for decryption operations');
    }
    const encryptionKey = key || Buffer.from(process.env.ENCRYPTION_KEY, 'utf-8').slice(0, 32);

    const decipher = crypto.createDecipheriv(
      this.config.encryption.algorithm,
      encryptionKey,
      Buffer.from(encryptedData.iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * تنظيف البيانات الحساسة من السجلات
   */
  sanitizeForLogging(data) {
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard', 'nationalId'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }

  /**
   * التحقق من أمان الملف
   */
  validateFile(file) {
    const errors = [];

    // التحقق من حجم الملف
    if (file.size > this.config.validation.maxFileSize) {
      errors.push(
        `حجم الملف يتجاوز الحد المسموح (${this.config.validation.maxFileSize / 1024 / 1024} MB)`
      );
    }

    // التحقق من نوع الملف
    if (!this.config.validation.allowedFileTypes.includes(file.mimetype)) {
      errors.push(`نوع الملف غير مسموح: ${file.mimetype}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// فئة RateLimiter — Redis-backed for multi-pod K8s deployments
// Falls back gracefully to in-memory Map when Redis is unavailable
class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000;
    this.max = options.max || 100;
    this.requests = new Map(); // in-memory fallback
    this.redis = null;
    this.prefix = options.prefix || 'rl:';
    this._initRedis();
  }

  /** Try to connect to Redis (non-blocking, silent fallback) */
  _initRedis() {
    try {
      if (
        process.env.NODE_ENV === 'test' ||
        process.env.USE_MOCK_DB === 'true' ||
        process.env.DISABLE_REDIS === 'true'
      )
        return;
      const { getRedisClient } = require('./redis.config');
      const client = getRedisClient();
      if (client && client.status !== 'end') {
        this.redis = client;
      }
    } catch (_e) {
      this.redis = null;
    }
  }

  /**
   * التحقق من الحد — async Redis path or sync in-memory fallback
   */
  check(identifier) {
    // If Redis is available, use MULTI for atomic increment + expire
    if (this.redis) {
      return this._checkRedis(identifier);
    }
    return this._checkMemory(identifier);
  }

  /** Redis-backed check (returns a result synchronously from cache or async) */
  async _checkRedis(identifier) {
    const key = `${this.prefix}${identifier}`;
    try {
      const current = await this.redis.incr(key);
      if (current === 1) {
        await this.redis.pexpire(key, this.windowMs);
      }
      const ttl = await this.redis.pttl(key);
      const resetAt = Date.now() + Math.max(ttl, 0);

      if (current > this.max) {
        return { allowed: false, remaining: 0, resetAt };
      }
      return { allowed: true, remaining: this.max - current, resetAt };
    } catch (_e) {
      // Redis failed mid-flight — fall back to memory
      return this._checkMemory(identifier);
    }
  }

  /** In-memory fallback (original implementation + stale-entry cleanup) */
  _checkMemory(identifier) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }

    const userRequests = this.requests.get(identifier);
    const validRequests = userRequests.filter(time => time > windowStart);
    this.requests.set(identifier, validRequests);

    if (validRequests.length >= this.max) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: validRequests[0] + this.windowMs,
      };
    }

    validRequests.push(now);

    // Periodic cleanup: purge stale keys every 1000 checks
    if (this.requests.size > 10000) {
      for (const [k, v] of this.requests) {
        if (!v.length || v[v.length - 1] < windowStart) this.requests.delete(k);
      }
    }

    return {
      allowed: true,
      remaining: this.max - validRequests.length,
      resetAt: now + this.windowMs,
    };
  }

  /**
   * إعادة تعيين الحد
   */
  reset(identifier) {
    this.requests.delete(identifier);
    if (this.redis) {
      this.redis.del(`${this.prefix}${identifier}`).catch(() => {});
    }
  }
}

module.exports = {
  securityConfig,
  SecurityService,
  RateLimiter,
};
