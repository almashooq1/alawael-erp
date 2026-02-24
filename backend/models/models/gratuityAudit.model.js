/**
 * Gratuity Audit Trail Model - نموذج سجل تدقيق مكافأة نهاية الخدمة
 * 
 * يتتبع كل تغيير وعملية متعلقة بحساب المكافأة
 */

const mongoose = require('mongoose');

const gratuityAuditSchema = new mongoose.Schema({
  gratuityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gratuity',
    required: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },

  // نوع الإجراء
  action: {
    type: String,
    enum: [
      'CREATED',                  // تم الإنشاء
      'MODIFIED',                 // تم التعديل
      'RECALCULATED',             // تم إعادة الحساب
      'SUBMITTED',                // تم الإرسال
      'APPROVED',                 // تم الموافقة
      'REJECTED',                 // تم الرفض
      'PAYMENT_INITIATED',        // بدء الدفع
      'PAYMENT_PROCESSED',        // معالجة الدفع
      'PAYMENT_COMPLETED',        // الدفع مكتمل
      'QIWA_SUBMITTED',           // قدمت إلى كيوا
      'GOSI_NOTIFIED',            // أخطر جوسي
      'CANCELLED',                // ملغاة
      'RESTORE_DRAFT',            // إعادة إلى المسودة
      'EXPORTED',                 // تم التصدير
      'REVIEWED'                  // تم المراجعة
    ],
    required: true
  },

  // تفاصيل الإجراء
  details: {
    // للتعديلات
    oldValues: mongoose.Schema.Types.Mixed,
    newValues: mongoose.Schema.Types.Mixed,

    // للموافقات
    approvedBy: mongoose.Schema.Types.ObjectId,
    remarks: String,

    // للمدفوعات
    paymentId: mongoose.Schema.Types.ObjectId,
    amount: Number,
    paymentMethod: String,
    paymentReference: String,

    // للتكاملات
    integrationName: String,
    integrationReference: String,
    integrationStatus: String,

    // معلومات إضافية
    ipAddress: String,
    userAgent: String,
    errorMessage: String
  },

  // معلومات المستخدم
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  userName: String,
  userRole: String,
  userEmail: String,

  // الطابع الزمني
  timestamp: {
    type: Date,
    default: Date.now
  },

  // حالة العملية
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'PENDING'],
    default: 'SUCCESS'
  },

  // تعليقات إضافية
  comments: String,

  // المرجع الخارجي (إن وجد)
  externalReference: String,

  // التوقيع الرقمي
  signature: String

}, {
  timestamps: false,
  collection: 'gratuity_audits',
  indexes: [
    { gratuityId: 1, timestamp: -1 },
    { employeeId: 1, timestamp: -1 },
    { action: 1, timestamp: -1 },
    { userId: 1, timestamp: -1 }
  ]
});

// الفهارس المركبة
gratuityAuditSchema.index({
  gratuityId: 1,
  action: 1,
  timestamp: -1
});

gratuityAuditSchema.index({
  employeeId: 1,
  action: 1,
  timestamp: -1
});

gratuityAuditSchema.index({
  timestamp: -1,
  status: 1
});

module.exports = mongoose.model('GratuityAudit', gratuityAuditSchema);
