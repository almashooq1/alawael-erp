/**
 * نموذج سجل التدقيق الشامل (Audit Log Model)
 * نظام تدقيق ذكي متقدم لتتبع جميع العمليات في النظام
 */

const mongoose = require('mongoose');

// تعريف أنواع الأحداث
const AuditEventTypes = {
  // أحداث المصادقة
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_LOGIN_FAILED: 'auth.login_failed',
  AUTH_PASSWORD_CHANGED: 'auth.password_changed',
  AUTH_TOKEN_REFRESHED: 'auth.token_refreshed',
  AUTH_MFA_ENABLED: 'auth.mfa_enabled',
  AUTH_MFA_DISABLED: 'auth.mfa_disabled',

  // أحداث المستخدمين
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_SUSPENDED: 'user.suspended',
  USER_ACTIVATED: 'user.activated',
  USER_ROLE_CHANGED: 'user.role_changed',
  USER_PERMISSIONS_CHANGED: 'user.permissions_changed',

  // أحداث البيانات (CRUD)
  DATA_CREATED: 'data.created',
  DATA_READ: 'data.read',
  DATA_UPDATED: 'data.updated',
  DATA_DELETED: 'data.deleted',
  DATA_EXPORTED: 'data.exported',
  DATA_IMPORTED: 'data.imported',

  // أحداث الأمان
  SECURITY_ACCESS_DENIED: 'security.access_denied',
  SECURITY_SUSPICIOUS_ACTIVITY: 'security.suspicious_activity',
  SECURITY_RATE_LIMIT_EXCEEDED: 'security.rate_limit_exceeded',
  SECURITY_BRUTE_FORCE_DETECTED: 'security.brute_force_detected',
  SECURITY_IP_BLOCKED: 'security.ip_blocked',
  SECURITY_PERMISSION_ESCALATION: 'security.permission_escalation',

  // أحداث النظام
  SYSTEM_CONFIG_CHANGED: 'system.config_changed',
  SYSTEM_BACKUP_CREATED: 'system.backup_created',
  SYSTEM_RESTORE_PERFORMED: 'system.restore_performed',
  SYSTEM_MAINTENANCE_START: 'system.maintenance_start',
  SYSTEM_MAINTENANCE_END: 'system.maintenance_end',
  SYSTEM_ERROR: 'system.error',

  // أحداث الملفات
  FILE_UPLOADED: 'file.uploaded',
  FILE_DOWNLOADED: 'file.downloaded',
  FILE_DELETED: 'file.deleted',
  FILE_SHARED: 'file.shared',
  FILE_PERMISSION_CHANGED: 'file.permission_changed',

  // أحداث API
  API_REQUEST: 'api.request',
  API_ERROR: 'api.error',
  API_RATE_LIMIT: 'api.rate_limit',
  API_DEPRECATED: 'api.deprecated',

  // أحداث التقارير
  REPORT_GENERATED: 'report.generated',
  REPORT_EXPORTED: 'report.exported',
  REPORT_SCHEDULED: 'report.scheduled',

  // أحداث الإشعارات
  NOTIFICATION_SENT: 'notification.sent',
  NOTIFICATION_FAILED: 'notification.failed',
  EMAIL_SENT: 'email.sent',
  SMS_SENT: 'sms.sent',
};

// مستويات الخطورة
const SeverityLevels = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info',
};

// حالات العمليات
const OperationStatus = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
};

// Schema للسجل الأساسي
const auditLogSchema = new mongoose.Schema(
  {
    // معلومات الحدث
    eventType: {
      type: String,
      required: true,
      enum: Object.values(AuditEventTypes),
      index: true,
    },
    eventCategory: {
      type: String,
      required: true,
      enum: [
        'auth',
        'authentication',
        'authorization',
        'data',
        'security',
        'system',
        'api',
        'file',
        'report',
        'notification',
      ],
      index: true,
    },
    severity: {
      type: String,
      enum: Object.values(SeverityLevels),
      default: 'info',
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(OperationStatus),
      default: 'success',
      index: true,
    },

    // معلومات المستخدم
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    username: String,
    userEmail: String,
    userRole: String,

    // معلومات الجلسة
    sessionId: {
      type: String,
      index: true,
    },
    ipAddress: {
      type: String,
      index: true,
    },
    userAgent: String,
    deviceInfo: {
      browser: String,
      os: String,
      device: String,
      platform: String,
    },

    // معلومات الموقع الجغرافي
    location: {
      country: String,
      city: String,
      region: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },

    // تفاصيل الطلب
    request: {
      method: String,
      url: String,
      endpoint: String,
      query: mongoose.Schema.Types.Mixed,
      headers: mongoose.Schema.Types.Mixed,
      body: mongoose.Schema.Types.Mixed,
    },

    // تفاصيل الاستجابة
    response: {
      statusCode: Number,
      statusMessage: String,
      data: mongoose.Schema.Types.Mixed,
      error: mongoose.Schema.Types.Mixed,
    },

    // تفاصيل الموارد المتأثرة
    resource: {
      type: String,
      default: null,
    },

    // البيانات القديمة والجديدة (للتحديثات)
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
      fields: [String],
    },

    // معلومات إضافية
    metadata: {
      duration: Number, // مدة العملية بالميلي ثانية
      size: Number, // حجم البيانات
      count: Number, // عدد السجلات المتأثرة
      tags: [String],
      custom: mongoose.Schema.Types.Mixed,
    },

    // الرسالة والوصف
    message: {
      type: String,
      required: true,
    },
    description: String,
    notes: String,

    // معلومات الأخطاء (في حالة الفشل)
    error: {
      code: String,
      message: String,
      stack: String,
      details: mongoose.Schema.Types.Mixed,
    },

    // العلامات والتصنيفات
    tags: [String],
    flags: {
      isAutomated: { type: Boolean, default: false },
      isAnomaly: { type: Boolean, default: false },
      requiresReview: { type: Boolean, default: false },
      isSensitive: { type: Boolean, default: false },
      isArchived: { type: Boolean, default: false },
      isSuspicious: { type: Boolean, default: false },
    },

    // المراجعة
    review: {
      status: {
        type: String,
        enum: ['pending', 'reviewed', 'approved', 'flagged'],
        default: 'pending',
      },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reviewedAt: Date,
      reviewNotes: String,
    },

    // السياق والارتباطات
    context: {
      correlationId: String, // لربط الأحداث المترابطة
      parentEventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AuditLog',
      },
      relatedEvents: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'AuditLog',
        },
      ],
      businessProcess: String,
      workflow: String,
    },

    // التوقيت
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      // index removed to avoid duplicate with TTL index below
    },
  },
  {
    timestamps: true,
    collection: 'audit_logs',
  }
);

// Indexes للبحث السريع
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ eventType: 1, timestamp: -1 });
auditLogSchema.index({ severity: 1, timestamp: -1 });
auditLogSchema.index({ 'resource.type': 1, 'resource.id': 1 });
auditLogSchema.index({ ipAddress: 1, timestamp: -1 });
auditLogSchema.index({ 'flags.isAnomaly': 1, timestamp: -1 });
auditLogSchema.index({ 'context.correlationId': 1 });
auditLogSchema.index({ sessionId: 1, timestamp: -1 });

// Text index للبحث النصي
auditLogSchema.index({
  message: 'text',
  description: 'text',
  username: 'text',
  'resource.name': 'text',
});

// TTL index للحذف التلقائي
auditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual للحصول على العمر
auditLogSchema.virtual('age').get(function () {
  return Date.now() - this.timestamp;
});

// Methods
auditLogSchema.methods = {
  /**
   * إضافة مراجعة للحدث
   */
  async addReview(reviewerId, status, notes) {
    this.review = {
      status,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      reviewNotes: notes,
    };
    return await this.save();
  },

  /**
   * تحديد العلامات
   */
  async setFlags(flags) {
    Object.assign(this.flags, flags);
    return await this.save();
  },

  /**
   * ربط حدث ذي صلة
   */
  async linkEvent(eventId) {
    if (!this.context.relatedEvents.includes(eventId)) {
      this.context.relatedEvents.push(eventId);
      await this.save();
    }
    return this;
  },
};

// Statics
auditLogSchema.statics = {
  /**
   * إنشاء سجل تدقيق جديد
   */
  async logEvent(eventData) {
    try {
      const log = new this(eventData);
      await log.save();
      return log;
    } catch (error) {
      console.error('Error creating audit log:', error);
      throw error;
    }
  },

  /**
   * الحصول على السجلات حسب المستخدم
   */
  async getByUser(userId, options = {}) {
    const { limit = 100, skip = 0, startDate, endDate } = options;
    const query = { userId };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    return await this.find(query).sort({ timestamp: -1 }).limit(limit).skip(skip).lean();
  },

  /**
   * الحصول على السجلات حسب النوع
   */
  async getByEventType(eventType, options = {}) {
    const { limit = 100, skip = 0 } = options;
    return await this.find({ eventType }).sort({ timestamp: -1 }).limit(limit).skip(skip).lean();
  },

  /**
   * الحصول على الأحداث الحرجة
   */
  async getCriticalEvents(hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return await this.find({
      severity: { $in: ['critical', 'high'] },
      timestamp: { $gte: since },
    })
      .sort({ timestamp: -1 })
      .lean();
  },

  /**
   * الحصول على الأنشطة المشبوهة
   */
  async getSuspiciousActivities(hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return await this.find({
      $or: [{ 'flags.isAnomaly': true }, { eventType: { $regex: /^security\./ } }],
      timestamp: { $gte: since },
    })
      .sort({ timestamp: -1 })
      .lean();
  },

  /**
   * إحصائيات الأحداث
   */
  async getStatistics(startDate, endDate) {
    // Use defaults if dates not provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days

    const matchStage = {
      timestamp: {
        $gte: start,
        $lte: end,
      },
    };

    const results = await this.aggregate([
      { $match: matchStage },
      {
        $facet: {
          totalCount: [{ $count: 'count' }],
          byEventType: [
            { $group: { _id: '$eventType', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          bySeverity: [
            { $group: { _id: '$severity', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
        },
      },
    ]);

    if (!results[0]) {
      return null;
    }

    return {
      totalLogs: results[0].totalCount[0]?.count || 0,
      byEventType: results[0].byEventType,
      bySeverity: results[0].bySeverity,
    };
  },

  /**
   * تحليل أنماط المستخدم
   */
  async analyzeUserPattern(userId, days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return await this.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          timestamp: { $gte: since },
        },
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$timestamp' },
            dayOfWeek: { $dayOfWeek: '$timestamp' },
            eventType: '$eventType',
          },
          count: { $sum: 1 },
          avgDuration: { $avg: '$metadata.duration' },
        },
      },
      { $sort: { count: -1 } },
    ]);
  },

  /**
   * كشف الحالات الشاذة
   */
  async detectAnomalies(userId, threshold = 3) {
    // الحصول على متوسط نشاط المستخدم
    const avgActivity = await this.aggregate([
      {
        $match: { userId: new mongoose.Types.ObjectId(userId) },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          avgCount: { $avg: '$count' },
          stdDev: { $stdDevPop: '$count' },
        },
      },
    ]);

    if (!avgActivity.length) return [];

    const { avgCount, stdDev } = avgActivity[0];
    const anomalyThreshold = avgCount + threshold * stdDev;

    return await this.aggregate([
      {
        $match: { userId: new mongoose.Types.ObjectId(userId) },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          },
          count: { $sum: 1 },
          events: { $push: '$$ROOT' },
        },
      },
      {
        $match: { count: { $gte: anomalyThreshold } },
      },
      { $sort: { '_id.date': -1 } },
    ]);
  },
};

// Middleware
auditLogSchema.pre('save', function (next) {
  // تعيين تاريخ انتهاء صلاحية تلقائي (90 يوم)
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  }

  // تحديد الفئة تلقائيًا من نوع الحدث
  if (!this.eventCategory && this.eventType) {
    this.eventCategory = this.eventType.split('.')[0];
  }

  if (typeof next === 'function') {
    next();
  }
});

// Middleware for insertMany
auditLogSchema.pre('insertMany', function (next, docs) {
  if (docs && docs.length) {
    docs.forEach(doc => {
      // تعيين تاريخ انتهاء صلاحية تلقائي (90 يوم)
      if (!doc.expiresAt) {
        doc.expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      }

      // تحديد الفئة تلقائيًا من نوع الحدث
      if (!doc.eventCategory && doc.eventType) {
        doc.eventCategory = doc.eventType.split('.')[0];
      }
    });
  }

  if (typeof next === 'function') {
    next();
  }
});

// تصدير النموذج والثوابت
// Check if model is already registered to avoid compilation errors
let AuditLog;
try {
  AuditLog = mongoose.model('AuditLog');
} catch (err) {
  AuditLog = mongoose.model('AuditLog', auditLogSchema);
}

module.exports = {
  AuditLog,
  AuditEventTypes,
  SeverityLevels,
  OperationStatus,
};
