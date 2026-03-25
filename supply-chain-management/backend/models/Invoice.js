const mongoose = require('mongoose');
const moment = require('moment');

/**
 * Invoice Schema
 * Manages invoices, billing, and payment tracking
 */
const InvoiceSchema = new mongoose.Schema(
  {
    // Invoice Identification
    invoiceNumber: {
      type: String,
      unique: true,
      required: true
    },

    invoiceId: {
      type: mongoose.Schema.Types.ObjectId
    },

    // Date Information
    issueDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    dueDate: {
      type: Date,
      required: true,
    },

    paidDate: Date,

    // Customer Information
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true
    },

    customerName: String,

    customerEmail: String,

    customerPhone: String,

    customerAddress: String,

    // Vendor Information
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },

    vendorName: String,

    vendorAddress: String,

    vendorTaxId: String,

    // Invoice Items
    items: [
      {
        itemId: mongoose.Schema.Types.ObjectId,
        description: String,
        quantity: Number,
        unitPrice: Number,
        taxRate: Number,
        lineTotal: Number,
        category: String,
      },
    ],

    // Amounts
    subtotal: {
      type: Number,
      required: true,
    },

    taxAmount: {
      type: Number,
      default: 0,
    },

    discountAmount: {
      type: Number,
      default: 0,
    },

    discountPercentage: {
      type: Number,
      default: 0,
    },

    shippingCost: {
      type: Number,
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
    },

    // Payment Tracking
    status: {
      type: String,
      enum: [
        'draft',
        'sent',
        'viewed',
        'partially_paid',
        'paid',
        'overdue',
        'cancelled',
        'disputed',
      ],
      default: 'draft'
    },

    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partially_paid', 'paid', 'overdue', 'cancelled'],
      default: 'unpaid',
    },

    amountPaid: {
      type: Number,
      default: 0,
    },

    amountDue: {
      type: Number,
      required: true,
    },

    // Payment Details
    paymentTerms: {
      type: String,
      enum: ['immediate', 'net15', 'net30', 'net60', 'net90', 'custom'],
      default: 'net30',
    },

    paymentInstructions: String,

    acceptedPaymentMethods: [
      {
        type: String,
        enum: ['credit_card', 'bank_transfer', 'check', 'cash', 'wallet'],
      },
    ],

    // Transactions Linked
    transactions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
      },
    ],

    // Tax Information
    taxRate: {
      type: Number,
      default: 0,
    },

    taxId: String,

    taxBreakdown: {
      federal: Number,
      state: Number,
      local: Number,
      other: Number,
    },

    // Notes & Metadata
    notes: String,

    internalNotes: String,

    memo: String,

    // Reference Information
    poNumber: String, // Purchase Order number

    orderReference: String,

    projectName: String,

    // Recurring Information
    isRecurring: {
      type: Boolean,
      default: false,
    },

    recurringPattern: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly', 'quarterly', 'annual'],
    },

    nextInvoiceDate: Date,

    // Document References
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        fileSize: Number,
        uploadedAt: Date,
      },
    ],

    // Reminders
    remindersSent: [
      {
        sentDate: Date,
        reminderType: String,
        status: String,
      },
    ],

    // Audit Trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    viewedAt: Date,

    viewedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // Soft Delete
    deletedAt: {
      type: Date,
      default: null,
    },

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes
InvoiceSchema.index({ customerId: 1, createdAt: -1 });
InvoiceSchema.index({ status: 1, dueDate: 1 });
InvoiceSchema.index({ paymentStatus: 1 });
InvoiceSchema.index({ dueDate: 1 });

// Virtuals

/**
 * Days until due
 */
InvoiceSchema.virtual('daysUntilDue').get(function () {
  return moment(this.dueDate).diff(moment(), 'days');
});

/**
 * Is overdue
 */
InvoiceSchema.virtual('isOverdue').get(function () {
  return this.daysUntilDue < 0 && this.paymentStatus !== 'paid';
});

/**
 * Is due soon (within 7 days)
 */
InvoiceSchema.virtual('isDueSoon').get(function () {
  const daysUntilDue = this.daysUntilDue;
  return daysUntilDue >= 0 && daysUntilDue <= 7 && this.paymentStatus !== 'paid';
});

/**
 * Remaining balance
 */
InvoiceSchema.virtual('remainingBalance').get(function () {
  return this.amountDue - this.amountPaid;
});

/**
 * Payment percentage
 */
InvoiceSchema.virtual('paymentPercentage').get(function () {
  return (this.amountPaid / this.totalAmount) * 100;
});

// Instance Methods

/**
 * Mark invoice as sent
 */
InvoiceSchema.methods.markAsSent = function () {
  this.status = 'sent';
  return this.save();
};

/**
 * Mark invoice as viewed
 */
InvoiceSchema.methods.markAsViewed = function (userId) {
  this.status = 'viewed';
  this.viewedAt = new Date();
  if (!this.viewedBy.includes(userId)) {
    this.viewedBy.push(userId);
  }
  return this.save();
};

/**
 * Record payment
 */
InvoiceSchema.methods.recordPayment = function (amount, transactionId) {
  this.amountPaid += amount;
  if (!this.transactions.includes(transactionId)) {
    this.transactions.push(transactionId);
  }

  if (this.amountPaid >= this.totalAmount) {
    this.status = 'paid';
    this.paymentStatus = 'paid';
    this.paidDate = new Date();
  } else if (this.amountPaid > 0) {
    this.status = 'partially_paid';
    this.paymentStatus = 'partially_paid';
  }

  this.amountDue = this.totalAmount - this.amountPaid;
  return this.save();
};

/**
 * Cancel invoice
 */
InvoiceSchema.methods.cancel = function () {
  this.status = 'cancelled';
  this.paymentStatus = 'cancelled';
  return this.save();
};

/**
 * Flag as disputed
 */
InvoiceSchema.methods.dispute = function (reason) {
  this.status = 'disputed';
  this.internalNotes = (this.internalNotes || '') + `\nDisputed: ${reason}`;
  return this.save();
};

/**
 * Send reminder
 */
InvoiceSchema.methods.sendReminder = function (reminderType = 'overdue') {
  if (!this.remindersSent) this.remindersSent = [];
  this.remindersSent.push({
    sentDate: new Date(),
    reminderType,
    status: 'sent',
  });
  return this.save();
};

/**
 * Add attachment
 */
InvoiceSchema.methods.addAttachment = function (fileName, fileUrl, fileSize) {
  if (!this.attachments) this.attachments = [];
  this.attachments.push({
    fileName,
    fileUrl,
    fileSize,
    uploadedAt: new Date(),
  });
  return this.save();
};

// Static Methods

/**
 * Get overdue invoices
 */
InvoiceSchema.statics.getOverdueInvoices = function (customerId = null) {
  const query = {
    dueDate: { $lt: new Date() },
    paymentStatus: { $ne: 'paid' },
    deletedAt: null,
  };
  if (customerId) query.customerId = customerId;
  return this.find(query).sort({ dueDate: 1 });
};

/**
 * Get invoices by status
 */
InvoiceSchema.statics.getByStatus = function (status, customerId = null) {
  const query = { status, deletedAt: null };
  if (customerId) query.customerId = customerId;
  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Calculate total outstanding
 */
InvoiceSchema.statics.getTotalOutstanding = function (customerId = null) {
  const query = {
    paymentStatus: { $in: ['unpaid', 'partially_paid', 'overdue'] },
    deletedAt: null,
  };
  if (customerId) query.customerId = customerId;

  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalOutstanding: { $sum: '$amountDue' },
        invoiceCount: { $sum: 1 },
        averageInvoice: { $avg: '$totalAmount' },
        oldestDueDate: { $min: '$dueDate' },
      },
    },
  ]);
};

module.exports = mongoose.model('Invoice', InvoiceSchema);
