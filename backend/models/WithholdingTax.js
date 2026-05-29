/**
 * ===================================================================
 * WITHHOLDING TAX MODEL - نموذج ضريبة الاستقطاع
 * ===================================================================
 */

const mongoose = require('mongoose');

const withholdingTaxSchema = new mongoose.Schema(
  {
    // رقم شهادة الاستقطاع
    certificateNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // بيانات المورد/المستفيد
    beneficiaryName: { type: String, required: true, trim: true },
    beneficiaryTaxId: { type: String, trim: true },
    beneficiaryCountry: { type: String, trim: true },
    beneficiaryType: {
      type: String,
      enum: ['resident', 'non_resident'],
      required: true,
    },

    // نوع الدفعة
    paymentType: {
      type: String,
      required: true,
      enum: [
        'management_fees', // رسوم إدارية
        'royalties', // إتاوات
        'rent', // إيجار
        'technical_services', // خدمات فنية
        'dividends', // أرباح أسهم
        'interest', // فوائد
        'insurance', // تأمين
        'international_telecom', // اتصالات دولية
        'other', // أخرى
      ],
    },

    // المبالغ
    grossAmount: { type: Number, required: true },
    withholdingRate: { type: Number, required: true },
    withholdingAmount: { type: Number, required: true },
    netAmount: { type: Number, required: true },
    // integer-halalas siblings (audit #5 EXPAND) — dual-written in pre('save')
    grossAmount_halalas: { type: Number, default: 0 },
    withholdingAmount_halalas: { type: Number, default: 0 },
    netAmount_halalas: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' },

    // الفاتورة المرتبطة
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'AccountingInvoice' },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'AccountingPayment' },

    // التاريخ
    paymentDate: { type: Date, required: true },
    filingDate: { type: Date },

    // الحالة
    status: {
      type: String,
      enum: ['pending', 'filed', 'paid', 'cancelled'],
      default: 'pending',
    },

    // الفترة الضريبية
    taxPeriod: { type: String }, // e.g., '2026-Q1'
    fiscalYear: { type: Number },

    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Money-Type Migration (audit #5) — dual-write integer-halalas siblings.
withholdingTaxSchema.pre('save', async function (next) {
  require('../intelligence/money.lib').deriveHalalas(this, [
    'grossAmount',
    'withholdingAmount',
    'netAmount',
  ]);
  next();
});

withholdingTaxSchema.index({ status: 1, fiscalYear: 1 });
withholdingTaxSchema.index({ beneficiaryName: 1 });

module.exports =
  mongoose.models.WithholdingTax || mongoose.model('WithholdingTax', withholdingTaxSchema);
