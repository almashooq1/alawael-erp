/**
 * Account Reconciliation Model - تسوية الحسابات العامة
 * General ledger account reconciliation & intercompany matching
 */
const mongoose = require('mongoose');

const matchedPairSchema = new mongoose.Schema({
  debitTransactionId: { type: mongoose.Schema.Types.ObjectId },
  creditTransactionId: { type: mongoose.Schema.Types.ObjectId },
  amount: { type: Number, required: true },
  matchedAt: { type: Date, default: Date.now },
  matchedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  matchType: { type: String, enum: ['manual', 'auto', 'partial'], default: 'manual' },
});

const accountReconciliationSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    accountName: { type: String },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    openingBalance: { type: Number, default: 0 },
    closingBalance: { type: Number, default: 0 },
    reconciledBalance: { type: Number, default: 0 },
    unreconciledBalance: { type: Number, default: 0 },
    totalDebits: { type: Number, default: 0 },
    totalCredits: { type: Number, default: 0 },
    matchedPairs: [matchedPairSchema],
    unmatchedItems: [{ type: mongoose.Schema.Types.ObjectId }],
    status: {
      type: String,
      enum: ['draft', 'in_progress', 'completed', 'reviewed'],
      default: 'draft',
    },
    reconciledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reconciledAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

accountReconciliationSchema.index({ organization: 1, accountId: 1, periodStart: 1 });
accountReconciliationSchema.index({ status: 1 });

const intercompanyTransactionSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    sourceBranch: { type: String, required: true },
    targetBranch: { type: String, required: true },
    transactionRef: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'SAR' },
    description: { type: String },
    sourceJournalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
    targetJournalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
    matchedWith: { type: mongoose.Schema.Types.ObjectId, ref: 'IntercompanyTransaction' },
    status: {
      type: String,
      enum: ['unmatched', 'matched', 'disputed', 'adjusted'],
      default: 'unmatched',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

intercompanyTransactionSchema.index({ organization: 1, sourceBranch: 1, targetBranch: 1 });
intercompanyTransactionSchema.index({ status: 1 });

const AccountReconciliation = mongoose.models.AccountReconciliation || mongoose.model('AccountReconciliation', accountReconciliationSchema);
const IntercompanyTransaction = mongoose.model(
  'IntercompanyTransaction',
  intercompanyTransactionSchema
);

module.exports = { AccountReconciliation, IntercompanyTransaction };
