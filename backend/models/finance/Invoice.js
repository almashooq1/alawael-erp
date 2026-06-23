const mongoose = require('mongoose');
const crypto = require('crypto');

const invoiceLineSchema = new mongoose.Schema({
  service_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  description_ar: { type: String, required: true },
  description_en: { type: String },
  quantity: { type: Number, default: 1 },
  unit_price: { type: Number, required: true },
  discount_amount: { type: Number, default: 0 },
  discount_percentage: { type: Number, default: 0 },
  taxable_amount: { type: Number, default: 0 },
  vat_rate: { type: Number, default: 15 }, // 15% VAT السعودي
  vat_amount: { type: Number, default: 0 },
  total_amount: { type: Number, default: 0 },
});

const invoiceSchema = new mongoose.Schema(
  {
    invoice_number: { type: String, unique: true }, // INV-YYYY-XXXXXXX
    uuid: { type: String, unique: true }, // ZATCA UUID
    beneficiary_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    invoice_type: {
      type: String,
      enum: ['standard', 'simplified', 'credit_note', 'debit_note'],
      default: 'simplified',
    },
    invoice_subtype: { type: String, enum: ['b2b', 'b2c'], default: 'b2c' },
    invoice_date: { type: Date, required: true, default: Date.now },
    supply_date: { type: Date },
    due_date: { type: Date },
    lines: [invoiceLineSchema],
    subtotal: { type: Number, default: 0 },
    discount_total: { type: Number, default: 0 },
    taxable_amount: { type: Number, default: 0 },
    vat_amount: { type: Number, default: 0 },
    total_amount: { type: Number, default: 0 },
    paid_amount: { type: Number, default: 0 },
    balance_due: { type: Number, default: 0 },
    // ── Money-Type Migration (audit #5) — integer-halalas siblings ──
    // Dual-written from the float fields above by the pre('save') hook (EXPAND
    // step). Reads cut over to these in a later phase; floats remain the source
    // of truth for now. Integer (Math.round) — exact, no IEEE-754 drift.
    subtotal_halalas: { type: Number, default: 0 },
    discount_total_halalas: { type: Number, default: 0 },
    taxable_amount_halalas: { type: Number, default: 0 },
    vat_amount_halalas: { type: Number, default: 0 },
    total_amount_halalas: { type: Number, default: 0 },
    paid_amount_halalas: { type: Number, default: 0 },
    balance_due_halalas: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' },
    payment_method: {
      type: String,
      enum: ['cash', 'card', 'mada', 'apple_pay', 'stc_pay', 'bank_transfer', 'insurance', 'mixed'],
    },
    // ZATCA Phase 2
    zatca_hash: { type: String }, // SHA-256 hash
    zatca_qr: { type: String }, // TLV QR base64
    zatca_xml: { type: String }, // UBL 2.1 XML
    zatca_status: {
      type: String,
      enum: ['pending', 'reported', 'cleared', 'rejected', 'not_applicable'],
      default: 'pending',
    },
    zatca_submission_id: { type: String },
    zatca_submitted_at: { type: Date },
    zatca_response: { type: Object },
    previous_invoice_hash: { type: String }, // للتسلسل
    invoice_counter: { type: Number }, // ICV
    // الفوترة للتأمين
    insurance_company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InsuranceCompany' },
    insurance_claim_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InsuranceClaim' },
    insurance_coverage_amount: { type: Number, default: 0 },
    patient_share_amount: { type: Number, default: 0 },
    // integer-halalas siblings (audit #5 EXPAND) — derived in pre('save')
    insurance_coverage_amount_halalas: { type: Number, default: 0 },
    patient_share_amount_halalas: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled', 'void'],
      default: 'draft',
    },
    notes: { type: String },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

// W933 — pure async hook (the mixed `async function (next){…next()}` style breaks
// under Mongoose 9 → "next is not a function" on every save).
invoiceSchema.pre('save', async function () {
  if (!this.invoice_number) {
    // W1463: atomic year-scoped sequence (was countDocuments()+1 → race → dup INV / E11000).
    // Format + invoice_counter (ICV, year-scoped) preserved exactly.
    const year = new Date().getFullYear();
    const seq = await require('../../database/utils/counter').nextSequence('finance_invoice');
    this.invoice_number = `INV-${year}-${String(seq).padStart(7, '0')}`;
    this.invoice_counter = seq;
  }
  if (!this.uuid) {
    this.uuid = crypto.randomUUID();
  }
  // حساب الإجماليات — W1449: header totals reconcile to the line items (ZATCA);
  // sums the ROUNDED per-line values so header tax/total === Σ line tax/total.
  require('../../intelligence/invoice-money.lib').computeInvoiceTotals(this);
  // Money-Type Migration (audit #5) — dual-write integer-halalas siblings from
  // the float fields just computed. Additive: does not change float behaviour.
  require('../../intelligence/invoice-money.lib').applyInvoiceHalalas(this);
});

// REMOVED DUPLICATE: invoiceSchema.index({ invoice_number: 1 }); — field already has index:true
// REMOVED DUPLICATE: invoiceSchema.index({ uuid: 1 }); — field already has index:true
invoiceSchema.index({ beneficiary_id: 1 });
invoiceSchema.index({ branch_id: 1, invoice_date: -1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ zatca_status: 1 });
invoiceSchema.index({ deleted_at: 1 });

// Registered as `FinanceInvoice` to dodge the collision with the
// canonical models/Invoice.js. Default export unchanged.
module.exports = mongoose.models.FinanceInvoice || mongoose.model('FinanceInvoice', invoiceSchema);
