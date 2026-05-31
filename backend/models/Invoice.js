const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true }, // INV-2024-0001
    beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    // W651 — branch tenancy denormalization (R4). Derived from the (required)
    // beneficiary in the pre-save hook below. Additive; backfill via
    // `npm run backfill:invoice-branchid`.
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    issuer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Employee who created it

    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date },

    items: [
      {
        description: String,
        quantity: { type: Number, default: 1 },
        unitPrice: Number,
        total: Number,
        serviceRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' }, // Optional link to service catalog
      },
    ],

    subTotal: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    // Insurance
    insurance: {
      provider: { type: mongoose.Schema.Types.ObjectId, ref: 'InsuranceProvider' },
      claimNumber: String,
      coverageAmount: { type: Number, default: 0 },
      patientShare: { type: Number, default: 0 },
      status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    },

    status: {
      type: String,
      enum: ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'OVERDUE'],
      default: 'DRAFT',
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'CARD', 'TRANSFER', 'INSURANCE'],
      default: 'CASH',
    },

    notes: String,

    // ─── ZATCA Phase-2 e-invoicing envelope ─────────────────────────────
    zatca: {
      uuid: String, // v4 UUID per invoice
      icv: Number, // Invoice Counter Value (monotonic)
      pih: String, // Previous Invoice Hash (base64 SHA-256)
      invoiceHash: String, // canonical hash of this invoice
      qrCode: String, // base64 TLV QR payload
      invoiceType: {
        type: String,
        enum: ['STANDARD', 'SIMPLIFIED'],
        default: 'SIMPLIFIED',
      },
      sellerName: String,
      sellerVatNumber: String,
      buyerName: String,
      buyerVatNumber: String,
      submittedToZatcaAt: Date,
      zatcaStatus: {
        type: String,
        enum: ['NOT_SUBMITTED', 'SUBMITTED', 'ACCEPTED', 'REJECTED'],
        default: 'NOT_SUBMITTED',
      },
      zatcaReference: String,
      zatcaErrors: [String],
    },
  },
  { timestamps: true }
);

// Auto-calc insurance patientShare before save.
// Mongoose 9 no longer passes `next` to document hooks — sync work just
// returns and the chain continues.
invoiceSchema.pre('save', function () {
  if (this.insurance && this.insurance.coverageAmount > 0) {
    this.insurance.patientShare = this.totalAmount - this.insurance.coverageAmount;
  } else if (this.insurance) {
    this.insurance.patientShare = this.totalAmount;
  }
});

// Post-save: fire-and-forget submission to ZATCA Phase 2 when:
//   • ZATCA_AUTOSUBMIT=true (env feature flag, default OFF)
//   • The invoice is newly issued and not already ACCEPTED
//
// The hook is intentionally fire-and-forget: invoice creation latency
// stays low, and the bridge writes results back via Invoice.updateOne()
// (NOT save()) so we don't recurse into this hook. Failures are logged
// but never thrown — see services/invoiceZatcaHook.js for the contract.
invoiceSchema.post('save', function (doc) {
  try {
    const status = doc?.zatca?.zatcaStatus;
    if (status === 'ACCEPTED' || status === 'SUBMITTED') return;
    if (String(process.env.ZATCA_AUTOSUBMIT || '').toLowerCase() !== 'true') return;

    const { submitInvoiceToZatca } = require('../services/invoiceZatcaHook');
    setImmediate(() => {
      submitInvoiceToZatca(doc).catch(err => {
        // submitInvoiceToZatca already logs internally; this catch is
        // defense-in-depth so an unhandled rejection cannot escape.
        require('../utils/logger').error('[invoice.post-save] zatca submit threw unexpectedly', {
          error: err && err.message,
        });
      });
    });
  } catch (err) {
    // Synchronous failure here would mean a bad require/wiring — log it
    // and move on. We never want to break Invoice persistence.
    require('../utils/logger').error('[invoice.post-save] hook setup failed', {
      error: err && err.message,
    });
  }
});

// ─── Compound Indexes ────────────────────────────────────────────────────────
// Beneficiary invoices filtered by status (most common query pattern)
invoiceSchema.index({ beneficiary: 1, status: 1 });
// W651 — branch-scoped finance stats (R4)
invoiceSchema.index({ branchId: 1, status: 1 });
// W651 — denormalize branchId from the (required) beneficiary. async style.
invoiceSchema.pre('save', async function deriveBranchFromBeneficiary() {
  if (this.branchId || !this.beneficiary) return;
  try {
    const Beneficiary = mongoose.model('Beneficiary');
    const ben = await Beneficiary.findById(this.beneficiary).select('branchId').lean();
    if (ben && ben.branchId) this.branchId = ben.branchId;
  } catch {
    /* model unavailable — leave unset (safe) */
  }
});
// Dashboard: list invoices by status sorted by date
invoiceSchema.index({ status: 1, issueDate: -1 });
// Overdue invoice detection batch job
invoiceSchema.index({ status: 1, dueDate: 1 });
// Insurance claim tracking
invoiceSchema.index({ 'insurance.status': 1, 'insurance.provider': 1 });

// Auto-issue a UniversalCode (`RH-INV-XXXXXX`) for every invoice —
// for AR/customer-facing lookup. Does NOT replace the ZATCA TLV QR
// (`qrCode` field above) which is mandated by Saudi e-invoicing and
// carries a tax-specific encoded payload.
try {
  const universalCodePlugin = require('../services/universalCode/plugin');
  invoiceSchema.plugin(universalCodePlugin, {
    entityType: 'INV',
    labelFrom: doc => doc.invoiceNumber || doc.number || null,
  });
} catch (_e) {
  /* loaded before services exist — skip silently */
}

module.exports = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
