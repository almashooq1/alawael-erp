/**
 * ===================================================================
 * ACCOUNTING INVOICE MODEL - نموذج الفاتورة المحاسبية
 * ===================================================================
 */

const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    vatRate: {
      type: Number,
      default: 15,
      min: 0,
      max: 100,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const accountingInvoiceSchema = new mongoose.Schema(
  {
    // رقم الفاتورة
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // التواريخ
    invoiceDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },

    // معلومات العميل
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    customerPhone: {
      type: String,
      trim: true,
    },
    customerAddress: {
      type: String,
      trim: true,
    },

    // نوع الفاتورة
    type: {
      type: String,
      required: true,
      enum: ['sales', 'service'],
      default: 'sales',
    },

    // حالة الفاتورة
    status: {
      type: String,
      required: true,
      enum: ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'],
      default: 'draft',
    },

    // بنود الفاتورة
    items: {
      type: [invoiceItemSchema],
      required: true,
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: 'يجب أن تحتوي الفاتورة على بند واحد على الأقل',
      },
    },

    // المبالغ
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    vatAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // ملاحظات وشروط
    notes: {
      type: String,
      trim: true,
    },
    terms: {
      type: String,
      trim: true,
      default: 'الدفع خلال 30 يوم من تاريخ الفاتورة',
    },

    // معلومات الإرسال
    sentDate: {
      type: Date,
    },
    sentTo: {
      type: String,
      trim: true,
    },

    // المدفوعات المرتبطة
    payments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AccountingPayment',
      },
    ],

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

// Indexes للأداء (invoiceNumber already has unique:true index)
accountingInvoiceSchema.index({ customerName: 1 });
accountingInvoiceSchema.index({ status: 1 });
accountingInvoiceSchema.index({ invoiceDate: -1 });
accountingInvoiceSchema.index({ dueDate: 1 });

// Virtual للتحقق من الفاتورة متأخرة
accountingInvoiceSchema.virtual('isOverdue').get(function () {
  if (this.status === 'paid' || this.status === 'cancelled') {
    return false;
  }
  return this.dueDate < new Date();
});

// Method لتحديث حالة الفاتورة بناءً على الدفعات
accountingInvoiceSchema.methods.updateStatus = function () {
  if (this.remainingAmount === 0) {
    this.status = 'paid';
  } else if (this.paidAmount > 0 && this.remainingAmount > 0) {
    this.status = 'partial';
  } else if (this.isOverdue && this.status !== 'cancelled') {
    this.status = 'overdue';
  }
  return this.save();
};

// Method لتسجيل دفعة
accountingInvoiceSchema.methods.recordPayment = function (amount, paymentId) {
  this.paidAmount += amount;
  this.remainingAmount = this.totalAmount - this.paidAmount;

  if (paymentId) {
    this.payments.push(paymentId);
  }

  return this.updateStatus();
};

// Pre-save middleware للتحقق من البيانات
accountingInvoiceSchema.pre('save', function (next) {
  // التأكد من أن remainingAmount صحيح
  if (this.isNew || this.isModified('totalAmount') || this.isModified('paidAmount')) {
    this.remainingAmount = this.totalAmount - this.paidAmount;
  }

  // التحقق من أن dueDate بعد invoiceDate
  if (this.dueDate < this.invoiceDate) {
    return next(new Error('تاريخ الاستحقاق يجب أن يكون بعد تاريخ الفاتورة'));
  }

  next();
});

// Static method لإنشاء رقم فاتورة تلقائي
accountingInvoiceSchema.statics.generateInvoiceNumber = async function (prefix = 'INV') {
  const year = new Date().getFullYear();
  const lastInvoice = await this.findOne({
    invoiceNumber: new RegExp(`^${prefix}-${year}-`),
  }).sort({ createdAt: -1 });

  let nextNumber = 1;
  if (lastInvoice) {
    const match = lastInvoice.invoiceNumber.match(/\d+$/);
    if (match) {
      nextNumber = parseInt(match[0]) + 1;
    }
  }

  return `${prefix}-${year}-${nextNumber.toString().padStart(4, '0')}`;
};

const AccountingInvoice = mongoose.model('AccountingInvoice', accountingInvoiceSchema);

module.exports = AccountingInvoice;
