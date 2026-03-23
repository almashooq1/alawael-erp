/* eslint-disable no-unused-vars */
/**
 * ===================================================================
 * BANK RECONCILIATION MODEL - نموذج التسوية البنكية
 * ===================================================================
 */

const mongoose = require('mongoose');

const bankStatementLineSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  description: { type: String, trim: true },
  reference: { type: String, trim: true },
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  balance: { type: Number },
  // حالة المطابقة
  matched: { type: Boolean, default: false },
  matchedTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  matchedAt: { type: Date },
});

const bankReconciliationSchema = new mongoose.Schema(
  {
    // معلومات التسوية
    reconciliationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'الحساب البنكي مطلوب'],
    },
    bankName: { type: String, trim: true },

    // الفترة
    periodStart: { type: Date, required: [true, 'تاريخ بداية الفترة مطلوب'] },
    periodEnd: { type: Date, required: [true, 'تاريخ نهاية الفترة مطلوب'] },

    // الأرصدة
    bankStatementBalance: { type: Number, required: true },
    bookBalance: { type: Number, required: true },
    adjustedBankBalance: { type: Number },
    adjustedBookBalance: { type: Number },
    difference: { type: Number, default: 0 },

    // كشف الحساب البنكي
    bankStatementLines: [bankStatementLineSchema],

    // بنود التسوية
    outstandingChecks: [
      {
        date: Date,
        reference: String,
        description: String,
        amount: Number,
      },
    ],
    depositsInTransit: [
      {
        date: Date,
        reference: String,
        description: String,
        amount: Number,
      },
    ],
    bankCharges: [
      {
        date: Date,
        description: String,
        amount: Number,
        recorded: { type: Boolean, default: false },
      },
    ],
    interestEarned: [
      {
        date: Date,
        description: String,
        amount: Number,
        recorded: { type: Boolean, default: false },
      },
    ],
    adjustments: [
      {
        date: Date,
        description: String,
        amount: Number,
        type: { type: String, enum: ['bank', 'book'] },
      },
    ],

    // الحالة
    status: {
      type: String,
      enum: ['draft', 'in_progress', 'completed', 'approved'],
      default: 'draft',
    },

    // المطابقة التلقائية
    autoMatchCount: { type: Number, default: 0 },
    manualMatchCount: { type: Number, default: 0 },
    unmatchedCount: { type: Number, default: 0 },

    notes: { type: String, trim: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

bankReconciliationSchema.index({ accountId: 1, periodEnd: -1 });
bankReconciliationSchema.index({ status: 1 });

module.exports = mongoose.models.BankReconciliation || mongoose.model('BankReconciliation', bankReconciliationSchema);
