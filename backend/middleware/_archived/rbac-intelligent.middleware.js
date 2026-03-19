/* eslint-disable no-unused-vars */
/**
 * ═══════════════════════════════════════════════════════════════
 * 🧠 Advanced Intelligent RBAC Middleware
 * ميدلوير RBAC ذكي متقدم
 * ═══════════════════════════════════════════════════════════════
 *
 * المميزات:
 * ✅ كشف الشذوذ الذكي
 * ✅ تحديد معدل الوصول
 * ✅ إدارة جلسات ديناميكية
 * ✅ تخزين مؤقت ذكي
 */

const logger = require('../utils/logger');
const crypto = require('crypto');

class IntelligentRBACMiddleware {
  constructor(rbacSystem, policyEngine, auditingService) {
    this.rbac = rbacSystem;
    this.policyEngine = policyEngine;
    this.auditing = auditingService;

    // Rate Limiting
    this.rateLimits = new Map();
    this.rateLimitConfig = {
      windowMs: 60000, // 1 minute
      maxRequests: 100,
      blockDurationMs: 300000, // 5 minutes
    };

    // Session Management
    this.activeSessions = new Map();
    this.sessionConfig = {
      expiryMs: 3600000, // 1 hour
      idleTimeoutMs: 900000, // 15 minutes
    };

    // Intelligent Cache
    this.smartCache = new Map();
    this.cacheHitStats = new Map();

    // Risk Scoring
    this.riskScores = new Map();
    this.anomalyThresholds = {
      LOW: 0.3,
      MEDIUM: 0.6,
      HIGH: 0.8,
      CRITICAL: 0.95,
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 1️⃣ INTELLIGENT AUTHORIZATION - التفويض الذكي
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * Express middleware للتفويض الذكي
   */
  authorize(requiredPermissions = [], options = {}) {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id || req.headers['x-user-id'];

        if (!userId) {
          return res.status(401).json({
            error: 'Unauthorized: No user ID provided',
            code: 'NO_USER_ID',
          });
        }

        // فحص قيود معدل الوصول
        if (!this._checkRateLimit(userId)) {
          this.auditing.logAuditEvent({
            eventType: 'RATE_LIMIT_EXCEEDED',
            userId,
            action: req.method,
            resource: req.path,
            status: 'failure',
            severity: 'medium',
            ipAddress: req.ip,
          });

          return res.status(429).json({
            error: 'Too Many Requests',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: this.rateLimitConfig.blockDurationMs / 1000,
          });
        }

        // بناء السياق
        const context = this._buildContext(req);

        // فحص الأذونات
        const hasAccess = this._checkPermissions(userId, requiredPermissions, context, options);

        if (!hasAccess) {
          this.auditing.logAuditEvent({
            eventType: 'AUTHORIZATION_FAILED',
            userId,
            action: req.method,
            resource: req.path,
            status: 'failure',
            severity: 'high',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          });

          return res.status(403).json({
            error: 'Forbidden: Insufficient permissions',
            code: 'INSUFFICIENT_PERMISSIONS',
            requiredPermissions,
          });
        }

        // تسجيل الوصول الناجح
        this.auditing.logAuditEvent({
          eventType: 'AUTHORIZATION_SUCCESS',
          userId,
          action: req.method,
          resource: req.path,
          status: 'success',
          ipAddress: req.ip,
        });

        // إضافة معلومات الموارد للطلب
        req.rbac = {
          userId,
          permissions: this.rbac.getUserEffectivePermissions(userId, context),
          scope: this.rbac.calculateUserScope(userId),
          context,
        };

        next();
      } catch (error) {
        logger.error('RBAC Authorization Error:', { error: error.message, stack: error.stack });
        res.status(500).json({
          error: 'Internal Server Error',
          code: 'AUTHORIZATION_ERROR',
        });
      }
    };
  }

  /**
   * التحقق من تعدد الأذونات
   */
  _checkPermissions(userId, requiredPermissions, context, options) {
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // بدون متطلبات = موافقة
    }

    const strategy = options.strategy || 'all'; // all | any | weighted

    switch (strategy) {
      case 'all':
        return this.rbac.hasAllPermissions(userId, requiredPermissions, context);

      case 'any':
        return this.rbac.hasAnyPermission(userId, requiredPermissions, context);

      case 'weighted':
        // التحقق المرجح - أهمية مختلفة لكل إذن
        return this._checkWeightedPermissions(
          userId,
          requiredPermissions,
          options.weights,
          context
        );

      default:
        return false;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 2️⃣ RATE LIMITING & THROTTLING - الحد من معدل الوصول
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * فحص حدود معدل الوصول
   */
  _checkRateLimit(userId) {
    if (!this.rateLimits.has(userId)) {
      this.rateLimits.set(userId, {
        count: 0,
        windowStart: Date.now(),
        blockedUntil: null,
      });
    }

    const limit = this.rateLimits.get(userId);

    // التحقق من حالة الحظر
    if (limit.blockedUntil && Date.now() < limit.blockedUntil) {
      return false; // محظور
    }

    // إعادة تعيين النافذة إذا انتهت
    if (Date.now() - limit.windowStart > this.rateLimitConfig.windowMs) {
      limit.count = 0;
      limit.windowStart = Date.now();
      limit.blockedUntil = null;
    }

    limit.count++;

    // تجاوز الحد
    if (limit.count > this.rateLimitConfig.maxRequests) {
      limit.blockedUntil = Date.now() + this.rateLimitConfig.blockDurationMs;
      return false;
    }

    return true;
  }

  /**
   * ضبط حدود معدل الوصول ديناميكياً
   */
  setDynamicRateLimit(userId, config = {}) {
    const userRole = this.rbac.getUserRoles(userId)[0]?.roleId;

    // الأدوار ذات الأولوية العالية تحصل على حدود أعلى
    const multiplier =
      {
        admin: 5,
        manager: 2,
        user: 1,
        guest: 0.5,
      }[userRole] || 1;

    this.rateLimitConfig.maxRequests = Math.round(100 * multiplier);
    this.rateLimitConfig.blockDurationMs = config.blockDurationMs || 300000;

    this.auditing.logAuditEvent({
      eventType: 'RATE_LIMIT_ADJUSTED',
      userId,
      metadata: { newLimit: this.rateLimitConfig.maxRequests, userRole },
      status: 'success',
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 3️⃣ INTELLIGENT CACHING - التخزين المؤقت الذكي
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * الحصول من الذاكرة المؤقتة الذكية
   */
  getFromSmartCache(key) {
    const cachedItem = this.smartCache.get(key);

    if (!cachedItem) {
      this._updateCacheStats(key, 'miss');
      return null;
    }

    // التحقق من انتهاء الصلاحية
    if (Date.now() - cachedItem.timestamp > cachedItem.ttl) {
      this.smartCache.delete(key);
      this._updateCacheStats(key, 'miss');
      return null;
    }

    this._updateCacheStats(key, 'hit');
    return cachedItem.data;
  }

  /**
   * الحفظ في الذاكرة المؤقتة الذكية
   */
  setInSmartCache(key, data, ttl = 300000) {
    this.smartCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
    });

    // تنظيف العناصر المنتهية الصلاحية
    if (this.smartCache.size > 10000) {
      this._cleanupSmartCache();
    }
  }

  /**
   * تنظيف الذاكرة المؤقتة
   */
  _cleanupSmartCache() {
    const now = Date.now();
    const entriesToDelete = [];

    for (const [key, item] of this.smartCache.entries()) {
      if (now - item.timestamp > item.ttl) {
        entriesToDelete.push(key);
      }
    }

    entriesToDelete.forEach(key => this.smartCache.delete(key));
  }

  /**
   * تحديث إحصائيات الذاكرة المؤقتة
   */
  _updateCacheStats(key, type) {
    if (!this.cacheHitStats.has(key)) {
      this.cacheHitStats.set(key, { hits: 0, misses: 0 });
    }

    const stats = this.cacheHitStats.get(key);
    if (type === 'hit') stats.hits++;
    else stats.misses++;
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 4️⃣ ANOMALY DETECTION & RISK SCORING - الكشف عن الشذوذ
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * حساب درجة المخاطرة للطلب
   */
  calculateRiskScore(userId, context) {
    let riskScore = 0;

    // عامل 1: السلوك غير المعتاد
    if (!this._isNormalBehavior(userId, context)) {
      riskScore += 0.3;
    }

    // عامل 2: ساعة غير عادية للوصول
    if (!this._isNormalAccessTime(userId, context)) {
      riskScore += 0.2;
    }

    // عامل 3: موقع غير معتاد
    if (!this._isNormalLocation(userId, context)) {
      riskScore += 0.25;
    }

    // عامل 4: جهاز غير معتاد
    if (!this._isKnownDevice(userId, context.deviceId)) {
      riskScore += 0.15;
    }

    // عامل 5: عمليات حساسة
    if (context.isSensitiveOperation) {
      riskScore += 0.2;
    }

    this.riskScores.set(`${userId}_${Date.now()}`, {
      score: riskScore,
      userId,
      timestamp: new Date(),
      factors: {
        behavior: !this._isNormalBehavior(userId, context),
        time: !this._isNormalAccessTime(userId, context),
        location: !this._isNormalLocation(userId, context),
        device: !this._isKnownDevice(userId, context.deviceId),
        sensitive: context.isSensitiveOperation,
      },
    });

    // تنبيهات المخاطرة العالية
    if (riskScore > this.anomalyThresholds.HIGH) {
      this._triggerHighRiskAlert(userId, riskScore, context);
    }

    return Math.min(riskScore, 1);
  }

  /**
   * التحقق من السلوك الطبيعي
   */
  _isNormalBehavior(userId, context) {
    const history = this.auditing.getUserAccessHistory?.(userId, 50) || [];

    if (history.length < 5) return true; // بيانات غير كافية

    const similarActions = history.filter(h => h.action === context.action);
    return similarActions.length > history.length * 0.1; // أكثر من 10% من الإجراءات السابقة
  }

  /**
   * التحقق من ساعة الوصول الطبيعية
   */
  _isNormalAccessTime(userId, _context) {
    const currentHour = new Date().getHours();
    const businessHours = currentHour >= 8 && currentHour <= 20;

    // أدوار مثل admin قد تحتاج وصول في أي وقت
    const role = this.rbac.getUserRoles(userId)[0]?.roleId;
    if (['admin', 'manager'].includes(role)) {
      return true;
    }

    return businessHours;
  }

  /**
   * التحقق من الموقع الطبيعي
   */
  _isNormalLocation(userId, context) {
    if (!context.location) return true;

    const history = this.auditing.getUserAccessHistory?.(userId, 100) || [];
    const locations = history.map(h => h.ipAddress).filter(Boolean);

    if (locations.length === 0) return true; // بدون بيانات

    // السماح بنطاق IP معقول
    return locations.includes(context.ipAddress) || locations.length < 3;
  }

  /**
   * التحقق من معرفة الجهاز
   */
  _isKnownDevice(userId, deviceId) {
    if (!deviceId) return true; // لا يوجد معرف جهاز

    // هنا يمكن إضافة قاعدة بيانات لأجهزة معروفة
    const knownDevices = new Set(); // يجب ملؤها من قاعدة البيانات
    return knownDevices.has(deviceId);
  }

  /**
   * تشغيل تنبيه المخاطرة العالية
   */
  _triggerHighRiskAlert(userId, riskScore, context) {
    const riskLevel =
      riskScore > this.anomalyThresholds.CRITICAL
        ? 'CRITICAL'
        : riskScore > this.anomalyThresholds.HIGH
          ? 'HIGH'
          : 'MEDIUM';

    this.auditing.reportSecurityIncident({
      type: 'HIGH_RISK_ACCESS_ATTEMPT',
      severity: riskLevel,
      userId,
      riskScore,
      context,
      timestamp: new Date(),
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 5️⃣ SESSION MANAGEMENT - إدارة الجلسات
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * إنشاء جلسة جديدة
   */
  createSession(userId, metadata = {}) {
    const sessionId = crypto.randomBytes(16).toString('hex');

    const session = {
      sessionId,
      userId,
      createdAt: new Date(),
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + this.sessionConfig.expiryMs),

      // Session Details
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      deviceId: metadata.deviceId,

      // Status
      isActive: true,

      // Access History
      accessLog: [],
    };

    this.activeSessions.set(sessionId, session);

    // تنظيف الجلسات القديمة
    this._cleanupExpiredSessions();

    return sessionId;
  }

  /**
   * التحقق من صحة الجلسة
   */
  validateSession(sessionId) {
    const session = this.activeSessions.get(sessionId);

    if (!session) {
      return { valid: false, reason: 'SESSION_NOT_FOUND' };
    }

    if (!session.isActive) {
      return { valid: false, reason: 'SESSION_INACTIVE' };
    }

    if (new Date() > session.expiresAt) {
      session.isActive = false;
      return { valid: false, reason: 'SESSION_EXPIRED' };
    }

    // التحقق من المهلة الزمنية للخمول
    if (new Date() - session.lastActivity > this.sessionConfig.idleTimeoutMs) {
      session.isActive = false;
      return { valid: false, reason: 'SESSION_IDLE_TIMEOUT' };
    }

    // تحديث آخر نشاط
    session.lastActivity = new Date();

    return { valid: true, session };
  }

  /**
   * تنظيف الجلسات المنتهية
   */
  _cleanupExpiredSessions() {
    const now = new Date();
    const sessionsToDelete = [];

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now > session.expiresAt || !session.isActive) {
        sessionsToDelete.push(sessionId);
      }
    }

    sessionsToDelete.forEach(id => this.activeSessions.delete(id));
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 6️⃣ UTILITY METHODS - طرق مساعدة
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * بناء السياق من الطلب
   */
  _buildContext(req) {
    return {
      method: req.method,
      path: req.path,
      action: req.method,
      resource: req.path,
      ipAddress: req.ip || req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent'],
      deviceId: req.headers['x-device-id'],
      timestamp: new Date(),
      sessionId: req.headers['x-session-id'],
    };
  }

  /**
   * التحقق المرجح للأذونات
   */
  _checkWeightedPermissions(userId, requiredPermissions, weights = {}, context) {
    let totalWeight = 0;
    let grantedWeight = 0;

    for (const perm of requiredPermissions) {
      const weight = weights[perm] || 1;
      totalWeight += weight;

      if (this.rbac.hasPermission(userId, perm, context)) {
        grantedWeight += weight;
      }
    }

    // يجب الحصول على 70% من الوزن على الأقل
    return grantedWeight / totalWeight >= 0.7;
  }

  /**
   * الحصول على إحصائيات الأداء
   */
  getPerformanceStats() {
    let totalRequests = 0;
    let totalHits = 0;

    for (const stats of this.cacheHitStats.values()) {
      totalRequests += stats.hits + stats.misses;
      totalHits += stats.hits;
    }

    return {
      cacheHitRate:
        totalRequests > 0 ? ((totalHits / totalRequests) * 100).toFixed(2) + '%' : 'N/A',
      activeSessions: this.activeSessions.size,
      cachedItems: this.smartCache.size,
      riskScoresTracked: this.riskScores.size,
    };
  }

  /**
   * تصدير البيانات
   */
  exportData() {
    return {
      activeSessions: Array.from(this.activeSessions.values()),
      riskScores: Array.from(this.riskScores.values()),
      cacheStats: Array.from(this.cacheHitStats.entries()),
      timestamp: new Date(),
    };
  }
}

module.exports = IntelligentRBACMiddleware;
