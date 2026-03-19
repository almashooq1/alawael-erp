/**
 * خدمة تحسين الأمان والأداء
 * Security & Performance Enhancement Service
 *
 * يوفر وظائف التحكم في معدل الطلبات والتحقق من المدخلات والأمان
 * Provides rate limiting, input validation, and security features
 */

class SecurityEnhancementService {
  constructor() {
    this.rateLimitStore = new Map();
    this.requestStats = {
      totalRequests: 0,
      blockedRequests: 0,
      securityIssues: [],
    };
    this.securityConfig = {
      rateLimit: {
        maxRequests: 100,
        windowMs: 15 * 60 * 1000, // 15 minutes
      },
      inputValidation: {
        maxStringLength: 1000,
        maxArrayLength: 10000,
        allowedSpecialChars: true,
      },
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5000'],
        credentials: true,
      },
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
      },
    };
  }

  /**
   * فحص حد معدل الطلبات
   * Check rate limit for IP/user
   */
  checkRateLimit(identifier) {
    const now = Date.now();
    const windowStart = now - this.securityConfig.rateLimit.windowMs;

    if (!this.rateLimitStore.has(identifier)) {
      this.rateLimitStore.set(identifier, {
        requests: [now],
        blocked: false,
      });
      return { allowed: true, remaining: this.securityConfig.rateLimit.maxRequests - 1 };
    }

    const userData = this.rateLimitStore.get(identifier);
    userData.requests = userData.requests.filter(time => time > windowStart);

    if (userData.requests.length >= this.securityConfig.rateLimit.maxRequests) {
      this.requestStats.blockedRequests++;
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil((userData.requests[0] + this.securityConfig.rateLimit.windowMs - now) / 1000),
      };
    }

    userData.requests.push(now);
    return {
      allowed: true,
      remaining: this.securityConfig.rateLimit.maxRequests - userData.requests.length,
    };
  }

  /**
   * التحقق من صحة المدخلات
   * Validate input data
   */
  validateInput(data, schema = {}) {
    const errors = [];

    if (typeof data === 'string') {
      if (data.length > this.securityConfig.inputValidation.maxStringLength) {
        errors.push(`String exceeds maximum length of ${this.securityConfig.inputValidation.maxStringLength}`);
      }
    }

    if (Array.isArray(data)) {
      if (data.length > this.securityConfig.inputValidation.maxArrayLength) {
        errors.push(`Array exceeds maximum length of ${this.securityConfig.inputValidation.maxArrayLength}`);
      }
    }

    if (typeof data === 'object' && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        // Check for SQL injection patterns
        if (typeof value === 'string') {
          if (this.detectSQLInjection(value)) {
            errors.push(`Potential SQL injection detected in field: ${key}`);
          }
          if (this.detectXSS(value)) {
            errors.push(`Potential XSS detected in field: ${key}`);
          }
          if (value.length > this.securityConfig.inputValidation.maxStringLength) {
            errors.push(`Field ${key} exceeds maximum string length`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      data: this.sanitizeInput(data),
    };
  }

  /**
   * كشف محاولات حقن SQL
   * Detect SQL injection attempts
   */
  detectSQLInjection(input) {
    const sqlPatterns = [
      /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
      /(-{2}|\/\*|\*\/|;|'|\"|\\)/g,
      /(;|'|"|-{2}|\/\*|\*\/|xp_|sp_)/gi,
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * كشف هجمات XSS
   * Detect XSS attempts
   */
  detectXSS(input) {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /javascript:/gi,
      /data:text\/html/gi,
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }

  /**
   * تنظيف المدخلات
   * Sanitize input data
   */
  sanitizeInput(data) {
    if (typeof data === 'string') {
      return data
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .trim();
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeInput(item));
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }

    return data;
  }

  /**
   * التحقق من رؤوس CORS
   * Verify CORS headers
   */
  verifyCORS(origin) {
    return this.securityConfig.cors.origin.includes(origin);
  }

  /**
   * الحصول على رؤوس الأمان
   * Get security headers
   */
  getSecurityHeaders() {
    return {
      ...this.securityConfig.headers,
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'",
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    };
  }

  /**
   * تجزئة كلمة مرور (محاكاة)
   * Hash password (simulated)
   */
  hashPassword(password) {
    // في الإنتاج، استخدم bcrypt أو مكتبة مشابهة
    let hash = 0;
    if (password.length === 0) return hash.toString();

    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * التحقق من كلمة المرور
   * Verify password
   */
  verifyPassword(password, hash) {
    return this.hashPassword(password) === hash;
  }

  /**
   * إنشاء رمز أمان (CSRF)
   * Generate CSRF token
   */
  generateCSRFToken() {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * تشفير بيانات حساسة
   * Encrypt sensitive data
   */
  encryptData(data, key = 'default_key') {
    // محاكاة التشفير
    const encoded = btoa(JSON.stringify(data));
    return {
      encrypted: encoded,
      algorithm: 'base64',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * فك تشفير البيانات
   * Decrypt data
   */
  decryptData(encryptedData) {
    try {
      return JSON.parse(atob(encryptedData.encrypted));
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }

  /**
   * سجل مشكلة أمان
   * Log security issue
   */
  logSecurityIssue(issue) {
    const securityLog = {
      type: issue.type,
      severity: issue.severity || 'medium',
      message: issue.message,
      timestamp: new Date().toISOString(),
      ip: issue.ip,
      userId: issue.userId,
    };

    this.requestStats.securityIssues.push(securityLog);

    // الاحتفاظ بآخر 1000 مشكلة
    if (this.requestStats.securityIssues.length > 1000) {
      this.requestStats.securityIssues = this.requestStats.securityIssues.slice(-1000);
    }

    console.warn('[SECURITY]', securityLog);
    return securityLog;
  }

  /**
   * الحصول على إحصائيات الأمان
   * Get security statistics
   */
  getSecurityStats() {
    return {
      totalRequests: this.requestStats.totalRequests,
      blockedRequests: this.requestStats.blockedRequests,
      blockRate:
        this.requestStats.totalRequests > 0
          ? ((this.requestStats.blockedRequests / this.requestStats.totalRequests) * 100).toFixed(2) + '%'
          : '0%',
      securityIssuesCount: this.requestStats.securityIssues.length,
      recentIssues: this.requestStats.securityIssues.slice(-10),
      rateLimitEntries: this.rateLimitStore.size,
    };
  }

  /**
   * التحقق من البريد الإلكتروني
   * Validate email
   */
  validateEmail(email) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
  }

  /**
   * التحقق من رقم الهاتف
   * Validate phone number
   */
  validatePhoneNumber(phone) {
    const pattern = /^[\d\-\+\(\)\s]{10,}$/;
    return pattern.test(phone);
  }

  /**
   * التحقق من صيغة التاريخ
   * Validate date format
   */
  validateDate(date) {
    return !isNaN(new Date(date).getTime());
  }

  /**
   * تنظيف قاعدة البيانات
   * Cleanup old rate limit entries
   */
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.securityConfig.rateLimit.windowMs;

    for (const [key, value] of this.rateLimitStore.entries()) {
      const activeRequests = value.requests.filter(time => time > windowStart);
      if (activeRequests.length === 0) {
        this.rateLimitStore.delete(key);
      } else {
        value.requests = activeRequests;
      }
    }
  }

  /**
   * إعادة تعيين الإحصائيات
   * Reset statistics
   */
  resetStatistics() {
    this.requestStats = {
      totalRequests: 0,
      blockedRequests: 0,
      securityIssues: [],
    };
  }
}

// Singleton instance
const securityEnhancementService = new SecurityEnhancementService();

export default securityEnhancementService;
