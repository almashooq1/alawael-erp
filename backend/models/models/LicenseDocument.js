/**
 * License Document Model - نموذج مستندات الرخصة
 * إدارة المستندات والملفات المرفوعة للرخص
 */

const mongoose = require('mongoose');

const licenseDocumentSchema = new mongoose.Schema(
  {
    // ==================== المعلومات الأساسية ====================

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

    // اسم المستند
    name: {
      type: String,
      required: true,
      trim: true
    },

    // وصف المستند
    description: String,

    // ==================== معلومات الملف ====================

    file: {
      // اسم الملف الأصلي
      originalName: {
        type: String,
        required: true
      },

      // نوع الملف
      mimeType: {
        type: String,
        required: true,
        validate: {
          validator: function (v) {
            // السماح فقط بأنواع ملفات محددة
            const allowed = [
              'application/pdf',
              'image/jpeg',
              'image/png',
              'image/gif',
              'application/msword',
              'application/vnd.ms-excel',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'application/zip',
              'text/plain'
            ];
            return allowed.includes(v);
          },
          message: 'نوع الملف غير مسموح'
        }
      },

      // حجم الملف (بايت)
      size: {
        type: Number,
        required: true
      },

      // مسار التخزين
      filepath: {
        type: String,
        required: true,
        unique: true
      },

      // قيمة التجزئة (Hash) للملف
      hash: {
        type: String,
        unique: true
      },

      // موقع التخزين (local, s3, etc)
      storage: {
        type: String,
        enum: ['local', 's3', 'azure', 'gcs'],
        default: 'local'
      }
    },

    // ==================== معلومات الرفع ====================

    upload: {
      // المستخدم الذي رفع الملف
      uploadedBy: {
        type: String,
        required: true
      },

      // البريد الإلكتروني للمستخدم
      uploaderEmail: String,

      // تاريخ الرفع
      uploadedAt: {
        type: Date,
        default: Date.now
      },

      // عنوان IP
      ipAddress: String,

      // بيانات المستخدم
      userAgent: String
    },

    // ==================== معلومات التصنيف ====================

    classification: {
      // نوع المستند
      type: {
        type: String,
        enum: [
          'commercial_registration',
          'municipal_license',
          'civil_defense',
          'health_card',
          'food_license',
          'driving_license',
          'insurance_document',
          'ownership_proof',
          'identification',
          'contract',
          'financial_statement',
          'inspection_report',
          'compliance_certificate',
          'other'
        ],
        required: true
      },

      // الفئة
      category: String,

      // الأولوية
      priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'critical'],
        default: 'normal'
      },

      // مطلوب لتجديد الرخصة
      requiredForRenewal: { type: Boolean, default: false }
    },

    // ==================== حالة المراجعة ====================

    review: {
      // حالة المستند
      status: {
        type: String,
        enum: ['pending_review', 'under_review', 'approved', 'rejected', 'archived', 'expired'],
        default: 'pending_review'
      },

      // من قام بالمراجعة
      reviewedBy: String,

      // تاريخ المراجعة
      reviewedAt: Date,

      // ملاحظات المراجعة
      reviewNotes: String,

      // سبب الرفض (إن وجد)
      rejectionReason: String,

      // تاريخ انتهاء صلاحية المستند
      expiryDate: Date
    },

    // ==================== البيانات الفنية ====================

    technical: {
      // عدد الصفحات (للملفات)
      pageCount: Number,

      // الدقة (للصور)
      resolution: String,

      // الألوان
      colorMode: String,

      // آخر تعديل
      lastModified: Date,

      // معلومات الملف الإضافية
      metadata: mongoose.Schema.Types.Mixed
    },

    // ==================== الكشف عن الانتهاكات ====================

    threatDetection: {
      // كشف الفيروسات
      virusScanStatus: {
        type: String,
        enum: ['pending', 'clean', 'infected', 'suspicious'],
        default: 'pending'
      },

      // نتائج الفحص
      scanResults: {
        engine: String,
        timestamp: Date,
        threats: [String]
      },

      // تحذيرات محتملة
      warnings: [String]
    },

    // ==================== الأمان والتشفير ====================

    security: {
      // مشفر
      encrypted: { type: Boolean, default: false },

      // خوارزمية التشفير
      encryptionAlgorithm: String,

      // مفتاح التشفير (مشفر)
      encryptionKey: String,

      // التوقيع الرقمي
      digitalSignature: String,

      // شهادة التوثيق
      certificate: String,

      // حماية كلمة المرور
      passwordProtected: { type: Boolean, default: false }
    },

    // ==================== مراجع و ارتباطات ====================

    references: {
      // معرفات العمليات المتعلقة
      relatedOperations: [mongoose.Schema.Types.ObjectId],

      // معرفات الرسائل
      relatedMessages: [mongoose.Schema.Types.ObjectId],

      // معرفات التقارير
      relatedReports: [mongoose.Schema.Types.ObjectId]
    },

    // ==================== ملاحظات ====================

    notes: [
      {
        content: String,
        createdBy: String,
        createdAt: { type: Date, default: Date.now }
      }
    ],

    // ==================== معلومات إضافية ====================

    // الحذف الناعم
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    deletedBy: String,
    deletionReason: String
  },
  {
    timestamps: true
  }
);

// ==================== Indexes ====================

licenseDocumentSchema.index({ licenseId: 1, 'classification.type': 1 });
licenseDocumentSchema.index({ licenseNumber: 1 });
licenseDocumentSchema.index({ 'upload.uploadedAt': -1 });
licenseDocumentSchema.index({ 'review.status': 1 });
licenseDocumentSchema.index({ 'file.hash': 1 });
licenseDocumentSchema.index({ 'threatDetection.virusScanStatus': 1 });

// ==================== Methods ====================

/**
 * حساب حجم الملف بصيغة مقروءة
 */
licenseDocumentSchema.methods.getReadableFileSize = function () {
  const bytes = this.file.size;
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * التحقق من أن المستند معتمد
 */
licenseDocumentSchema.methods.isApproved = function () {
  return this.review.status === 'approved';
};

/**
 * التحقق من أن المستند منتهي الصلاحية
 */
licenseDocumentSchema.methods.isExpired = function () {
  if (!this.review.expiryDate) return false;
  return new Date() > new Date(this.review.expiryDate);
};

/**
 * الحصول على عدد أيام حتى انتهاء صلاحية المستند
 */
licenseDocumentSchema.methods.getDaysUntilExpiry = function () {
  if (!this.review.expiryDate) return null;

  const today = new Date();
  const expiry = new Date(this.review.expiryDate);
  const diff = expiry - today;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

/**
 * الموافقة على المستند
 */
licenseDocumentSchema.methods.approve = function (approvedBy, notes = '') {
  this.review.status = 'approved';
  this.review.reviewedBy = approvedBy;
  this.review.reviewedAt = new Date();
  this.review.reviewNotes = notes;
  return this;
};

/**
 * رفض المستند
 */
licenseDocumentSchema.methods.reject = function (rejectedBy, reason = '') {
  this.review.status = 'rejected';
  this.review.reviewedBy = rejectedBy;
  this.review.reviewedAt = new Date();
  this.review.rejectionReason = reason;
  return this;
};

/**
 * إضافة ملاحظة
 */
licenseDocumentSchema.methods.addNote = function (content, createdBy) {
  this.notes.push({
    content,
    createdBy,
    createdAt: new Date()
  });
  return this;
};

/**
 * حذف ناعم للمستند
 */
licenseDocumentSchema.methods.softDelete = function (deletedBy, reason = '') {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  this.deletionReason = reason;
  return this;
};

// ==================== Statics ====================

/**
 * البحث عن مستندات رخصة محددة
 */
licenseDocumentSchema.statics.findByLicense = function (licenseId) {
  return this.find({ licenseId, isDeleted: false });
};

/**
 * البحث عن المستندات المنتظرة المراجعة
 */
licenseDocumentSchema.statics.findPendingReview = function () {
  return this.find({
    'review.status': 'pending_review',
    isDeleted: false
  }).sort({ 'upload.uploadedAt': 1 });
};

/**
 * البحث عن المستندات المرفوضة
 */
licenseDocumentSchema.statics.findRejected = function (licenseId) {
  return this.find({
    licenseId,
    'review.status': 'rejected',
    isDeleted: false
  });
};

/**
 * الحصول على إحصائيات المستندات
 */
licenseDocumentSchema.statics.getDocumentStatistics = async function (licenseId) {
  const stats = await this.aggregate([
    {
      $match: { licenseId: mongoose.Types.ObjectId(licenseId), isDeleted: false }
    },
    {
      $group: {
        _id: '$review.status',
        count: { $sum: 1 },
        totalSize: { $sum: '$file.size' }
      }
    }
  ]);

  return stats;
};

/**
 * حذف المستندات القديمة
 */
licenseDocumentSchema.statics.deleteOldDocuments = async function (daysOld = 365) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return this.updateMany(
    {
      'upload.uploadedAt': { $lt: cutoffDate },
      'review.status': 'archived'
    },
    {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: 'system',
      deletionReason: 'Automatic cleanup of old documents'
    }
  );
};

module.exports = mongoose.model('LicenseDocument', licenseDocumentSchema);
