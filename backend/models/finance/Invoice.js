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

invoiceSchema.pre('save', async function (next) {
  if (!this.invoice_number) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      invoice_number: new RegExp(`^INV-${year}-`),
    });
    this.invoice_number = `INV-${year}-${String(count + 1).padStart(7, '0')}`;
    this.invoice_counter = count + 1;
  }
  if (!this.uuid) {
    this.uuid = crypto.randomUUID();
  }
  // حساب الإجماليات
  if (this.lines && this.lines.length > 0) {
    let subtotal = 0,
      discountTotal = 0,
      vatTotal = 0;
    this.lines.forEach(line => {
      const lineTotal = line.quantity * line.unit_price;
      const discountAmt = line.discount_amount || lineTotal * (line.discount_percentage / 100 || 0);
      const taxable = lineTotal - discountAmt;
      const vat = taxable * (line.vat_rate / 100);
      line.taxable_amount = taxable;
      line.vat_amount = Math.round(vat * 100) / 100;
      line.total_amount = Math.round((taxable + vat) * 100) / 100;
      line.discount_amount = Math.round(discountAmt * 100) / 100;
      subtotal += lineTotal;
      discountTotal += discountAmt;
      vatTotal += vat;
    });
    this.subtotal = Math.round(subtotal * 100) / 100;
    this.discount_total = Math.round(discountTotal * 100) / 100;
    this.taxable_amount = Math.round((subtotal - discountTotal) * 100) / 100;
    this.vat_amount = Math.round(vatTotal * 100) / 100;
    this.total_amount = Math.round((this.taxable_amount + this.vat_amount) * 100) / 100;
    this.balance_due = Math.round((this.total_amount - this.paid_amount) * 100) / 100;
  }
  next();
});

invoiceSchema.index({ invoice_number: 1 });
invoiceSchema.index({ uuid: 1 });
invoiceSchema.index({ beneficiary_id: 1 });
invoiceSchema.index({ branch_id: 1, invoice_date: -1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ zatca_status: 1 });
invoiceSchema.index({ deleted_at: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
