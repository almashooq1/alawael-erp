/**
 * FinancialTransaction.js - MongoDB Model for Financial Transactions
 * Records all financial transactions including debits and credits
 */

const mongoose = require('mongoose');

const FinancialTransactionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    transactionId: {
      type: String,
      required: true,
      unique: true
    },
    transactionDate: {
      type: Date,
      required: true,
      index: true
    },
    description: {
      type: String,
      required: true
    },
    journalEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry',
      required: true
    },
    // Debit Account
    debitAccount: {
      accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true
      },
      accountCode: String,
      accountName: String,
      amount: {
        type: Number,
        required: true,
        min: 0
      }
    },
    // Credit Account
    creditAccount: {
      accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true
      },
      accountCode: String,
      accountName: String,
      amount: {
        type: Number,
        required: true,
        min: 0
      }
    },
    // Transaction Classification
    transactionType: {
      type: String,
      enum: [
        'invoice',
        'payment',
        'expense',
        'deposit',
        'withdrawal',
        'transfer',
        'adjustment',
        'depreciation',
        'accrual',
        'provision'
      ],
      required: true
    },
    flowType: {
      type: String,
      enum: ['revenue', 'expense', 'investment', 'financing'],
      required: true
    },
    activityType: {
      type: String,
      enum: ['operating', 'investing', 'financing'],
      required: true
    },
    // Related Document
    relatedDocument: {
      documentType: String, // invoice, purchase order, receipt
      documentId: mongoose.Schema.Types.ObjectId,
      documentNumber: String,
      documentDate: Date
    },
    // Parties Involved
    customer: {
      customerId: mongoose.Schema.Types.ObjectId,
      name: String,
      email: String
    },
    vendor: {
      vendorId: mongoose.Schema.Types.ObjectId,
      name: String,
      email: String
    },
    employee: {
      employeeId: mongoose.Schema.Types.ObjectId,
      name: String,
      email: String
    },
    // Payment Details
    paymentMethod: {
      type: String,
      enum: ['cash', 'check', 'credit-card', 'bank-transfer', 'online'],
      default: 'bank-transfer'
    },
    referenceNumber: String,
    checkNumber: String,

    // Tax Information
    taxDetails: {
      taxType: String,
      taxRate: Number,
      taxAmount: Number,
      taxAccount: mongoose.Schema.Types.ObjectId
    },

    // Cost Center/Department
    costCenter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CostCenter'
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },

    // Status and Approval
    status: {
      type: String,
      enum: ['draft', 'posted', 'reconciled', 'voided'],
      default: 'draft'
    },
    isPosted: {
      type: Boolean,
      default: false
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    postedDate: Date,

    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvalNotes: String,

    // Attachments
    attachments: [{
      filename: String,
      fileUrl: String,
      uploadedAt: Date
    }],

    // Reconciliation
    isReconciled: {
      type: Boolean,
      default: false
    },
    reconciliationDate: Date,
    reconciledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    // Notes and Tags
    notes: String,
    tags: [String],

    // Audit Trail
    auditTrail: [{
      action: String,
      performedBy: mongoose.Schema.Types.ObjectId,
      timestamp: {
        type: Date,
        default: Date.now
      },
      details: String
    }],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Indexes
FinancialTransactionSchema.index({ organizationId: 1, transactionDate: -1 });
FinancialTransactionSchema.index({ journalEntryId: 1 });
FinancialTransactionSchema.index({ 'debitAccount.accountId': 1, transactionDate: -1 });
FinancialTransactionSchema.index({ 'creditAccount.accountId': 1, transactionDate: -1 });
FinancialTransactionSchema.index({ status: 1, transactionDate: -1 });
FinancialTransactionSchema.index({ transactionType: 1, transactionDate: -1 });

// Validation: Ensure debit and credit amounts are equal
FinancialTransactionSchema.pre('save', function(next) {
  if (this.debitAccount.amount !== this.creditAccount.amount) {
    return next(new Error('Debit and credit amounts must be equal'));
  }
  next();
});

// Method to post transaction
FinancialTransactionSchema.methods.post = function(userId) {
  this.status = 'posted';
  this.isPosted = true;
  this.postedBy = userId;
  this.postedDate = new Date();

  this.auditTrail.push({
    action: 'posted',
    performedBy: userId,
    timestamp: new Date()
  });

  return this.save();
};

// Method to void transaction
FinancialTransactionSchema.methods.void = function(userId, reason = '') {
  this.status = 'voided';

  this.auditTrail.push({
    action: 'voided',
    performedBy: userId,
    timestamp: new Date(),
    details: reason
  });

  return this.save();
};

// Method to reconcile transaction
FinancialTransactionSchema.methods.reconcile = function(userId) {
  this.isReconciled = true;
  this.reconciliationDate = new Date();
  this.reconciledBy = userId;

  this.auditTrail.push({
    action: 'reconciled',
    performedBy: userId,
    timestamp: new Date()
  });

  return this.save();
};

// Method to add attachment
FinancialTransactionSchema.methods.addAttachment = function(filename, fileUrl) {
  this.attachments.push({
    filename,
    fileUrl,
    uploadedAt: new Date()
  });
  return this.save();
};

// Static method to create journal entry transactions
FinancialTransactionSchema.statics.createFromJournalEntry = function(journalEntry) {
  const transactions = [];

  journalEntry.entries.forEach(entry => {
    transactions.push({
      organizationId: journalEntry.organizationId,
      transactionId: `${journalEntry._id}-${Date.now()}`,
      transactionDate: journalEntry.transactionDate,
      description: journalEntry.description,
      journalEntryId: journalEntry._id,
      debitAccount: entry.debitAccount,
      creditAccount: entry.creditAccount,
      transactionType: journalEntry.transactionType,
      flowType: journalEntry.flowType,
      activityType: journalEntry.activityType,
      status: 'draft',
      createdBy: journalEntry.createdBy
    });
  });

  return this.insertMany(transactions);
};

// Static method to get account transactions
FinancialTransactionSchema.statics.getAccountTransactions = function(organizationId, accountId, from, to) {
  return this.find({
    organizationId,
    $or: [
      { 'debitAccount.accountId': accountId },
      { 'creditAccount.accountId': accountId }
    ],
    transactionDate: { $gte: from, $lte: to },
    isPosted: true
  }).sort({ transactionDate: 1 });
};

module.exports = mongoose.model('FinancialTransaction', FinancialTransactionSchema);
