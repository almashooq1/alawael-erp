/**
 * نموذج مستندات الموظف (Employee Document Management)
 * إدارة مركزية آمنة لجميع وثائق الموظفين مع تتبع الصلاحية
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const documentSchema = new Schema(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },

    // معلومات المستند
    title: { type: String, required: true },
    titleEn: { type: String },
    category: {
      type: String,
      enum: [
        'هوية',
        'جواز سفر',
        'إقامة',
        'رخصة قيادة',
        'شهادة أكاديمية',
        'شهادة مهنية',
        'شهادة تدريب',
        'عقد عمل',
        'خطاب تعيين',
        'خطاب راتب',
        'تقرير طبي',
        'تأمين صحي',
        'تصريح عمل',
        'تأشيرة',
        'أخرى',
      ],
      required: true,
    },
    documentNumber: { type: String },
    description: { type: String },

    // الملف
    file: {
      originalName: { type: String },
      storagePath: { type: String },
      mimeType: { type: String },
      size: { type: Number }, // bytes
      checksum: { type: String }, // SHA-256 للتحقق
    },

    // الصلاحية
    issueDate: { type: Date },
    expiryDate: { type: Date },
    isExpired: { type: Boolean, default: false },
    daysToExpiry: { type: Number },

    // التنبيهات
    alertDaysBefore: { type: Number, default: 30 },
    alertSent: { type: Boolean, default: false },
    alertSentAt: { type: Date },

    // الحالة
    status: {
      type: String,
      enum: ['ساري', 'منتهي', 'قيد التجديد', 'ملغى', 'مرفوض'],
      default: 'ساري',
    },

    // التحقق
    verification: {
      isVerified: { type: Boolean, default: false },
      verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      verifiedAt: { type: Date },
      verificationNotes: { type: String },
    },

    // OCR / AI Extraction
    aiExtractedData: {
      extractedFields: { type: Map, of: String },
      confidence: { type: Number, min: 0, max: 100 },
      extractedAt: { type: Date },
      rawText: { type: String },
    },

    // السرية
    confidentiality: {
      type: String,
      enum: ['عام', 'محدود', 'سري', 'سري للغاية'],
      default: 'محدود',
    },

    // تاريخ الإصدارات
    versions: [
      {
        version: { type: Number },
        file: { originalName: String, storagePath: String, mimeType: String, size: Number },
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now },
        changeNotes: { type: String },
      },
    ],

    tags: [{ type: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

// حساب حالة الانتهاء تلقائياً
documentSchema.pre('save', function (next) {
  if (this.expiryDate) {
    const now = new Date();
    const diff = Math.ceil((this.expiryDate - now) / (1000 * 60 * 60 * 24));
    this.daysToExpiry = diff;
    this.isExpired = diff <= 0;
    if (this.isExpired && this.status === 'ساري') {
      this.status = 'منتهي';
    }
  }
  next();
});

documentSchema.index({ category: 1, status: 1 });
documentSchema.index({ expiryDate: 1, isExpired: 1 });
documentSchema.index({ 'verification.isVerified': 1 });
documentSchema.index({ tags: 1 });

module.exports =
  mongoose.models.EmployeeDocument || mongoose.model('EmployeeDocument', documentSchema);
