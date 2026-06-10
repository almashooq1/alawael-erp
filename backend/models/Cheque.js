/**
 * Cheque Model - نموذج الشيكات
 * إدارة الشيكات الصادرة والواردة
 */
const mongoose = require('mongoose');

const chequeSchema = new mongoose.Schema(
  {
    chequeNumber: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['issued', 'received'],
      required: true,
    },
    bankName: {
      type: String,
      required: true,
      trim: true,
    },
    bankBranch: {
      type: String,
      trim: true,
    },
    accountNumber: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    // integer-halalas sibling (audit #5 EXPAND) — dual-written in pre('save')
    amount_halalas: { type: Number, default: 0 },
    currency: {
      type: String,
      default: 'SAR',
    },
    issueDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    payee: {
      type: String,
      required: true,
      trim: true,
    },
    drawer: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'deposited', 'cleared', 'bounced', 'cancelled', 'expired', 'on_hold'],
      default: 'pending',
    },
    depositDate: Date,
    clearDate: Date,
    bounceDate: Date,
    bounceReason: String,
    relatedInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    relatedExpense: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expense',
    },
    attachments: [
      {
        filename: String,
        path: String,
        uploadDate: { type: Date, default: Date.now },
      },
    ],
    notes: String,
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // W269 — denormalized from relatedInvoice for cross-branch isolation. Nullable:
    // standalone / expense-only cheques have no branch anchor → treated as org-level.
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
  },
  {
    timestamps: true,
  }
);

// Money-Type Migration (audit #5) — dual-write integer-halalas siblings.
chequeSchema.pre('save', async function () {
  require('../intelligence/money.lib').deriveHalalas(this, ['amount']);
});

// W269 — derive branchId from the related invoice (best-effort; cheques without an
// invoice link stay null = org-level). pre('validate') so it runs on every save.
chequeSchema.pre('validate', async function () {
  if (this.branchId || !this.relatedInvoice) return;
  try {
    const Invoice = mongoose.model('Invoice');
    const inv = await Invoice.findById(this.relatedInvoice).select('branchId').lean();
    if (inv && inv.branchId) this.branchId = inv.branchId;
  } catch (_e) {
    /* best-effort — never block a save on the derivation */
  }
});

chequeSchema.index({ branchId: 1, status: 1 });
chequeSchema.index({ chequeNumber: 1, bankName: 1 });
chequeSchema.index({ status: 1, dueDate: 1 });
chequeSchema.index({ type: 1, status: 1 });
chequeSchema.index({ organization: 1 });

module.exports = mongoose.models.Cheque || mongoose.model('Cheque', chequeSchema);
