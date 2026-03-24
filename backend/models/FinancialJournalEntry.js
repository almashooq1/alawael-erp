/* eslint-disable no-unused-vars, no-undef, no-empty, prefer-const, no-constant-condition, no-unused-expressions */
/**

 * FinancialJournalEntry Model




 */

const mongoose = require('mongoose');

const journalEntrySchema = new mongoose.Schema(
  {
    // 8& 778~77 77778y7

    entryNumber: {
      type: String,

      required: true,

      unique: true,

      index: true,
    },

    // 78y78  77 78 8 8y7

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

    // 78 78778   - 8y77 78   8y888   78 78y8   = 78 7778& 78

    balanced: {
      type: Boolean,

      default: false,
    },

    // 78~778y8  78 7777

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

    // 878~ 78 8& 778& 8 7

    description: {
      type: String,
      required: true,
    },

    // 78 7778y7

    date: {
      type: Date,

      required: true,

      default: Date.now,

      index: true,
    },

    // 78 8~777 78 8& 77778y7

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

    // 78 8& 7778y7 878 87778

    attachments: {
      type: [mongoose.Schema.Types.ObjectId],

      default: [],

      ref: 'Attachment',
    },

    // 78y78  77 78 8& 77778&

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,

      required: true,

      ref: 'User',
    },

    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,

      ref: 'User',
    },

    // 78 78y78  77 78 7778~8y7

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

    // 7777 78 778y8y777

    status: {
      type: String,

      enum: ['draft', 'pending', 'approved', 'rejected', 'archived'],

      default: 'draft',
    },

    // 8& 78 88& 77 78 778 8y8

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

// date: removed — index:true creates implicit index

journalEntrySchema.index({ 'account.accountCode': 1 });

journalEntrySchema.index({ period: 1 });

journalEntrySchema.index({ createdBy: 1 });

journalEntrySchema.index({ status: 1 });

journalEntrySchema.index({ 'period.year': 1, 'period.month': 1 });

// ===== VIRTUALS =====

journalEntrySchema.virtual('amount').get(function () {
  return Math.max(this.debit, this.credit);
});

journalEntrySchema.virtual('isBalanced').get(function () {});

// ===== HOOKS =====

journalEntrySchema.pre('save', async function () {
  // 78 778 8  8& 8   78 78778

  this.balanced = this.isBalanced;

  // 78 778 8  8& 8   78   78 78y8   878 7778& 78   8 7 8y888  78

  if (this.debit === 0 && this.credit === 0) {
  }

  // 8y77 78   8y888   78 78y8   78 78 7778& 78   8~8 7 (8 8y7

  if (this.debit > 0 && this.credit > 0) {
  }

  next();
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
  mongoose.model('FinancialJournalEntry', journalEntrySchema);
