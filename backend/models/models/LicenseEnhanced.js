/**
 * License Model - نموذج الرخصة الرئيسي المحسّن
 * Enhanced License Management System
 * 
 * يحتوي على جميع البيانات المتعلقة برخصة واحدة بما فيها:
 * - البيانات الأساسية
 * - معلومات الجهة المُصدِرة
 * - سجل التجديدات
 * - حالة الامتثال
 * - المستندات المرفوعة
 * - التنبيهات والإخطارات
 */

const mongoose = require('mongoose');

const licenseSchema = new mongoose.Schema(
  {
    // ==================== البيانات الأساسية ====================

    // معرّف الرخصة الفريد
    licenseNumber: {
      type: String,
      required: [true, 'رقم الرخصة مطلوب'],
      unique: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[A-Z0-9\-]{5,50}$/.test(v);
        },
        message: 'رقم الرخصة يجب أن يكون صيغة صحيحة'
      }
    },

    // نوع الرخصة
    licenseType: {
      type: String,
      required: [true, 'نوع الرخصة مطلوب'],
      enum: [
        'CR',           // السجل التجاري
        'ML',           // الرخصة البلدية
        'CD',           // شهادة الدفاع المدني
        'HC',           // البطاقة الصحية
        'FL',           // رخصة المواد الغذائية
        'DL',           // رخصة القيادة
        'BANK',         // رخصة البنك
        'INSURANCE',    // رخصة التأمين
        'SCFHS',        // رخصة SCFHS
        'QIWA',         // رخصة QIWA
        'SAMA',         // رخصة SAMA
        'OTHER'         // أخرى
      ]
    },

    // حالة الرخصة الحالية
    status: {
      type: String,
      enum: ['active', 'expired', 'suspended', 'revoked', 'pending_renewal', 'inactive'],
      default: 'active'
    },

    // ==================== بيانات الكيان/الجهة ====================

    entity: {
      // نوع الكيان
      type: {
        type: String,
        enum: ['individual', 'company', 'government', 'organization'],
        required: true
      },

      // اسم الكيان
      name: {
        type: String,
        required: [true, 'اسم الكيان مطلوب'],
        trim: true
      },

      // الهوية الوطنية / الرقم التجاري
      idNumber: {
        type: String,
        required: true,
        trim: true
      },

      // المدينة
      city: String,

      // المنطقة
      region: String,

      // البريد الإلكتروني
      email: {
        type: String,
        lowercase: true,
        validate: {
          validator: function (v) {
            return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
          }
        }
      },

      // رقم الهاتف
      phone: String,

      // العنوان
      address: String
    },

    // ==================== بيانات الجهة المُصدِرة ====================

    issuingAuthority: {
      name: {
        type: String,
        required: true
      },
      code: String,
      department: String,
      contactInfo: {
        phone: String,
        email: String,
        website: String
      }
    },

    // ==================== المواعيد الزمنية ====================

    dates: {
      // تاريخ الإصدار
      issued: {
        type: Date,
        required: true
      },

      // تاريخ الانتهاء/الصلاحية
      expiry: {
        type: Date,
        required: true
      },

      // تاريخ آخر تحديث
      lastUpdated: {
        type: Date,
        default: Date.now
      },

      // تاريخ آخر تجديد
      lastRenewal: Date,

      // الموعد النهائي للتجديد
      renewalDeadline: Date
    },

    // ==================== معلومات الرسوم والتكاليف ====================

    costs: {
      // رسم الإصدار
      issuingFee: {
        type: Number,
        default: 0
      },

      // رسم التجديد المقدر
      renewalFee: {
        type: Number,
        default: 0
      },

      // رسوم إضافية
      additionalFees: [{
        description: String,
        amount: Number,
        dueDate: Date
      }],

      // إجمالي التكاليف المتوقعة سنوياً
      annualCostEstimate: Number,

      // العملة
      currency: {
        type: String,
        default: 'SAR'
      }
    },

    // ==================== المتطلبات والمستندات ====================

    requirements: {
      // المستندات المطلوبة
      requiredDocuments: [
        {
          name: String,
          description: String,
          mandatory: { type: Boolean, default: true },
          notes: String
        }
      ],

      // شروط إضافية
      conditions: [String],

      // تحديات أو تحذيرات
      warnings: [String]
    },

    // ==================== سجل التجديدات ====================

    renewalHistory: [
      {
        // تاريخ التجديد
        date: Date,

        // تاريخ الصلاحية الجديدة
        newExpiryDate: Date,

        // حالة التجديد
        status: {
          type: String,
          enum: ['approved', 'rejected', 'pending', 'cancelled']
        },

        // ملاحظات التجديد
        notes: String,

        // المُجدِّد
        renewedBy: String,

        // المستندات المرفوعة
        documentsSubmitted: [String]
      }
    ],

    // ==================== الامتثال والانتهاكات ====================

    compliance: {
      // حالة الامتثال
      status: {
        type: String,
        enum: ['compliant', 'non_compliant', 'under_review', 'suspended'],
        default: 'compliant'
      },

      // الانتهاكات المسجلة
      violations: [
        {
          date: Date,
          type: String,
          description: String,
          severity: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical']
          },
          penalty: String,
          status: {
            type: String,
            enum: ['open', 'resolved', 'appealing']
          }
        }
      ],

      // آخر عملية تدقيق
      lastAudit: {
        date: Date,
        result: String,
        auditor: String
      },

      // الملاحظات الخاصة
      notes: String
    },

    // ==================== معلومات التحقق ====================

    verification: {
      // تم التحقق منها
      verified: {
        type: Boolean,
        default: false
      },

      // تاريخ التحقق الأخير
      lastVerificationDate: Date,

      // نوع التحقق
      verificationType: {
        type: String,
        enum: ['manual', 'automatic', 'government_api', 'third_party']
      },

      // قناة التحقق
      verificationChannel: String,

      // نتيجة التحقق
      verificationResult: {
        type: String,
        enum: ['valid', 'invalid', 'pending', 'expired', 'suspended']
      },

      // ملاحظات التحقق
      verificationNotes: String
    },

    // ==================== التصنيفات والعلامات ====================

    tags: [
      {
        type: String,
        lowercase: true
      }
    ],

    categories: [String],

    // ==================== المستندات المرفوعة ====================

    documents: [
      {
        // معرّف المستند
        documentId: mongoose.Schema.Types.ObjectId,

        // اسم المستند
        name: String,

        // نوع المستند
        type: String,

        // تاريخ الرفع
        uploadedAt: Date,

        // رفع بواسطة
        uploadedBy: String,

        // حجم الملف
        fileSize: Number,

        // مسار التخزين
        filepath: String,

        // حالة المستند
        status: {
          type: String,
          enum: ['pending_review', 'approved', 'rejected', 'archived']
        },

        // ملاحظات المراجعة
        reviewNotes: String,

        // تاريخ انتهاء الصلاحية
        expiryDate: Date
      }
    ],

    // ==================== الإخطارات والتنبيهات ====================

    alerts: [
      {
        // نوع التنبيه
        type: {
          type: String,
          enum: ['expiry', 'renewal_due', 'missing_documents', 'violation', 'compliance_issue', 'custom']
        },

        // الأولوية
        priority: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
          default: 'medium'
        },

        // الرسالة
        message: String,

        // تاريخ الإنشاء
        createdAt: Date,

        // مقروءة/غير مقروءة
        read: { type: Boolean, default: false },

        // تاريخ الإجراء
        actionDate: Date,

        // الإجراء المتخذ
        actionTaken: String,

        // معرّف الموظف المسؤول
        assignedTo: String
      }
    ],

    // ==================== البيانات الحكومية ====================

    governmentData: {
      // الحالة حسب الخدمة الحكومية
      governmentStatus: {
        type: String,
        enum: ['active', 'expired', 'suspended', 'cancelled', 'pending', 'unknown']
      },

      // آخر تحديث من الحكومة
      lastSyncWithGovernment: Date,

      // البيانات المتزامنة
      syncedData: mongoose.Schema.Types.Mixed,

      // ملاحظات التزامن
      syncNotes: String,

      // رابط التحقق الحكومي
      governmentVerificationLink: String,

      // رقم الملف الحكومي
      governmentFileNumber: String
    },

    // ==================== ملاحظات وتعليقات ====================

    notes: [
      {
        // محتوى الملاحظة
        content: String,

        // من كتب الملاحظة
        createdBy: String,

        // تاريخ الإضافة
        createdAt: {
          type: Date,
          default: Date.now
        },

        // تصنيف الملاحظة
        category: {
          type: String,
          enum: ['general', 'internal', 'client', 'compliance', 'action_required']
        }
      }
    ],

    // ==================== بيانات التحكم والسماح ====================

    permissions: {
      // من يمكنه الوصول
      viewAccess: [String],

      // من يمكنه التعديل
      editAccess: [String],

      // من يمكنه الحذف
      deleteAccess: [String],

      // من يمكنه الموافقة
      approvalAccess: [String]
    },

    // ==================== البيانات الإضافية ====================

    metadata: {
      // الإصدار
      version: { type: Number, default: 1 },

      // معرّف الموظف الذي أنشأ السجل
      createdBy: String,

      // معرّف آخر من قام بتعديل
      lastModifiedBy: String,

      // ملاحظات داخلية
      internalNotes: String,

      // الأولوية
      priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'critical'],
        default: 'normal'
      },

      // النسخة الاحتياطية المطلوبة
      backupRequired: { type: Boolean, default: false }
    }
  },
  {
    // إضافة timestamps تلقائياً
    timestamps: true,

    // اسم الحقول
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ==================== Indexes ====================

// مؤشرات لتحسين الأداء
licenseSchema.index({ licenseNumber: 1, licenseType: 1 });
licenseSchema.index({ 'entity.idNumber': 1 });
licenseSchema.index({ status: 1, 'dates.expiry': 1 });
licenseSchema.index({ 'dates.expiry': 1 });
licenseSchema.index({ 'issuingAuthority.name': 1 });
licenseSchema.index({ tags: 1 });
licenseSchema.index({ 'compliance.status': 1 });
licenseSchema.index({ createdAt: -1 });

// مؤشر مركب للبحث
licenseSchema.index({
  'entity.name': 'text',
  licenseNumber: 'text',
  'issuingAuthority.name': 'text'
});

// ==================== Virtual Fields ====================

// عدد أيام حتى الانتهاء
licenseSchema.virtual('daysUntilExpiry').get(function () {
  const today = new Date();
  const expiry = new Date(this.dates.expiry);
  const diff = expiry - today;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// حالة الانتهاء المرئية
licenseSchema.virtual('expiryStatus').get(function () {
  const days = this.daysUntilExpiry;
  if (days < 0) return 'منتهية الصلاحية';
  if (days <= 7) return 'انتهاء فوري';
  if (days <= 30) return 'قريبة جداً';
  if (days <= 60) return 'قريبة';
  return 'سارية';
});

// النسبة المتبقية من الصلاحية
licenseSchema.virtual('validityPercentage').get(function () {
  const issued = new Date(this.dates.issued);
  const expiry = new Date(this.dates.expiry);
  const total = expiry - issued;
  const remaining = expiry - new Date();
  return Math.round((remaining / total) * 100);
});

// ==================== Methods ====================

/**
 * التحقق من صلاحية الرخصة
 */
licenseSchema.methods.isExpired = function () {
  return new Date() > new Date(this.dates.expiry);
};

/**
 * التحقق من أن الرخصة قريبة الانتهاء
 */
licenseSchema.methods.isExpiringSoon = function (days = 30) {
  const daysLeft = this.daysUntilExpiry;
  return daysLeft > 0 && daysLeft <= days;
};

/**
 * تحديث حالة الرخصة
 */
licenseSchema.methods.updateStatus = function () {
  if (this.isExpired()) {
    this.status = 'expired';
  } else if (this.status === 'active') {
    // تحديثات أخرى إذا لزمت
  }
  return this;
};

/**
 * إضافة تنبيه جديد
 */
licenseSchema.methods.addAlert = function (alert) {
  this.alerts.push({
    ...alert,
    createdAt: new Date()
  });
  return this;
};

/**
 * إضافة ملاحظة جديدة
 */
licenseSchema.methods.addNote = function (content, createdBy, category = 'general') {
  this.notes.push({
    content,
    createdBy,
    category,
    createdAt: new Date()
  });
  return this;
};

/**
 * تسجيل انتهاك جديد
 */
licenseSchema.methods.recordViolation = function (violation) {
  this.compliance.violations.push({
    ...violation,
    date: new Date()
  });

  // تحديث حالة الامتثال
  if (violation.severity === 'critical') {
    this.compliance.status = 'non_compliant';
    if (!this.status.includes('suspended')) {
      this.status = 'suspended';
    }
  }

  return this;
};

/**
 * تجديد الرخصة
 */
licenseSchema.methods.renew = function (newExpiryDate, renewalData = {}) {
  // إضافة إلى سجل التجديدات
  this.renewalHistory.push({
    date: new Date(),
    newExpiryDate,
    status: 'approved',
    notes: renewalData.notes,
    renewedBy: renewalData.renewedBy,
    documentsSubmitted: renewalData.documents || []
  });

  // تحديث تاريخ الصلاحية
  this.dates.expiry = newExpiryDate;
  this.dates.lastRenewal = new Date();
  this.status = 'active';

  return this;
};

// ==================== Statics ====================

/**
 * البحث عن رخص منتهية الصلاحية
 */
licenseSchema.statics.findExpired = function () {
  return this.find({
    'dates.expiry': { $lt: new Date() }
  });
};

/**
 * البحث عن رخص قريبة الانتهاء
 */
licenseSchema.statics.findExpiringsoon = function (days = 30) {
  const today = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);

  return this.find({
    'dates.expiry': {
      $gte: today,
      $lte: expiryDate
    },
    status: { $ne: 'expired' }
  });
};

/**
 * البحث عن رخص لجهة محددة
 */
licenseSchema.statics.findByEntity = function (entityId) {
  return this.find({
    'entity.idNumber': entityId
  });
};

/**
 * الحصول على إحصائيات عامة
 */
licenseSchema.statics.getStatistics = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: {
          $sum: {
            $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
          }
        },
        expired: {
          $sum: {
            $cond: [{ $eq: ['$status', 'expired'] }, 1, 0]
          }
        },
        suspended: {
          $sum: {
            $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0]
          }
        }
      }
    }
  ]);

  return stats[0] || {
    total: 0,
    active: 0,
    expired: 0,
    suspended: 0
  };
};

module.exports = mongoose.model('License', licenseSchema);
