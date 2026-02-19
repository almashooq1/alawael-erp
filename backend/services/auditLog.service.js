/**
 * خدمة سجل التدقيق الذكي (Audit Log Service)
 * خدمة شاملة لإدارة وتحليل سجلات التدقيق
 */

const {
  AuditLog,
  AuditEventTypes,
  SeverityLevels,
  OperationStatus,
} = require('../models/auditLog.model');
const { encrypt } = require('../utils/fieldEncryption');
let geoip;
let UAParser;

try {
  geoip = require('geoip-lite');
} catch (error) {
  geoip = null;
}

try {
  UAParser = require('ua-parser-js');
} catch (error) {
  UAParser = null;
}

class AuditLogService {
  constructor() {
    this.logEvent = AuditLogService.logEvent;
    this.createAuditLog = AuditLogService.createAuditLog;
    this.logAuthEvent = AuditLogService.logAuthEvent;
    this.logDataOperation = AuditLogService.logDataOperation;
    this.logSecurityEvent = AuditLogService.logSecurityEvent;
    this.logApiRequest = AuditLogService.logApiRequest;
    this.search = AuditLogService.search;
    this.getStatistics = AuditLogService.getStatistics;
    this.analyzeUserBehavior = AuditLogService.analyzeUserBehavior;
    this.exportLogs = AuditLogService.exportLogs;
    this.archiveOldLogs = AuditLogService.archiveOldLogs;
    this.deleteArchivedLogs = AuditLogService.deleteArchivedLogs;
    this.notifyCriticalEvent = AuditLogService.notifyCriticalEvent;
  }

  /**
   * تسجيل حدث تدقيق شامل
   */
  static async logEvent({
    eventType,
    severity = 'info',
    status = 'success',
    userId,
    username,
    userEmail,
    userRole,
    sessionId,
    req,
    resource,
    changes,
    metadata = {},
    message,
    description,
    error,
    tags = [],
    flags = {},
  }) {
    // Skip audit logging in test mode to avoid Mongoose buffering timeouts
    // UNLESS ENABLE_AUDIT_LOGGING_IN_TESTS is set for audit-specific tests
    if (process.env.NODE_ENV === 'test' && process.env.ENABLE_AUDIT_LOGGING_IN_TESTS !== 'true') {
      return null;
    }
    try {
      // استخراج معلومات من الطلب
      let requestData = {};
      let deviceInfo = {};
      let location = {};
      let ipAddress = null;

      if (req) {
        ipAddress = this.extractIpAddress(req);
        deviceInfo = this.parseUserAgent(req.headers['user-agent']);
        location = this.getLocation(ipAddress);

        requestData = {
          method: req.method,
          url: req.originalUrl || req.url,
          endpoint: req.route?.path,
          query: req.query,
          headers: this.sanitizeHeaders(req.headers),
          body: this.sanitizeBody(req.body),
        };
      }

      // تحويل userId إلى ObjectId إذا كان صحيحاً أو تركه null إذا كان مثل "mock_tester"
      let finalUserId = null;
      if (userId && userId !== 'mock_tester') {
        if (typeof userId === 'string' && userId.length === 24) {
          // محاولة تحويل إلى ObjectId
          try {
            const mongoose = require('mongoose');
            finalUserId = new mongoose.Types.ObjectId(userId);
          } catch (e) {
            finalUserId = null; // في حالة الفشل، ترك كـ null
          }
        } else if (typeof userId === 'object' && userId._id) {
          finalUserId = userId._id;
        } else if (typeof userId === 'object') {
          finalUserId = userId; // ObjectId object
        }
      }

      // تحويل resource إلى string إذا كان object
      let finalResource = null;
      if (resource) {
        if (typeof resource === 'string') {
          finalResource = resource;
        } else if (typeof resource === 'object') {
          // تحويل object إلى string format: "type:id"
          finalResource = `${resource.type}:${resource.id}`;
        }
      }

      // إنشاء سجل التدقيق
      const auditLog = await AuditLog.create({
        eventType,
        eventCategory: eventType.split('.')[0] || 'general',
        message: message || description || 'Audit log entry',
        severity,
        status,
        userId: finalUserId,
        username,
        userEmail,
        userRole,
        sessionId,
        ipAddress,
        userAgent: req?.headers['user-agent'],
        deviceInfo,
        location,
        request: requestData,
        resource: finalResource,
        changes,
        metadata,
        description,
        error,
        tags,
        flags,
        timestamp: new Date(),
      });

      // إصدار إشعار للأحداث الحرجة
      if (severity === 'critical' || severity === 'high') {
        await this.notifyCriticalEvent(auditLog);
      }

      return auditLog;
    } catch (err) {
      console.error('Error logging audit event:', err);
      // لا نرمي خطأ لتجنب توقف العملية الأساسية
      return null;
    }
  }

  /**
   * تسجيل حدث مصادقة
   */
  static async logAuthEvent(type, user, req, success = true, error = null) {
    const eventType =
      type === 'login'
        ? success
          ? AuditEventTypes.AUTH_LOGIN
          : AuditEventTypes.AUTH_LOGIN_FAILED
        : AuditEventTypes.AUTH_LOGOUT;

    return await this.logEvent({
      eventType,
      severity: success ? 'info' : 'medium',
      status: success ? 'success' : 'failure',
      userId: user?._id,
      username: user?.username,
      userEmail: user?.email,
      userRole: user?.role,
      req,
      message: success
        ? `User ${user?.username} ${type} successfully`
        : `Failed ${type} attempt for ${user?.username || 'unknown user'}`,
      error: error ? { message: error.message } : null,
      tags: ['authentication', type],
    });
  }

  /**
   * تسجيل عملية CRUD
   */
  static async logDataOperation(operation, resource, user, req, oldData = null, newData = null) {
    const eventTypeMap = {
      create: AuditEventTypes.DATA_CREATED,
      read: AuditEventTypes.DATA_READ,
      update: AuditEventTypes.DATA_UPDATED,
      delete: AuditEventTypes.DATA_DELETED,
    };

    const changes = oldData && newData ? this.calculateChanges(oldData, newData) : null;

    return await this.logEvent({
      eventType: eventTypeMap[operation] || AuditEventTypes.DATA_UPDATED,
      severity: operation === 'delete' ? 'medium' : 'low',
      status: 'success',
      userId: user?._id,
      username: user?.username,
      userRole: user?.role,
      req,
      resource: `${resource.type}:${resource.id}`,
      changes,
      message: `${operation.toUpperCase()} operation on ${resource.type} ${resource.name || resource.id}`,
      tags: ['data', operation, resource.type],
    });
  }

  /**
   * تسجيل حدث أمني
   */
  static async logSecurityEvent(eventType, user, req, details, severity = 'high') {
    return await this.logEvent({
      eventType,
      severity,
      status: 'failure',
      userId: user?._id,
      username: user?.username,
      req,
      message: `Security event: ${eventType}`,
      description: details,
      tags: ['security', 'alert'],
      flags: {
        requiresReview: true,
        isAnomaly: true,
      },
    });
  }

  /**
   * تسجيل طلب API
   */
  static async logApiRequest(req, res, duration) {
    const success = res.statusCode < 400;

    // استخراج userId من عدة مصادر محتملة
    let userId = null;
    if (req.user) {
      if (typeof req.user === 'string') {
        // في الاختبارات قد يكون userId مرسل مباشرة كـ string
        userId = req.user !== 'mock_tester' ? req.user : null;
      } else if (req.user._id && req.user._id !== 'mock_tester') {
        userId = req.user._id;
      } else if (req.user.id && req.user.id !== 'mock_tester') {
        userId = req.user.id;
      }
    }

    return await this.logEvent({
      eventType: success ? AuditEventTypes.API_REQUEST : AuditEventTypes.API_ERROR,
      severity: success ? 'info' : 'medium',
      status: success ? 'success' : 'failure',
      userId,
      username: req.user?.username || req.user?.name,
      req,
      response: {
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
      },
      metadata: {
        duration,
        size: res.get('content-length'),
      },
      message: `API ${req.method} ${req.originalUrl} - ${res.statusCode}`,
      tags: ['api', req.method.toLowerCase()],
    });
  }

  /**
   * البحث في السجلات
   */
  static async search(filters = {}, options = {}) {
    const {
      eventType,
      eventCategory,
      severity,
      status,
      userId,
      startDate,
      endDate,
      ipAddress,
      searchText,
      tags,
      isAnomaly,
      requiresReview,
    } = filters;

    const { limit = 100, skip = 0, sort = '-timestamp' } = options;

    const query = {};

    // بناء الاستعلام
    if (eventType) query.eventType = eventType;
    if (eventCategory) query.eventCategory = eventCategory;
    if (severity) query.severity = severity;
    if (status) query.status = status;
    if (userId) query.userId = userId;
    if (ipAddress) query.ipAddress = ipAddress;
    if (tags && tags.length) query.tags = { $in: tags };
    if (isAnomaly !== undefined) query['flags.isAnomaly'] = isAnomaly;
    if (requiresReview !== undefined) query['flags.requiresReview'] = requiresReview;

    // نطاق التاريخ
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // البحث النصي
    if (searchText) {
      query.$text = { $search: searchText };
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort(sort).limit(limit).skip(skip).lean(),
      AuditLog.countDocuments(query),
    ]);

    return {
      logs,
      pagination: {
        total,
        limit,
        skip,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * الحصول على إحصائيات
   */
  static async getStatistics(startDate, endDate) {
    const stats = await AuditLog.getStatistics(startDate, endDate);

    // إحصائيات إضافية
    const [totalEvents, criticalEvents, failedEvents, uniqueUsers, uniqueIPs, anomalies] =
      await Promise.all([
        AuditLog.countDocuments({
          timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) },
        }),
        AuditLog.countDocuments({
          severity: { $in: ['critical', 'high'] },
          timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) },
        }),
        AuditLog.countDocuments({
          status: 'failure',
          timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) },
        }),
        AuditLog.distinct('userId', {
          timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) },
        }).then(users => users.length),
        AuditLog.distinct('ipAddress', {
          timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) },
        }).then(ips => ips.length),
        AuditLog.countDocuments({
          'flags.isAnomaly': true,
          timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) },
        }),
      ]);

    return {
      overview: {
        totalEvents,
        criticalEvents,
        failedEvents,
        uniqueUsers,
        uniqueIPs,
        anomalies,
        successRate:
          totalEvents > 0 ? (((totalEvents - failedEvents) / totalEvents) * 100).toFixed(2) : 0,
      },
      byEventType: stats,
    };
  }

  /**
   * تحليل سلوك المستخدم
   */
  static async analyzeUserBehavior(userId, days = 7) {
    const [pattern, anomalies, recentActivity] = await Promise.all([
      AuditLog.analyzeUserPattern(userId, days),
      AuditLog.detectAnomalies(userId),
      AuditLog.getByUser(userId, { limit: 20 }),
    ]);

    return {
      pattern,
      anomalies,
      recentActivity,
      riskScore: this.calculateRiskScore(anomalies, pattern),
    };
  }

  /**
   * تصدير السجلات
   */
  static async exportLogs(filters, format = 'json') {
    const { logs } = await this.search(filters, { limit: 10000 });

    if (format === 'csv') {
      return this.convertToCSV(logs);
    }

    return JSON.stringify(logs);
  }

  /**
   * أرشفة السجلات القديمة
   */
  static async archiveOldLogs(daysOld = 90) {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const result = await AuditLog.updateMany(
      {
        timestamp: { $lt: cutoffDate },
        'flags.isArchived': false,
      },
      {
        $set: { 'flags.isArchived': true },
      }
    );

    return result;
  }

  /**
   * حذف السجلات المؤرشفة
   */
  static async deleteArchivedLogs(daysOld = 180) {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const result = await AuditLog.deleteMany({
      timestamp: { $lt: cutoffDate },
      'flags.isArchived': true,
    });

    return result;
  }

  // ============ Helper Methods ============

  /**
   * استخراج عنوان IP
   */
  static extractIpAddress(req) {
    return (
      req.ip ||
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      null
    );
  }

  /**
   * تحليل User Agent
   */
  static parseUserAgent(userAgent) {
    if (!userAgent) return {};
    if (!UAParser) return {};

    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    return {
      browser: result.browser.name,
      os: result.os.name,
      device: result.device.type || 'desktop',
      platform: result.os.name,
    };
  }

  /**
   * الحصول على الموقع الجغرافي
   */
  static getLocation(ip) {
    if (!ip || ip === '::1' || ip === '127.0.0.1') return {};
    if (!geoip) return {};

    const geo = geoip.lookup(ip);
    if (!geo) return {};

    return {
      country: geo.country,
      city: geo.city,
      region: geo.region,
      coordinates: {
        lat: geo.ll[0],
        lng: geo.ll[1],
      },
    };
  }

  /**
   * تنقية Headers
   */
  static sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    // إزالة المعلومات الحساسة
    delete sanitized.authorization;
    delete sanitized.cookie;
    delete sanitized['x-api-key'];
    return sanitized;
  }

  /**
   * تنقية Body
   */
  static sanitizeBody(body) {
    if (!body) return null;

    const sanitized = { ...body };
    // إزالة كلمات المرور والمعلومات الحساسة
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'creditCard',
      'otp',
      'backupCode',
      'mfa',
      'pin',
      'ssn',
      'nationalId',
    ];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        const encryptedValue = encrypt(sanitized[field]);
        sanitized[field] = encryptedValue === sanitized[field] ? '***REDACTED***' : encryptedValue;
      }
    }

    return sanitized;
  }

  /**
   * حساب التغييرات بين البيانات القديمة والجديدة
   */
  static calculateChanges(oldData, newData) {
    const changes = {
      before: {},
      after: {},
      fields: [],
    };

    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const key of allKeys) {
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        changes.before[key] = oldData[key];
        changes.after[key] = newData[key];
        changes.fields.push(key);
      }
    }

    return changes;
  }

  /**
   * حساب درجة المخاطر
   */
  static calculateRiskScore(anomalies, pattern) {
    let score = 0;

    // زيادة النقاط بناءً على الحالات الشاذة
    score += anomalies.length * 10;

    // تحليل النمط
    if (pattern.length > 0) {
      const avgCount = pattern.reduce((sum, p) => sum + p.count, 0) / pattern.length;
      if (avgCount > 100) score += 20;
    }

    // تحديد المستوى
    if (score > 80) return { score, level: 'critical', color: 'red' };
    if (score > 50) return { score, level: 'high', color: 'orange' };
    if (score > 30) return { score, level: 'medium', color: 'yellow' };
    return { score, level: 'low', color: 'green' };
  }

  /**
   * تحويل إلى CSV
   */
  static convertToCSV(logs) {
    if (!logs.length) return '';

    const headers = [
      'Timestamp',
      'Event Type',
      'Severity',
      'Status',
      'User',
      'IP Address',
      'Message',
    ];

    const rows = logs.map(log => [
      log.timestamp,
      log.eventType,
      log.severity,
      log.status,
      log.username || 'N/A',
      log.ipAddress || 'N/A',
      log.message,
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * إرسال إشعار للأحداث الحرجة
   */
  static async notifyCriticalEvent(auditLog) {
    // يمكن تكامله مع نظام الإشعارات
    console.warn('CRITICAL AUDIT EVENT:', {
      eventType: auditLog.eventType,
      message: auditLog.message,
      user: auditLog.username,
      timestamp: auditLog.timestamp,
    });
  }

  /**
   * إنشاء سجل تدقيق (نسخة مختصرة من logEvent)
   */
  static async createAuditLog(data) {
    try {
      const auditLog = new AuditLog({
        eventType: data.action || 'CUSTOM_EVENT',
        severity: data.severity || 'info',
        message: data.message,
        userId: data.user,
        username: data.user,
        metadata: {
          details: data.details,
          workflowId: data.workflowId,
          state: data.state,
          step: data.step,
          phase: data.phase,
          error: data.error,
          errorMessage: data.errorMessage,
          value: data.value,
          initialValue: data.initialValue,
          data: data.data,
          recovered: data.recovered,
        },
      });
      await auditLog.save();
      return auditLog;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = AuditLogService;
