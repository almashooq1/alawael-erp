/* eslint-disable no-unused-vars */
/**
 * ===================================================================
 * CURRENCY EXCHANGE RATE MODEL - نموذج أسعار صرف العملات
 * ===================================================================
 */

const mongoose = require('mongoose');

const exchangeRateSchema = new mongoose.Schema(
  {
    // العملة المصدر
    fromCurrency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    // العملة الهدف
    toCurrency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    // سعر الصرف
    rate: {
      type: Number,
      required: [true, 'سعر الصرف مطلوب'],
      min: [0, 'سعر الصرف يجب أن يكون موجباً'],
    },
    // سعر الصرف المعكوس
    inverseRate: { type: Number },

    // تاريخ السعر
    effectiveDate: { type: Date, required: true, default: Date.now },
    expiryDate: { type: Date },

    // المصدر
    source: {
      type: String,
      enum: ['manual', 'api', 'bank', 'central_bank'],
      default: 'manual',
    },

    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

exchangeRateSchema.index({ fromCurrency: 1, toCurrency: 1, effectiveDate: -1 });
exchangeRateSchema.index({ isActive: 1 });

// حساب السعر المعكوس تلقائياً
exchangeRateSchema.pre('save', function (next) {
  if (this.rate) {
    this.inverseRate = Math.round((1 / this.rate) * 1000000) / 1000000;
  }
  next();
});

module.exports = mongoose.model('ExchangeRate', exchangeRateSchema);
