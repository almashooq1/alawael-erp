/**
 * FinancialJournalEntry Model
 * نموذج قيود اليومية المالية
 */

const mongoose = require('mongoose');

const journalEntrySchema = new mongoose.Schema(
  {
    entryNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    debit: {
      type: Number,
      required: true,
      min: 0,
    },
    credit: {
      type: Number,
      required: true,
      min: 0,
    },
    balanced: {
      type: Boolean,
      default: false,
    },
    account: {
      accountCode: {
        type: String,
        required: true,
      },
      accountName: {
        type: String,
        required: true,
      },
      accountType: {
        type: String,
        enum: ['asset', 'liability', 'equity', 'revenue', 'expense'],
        required: true,
      },
    },
    description: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    period: {
      month: {
        type: Number,
        min: 1,
        max: 12,
        required: true,
      },
      year: {
        type: Number,
        required: true,
      },
    },
    attachments: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
      ref: 'Attachment',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reference: {
      type: String,
    },
    notes: {
      type: String,
    },
    isApproved: {
      type: Boolean,
      default: false,
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvalDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected', 'archived'],
      default: 'draft',
    },
    auditLog: {
      type: [
        {
          action: String,
          user: mongoose.Schema.Types.ObjectId,
          timestamp: { type: Date, default: Date.now },
          details: String,
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'financial_journal_entries',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ===== INDEXES =====
journalEntrySchema.index({ 'account.accountCode': 1 });
journalEntrySchema.index({ period: 1 });
journalEntrySchema.index({ createdBy: 1 });
journalEntrySchema.index({ status: 1 });
journalEntrySchema.index({ 'period.year': 1, 'period.month': 1 });

// ===== VIRTUALS =====
journalEntrySchema.virtual('amount').get(function () {
  return Math.max(this.debit, this.credit);
});

journalEntrySchema.virtual('isBalanced').get(function () {
  return this.debit === this.credit;
});

// ===== HOOKS =====
journalEntrySchema.pre('save', function () {
  this.balanced = this.debit === this.credit;
});

// ===== METHODS =====
journalEntrySchema.methods.approve = async function (userId) {
  this.isApproved = true;
  this.approvedBy = userId;
  this.approvalDate = new Date();
  this.status = 'approved';
  this.auditLog.push({
    action: 'approved',
    user: userId,
    timestamp: new Date(),
  });
  return this.save();
};

journalEntrySchema.methods.reject = async function (userId, reason) {
  this.status = 'rejected';
  this.auditLog.push({
    action: 'rejected',
    user: userId,
    timestamp: new Date(),
    details: reason,
  });
  return this.save();
};

journalEntrySchema.methods.archive = async function (userId) {
  this.status = 'archived';
  this.auditLog.push({
    action: 'archived',
    user: userId,
    timestamp: new Date(),
  });
  return this.save();
};

// ===== STATICS =====
journalEntrySchema.statics.getByPeriod = function (year, month) {
  return this.find({
    'period.year': year,
    'period.month': month,
    status: { $ne: 'archived' },
  }).sort({ date: -1 });
};

journalEntrySchema.statics.getByAccount = function (accountCode, year, month) {
  return this.find({
    'account.accountCode': accountCode,
    'period.year': year,
    'period.month': month,
    status: { $ne: 'archived' },
  }).sort({ date: -1 });
};

journalEntrySchema.statics.getTrialBalance = async function (year, month) {
  const entries = await this.find({
    'period.year': year,
    'period.month': month,
    isApproved: true,
  });

  const balances = {};
  entries.forEach(entry => {
    const code = entry.account.accountCode;
    if (!balances[code]) {
      balances[code] = { debit: 0, credit: 0, name: entry.account.accountName };
    }
    balances[code].debit += entry.debit;
    balances[code].credit += entry.credit;
  });

  return balances;
};

// ===== VALIDATION =====
journalEntrySchema.path('debit').validate(function (value) {
  return value >= 0;
});

journalEntrySchema.path('credit').validate(function (value) {
  return value >= 0;
});

module.exports =
  mongoose.models.FinancialJournalEntry ||
  mongoose.models.FinancialJournalEntry ||
  mongoose.models.FinancialJournalEntry ||
  mongoose.model('FinancialJournalEntry', journalEntrySchema);
