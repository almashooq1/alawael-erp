/* eslint-disable no-unused-vars */
/**
 * ===================================================================
 * RECURRING TRANSACTION MODEL - نموذج المعاملات المتكررة
 * ===================================================================
 */

const mongoose = require('mongoose');

const recurringTransactionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'اسم المعاملة المتكررة مطلوب'],
      trim: true,
    },
    description: { type: String, trim: true },

    // نوع المعاملة
    type: {
      type: String,
      required: true,
      enum: ['income', 'expense', 'journal_entry', 'transfer'],
    },

    // مبلغ المعاملة
    amount: {
      type: Number,
      required: [true, 'المبلغ مطلوب'],
      min: [0, 'المبلغ يجب أن يكون موجباً'],
    },

    // العملة
    currency: { type: String, default: 'SAR' },

    // الحساب المصدر والحساب الوجهة
    fromAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    toAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },

    // التصنيف
    category: { type: String, trim: true },

    // التكرار
    frequency: {
      type: String,
      required: true,
      enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semi_annual', 'annual'],
    },

    // تاريخ البداية والنهاية
    startDate: { type: Date, required: [true, 'تاريخ البداية مطلوب'] },
    endDate: { type: Date },

    // يوم التنفيذ (1-31 للشهري, 1-7 للأسبوعي)
    executionDay: { type: Number, min: 1, max: 31 },

    // آخر تنفيذ
    lastExecutedAt: { type: Date },
    nextExecutionDate: { type: Date },

    // عدد مرات التنفيذ
    executionCount: { type: Number, default: 0 },
    maxExecutions: { type: Number }, // null = unlimited

    // الحالة
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'cancelled'],
      default: 'active',
    },

    // الإشعارات
    notifyBeforeExecution: { type: Boolean, default: true },
    notifyDaysBefore: { type: Number, default: 1 },

    // سجل التنفيذ
    executionHistory: [
      {
        executedAt: Date,
        amount: Number,
        transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
        status: { type: String, enum: ['success', 'failed', 'skipped'] },
        note: String,
      },
    ],

    // بيانات المستخدم
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

recurringTransactionSchema.index({ status: 1, nextExecutionDate: 1 });
recurringTransactionSchema.index({ createdBy: 1 });

module.exports = mongoose.model('RecurringTransaction', recurringTransactionSchema);
