/**
 * ===================================================================
 * ACCOUNTING PAYMENT MODEL - نموذج الدفعة المحاسبية
 * ===================================================================
 */

const mongoose = require('mongoose');

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
accountingPaymentSchema.pre('save', async function () {
  // إذا كانت الدفعة جديدة ومكتملة، تحديث الفاتورة
  if (this.isNew && this.status === 'completed') {
    try {
      const AccountingInvoice = mongoose.model('AccountingInvoice');
      const invoice = await AccountingInvoice.findById(this.invoice);

      if (!invoice) {
        return next(new Error('الفاتورة غير موجودة'));
      }

      // التحقق من أن المبلغ لا يتجاوز المبلغ المتبقي
      if (this.amount > invoice.remainingAmount) {
        return next(new Error('المبلغ المدفوع يتجاوز المبلغ المتبقي في الفاتورة'));
      }

      // تحديث الفاتورة
      await invoice.recordPayment(this.amount, this._id);
    } catch (error) {
      return next(error);
    }
  }

  next();
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
    console.error('خطأ في تحديث الفاتورة بعد حذف الدفعة:', error);
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

const AccountingPayment = mongoose.model('AccountingPayment', accountingPaymentSchema);

module.exports = AccountingPayment;
