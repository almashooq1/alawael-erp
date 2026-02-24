/**
 * License Alert Model - نموذج التنبيهات والإخطارات
 * نظام متقدم للتنبيهات الموجهة والإخطارات الذكية
 */

const mongoose = require('mongoose');

const licenseAlertSchema = new mongoose.Schema(
  {
    // ==================== المعلومات الأساسية ====================

    // معرّف الرخصة
    licenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'License',
      required: true,
    },

    // رقم الرخصة
    licenseNumber: {
      type: String,
      required: true,
    },

    // عنوان التنبيه
    title: {
      type: String,
      required: true,
      trim: true
    },

    // وصف التنبيه
    description: String,

    // ==================== نوع التنبيه ====================

    type: {
      type: String,
      enum: [
        'expiry_90_days',      // انتهاء بعد 90 يوم
        'expiry_60_days',      // انتهاء بعد 60 يوم
        'expiry_30_days',      // انتهاء بعد 30 يوم
        'expiry_15_days',      // انتهاء بعد 15 يوم
        'expiry_7_days',       // انتهاء بعد 7 أيام
        'expiry_today',        // ينتهي اليوم
        'expired',             // منتهية الصلاحية
        'renewal_eligible',    // مؤهلة للتجديد
        'missing_documents',   // مستندات ناقصة
        'violation_recorded',  // تم تسجيل انتهاك
        'compliance_issue',    // مشكلة امتثال
        'unverified',          // لم يتم التحقق منها
        'document_expired',    // انتهت صلاحية مستند
        'payment_overdue',     // رسوم متجاوزة
        'government_update',   // تحديث حكومي
        'blacklist_added',     // تمت إضافتها للقائمة السوداء
        'custom'               // تنبيه مخصص
      ],
      required: true,
    },

    // ==================== الأولوية والتصنيفات ====================

    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },

    // الفئة
    category: {
      type: String,
      enum: ['regulatory', 'administrative', 'financial', 'operational', 'security'],
      default: 'administrative'
    },

    // شدة التنبيه (مستقلة عن الأولوية)
    severity: {
      type: String,
      enum: ['info', 'warning', 'error', 'critical'],
      default: 'warning'
    },

    // ==================== الموعد الزمني ====================

    timing: {
      // تاريخ إنشاء التنبيه
      createdAt: {
        type: Date,
        default: Date.now,
      },

      // موعد انتهاء صلاحية التنبيه
      expiryDate: Date,

      // تاريخ آخر مراجعة
      lastReviewedAt: Date,

      // تاريخ إرسال الإخطار الأول
      firstNotificationSentAt: Date,

      // تاريخ آخر إخطار
      lastNotificationSentAt: Date,

      // الفاصل الزمني بين الإخطارات (بالساعات)
      notificationInterval: {
        type: Number,
        default: 24
      }
    },

    // ==================== حالة التنبيه ====================

    status: {
      // حالة التنبيه الحالية
      current: {
        type: String,
        enum: ['active', 'acknowledged', 'resolved', 'dismissed', 'snoozed'],
        default: 'active',
      },

      // من اعترف بالتنبيه
      acknowledgedBy: String,

      // تاريخ الاعتراف
      acknowledgedAt: Date,

      // من حل المشكلة
      resolvedBy: String,

      // تاريخ الحل
      resolvedAt: Date,

      // من رفض التنبيه
      dismissedBy: String,

      // تاريخ الرفض
      dismissedAt: Date,

      // سبب الرفض
      dismissalReason: String,

      // موعد استئناف التنبيه (في حالة الـ snooze)
      snoozedUntil: Date,

      // من طلب الـ snooze
      snoozedBy: String
    },

    // ==================== المتلقين ====================

    recipients: {
      // المستخدمون المتأثرون
      users: [{
        userId: {
          type: String,
          required: true
        },
        email: String,
        role: String,
        department: String
      }],

      // المجموعات
      groups: [String],

      // الأدوار
      roles: [String],

      // الأقسام
      departments: [String],

      // العناوين البريدية
      emails: [String],

      // أرقام الهاتف (لـ SMS)
      phoneNumbers: [String]
    },

    // ==================== تاريخ الإخطارات ====================

    notificationHistory: [
      {
        // نوع الإخطار
        notificationType: {
          type: String,
          enum: ['email', 'sms', 'in_app', 'push', 'other'],
          required: true
        },

        // المستقبل
        recipient: String,

        // حالة الإرسال
        status: {
          type: String,
          enum: ['pending', 'sent', 'delivered', 'failed', 'bounced'],
          default: 'pending'
        },

        // وقت الإرسال
        sentAt: Date,

        // رسالة الخطأ إن وجدت
        error: String,

        // عدد محاولات الإرسال
        retryCount: { type: Number, default: 0 },

        // ملاحظات إضافية
        notes: String
      }
    ],

    // ==================== الإجراءات الموصى بها ====================

    recommendedActions: [
      {
        // وصف الإجراء
        description: String,

        // أولوية الإجراء
        priority: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
          default: 'medium'
        },

        // الدور المسؤول
        responsibleRole: String,

        // الموعد النهائي
        dueDate: Date,

        // حالة الإجراء
        status: {
          type: String,
          enum: ['pending', 'in_progress', 'completed', 'skipped'],
          default: 'pending'
        },

        // من نفذ الإجراء
        completedBy: String,

        // تاريخ الإنجاز
        completedAt: Date,

        // ملاحظات الإجراء
        notes: String
      }
    ],

    // ==================== البيانات المرتبطة ====================

    relatedData: {
      // معرّفات الموارد المرتبطة
      relatedResources: [
        {
          type: {
            type: String,
            enum: ['license', 'document', 'violation', 'renewal', 'audit']
          },
          id: mongoose.Schema.Types.ObjectId,
          reference: String
        }
      ],

      // البيانات الإضافية
      metadata: mongoose.Schema.Types.Mixed
    },

    // ==================== الإحصائيات ====================

    statistics: {
      // عدد مرات عرض التنبيه
      viewCount: { type: Number, default: 0 },

      // عدد مرات النقر عليه
      clickCount: { type: Number, default: 0 },

      // عدد مرات الاعتراف به
      acknowledgmentCount: { type: Number, default: 0 }
    },

    // ==================== ملاحظات ====================

    notes: [
      {
        content: String,
        createdBy: String,
        createdAt: { type: Date, default: Date.now }
      }
    ],

    // ==================== معلومات إنشاء وتعديل ====================

    createdBy: String,
    lastModifiedBy: String,
    automationRule: mongoose.Schema.Types.ObjectId
  },
  {
    timestamps: true
  }
);

// ==================== Indexes ====================

licenseAlertSchema.index({ licenseId: 1, 'status.current': 1 });
licenseAlertSchema.index({ licenseNumber: 1 });
licenseAlertSchema.index({ type: 1, priority: 1 });
licenseAlertSchema.index({ 'status.current': 1, priority: 1 });
licenseAlertSchema.index({ 'timing.createdAt': -1 });
licenseAlertSchema.index({ 'timing.expiryDate': 1 });

// مؤشر TTL لحذف التنبيهات المنتهية تلقائياً
licenseAlertSchema.index(
  { 'timing.expiryDate': 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: {
      'status.current': { $in: ['resolved', 'dismissed'] }
    }
  }
);

// ==================== Methods ====================

/**
 * التحقق من أن التنبيه نشط
 */
licenseAlertSchema.methods.isActive = function () {
  return this.status.current === 'active';
};

/**
 * الاعتراف بالتنبيه
 */
licenseAlertSchema.methods.acknowledge = function (acknowledgedBy) {
  this.status.current = 'acknowledged';
  this.status.acknowledgedBy = acknowledgedBy;
  this.status.acknowledgedAt = new Date();
  this.statistics.acknowledgmentCount++;
  return this;
};

/**
 * حل المشكلة
 */
licenseAlertSchema.methods.resolve = function (resolvedBy, notes = '') {
  this.status.current = 'resolved';
  this.status.resolvedBy = resolvedBy;
  this.status.resolvedAt = new Date();
  if (notes) {
    this.addNote(notes, resolvedBy);
  }
  return this;
};

/**
 * رفض التنبيه
 */
licenseAlertSchema.methods.dismiss = function (dismissedBy, reason = '') {
  this.status.current = 'dismissed';
  this.status.dismissedBy = dismissedBy;
  this.status.dismissedAt = new Date();
  this.status.dismissalReason = reason;
  return this;
};

/**
 * تأجيل التنبيه
 */
licenseAlertSchema.methods.snooze = function (snoozedBy, hours = 24) {
  this.status.current = 'snoozed';
  this.status.snoozedBy = snoozedBy;
  this.status.snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
  return this;
};

/**
 * إضافة ملاحظة
 */
licenseAlertSchema.methods.addNote = function (content, createdBy) {
  this.notes.push({
    content,
    createdBy,
    createdAt: new Date()
  });
  return this;
};

/**
 * تسجيل إخطار مرسل
 */
licenseAlertSchema.methods.recordNotification = function (
  notificationType,
  recipient,
  status = 'sent'
) {
  this.notificationHistory.push({
    notificationType,
    recipient,
    status,
    sentAt: new Date()
  });

  if (status === 'sent' && !this.timing.firstNotificationSentAt) {
    this.timing.firstNotificationSentAt = new Date();
  }

  this.timing.lastNotificationSentAt = new Date();
  return this;
};

// ==================== Statics ====================

/**
 * البحث عن التنبيهات النشطة
 */
licenseAlertSchema.statics.findActive = function (licenseId = null) {
  const query = { 'status.current': 'active' };
  if (licenseId) {
    query.licenseId = licenseId;
  }
  return this.find(query).sort({ priority: -1, 'timing.createdAt': -1 });
};

/**
 * البحث عن التنبيهات الحرجة
 */
licenseAlertSchema.statics.findCritical = function () {
  return this.find({
    priority: 'critical',
    'status.current': { $in: ['active', 'acknowledged'] }
  }).sort({ 'timing.createdAt': -1 });
};

/**
 * الحصول على تنبيهات مستخدم معين
 */
licenseAlertSchema.statics.findByUser = function (userId) {
  return this.find({
    'recipients.users.userId': userId,
    'status.current': { $in: ['active', 'acknowledged'] }
  }).sort({ 'timing.createdAt': -1 });
};

/**
 * الحصول على إحصائيات التنبيهات
 */
licenseAlertSchema.statics.getAlertStatistics = async function (dateRange = {}) {
  const query = {};

  if (dateRange.from) {
    query['timing.createdAt'] = { $gte: dateRange.from };
  }
  if (dateRange.to) {
    query['timing.createdAt'] = {
      ...query['timing.createdAt'],
      $lte: dateRange.to
    };
  }

  const stats = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: {
          type: '$type',
          priority: '$priority',
          status: '$status.current'
        },
        count: { $sum: 1 }
      }
    }
  ]);

  return stats;
};

/**
 * حذف التنبيهات المنتهية
 */
licenseAlertSchema.statics.cleanupExpiredAlerts = async function () {
  return this.deleteMany({
    'timing.expiryDate': { $lt: new Date() },
    'status.current': { $in: ['resolved', 'dismissed'] }
  });
};

module.exports = mongoose.model('LicenseAlert', licenseAlertSchema);
