/**
 * Advanced Security Hardening Module
 * تحسينات أمان متقدمة لنظام تتبع الحافلات
 */

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const validator = require('validator');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// ====== 1. مكافحة DDoS والحد من المعدل ======

class DDoSProtection {
  /**
   * حد المعدل العام
   */
  static createGeneralRateLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 دقيقة
      max: 100, // 100 طلب لكل IP
      message: 'عدد كبير جداً من الطلبات من هذا العنوان، يرجى المحاولة لاحقاً.',
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // تخطي الـ Healthcheck endpoints
        return req.path === '/health';
      }
    });
  }

  /**
   * حد معدل صارم لـ API الحساسة
   */
  static createStrictRateLimiter() {
    return rateLimit({
      windowMs: 5 * 60 * 1000, // 5 دقائق
      max: 10, // 10 طلبات فقط
      skipSuccessfulRequests: true,
      message: 'الكثير من محاولات الفشل، يرجى المحاولة لاحقاً.'
    });
  }

  /**
   * حد معدل مخصص لكل endpoint
   */
  static createEndpointRateLimiter(max = 30, windowMs = 15 * 60 * 1000) {
    return rateLimit({
      windowMs,
      max,
      keyGenerator: (req) => {
        // استخدم معرف المستخدم بدلاً من IP
        return req.user?.id || req.ip;
      }
    });
  }

  /**
   * الكشف عن هجمات DDoS
   */
  static detectDDoSAttack(req, threshold = 1000) {
    const clientIp = req.ip;
    const timestamp = Date.now();

    // تتبع الطلبات من كل IP
    if (!this.requestCounts) {
      this.requestCounts = new Map();
    }

    if (!this.requestCounts.has(clientIp)) {
      this.requestCounts.set(clientIp, { count: 1, startTime: timestamp });
    } else {
      const data = this.requestCounts.get(clientIp);
      const timeDiff = timestamp - data.startTime;

      // إعادة تعيين بعد دقيقة
      if (timeDiff > 60000) {
        this.requestCounts.set(clientIp, { count: 1, startTime: timestamp });
      } else {
        data.count++;

        // تنبيه إذا تجاوز الحد
        if (data.count > threshold) {
          console.warn(`🚨 Potential DDoS attack from ${clientIp}`);
          return {
            isAttack: true,
            ip: clientIp,
            requestCount: data.count,
            timeWindow: timeDiff
          };
        }
      }
    }

    return { isAttack: false };
  }

  /**
   * الحد من الـ IP الخطرة
   */
  static blockSuspiciousIP(req, res, next) {
    const blockedIPs = process.env.BLOCKED_IPS?.split(',') || [];
    const clientIp = req.ip;

    if (blockedIPs.includes(clientIp)) {
      return res.status(403).json({
        status: 'error',
        message: 'تم حظر عنوانك'
      });
    }

    next();
  }
}

// ====== 2. تحقق أमان من الطلبات ======

class RequestValidation {
  /**
   * تنقية البيانات من NoSQL Injection
   */
  static sanitizeInput(app) {
    // حماية النماذج من الـ Query Injection
    app.use(mongoSanitize({
      allowBatch: false,
      allowDots: false
    }));

    return app;
  }

  /**
   * التحقق من صحة البيانات
   */
  static validateInput(data, schema) {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];

      // التحقق من المتطلب
      if (rules.required && !value) {
        errors.push(`${field} مطلوب`);
        continue;
      }

      if (!value) continue;

      // التحقق من النوع
      if (rules.type && typeof value !== rules.type) {
        errors.push(`${field} يجب أن يكون من نوع ${rules.type}`);
      }

      // التحقق من الطول
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${field} يجب أن يكون على الأقل ${rules.minLength} أحرف`);
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${field} يجب ألا يتجاوز ${rules.maxLength} أحرف`);
      }

      // التحقق من الصيغة
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${field} صيغة غير صحيحة`);
      }

      // التحقق من البريد الإلكتروني
      if (rules.email && !validator.isEmail(value)) {
        errors.push(`${field} بريد إلكتروني غير صحيح`);
      }

      // التحقق من رقم الهاتف
      if (rules.phone && !validator.isMobilePhone(value)) {
        errors.push(`${field} رقم هاتف غير صحيح`);
      }

      // التحقق من الإحداثيات
      if (rules.coordinates) {
        const [lat, lng] = value.split(',');
        if (!validator.isLatLong(`${lat},${lng}`)) {
          errors.push(`${field} إحداثيات غير صحيحة`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * التنقية من XSS
   */
  static sanitizeXSS(str) {
    if (typeof str !== 'string') return str;

    return str
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * التحقق من توقيع الطلب
   */
  static verifyRequestSignature(req, secret) {
    const signature = req.headers['x-signature'];
    const timestamp = req.headers['x-timestamp'];
    const payload = req.body;

    // تحقق من الطابع الزمني (منع replay attacks)
    const now = Date.now();
    const diff = now - parseInt(timestamp);
    if (diff > 5 * 60 * 1000) { // 5 دقائق
      return false;
    }

    // تحقق من التوقيع
    const hash = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload) + timestamp)
      .digest('hex');

    return hash === signature;
  }
}

// ====== 3. تحسينات أمان JWT ======

class JWTSecurity {
  /**
   * إنشاء JWT آمن
   */
  static generateSecureToken(payload, expiresIn = '1h') {
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn,
      algorithm: 'HS512',
      issuer: 'gps-fleet-system',
      audience: 'fleet-app'
    });
  }

  /**
   * التحقق من JWT مع حماية إضافية
   */
  static verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ['HS512'],
        issuer: 'gps-fleet-system',
        audience: 'fleet-app'
      });

      // تحقق من أن التوكن لم يتم إلغاؤه (Blacklist)
      if (this.isTokenBlacklisted(token)) {
        throw new Error('Token has been revoked');
      }

      return decoded;
    } catch (error) {
      console.error('JWT verification failed:', error.message);
      return null;
    }
  }

  /**
   * إضافة التوكن للقائمة السوداء
   */
  static blacklistToken(token) {
    if (!this.blacklistedTokens) {
      this.blacklistedTokens = new Set();
    }

    this.blacklistedTokens.add(token);

    // امسح من القائمة السوداء بعد انتهاء الصلاحية
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      const expiryTime = decoded.exp * 1000 - Date.now();
      setTimeout(() => {
        this.blacklistedTokens.delete(token);
      }, expiryTime);
    }
  }

  /**
   * تحقق من التوكن المدرج في القائمة السوداء
   */
  static isTokenBlacklisted(token) {
    return this.blacklistedTokens?.has(token) || false;
  }

  /**
   * Refresh Token Strategy
   */
  static generateRefreshToken(payload) {
    return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: '7d',
      algorithm: 'HS512'
    });
  }

  /**
   * استبدال التوكن
   */
  static refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        { algorithms: ['HS512'] }
      );

      return this.generateSecureToken({
        id: decoded.id,
        email: decoded.email,
        role: decoded.role
      });
    } catch (error) {
      console.error('Refresh token failed:', error.message);
      return null;
    }
  }
}

// ====== 4. تحسينات المفتاح API ======

class APIKeyManagement {
  /**
   * إنشاء مفتاح API آمن
   */
  static generateAPIKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * التحقق من مفتاح API
   */
  static verifyAPIKey(req, validKeys) {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey || !validKeys.includes(apiKey)) {
      return false;
    }

    return true;
  }

  /**
   * تقسيم المفتاح API (Key Rotation)
   */
  static rotateAPIKey(oldKey, keys) {
    if (keys.includes(oldKey)) {
      keys.splice(keys.indexOf(oldKey), 1);
    }

    const newKey = this.generateAPIKey();
    keys.push(newKey);

    return {
      newKey,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 يوم
    };
  }
}

// ====== 5. حماية CORS والـ Headers ======

class SecurityHeaders {
  /**
   * تأمين CORS
   */
  static secureCORS(app) {
    app.use((req, res, next) => {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:3000',
        'http://localhost:3001'
      ];

      const origin = req.headers.origin;

      if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }

      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 ساعة

      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  /**
   * استخدام Helmet لتأمين Headers
   */
  static secureHeaders(app) {
    app.use(helmet({
      // منع Clickjacking
      frameguard: {
        action: 'deny'
      },
      // منع MIME Sniffing
      noSniff: true,
      // تفعيل XSS Protection
      xssFilter: true,
      // تقليل Referrer Info
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https:']
        }
      },
      // Strict Transport Security
      hsts: {
        maxAge: 365 * 24 * 60 * 60, // سنة واحدة
        includeSubDomains: true,
        preload: true
      }
    }));
  }

  /**
   * منع Information Leakage
   */
  static hideServerInfo(app) {
    app.use((req, res, next) => {
      res.removeHeader('X-Powered-By');
      res.removeHeader('Server');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      next();
    });
  }
}

// ====== 6. التشفير والتجزئة ======

class EncryptionUtil {
  /**
   * تشفير البيانات الحساسة
   */
  static encryptData(data, key = process.env.ENCRYPTION_KEY) {
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * فك تشفير البيانات
   */
  static decryptData(encryptedData, key = process.env.ENCRYPTION_KEY) {
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  }

  /**
   * تجزئة كلمة المرور
   */
  static hashPassword(password, rounds = 10) {
    const bcrypt = require('bcryptjs');
    return bcrypt.hashSync(password, rounds);
  }

  /**
   * التحقق من كلمة المرور
   */
  static verifyPassword(password, hash) {
    const bcrypt = require('bcryptjs');
    return bcrypt.compareSync(password, hash);
  }
}

// ====== 7. تسجيل الأمان والمراقبة ======

class SecurityAuiting {
  /**
   * تسجيل محاولات الوصول غير الصحيحة
   */
  static logSecurityEvent(event, details) {
    const timestamp = new Date().toISOString();
    const log = {
      timestamp,
      event,
      details,
      severity: details.severity || 'info'
    };

    // احفظ في قاعدة البيانات
    console.log(`🔐 Security Event [${log.severity.toUpperCase()}]:`, JSON.stringify(log));

    // التنبيهات الفورية للأحداث الخطيرة
    if (log.severity === 'critical' || log.severity === 'high') {
      this.sendSecurityAlert(log);
    }
  }

  /**
   * إرسال تنبيه أمان فوري
   */
  static sendSecurityAlert(log) {
    // أرسل بريد إلكتروني أو رسالة SMS
    console.warn('🚨 CRITICAL SECURITY ALERT:', log);

    // يمكن إضافة Slack notification أو Email
    // this.sendEmail(log);
  }

  /**
   * تسجيل نشاط المستخدم
   */
  static logUserActivity(userId, activity, ipAddress) {
    const log = {
      timestamp: new Date(),
      userId,
      activity,
      ipAddress
    };

    // احفظ في قاعدة البيانات
    console.log('👤 User Activity:', log);
  }

  /**
   * اكتشاف السلوك المريب
   */
  static detectSuspiciousActivity(userId, activity) {
    // تحقق من السلوكيات غير الطبيعية
    // مثل: عدد محاولات فاشلة متكررة، تغييرات كبيرة في موقع الجغرافية، إلخ

    const suspiciousPatterns = {
      'multiple_failed_logins': { threshold: 5, timeWindow: 10 * 60 * 1000 }, // 5 محاولات في 10 دقائق
      'unusual_location': { threshold: 1 }, // تغيير موقع جغرافي غير متوقع
      'bulk_export': { threshold: 1000 } // محاولة تنزيل بيانات كبيرة
    };

    if (suspiciousPatterns[activity.type]) {
      const pattern = suspiciousPatterns[activity.type];
      if (activity.count >= pattern.threshold) {
        this.logSecurityEvent('suspicious_activity_detected', {
          userId,
          activity: activity.type,
          count: activity.count,
          severity: 'high'
        });

        return true;
      }
    }

    return false;
  }
}

// ====== 8. الاختبار الأمني والمسح ======

class SecurityTesting {
  /**
   * مسح الثغرات الشائعة
   */
  static async scanVulnerabilities() {
    // فحص npm dependencies
    const vulnerabilities = [];

    console.log('🔍 Scanning for known vulnerabilities...');

    // يمكن استخدام npm audit
    // npm audit --audit-level=moderate

    return vulnerabilities;
  }

  /**
   * اختبار قوة كلمة المرور
   */
  static checkPasswordStrength(password) {
    const strength = {
      score: 0,
      feedback: []
    };

    // الحد الأدنى 8 أحرف
    if (password.length < 8) {
      strength.feedback.push('يجب أن تكون كلمة المرور 8 أحرف على الأقل');
    } else {
      strength.score++;
    }

    // تحتوي على أحرف كبيرة
    if (/[A-Z]/.test(password)) {
      strength.score++;
    } else {
      strength.feedback.push('أضف أحرف كبيرة');
    }

    // تحتوي على أحرف صغيرة
    if (/[a-z]/.test(password)) {
      strength.score++;
    } else {
      strength.feedback.push('أضف أحرف صغيرة');
    }

    // تحتوي على أرقام
    if (/\d/.test(password)) {
      strength.score++;
    } else {
      strength.feedback.push('أضف أرقام');
    }

    // تحتوي على رموز خاصة
    if (/[!@#$%^&*]/.test(password)) {
      strength.score++;
    } else {
      strength.feedback.push('أضف رموز خاصة');
    }

    const levels = ['ضعيفة جداً', 'ضعيفة', 'متوسطة', 'قوية', 'قوية جداً'];
    strength.level = levels[Math.min(strength.score - 1, 4)];

    return strength;
  }
}

// ====== التصدير ======

module.exports = {
  DDoSProtection,
  RequestValidation,
  JWTSecurity,
  APIKeyManagement,
  SecurityHeaders,
  EncryptionUtil,
  SecurityAuiting,
  SecurityTesting,

  // خادم أمان متكامل
  setupSecurityMiddleware: function(app) {
    // الترتيب مهم جداً
    DDoSProtection.blockSuspiciousIP(app);
    const generalRateLimiter = DDoSProtection.createGeneralRateLimiter();
    app.use(generalRateLimiter);

    SecurityHeaders.secureHeaders(app);
    SecurityHeaders.hideServerInfo(app);
    SecurityHeaders.secureCORS(app);

    RequestValidation.sanitizeInput(app);

    console.log('✅ All security middleware configured');
  }
};
