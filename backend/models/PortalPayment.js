/**
 * PortalPayment Model
 * نموذج الدفعات في بوابة المستفيد/ولي الأمر
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const PortalPaymentSchema = new Schema(
  {
    // Related Entities الكيانات المرتبطة
    guardianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guardian',
      required: [true, 'معرف ولي الأمر مطلوب'],
      index: true,
    },
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: [true, 'معرف المستفيد مطلوب'],
      index: true,
    },

    // Payment Details تفاصيل الدفعة
    amount: {
      type: Number,
      required: [true, 'المبلغ مطلوب'],
      min: 0,
    },
    currency: {
      type: String,
      enum: ['AED', 'USD', 'SAR', 'KWD', 'BHD'],
      default: 'AED',
    },
    description: {
      type: String,
      required: [true, 'وصف الدفعة مطلوب'],
      maxlength: 500,
    },
    invoiceNumber: {
      type: String,
      required: [true, 'رقم الفاتورة مطلوب'],
      unique: true,
    },

    // Dates التواريخ
    dueDate: {
      type: Date,
      required: [true, 'تاريخ الاستحقاق مطلوب'],
      index: true,
    },
    paidDate: Date,
    reminderSentAt: Date,

    // Payment Method طريقة الدفع
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'debit_card', 'bank_transfer', 'cash', 'check', 'online_wallet'],
      default: null,
    },
    transactionReference: String,
    gatewayTransactionId: String,

    // Status الحالة
    status: {
      type: String,
      enum: ['pending', 'partially_paid', 'paid', 'overdue', 'cancelled', 'refunded'],
      default: 'pending',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['awaiting_payment', 'payment_processing', 'payment_confirmed', 'payment_failed'],
      default: 'awaiting_payment',
    },

    // Additional Payment Info معلومات إضافية
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    amountRemaining: Number,
    penaltyCharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountApplied: {
      type: Number,
      default: 0,
      min: 0,
    },
    finalAmount: Number,

    // Payment Installments الدفع بالتقسيط
    isInstallment: {
      type: Boolean,
      default: false,
    },
    installmentNumber: Number,
    totalInstallments: Number,
    installmentPlan: [
      {
        installmentNumber: Number,
        amount: Number,
        dueDate: Date,
        status: {
          type: String,
          enum: ['pending', 'paid', 'overdue'],
          default: 'pending',
        },
        paidDate: Date,
      },
    ],

    // Payment Notes ملاحظات الدفعة
    adminNotes: String,
    guardianNotes: String,
    internalNotes: String,

    // Receipt & Documentation الإيصالات والتوثيق
    receiptUrl: String,
    receiptGenerated: {
      type: Boolean,
      default: false,
    },
    receiptSentAt: Date,
    invoiceSentAt: Date,

    // Reminder & Notifications التنبيهات والتذكيرات
    reminderCount: {
      type: Number,
      default: 0,
    },
    nextReminderDate: Date,
    remindersSent: [
      {
        sentAt: Date,
        method: String, // email, sms, push
        status: String,
      },
    ],

    // Late Payment معالجة التأخر
    daysOverdue: {
      type: Number,
      default: 0,
    },
    overdueNotificationSent: {
      type: Boolean,
      default: false,
    },
    overdueProcessingStarted: {
      type: Boolean,
      default: false,
    },

    // Refund Information معلومات المرتجعات
    refundAmount: Number,
    refundReason: String,
    refundRequestedAt: Date,
    refundProcessedAt: Date,
    refundMethod: String,
    refundTransactionId: String,

    // Verification التحقق
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'failed'],
      default: 'pending',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verificationTime: Date,

    // Audit Trail
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
    collection: 'portal_payments',
  }
);

// Indexes
PortalPaymentSchema.index({ guardianId: 1, createdAt: -1 });
PortalPaymentSchema.index({ beneficiaryId: 1, status: 1 });
PortalPaymentSchema.index({ status: 1, dueDate: 1 });
PortalPaymentSchema.index({ invoiceNumber: 1 });

// Virtual: Days Until Due
PortalPaymentSchema.virtual('daysUntilDue').get(function () {
  const now = new Date();
  const diffTime = this.dueDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual: Is Overdue
PortalPaymentSchema.virtual('isOverdue').get(function () {
  return this.status === 'overdue' || (new Date() > this.dueDate && this.status !== 'paid');
});

// Static Methods
PortalPaymentSchema.statics.getByGuardian = function (guardianId) {
  return this.find({
    guardianId,
    deletedAt: null,
  }).sort({ dueDate: 1 });
};

PortalPaymentSchema.statics.getByBeneficiary = function (beneficiaryId) {
  return this.find({
    beneficiaryId,
    deletedAt: null,
  }).sort({ dueDate: 1 });
};

PortalPaymentSchema.statics.getPendingPayments = function (guardianId) {
  return this.find({
    guardianId,
    status: { $in: ['pending', 'partially_paid', 'overdue'] },
    deletedAt: null,
  }).sort({ dueDate: 1 });
};

PortalPaymentSchema.statics.getOverduePayments = function () {
  return this.find({
    status: 'overdue',
    dueDate: { $lt: new Date() },
    deletedAt: null,
  }).sort({ dueDate: 1 });
};

PortalPaymentSchema.statics.getUpcomingPayments = function (days = 7) {
  const today = new Date();
  const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

  return this.find({
    dueDate: { $gte: today, $lte: futureDate },
    status: { $in: ['pending', 'partially_paid'] },
    deletedAt: null,
  }).sort({ dueDate: 1 });
};

PortalPaymentSchema.statics.getTotalDue = function (guardianId) {
  return this.aggregate([
    { $match: { guardianId, status: { $in: ['pending', 'overdue'] } } },
    { $group: { _id: null, totalDue: { $sum: '$amountRemaining' || '$amount' } } },
  ]);
};

PortalPaymentSchema.statics.getPaymentStats = function (guardianId) {
  return this.aggregate([
    { $match: { guardianId, deletedAt: null } },
    {
      $group: {
        _id: null,
        totalInvoiced: { $sum: '$amount' },
        totalPaid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } },
        totalPending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] } },
        totalOverdue: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, '$amount', 0] } },
        countTotal: { $sum: 1 },
        countPaid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
        countPending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        countOverdue: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } },
      },
    },
  ]);
};

// Instance Methods
PortalPaymentSchema.methods.markAsPaid = async function (paidAmount, paymentMethod, transactionRef) {
  this.amountPaid = (this.amountPaid || 0) + paidAmount;
  this.paidDate = new Date();
  this.paymentMethod = paymentMethod;
  this.transactionReference = transactionRef;

  if (this.amountPaid >= this.finalAmount || this.finalAmount) {
    this.status = 'paid';
  } else {
    this.status = 'partially_paid';
  }

  this.amountRemaining = this.finalAmount - this.amountPaid;
  this.paymentStatus = 'payment_confirmed';

  return this.save();
};

PortalPaymentSchema.methods.markAsOverdue = async function () {
  if (this.status !== 'paid') {
    this.status = 'overdue';
    this.daysOverdue = Math.ceil((new Date() - this.dueDate) / (1000 * 60 * 60 * 24));
    this.overdueNotificationSent = false;
  }
  return this.save();
};

PortalMessageSchema.methods.sendReminder = async function () {
  const Notification = mongoose.model('PortalNotification');

  await Notification.create({
    guardianId: this.guardianId,
    beneficiaryId: this.beneficiaryId,
    type: 'payment',
    title_ar: 'تذكير: دفعة مستحقة',
    title_en: 'Reminder: Payment Due',
    message_ar: `الدفعة رقم ${this.invoiceNumber} مستحقة في ${this.dueDate.toLocaleDateString('ar')}`,
    message_en: `Invoice #${this.invoiceNumber} is due on ${this.dueDate.toLocaleDateString('en')}`,
    relatedId: this._id,
  });

  this.reminderCount = (this.reminderCount || 0) + 1;
  this.remindersSent.push({
    sentAt: new Date(),
    method: 'system',
    status: 'sent',
  });

  return this.save();
};

PortalPaymentSchema.methods.generateReceipt = async function () {
  // This would integrate with a PDF generation service
  this.receiptGenerated = true;
  return this.save();
};

PortalPaymentSchema.methods.requestRefund = async function (reason) {
  this.refundReason = reason;
  this.refundRequestedAt = new Date();
  return this.save();
};

// Middleware
PortalPaymentSchema.pre('save', function (next) {
  // Calculate final amount
  this.finalAmount = this.amount + this.penaltyCharge - this.discountApplied;
  if (!this.amountRemaining) {
    this.amountRemaining = this.finalAmount;
  }

  // Check and update overdue status
  if (new Date() > this.dueDate && this.status !== 'paid' && this.status !== 'overdue') {
    this.status = 'overdue';
    this.daysOverdue = Math.ceil((new Date() - this.dueDate) / (1000 * 60 * 60 * 24));
  }

  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('PortalPayment', PortalPaymentSchema);
