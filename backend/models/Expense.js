/* eslint-disable no-unused-vars */
/**
 * ===================================================================
 * EXPENSE MODEL - نموذج المصروف
 * ===================================================================
 */

const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    // الرقم المرجعي (مولّد تلقائياً)
    reference: {
      type: String,
      unique: true,
      sparse: true,
    },

    // التاريخ
    date: {
      type: Date,
      required: true,
    },

    // الفئة
    category: {
      type: String,
      required: true,
    },

    // الوصف
    description: {
      type: String,
      required: true,
    },

    // المبلغ
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // العملة
    currency: {
      type: String,
      default: 'SAR',
    },

    // الحساب
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    // اسم الحساب (نصي)
    account: {
      type: String,
      trim: true,
    },
    // اسم المورد (نصي)
    vendor: {
      type: String,
      trim: true,
    },

    // طريقة الدفع
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'check', 'credit_card', 'debit_card'],
      default: 'bank_transfer',
    },

    // المشروع أو مركز التكلفة
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
    costCenter: String,

    // معلومات الضريبة
    isTaxable: {
      type: Boolean,
      default: true,
    },
    taxRate: {
      type: Number,
      default: 0.15,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },

    // الحالة
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'paid'],
      default: 'pending',
    },

    // الموافقة
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    rejectionReason: String,

    // الملاحظات
    notes: String,

    // المرفقات (الإيصالات)
    receipts: [
      {
        name: String,
        url: String,
        uploadedAt: Date,
      },
    ],

    // معلومات التتبع
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate reference before save
expenseSchema.pre('save', async function () {
  if (!this.reference) {
    const count = await this.constructor.countDocuments();
    this.reference = `EXP-${String(count + 1).padStart(4, '0')}`;
  }
});

// فهرسة
// Note: reference field doesn't need explicit index (not unique, optional field)
expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ status: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
