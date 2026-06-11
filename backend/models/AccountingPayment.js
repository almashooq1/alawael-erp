/* eslint-disable no-undef */
/**
 * ===================================================================
 * ACCOUNTING PAYMENT MODEL - نموذج الدفعة المحاسبية
 * ===================================================================
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const accountingPaymentSchema = new mongoose.Schema(
  {
    // الفاتورة المرتبطة
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AccountingInvoice',
      required: true,
    },

    // المبلغ
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    // integer-halalas sibling (audit #5 EXPAND) — dual-written in pre('save')
    amount_halalas: { type: Number, default: 0 },

    // تاريخ الدفع
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // طريقة الدفع
    paymentMethod: {
      type: String,
      required: true,
      enum: ['cash', 'bank', 'credit', 'transfer', 'cheque'],
      default: 'cash',
    },

    // رقم المرجع
    reference: {
      type: String,
      trim: true,
    },

    // حالة الدفعة
    status: {
      type: String,
      required: true,
      enum: ['completed', 'pending', 'failed', 'cancelled'],
      default: 'completed',
    },

    // من استلم الدفعة
    receivedBy: {
      type: String,
      trim: true,
    },

    // بيانات الشيك (إذا كانت طريقة الدفع شيك)
    chequeNumber: {
      type: String,
      trim: true,
    },
    chequeDate: {
      type: Date,
    },
    bankName: {
      type: String,
      trim: true,
    },

    // رقم المعاملة (للتحويلات البنكية والبطاقات)
    transactionId: {
      type: String,
      trim: true,
    },

    // ملاحظات
    notes: {
      type: String,
      trim: true,
    },

    // القيد المحاسبي المرتبط
    journalEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry',
    },

    // معلومات النظام
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes للأداء
accountingPaymentSchema.index({ invoice: 1 });
accountingPaymentSchema.index({ paymentDate: -1 });
accountingPaymentSchema.index({ paymentMethod: 1 });
accountingPaymentSchema.index({ status: 1 });
// Note: reference field doesn't need explicit index (not unique, optional field)

// Virtual للحصول على معلومات الفاتورة
accountingPaymentSchema.virtual('invoiceDetails', {
  ref: 'AccountingInvoice',
  localField: 'invoice',
  foreignField: '_id',
  justOne: true,
});

// Pre-save middleware
// W1213 — the old body called `next()` (×4) which an async no-param hook
// NEVER receives → ReferenceError on every AccountingPayment save (the same
// crash class fixed on Communication in W1193; repo-wide hunt found this as
// the last instance). Async hooks signal failure by THROWING (W483 canonical).
accountingPaymentSchema.pre('save', async function () {
  // Money-Type Migration (audit #5) — dual-write integer-halalas siblings.
  require('../intelligence/money.lib').deriveHalalas(this, ['amount']);
  // إذا كانت الدفعة جديدة ومكتملة، تحديث الفاتورة
  if (this.isNew && this.status === 'completed') {
    const AccountingInvoice = mongoose.model('AccountingInvoice');
    const invoice = await AccountingInvoice.findById(this.invoice);

    if (!invoice) {
      throw new Error('الفاتورة غير موجودة');
    }

    // التحقق من أن المبلغ لا يتجاوز المبلغ المتبقي
    if (this.amount > invoice.remainingAmount) {
      throw new Error('المبلغ المدفوع يتجاوز المبلغ المتبقي في الفاتورة');
    }

    // تحديث الفاتورة
    await invoice.recordPayment(this.amount, this._id);
  }
});

// Post-remove middleware لتحديث الفاتورة عند حذف الدفعة
accountingPaymentSchema.post('remove', async function (doc) {
  try {
    const AccountingInvoice = mongoose.model('AccountingInvoice');
    const invoice = await AccountingInvoice.findById(doc.invoice);

    if (invoice) {
      // إزالة الدفعة من قائمة المدفوعات
      invoice.payments = invoice.payments.filter(p => p.toString() !== doc._id.toString());

      // تحديث المبالغ
      invoice.paidAmount -= doc.amount;
      invoice.remainingAmount = invoice.totalAmount - invoice.paidAmount;

      await invoice.updateStatus();
    }
  } catch (error) {
    logger.error('خطأ في تحديث الفاتورة بعد حذف الدفعة:', error);
  }
});

// Method لطباعة إيصال
accountingPaymentSchema.methods.generateReceipt = async function () {
  await this.populate('invoice');

  return {
    receiptNumber: `REC-${this._id}`,
    date: this.paymentDate,
    amount: this.amount,
    paymentMethod: this.paymentMethod,
    invoice: {
      invoiceNumber: this.invoice.invoiceNumber,
      customerName: this.invoice.customerName,
      totalAmount: this.invoice.totalAmount,
      remainingAmount: this.invoice.remainingAmount,
    },
    reference: this.reference,
    receivedBy: this.receivedBy,
  };
};

const AccountingPayment =
  mongoose.models.AccountingPayment || mongoose.model('AccountingPayment', accountingPaymentSchema);

module.exports = AccountingPayment;
