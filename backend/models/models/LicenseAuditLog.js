/**
 * License Audit Log Model - نموذج سجل تدقيق الرخص
 * نظام تدقيق شامل لتتبع جميع العمليات على الرخص
 */

const mongoose = require('mongoose');

const licenseAuditLogSchema = new mongoose.Schema(
  {
    // ==================== معلومات المستند ====================

    // معرّف الرخصة المتعلقة
    licenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'License',
      required: true
    },

    // رقم الرخصة
    licenseNumber: {
      type: String,
      required: true
    },

    // ==================== معلومات العملية ====================

    // نوع العملية
    action: {
      type: String,
      enum: [
        'CREATE',          // إنشاء رخصة جديدة
        'UPDATE',          // تحديث البيانات
        'DELETE',          // حذف
        'RENEW',           // تجديد
        'VERIFY',          // تحقق
        'SUSPEND',         // إيقاف
        'REVOKE',          // إلغاء
        'RESTORE',         // استرجاع
        'DOCUMENT_UPLOAD', // رفع مستند
        'VIOLATION_RECORD',// تسجيل انتهاك
        'NOTE_ADDED',      // إضافة ملاحظة
        'STATUS_CHANGE',   // تغيير الحالة
        'ALERT_CREATED',   // إنشاء تنبيه
        'EXPORT',          // تصدير البيانات
        'BATCH_OPERATION', // عملية جماعية
        'GOVERNMENT_SYNC'  // مزامنة حكومية
      ],
      required: true
    },

    // وصف العملية
    description: String,

    // ==================== البيانات المتغيرة ====================

    // البيانات قبل التغيير
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
      changedFields: [String]
    },

    // ==================== معلومات المستخدم ====================

    user: {
      // معرّف المستخدم
      userId: {
        type: String,
        required: true
      },

      // اسم المستخدم
      username: String,

      // البريد الإلكتروني
      email: String,

      // الدور
      role: String,

      // القسم
      department: String
    },

    // ==================== معلومات النظام ====================

    system: {
      // عنوان IP
      ipAddress: String,

      // بيانات المستخدم
      userAgent: String,

      // جلسة العمل
      sessionId: String,

      // الجهاز
      deviceInfo: String
    },

    // ==================== نتيجة العملية ====================

    result: {
      // حالة النجاح/الفشل
      status: {
        type: String,
        enum: ['success', 'failure', 'warning'],
        default: 'success'
      },

      // رسالة الخطأ إن وجدت
      errorMessage: String,

      // رمز الخطأ
      errorCode: String,

      // الرسالة الإضافية
      message: String
    },

    // ==================== الارتباطات ====================

    // معرّفات الموارد المرتبطة
    relatedResources: [{
      type: {
        type: String,
        enum: ['license', 'user', 'document', 'violation', 'alert', 'batch']
      },
      id: String,
      reference: String
    }],

    // العملية الأب (في حالة العمليات الجماعية)
    parentActionId: mongoose.Schema.Types.ObjectId,

    // العمليات الفرعية (في حالة العمليات الجماعية)
    childActions: [mongoose.Schema.Types.ObjectId],

    // ==================== البيانات الإضافية ====================

    // الأولوية
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'critical'],
      default: 'normal'
    },

    // الملاحظات
    notes: String,

    // الوقت المستغرق (بالميلي ثانية)
    duration: Number,

    // متعقبة أو لم تتم متابعتها
    tracked: { type: Boolean, default: true }
  },
  {
    timestamps: {
      createdAt: 'timestamp',
      updatedAt: false
    }
  }
);

// ==================== Indexes ====================

licenseAuditLogSchema.index({ licenseId: 1, action: 1 });
licenseAuditLogSchema.index({ 'user.userId': 1 });
licenseAuditLogSchema.index({ action: 1, timestamp: -1 });
licenseAuditLogSchema.index({ timestamp: -1 });
licenseAuditLogSchema.index({
  licenseNumber: 1,
  timestamp: -1
});

// مؤشر TTL لحذف السجلات القديمة تلقائياً بعد سنة
licenseAuditLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 365 * 24 * 60 * 60 }
);

// ==================== Methods ====================

/**
 * الحصول على ملخص العملية
 */
licenseAuditLogSchema.methods.getSummary = function () {
  return {
    action: this.action,
    timestamp: this.timestamp,
    user: this.user.username,
    status: this.result.status,
    licenseNumber: this.licenseNumber,
    description: this.description
  };
};

/**
 * التحقق من أن العملية نجحت
 */
licenseAuditLogSchema.methods.wasSuccessful = function () {
  return this.result.status === 'success';
};

/**
 * الحصول على أسماء الحقول المتغيرة
 */
licenseAuditLogSchema.methods.getChangedFields = function () {
  return this.changes?.changedFields || [];
};

// ==================== Statics ====================

/**
 * البحث عن عمليات لرخصة محددة
 */
licenseAuditLogSchema.statics.findByLicense = function (licenseId, limit = 100) {
  return this.find({ licenseId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

/**
 * البحث عن عمليات مستخدم محدد
 */
licenseAuditLogSchema.statics.findByUser = function (userId, options = {}) {
  const query = { 'user.userId': userId };

  if (options.dateFrom) {
    query.timestamp = { $gte: options.dateFrom };
  }

  if (options.dateTo) {
    query.timestamp = {
      ...query.timestamp,
      $lte: options.dateTo
    };
  }

  let result = this.find(query).sort({ timestamp: -1 });

  if (options.limit) {
    result = result.limit(options.limit);
  }

  return result;
};

/**
 * البحث عن عمليات فاشلة
 */
licenseAuditLogSchema.statics.findFailedActions = function (limit = 100) {
  return this.find({ 'result.status': { $in: ['failure', 'warning'] } })
    .sort({ timestamp: -1 })
    .limit(limit);
};

/**
 * الحصول على إحصائيات قسم معين
 */
licenseAuditLogSchema.statics.getDepartmentStatistics = async function (department, dateRange = {}) {
  const query = {
    'user.department': department
  };

  if (dateRange.from) {
    query.timestamp = { $gte: dateRange.from };
  }
  if (dateRange.to) {
    query.timestamp = {
      ...query.timestamp,
      $lte: dateRange.to
    };
  }

  const stats = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        successful: {
          $sum: {
            $cond: [
              { $eq: ['$result.status', 'success'] },
              1,
              0
            ]
          }
        },
        failed: {
          $sum: {
            $cond: [
              { $eq: ['$result.status', 'failure'] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);

  return stats;
};

/**
 * الحصول على تقرير نشاط يومي
 */
licenseAuditLogSchema.statics.getDailyActivityReport = async function (date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return this.aggregate([
    {
      $match: {
        timestamp: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      }
    },
    {
      $group: {
        _id: {
          hour: { $hour: '$timestamp' },
          action: '$action'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.hour': 1 } }
  ]);
};

module.exports = mongoose.model('LicenseAuditLog', licenseAuditLogSchema);
