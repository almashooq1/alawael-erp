const mongoose = require('mongoose');

const claimItemSchema = new mongoose.Schema({
  service_code: { type: String },
  description_ar: { type: String },
  quantity: { type: Number, default: 1 },
  unit_price: { type: Number },
  claimed_amount: { type: Number },
  approved_amount: { type: Number, default: 0 },
  rejection_reason: { type: String },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'partial'],
    default: 'pending',
  },
});

const insuranceClaimSchema = new mongoose.Schema(
  {
    claim_number: { type: String, unique: true },
    beneficiary_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    insurance_company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InsuranceCompany',
      required: true,
    },
    policy_number: { type: String },
    member_id: { type: String }, // رقم العضوية في التأمين
    invoice_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    service_date: { type: Date },
    submission_date: { type: Date },
    claim_type: {
      type: String,
      enum: ['outpatient', 'inpatient', 'therapy', 'assessment', 'equipment'],
      default: 'therapy',
    },
    items: [claimItemSchema],
    total_claimed: { type: Number, default: 0 },
    total_approved: { type: Number, default: 0 },
    total_rejected: { type: Number, default: 0 },
    patient_share: { type: Number, default: 0 },
    // integer-halalas siblings (audit #5 EXPAND) — dual-written in pre('save')
    total_claimed_halalas: { type: Number, default: 0 },
    total_approved_halalas: { type: Number, default: 0 },
    total_rejected_halalas: { type: Number, default: 0 },
    patient_share_halalas: { type: Number, default: 0 },
    // الموافقة المسبقة
    prior_auth_number: { type: String },
    prior_auth_date: { type: Date },
    prior_auth_expiry: { type: Date },
    prior_auth_status: {
      type: String,
      enum: ['not_required', 'pending', 'approved', 'rejected'],
      default: 'not_required',
    },
    // الحالة
    status: {
      type: String,
      enum: [
        'draft',
        'submitted',
        'under_review',
        'approved',
        'partially_approved',
        'rejected',
        'paid',
        'appealed',
      ],
      default: 'draft',
    },
    rejection_reason: { type: String },
    payment_reference: { type: String },
    payment_date: { type: Date },
    // NPHIES (بوابة الفوترة الصحية)
    nphies_claim_id: { type: String },
    nphies_status: { type: String },
    nphies_response: { type: Object },
    submitted_at: { type: Date },
    notes: { type: String },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

insuranceClaimSchema.pre('save', async function () {
  if (!this.claim_number) {
    // W1463: atomic year-scoped sequence (was countDocuments()+1 → race → dup CLM / E11000)
    const year = new Date().getFullYear();
    const seq = await require('../../database/utils/counter').nextSequence('insurance_claim');
    this.claim_number = `CLM-${year}-${String(seq).padStart(6, '0')}`;
  }
  // W1451: derive header totals from items ONLY when items change, so an explicitly
  // set total (e.g. a lump-sum insurer remittance via processClaimResponse, with no
  // per-item approved_amount) is not silently overwritten. total_rejected is always
  // the difference of the two header totals.
  require('../../intelligence/insurance-claim-money.lib').reconcileClaimTotals(
    this,
    this.isNew || this.isModified('items')
  );
  // Money-Type Migration (audit #5) — dual-write integer-halalas siblings.
  require('../../intelligence/money.lib').deriveHalalas(this, [
    'total_claimed',
    'total_approved',
    'total_rejected',
    'patient_share',
  ]);
});

// REMOVED DUPLICATE: insuranceClaimSchema.index({ claim_number: 1 }); — field already has index:true
insuranceClaimSchema.index({ beneficiary_id: 1 });
insuranceClaimSchema.index({ branch_id: 1, status: 1 });
insuranceClaimSchema.index({ insurance_company_id: 1 });
insuranceClaimSchema.index({ deleted_at: 1 });

// Registered as `FinanceInsuranceClaim` (not `InsuranceClaim`) so it
// doesn't collide with models/insuranceClaim.model.js (the canonical
// 400-line schema). The default export still resolves to a usable model
// for any existing consumer.
module.exports =
  mongoose.models.FinanceInsuranceClaim ||
  mongoose.model('FinanceInsuranceClaim', insuranceClaimSchema);
