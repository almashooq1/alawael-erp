const mongoose = require('mongoose');
const moment = require('moment');

/**
 * Transaction Schema
 * Tracks all financial transactions: payments, refunds, adjustments, and settlements
 */
const TransactionSchema = new mongoose.Schema(
  {
    // Transaction Identification
    transactionId: {
      type: String,
      unique: true,
      required: true
    },

    // Transaction Type
    type: {
      type: String,
      enum: [
        'payment', // Customer payment
        'refund', // Return/cancellation
        'adjustment', // Manual adjustment
        'fee', // Processing fee
        'credit', // Credit memo
        'reversal', // Transaction reversal
        'settlement', // Settlement
      ],
      required: true
    },

    // Transaction Details
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'KWD', 'JPY', 'CNY'],
    },

    description: String,

    // References
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },

    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice'
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
    },

    // Payment Method
    paymentMethod: {
      type: String,
      enum: [
        'card', // Credit/Debit Card
        'bank_transfer', // Bank Transfer
        'wallet', // Digital Wallet
        'check', // Check
        'cash', // Cash
        'crypto', // Cryptocurrency
      ],
      required: true,
    },

    paymentGateway: {
      type: String,
      enum: ['stripe', 'paypal', 'razorpay', 'square', 'custom'],
    },

    // Payment Processing
    status: {
      type: String,
      enum: [
        'pending', // Awaiting processing
        'processing', // In progress
        'completed', // Successfully completed
        'failed', // Processing failed
        'cancelled', // User cancelled
        'refunded', // Partially or fully refunded
        'disputed', // Under dispute
      ],
      default: 'pending'
    },

    processedAt: Date,

    gatewayTransactionId: {
      type: String
    },

    gatewayReference: String,

    // Payment Details
    cardLast4: String, // Last 4 digits of card

    cardBrand: String, // Visa, MasterCard, AmEx

    bankAccount: String, // Bank account for transfers

    walletId: String,

    // Fee Information
    processingFee: {
      type: Number,
      default: 0,
    },

    platformFee: {
      type: Number,
      default: 0,
    },

    totalFees: {
      type: Number,
      default: 0,
    },

    netAmount: {
      type: Number,
      required: true,
    },

    // Reconciliation
    reconciliationStatus: {
      type: String,
      enum: ['pending', 'matched', 'verified', 'disputed'],
      default: 'pending',
    },

    reconciliationDate: Date,

    reconciliationNotes: String,

    // Refund Details (if applicable)
    originalTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
    },

    refundAmount: {
      type: Number,
      default: 0,
    },

    refundReason: String,

    refundStatus: {
      type: String,
      enum: ['none', 'pending', 'completed', 'failed'],
      default: 'none',
    },

    // Metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    notes: String,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    ipAddress: String,

    userAgent: String,

    // Retry Information
    retryCount: {
      type: Number,
      default: 0,
    },

    lastRetryDate: Date,

    // Webhook/Event Tracking
    webhookStatus: {
      type: String,
      enum: ['pending', 'delivered', 'failed'],
      default: 'pending',
    },

    webhookRetries: {
      type: Number,
      default: 0,
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

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for performance
TransactionSchema.index({ customerId: 1, createdAt: -1 });
TransactionSchema.index({ type: 1, status: 1 });
TransactionSchema.index({ processedAt: 1 });
TransactionSchema.index({ reconciliationStatus: 1 });

// Virtual for formatted amount
TransactionSchema.virtual('formattedAmount').get(function () {
  return `${this.currency} ${(this.amount / 100).toFixed(2)}`;
});

// Virtual for is_refundable
TransactionSchema.virtual('isRefundable').get(function () {
  return ['completed', 'partially_refunded'].includes(this.status);
});

// Virtual for is_disputable
TransactionSchema.virtual('isDisputable').get(function () {
  const daysSince = moment().diff(moment(this.createdAt), 'days');
  return daysSince <= 120 && ['completed', 'refunded'].includes(this.status);
});

// Virtual for remaining_refundable_amount
TransactionSchema.virtual('remainingRefundableAmount').get(function () {
  return this.amount - (this.refundAmount || 0);
});

// Instance Methods

/**
 * Mark transaction as processed
 */
TransactionSchema.methods.markAsProcessed = function (gatewayTxnId, reference) {
  this.status = 'completed';
  this.processedAt = new Date();
  this.gatewayTransactionId = gatewayTxnId;
  this.gatewayReference = reference;
  this.reconciliationStatus = 'pending';
  return this.save();
};

/**
 * Mark transaction as failed
 */
TransactionSchema.methods.markAsFailed = function (reason) {
  this.status = 'failed';
  this.notes = (this.notes || '') + `\nFailed: ${reason}`;
  return this.save();
};

/**
 * Initiate refund
 */
TransactionSchema.methods.initiateRefund = function (amount, reason) {
  if (amount > this.remainingRefundableAmount) {
    throw new Error('Refund amount exceeds remaining balance');
  }
  this.refundStatus = 'pending';
  this.refundAmount = (this.refundAmount || 0) + amount;
  this.refundReason = reason;
  return this.save();
};

/**
 * Complete refund
 */
TransactionSchema.methods.completeRefund = function () {
  this.refundStatus = 'completed';
  if (this.refundAmount === this.amount) {
    this.status = 'refunded';
  } else if (this.refundAmount > 0) {
    this.status = 'partially_refunded';
  }
  return this.save();
};

/**
 * Flag for dispute
 */
TransactionSchema.methods.flagForDispute = function (reason) {
  if (!this.isDisputable) {
    throw new Error('Transaction cannot be disputed');
  }
  this.status = 'disputed';
  this.notes = (this.notes || '') + `\nDispute: ${reason}`;
  return this.save();
};

/**
 * Reconcile transaction
 */
TransactionSchema.methods.reconcile = function (statement, notes = '') {
  this.reconciliationStatus = 'verified';
  this.reconciliationDate = new Date();
  this.reconciliationNotes = notes;
  return this.save();
};

// Static Methods

/**
 * Get transactions by date range
 */
TransactionSchema.statics.findByDateRange = function (startDate, endDate, options = {}) {
  const query = {
    createdAt: { $gte: startDate, $lte: endDate },
    deletedAt: null,
  };

  if (options.customerId) query.customerId = options.customerId;
  if (options.type) query.type = options.type;
  if (options.status) query.status = options.status;

  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Get pending reconciliation
 */
TransactionSchema.statics.getPendingReconciliation = function () {
  return this.find({
    reconciliationStatus: 'pending',
    status: 'completed',
    deletedAt: null,
  }).sort({ createdAt: 1 });
};

/**
 * Get failed transactions
 */
TransactionSchema.statics.getFailedTransactions = function (days = 7) {
  const sinceDate = moment().subtract(days, 'days').toDate();
  return this.find({
    status: 'failed',
    createdAt: { $gte: sinceDate },
    deletedAt: null,
  });
};

/**
 * Calculate total revenue
 */
TransactionSchema.statics.calculateRevenue = function (query = {}) {
  return this.aggregate([
    { $match: { ...query, type: 'payment', status: 'completed', deletedAt: null } },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        totalFees: { $sum: '$totalFees' },
        netRevenue: { $sum: '$netAmount' },
        transactionCount: { $sum: 1 },
        averageTransaction: { $avg: '$amount' },
      },
    },
  ]);
};

module.exports = mongoose.model('Transaction', TransactionSchema);
