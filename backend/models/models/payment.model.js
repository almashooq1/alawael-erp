/**
 * Payment Model - نموذج السداد
 * 
 * يحتفظ بسجلات الدفعات المرتبطة بمكافآت نهاية الخدمة
 */

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
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

  // تفاصيل الدفع
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['BANK_TRANSFER', 'CHECK', 'CASH', 'SALARY_OFFSET'],
    required: true
  },

  // تفاصيل البنك
  bankDetails: {
    bankName: String,
    accountNumber: String,
    iban: String,
    swiftCode: String,
    accountHolderName: String
  },

  // تفاصيل الشيك
  checkDetails: {
    checkNumber: String,
    checkDate: Date,
    issueDate: Date,
    expiryDate: Date,
    bankName: String
  },

  // الحالة
  status: {
    type: String,
    enum: [
      'PENDING',              // قيد الانتظار
      'APPROVED',             // موافق عليها
      'PROCESSING',           // قيد المعالجة
      'COMPLETED',            // مكتملة
      'FAILED',               // فشلت
      'REJECTED',             // مرفوضة
      'CANCELLED'             // ملغاة
    ],
    default: 'PENDING'
  },

  // المراجع
  paymentReference: String,
  transactionId: String,
  receiptNumber: String,

  // التواريخ
  requestedDate: {
    type: Date,
    default: Date.now
  },
  approvedDate: Date,
  processedDate: Date,
  completedAt: Date,

  // ملاحظات إضافية
  remarks: String,
  failureReason: String,
  rejectionReason: String,

  // البيانات المالية
  currency: {
    type: String,
    default: 'SAR'
  },
  exchangeRate: {
    type: Number,
    default: 1
  },

  // المسؤول
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // التتبع والتدقيق
  attachments: [{
    fileName: String,
    fileUrl: String,
    uploadedAt: Date,
    documentType: String // RECEIPT, CHECK_IMAGE, TRANSFER_PROOF
  }],

  // بيانات المراجع
  reconciliationId: String,
  batchNumber: String,

  // معلومات النظام
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'payments'
});

// تحديث updatedAt قبل الحفظ
paymentSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// الفهارس
paymentSchema.index({
  gratuityId: 1,
  status: 1
});

paymentSchema.index({
  employeeId: 1,
  createdAt: -1
});

paymentSchema.index({
  status: 1,
  createdAt: -1
});

paymentSchema.index({
  transactionId: 1
});

module.exports = mongoose.model('Payment', paymentSchema);
