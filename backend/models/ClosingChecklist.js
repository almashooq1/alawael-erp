/**
 * Closing Checklist Model - قائمة إقفال الفترة المالية
 * Financial period closing workflow & year-end close
 */
const mongoose = require('mongoose');

const closingTaskSchema = new mongoose.Schema({
  taskName: { type: String, required: true },
  taskNameEn: { type: String },
  description: { type: String },
  category: {
    type: String,
    enum: [
      'journal_entries',
      'reconciliation',
      'depreciation',
      'accruals',
      'provisions',
      'intercompany',
      'tax',
      'audit',
      'other',
    ],
    default: 'other',
  },
  isRequired: { type: Boolean, default: true },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'skipped', 'blocked'],
    default: 'pending',
  },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedAt: { type: Date },
  notes: { type: String },
  blockedReason: { type: String },
  order: { type: Number, default: 0 },
});

const closingChecklistSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    fiscalPeriodId: { type: mongoose.Schema.Types.ObjectId, ref: 'FiscalPeriod', required: true },
    periodType: {
      type: String,
      enum: ['monthly', 'quarterly', 'annual'],
      default: 'monthly',
    },
    periodLabel: { type: String, required: true },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'pending_review', 'completed', 'reopened'],
      default: 'not_started',
    },
    lockStatus: {
      type: String,
      enum: ['open', 'soft_locked', 'hard_locked', 'closed'],
      default: 'open',
    },
    tasks: [closingTaskSchema],
    closingJournalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
    retainedEarningsTransferred: { type: Boolean, default: false },
    retainedEarningsAmount: { type: Number, default: 0 },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    closedAt: { type: Date },
    reopenedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reopenedAt: { type: Date },
    reopenReason: { type: String },
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

closingChecklistSchema.index({ organization: 1, fiscalPeriodId: 1 }, { unique: true });
closingChecklistSchema.index({ status: 1, lockStatus: 1 });

module.exports = mongoose.model('ClosingChecklist', closingChecklistSchema);
