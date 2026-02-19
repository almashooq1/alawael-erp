/**
 * Document Model
 * نموذج إدارة المستندات - تخزين البيانات الوصفية للملفات
 */

const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema(
  {
    // معلومات الملف الأساسية
    fileName: {
      type: String,
      required: [true, 'اسم الملف مطلوب'],
      trim: true,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ['pdf', 'docx', 'xlsx', 'jpg', 'png', 'txt', 'pptx', 'zip', 'other'],
      default: 'other',
    },
    mimeType: {
      type: String,
      default: 'application/octet-stream',
    },
    fileSize: {
      type: Number, // في بايتات
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },

    // معلومات المستند
    title: {
      type: String,
      required: [true, 'عنوان المستند مطلوب'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      enum: ['تقارير', 'عقود', 'سياسات', 'تدريب', 'مالي', 'أخرى'],
      default: 'أخرى',
    },
    tags: [String],

    // التنظيم
    folder: {
      type: String,
      default: 'root',
    },
    parentFolderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
    },

    // معلومات المستخدم
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    uploadedByName: String,
    uploadedByEmail: String,

    // الصلاحيات والمشاركة
    isPublic: {
      type: Boolean,
      default: false,
    },
    sharedWith: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        email: String,
        name: String,
        permission: {
          type: String,
          enum: ['view', 'edit', 'download', 'share'],
          default: 'view',
        },
        sharedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    sharedWithGroups: [
      {
        groupId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Group',
        },
        groupName: String,
        permission: {
          type: String,
          enum: ['view', 'edit', 'download', 'share'],
          default: 'view',
        },
      },
    ],

    // إدارة النسخ والإصدارات
    version: {
      type: Number,
      default: 1,
    },
    isLatestVersion: {
      type: Boolean,
      default: true,
    },
    previousVersions: [
      {
        versionNumber: Number,
        uploadedAt: Date,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        filePath: String,
        fileSize: Number,
        changes: String,
      },
    ],

    // البحث والفهرسة
    searchKeywords: [String],
    lastModified: {
      type: Date,
      default: Date.now,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Phase 8: Enhanced Features
    signatures: [
      {
        signedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        signedAt: { type: Date, default: Date.now },
        signatureHash: String, // Digital signature hash
        status: { type: String, enum: ['pending', 'signed', 'rejected'], default: 'signed' },
      },
    ],
    isEncrypted: { type: Boolean, default: false },
    encryptionKeyId: String,
    ocrStatus: { type: String, enum: ['pending', 'completed', 'failed', 'none'], default: 'none' },
    extractedText: String, // OCR Result

    downloadCount: {
      type: Number,
      default: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
    },

    // حالة المستند
    status: {
      type: String,
      enum: ['نشط', 'مؤرشف', 'محذوف', 'قيد المراجعة'],
      default: 'نشط',
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: Date,
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // البيانات الوصفية
    metadata: {
      author: String,
      subject: String,
      keywords: String,
      comments: String,
    },

    // التنبيهات والتذكيرات
    expiryDate: Date,
    requiresApproval: {
      type: Boolean,
      default: false,
    },
    approvalStatus: {
      type: String,
      enum: ['معلق', 'موافق عليه', 'مرفوض'],
      default: 'معلق',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // نشاط المستند
    activityLog: [
      {
        action: {
          type: String,
          enum: ['تحميل', 'تنزيل', 'عرض', 'مشاركة', 'تعديل', 'حذف', 'استرجاع'],
        },
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        performedByName: String,
        performedAt: {
          type: Date,
          default: Date.now,
        },
        details: String,
      },
    ],
  },
  {
    timestamps: true,
    collection: 'documents',
  },
);

// الفهارس
DocumentSchema.index({ uploadedBy: 1, createdAt: -1 });
DocumentSchema.index({ category: 1 });
DocumentSchema.index({ title: 'text', description: 'text', tags: 'text' });
DocumentSchema.index({ 'sharedWith.userId': 1 });
DocumentSchema.index({ folder: 1 });
DocumentSchema.index({ status: 1 });

// تحديث معلومات البحث قبل الحفظ
DocumentSchema.pre('save', function (next) {
  if (this.isModified('title') || this.isModified('description') || this.isModified('tags')) {
    this.searchKeywords = [this.title, this.description, ...(this.tags || []), this.originalFileName].filter(Boolean);
  }
  next();
});

// إرجاع حجم الملف بصيغة قابلة للقراءة
DocumentSchema.methods.getFileSizeFormatted = function () {
  const bytes = this.fileSize;
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// التحقق من صلاحية المستخدم
DocumentSchema.methods.hasAccess = function (userId, requiredPermission = 'view') {
  // المالك لديه كل الصلاحيات
  if (this.uploadedBy.toString() === userId.toString()) {
    return true;
  }

  // التحقق من المشاركة المباشرة
  const sharedUser = this.sharedWith.find(share => share.userId.toString() === userId.toString());
  if (sharedUser) {
    const permissions = {
      view: ['view', 'edit', 'download', 'share'],
      edit: ['edit', 'download', 'share'],
      download: ['download', 'share'],
      share: ['share'],
    };
    return permissions[requiredPermission].includes(sharedUser.permission);
  }

  return this.isPublic && requiredPermission === 'view';
};

// إضافة سجل النشاط
DocumentSchema.methods.addActivityLog = function (action, performedBy, performedByName, details = '') {
  this.activityLog.push({
    action,
    performedBy,
    performedByName,
    details,
  });
};

// Statics - Methods for Document class
DocumentSchema.statics.searchDocuments = async function(query, filters = {}) {
  let searchQuery = this.where();

  if (query) {
    searchQuery = searchQuery.or([
      { title: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } },
      { extractedText: { $regex: query, $options: 'i' } },
    ]);
  }

  if (filters.category) searchQuery = searchQuery.where('category').equals(filters.category);
  if (filters.uploadedBy) searchQuery = searchQuery.where('uploadedBy').equals(filters.uploadedBy);
  if (filters.status) searchQuery = searchQuery.where('status').equals(filters.status);
  if (filters.isArchived !== undefined) searchQuery = searchQuery.where('isArchived').equals(filters.isArchived);

  return searchQuery.sort({ createdAt: -1 });
};

DocumentSchema.statics.findRecent = function(limit = 10) {
  return this.find({ isArchived: false })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('uploadedBy', 'name email');
};

DocumentSchema.statics.findByCategory = function(category) {
  return this.find({ category, isArchived: false }).sort({ createdAt: -1 });
};

DocumentSchema.statics.findExpiring = function(daysFromNow = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysFromNow);
  
  return this.find({
    expiryDate: { $gte: new Date(), $lte: futureDate },
    isArchived: false,
  }).sort({ expiryDate: 1 });
};

DocumentSchema.statics.getMostDownloaded = function(limit = 10) {
  return this.find({ isArchived: false })
    .sort({ downloadCount: -1 })
    .limit(limit)
    .populate('uploadedBy', 'name');
};

// Virtual for file extension
DocumentSchema.virtual('extension').get(function() {
  const parts = this.originalFileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'unknown';
});

// Virtual for age in days
DocumentSchema.virtual('ageDays').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  return Math.floor((now - created) / (1000 * 60 * 60 * 24));
});

// Virtual for is expiring soon
DocumentSchema.virtual('isExpiringSoon').get(function() {
  if (!this.expiryDate) return false;
  const daysUntilExpiry = Math.floor((this.expiryDate - new Date()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
});

module.exports = mongoose.model('Document', DocumentSchema);
