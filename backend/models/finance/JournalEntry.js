const mongoose = require('mongoose');

const journalEntryLineSchema = new mongoose.Schema({
  account_code: { type: String, required: true },
  account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ChartOfAccount' },
  description: { type: String },
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  cost_center: { type: String },
});

const journalEntrySchema = new mongoose.Schema(
  {
    entry_number: { type: String, unique: true },
    entry_date: { type: Date, required: true, default: Date.now },
    entry_type: {
      type: String,
      enum: ['manual', 'invoice', 'payment', 'payroll', 'eos', 'adjustment', 'opening', 'closing'],
      default: 'manual',
    },
    description_ar: { type: String, required: true },
    description_en: { type: String },
    reference_type: { type: String }, // Invoice, PayrollRecord, etc.
    reference_id: { type: mongoose.Schema.Types.ObjectId },
    reference_number: { type: String },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    lines: [journalEntryLineSchema],
    total_debit: { type: Number, default: 0 },
    total_credit: { type: Number, default: 0 },
    is_balanced: { type: Boolean, default: false },
    status: { type: String, enum: ['draft', 'posted', 'reversed'], default: 'draft' },
    posted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    posted_at: { type: Date },
    reversed_entry_id: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
    notes: { type: String },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

journalEntrySchema.pre('save', async function (next) {
  if (!this.entry_number) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      entry_number: new RegExp(`^JE-${year}-`),
    });
    this.entry_number = `JE-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  if (this.lines && this.lines.length > 0) {
    this.total_debit = this.lines.reduce((s, l) => s + (l.debit || 0), 0);
    this.total_credit = this.lines.reduce((s, l) => s + (l.credit || 0), 0);
    this.is_balanced = Math.abs(this.total_debit - this.total_credit) < 0.01;
  }
  next();
});

journalEntrySchema.index({ entry_number: 1 });
journalEntrySchema.index({ entry_date: -1 });
journalEntrySchema.index({ branch_id: 1 });
journalEntrySchema.index({ status: 1 });
journalEntrySchema.index({ reference_type: 1, reference_id: 1 });
journalEntrySchema.index({ deleted_at: 1 });

module.exports = mongoose.model('JournalEntry', journalEntrySchema);
