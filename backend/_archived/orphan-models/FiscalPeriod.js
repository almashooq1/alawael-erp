/* eslint-disable no-unused-vars */
/**
 * ===================================================================
 * FISCAL PERIOD MODEL - نموذج الفترة المحاسبية
 * ===================================================================
 */

const mongoose = require('mongoose');

const fiscalPeriodSchema = new mongoose.Schema(
  {
    // معلومات الفترة
    name: {
      type: String,
      required: [true, 'اسم الفترة المحاسبية مطلوب'],
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // النوع
    periodType: {
      type: String,
      required: true,
      enum: ['month', 'quarter', 'semi_annual', 'annual'],
    },

    // السنة المالية
    fiscalYear: {
      type: Number,
      required: [true, 'السنة المالية مطلوبة'],
    },

    // التواريخ
    startDate: { type: Date, required: [true, 'تاريخ البداية مطلوب'] },
    endDate: { type: Date, required: [true, 'تاريخ النهاية مطلوب'] },

    // الحالة
    status: {
      type: String,
      enum: ['open', 'closing', 'closed', 'locked'],
      default: 'open',
    },

    // الأرصدة الافتتاحية والختامية
    openingBalances: {
      totalAssets: { type: Number, default: 0 },
      totalLiabilities: { type: Number, default: 0 },
      totalEquity: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      totalExpenses: { type: Number, default: 0 },
      retainedEarnings: { type: Number, default: 0 },
    },
    closingBalances: {
      totalAssets: { type: Number, default: 0 },
      totalLiabilities: { type: Number, default: 0 },
      totalEquity: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      totalExpenses: { type: Number, default: 0 },
      retainedEarnings: { type: Number, default: 0 },
      netIncome: { type: Number, default: 0 },
    },

    // قيد الإقفال
    closingEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },

    // إحصائيات
    transactionCount: { type: Number, default: 0 },
    journalEntryCount: { type: Number, default: 0 },

    // عمليات الإقفال
    closingSteps: [
      {
        step: { type: String },
        status: { type: String, enum: ['pending', 'completed', 'skipped'] },
        completedAt: { type: Date },
        completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        notes: { type: String },
      },
    ],

    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    closedAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

fiscalPeriodSchema.index({ fiscalYear: 1, periodType: 1 });
fiscalPeriodSchema.index({ status: 1 });

module.exports = mongoose.models.FiscalPeriod || mongoose.model('FiscalPeriod', fiscalPeriodSchema);
