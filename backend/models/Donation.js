/* eslint-disable no-unused-vars */
/**
 * ===================================================================
 * DONATION MODEL - نموذج التبرعات
 * ===================================================================
 */

const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema(
  {
    // رقم التبرع
    donationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // نوع التبرع
    type: {
      type: String,
      required: true,
      enum: ['cash', 'in_kind', 'endowment', 'zakat', 'sadaqah', 'recurring', 'conditional'],
    },

    // بيانات المتبرع
    donorName: { type: String, required: true, trim: true },
    donorPhone: { type: String, trim: true },
    donorEmail: { type: String, trim: true },
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isAnonymous: { type: Boolean, default: false },

    // المبلغ
    amount: {
      type: Number,
      required: [true, 'مبلغ التبرع مطلوب'],
      min: [0, 'المبلغ يجب أن يكون موجباً'],
    },
    currency: { type: String, default: 'SAR' },

    // طريقة الدفع
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'credit_card', 'check', 'online', 'other'],
      default: 'cash',
    },
    paymentReference: { type: String, trim: true },

    // التخصيص
    purpose: { type: String, trim: true },
    campaign: { type: String, trim: true },
    restrictedTo: { type: String, trim: true },

    // الحالة
    status: {
      type: String,
      enum: ['pledged', 'received', 'acknowledged', 'refunded', 'cancelled'],
      default: 'received',
    },

    // الاستلام
    receiptNumber: { type: String, trim: true },
    receiptDate: { type: Date },
    receiptSent: { type: Boolean, default: false },

    // التبرع المتكرر
    isRecurring: { type: Boolean, default: false },
    recurringFrequency: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'annual'],
    },

    // التاريخ
    donationDate: { type: Date, required: true, default: Date.now },

    // ملاحظات
    notes: { type: String, trim: true },
    internalNotes: { type: String, trim: true },

    // الحساب المحاسبي
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

donationSchema.index({ type: 1, status: 1 });
donationSchema.index({ donorName: 1 });
donationSchema.index({ donationDate: -1 });

module.exports = mongoose.models.Donation || mongoose.model('Donation', donationSchema);
