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

insuranceClaimSchema.pre('save', async function (next) {
  if (!this.claim_number) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      claim_number: new RegExp(`^CLM-${year}-`),
    });
    this.claim_number = `CLM-${year}-${String(count + 1).padStart(6, '0')}`;
  }
  if (this.items && this.items.length > 0) {
    this.total_claimed = this.items.reduce((s, i) => s + (i.claimed_amount || 0), 0);
    this.total_approved = this.items.reduce((s, i) => s + (i.approved_amount || 0), 0);
    this.total_rejected = this.total_claimed - this.total_approved;
  }
  next();
});

insuranceClaimSchema.index({ claim_number: 1 });
insuranceClaimSchema.index({ beneficiary_id: 1 });
insuranceClaimSchema.index({ branch_id: 1, status: 1 });
insuranceClaimSchema.index({ insurance_company_id: 1 });
insuranceClaimSchema.index({ deleted_at: 1 });

module.exports = mongoose.model('InsuranceClaim', insuranceClaimSchema);
