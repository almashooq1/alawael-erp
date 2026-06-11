/**
 * SmartInsuranceClaim Model — System 40: Smart Insurance
 * مطالبات التأمين (policy-based) عبر NPHIES
 *
 * W1210 — the System-40 family (InsurancePolicy / InsuranceCompany /
 * PriorAuthorization / InsuranceEligibilityCheck) shipped WITHOUT its claims
 * model: smartInsurance.service bound `models/InsuranceClaim.js`, which is a
 * re-export shim onto the CONTRACT-based `insuranceClaim.model.js` (REQUIRED
 * beneficiary/contract/visitDate/totalGross/totalNet) — a different billing
 * pipeline — so `submitClaim()` threw ValidationError on every call since
 * the system shipped. Per the W337 precedent (close the phantom by BUILDING
 * the canonical sibling) and ADR-021 Pattern D (distinct registered name —
 * three other InsuranceClaim files already exist), this model carries the
 * policy-based vocabulary the service + smart-insurance routes have always
 * spoken. Schema = exact union of every field the service/routes read or
 * write (verified against submitClaim / NPHIES status updates / adjudicate /
 * getStats / getRejectionAnalytics / list filters).
 */
const mongoose = require('mongoose');

const smartInsuranceClaimSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    claimNumber: { type: String, unique: true, required: true },
    // W1193 lesson applied at birth: required identifiers carry defaults so
    // no caller can ever hit a required-with-no-default ValidationError.
    claimUuid: {
      type: String,
      unique: true,
      required: true,
      default: () => require('crypto').randomUUID(),
    },

    policyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InsurancePolicy',
      required: true,
      index: true,
    },
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    insuranceCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: 'InsuranceCompany' },
    serviceSessionId: { type: mongoose.Schema.Types.ObjectId },
    priorAuthId: { type: mongoose.Schema.Types.ObjectId, ref: 'PriorAuthorization' },

    claimType: {
      type: String,
      enum: ['professional', 'institutional', 'pharmacy', 'oral_health', 'vision'],
      default: 'professional',
    },
    serviceDate: { type: Date },

    // المبالغ — integer-halalas siblings dual-written in pre('save') (audit #5)
    billedAmount: { type: Number, required: true, min: 0 },
    billedAmount_halalas: { type: Number, default: 0 },
    approvedAmount: { type: Number, default: null },
    approvedAmount_halalas: { type: Number, default: 0 },
    patientShare: { type: Number, default: 0 },
    insuranceShare: { type: Number, default: 0 },

    diagnosisCodes: { type: [String], default: [] }, // ICD-10
    procedureCodes: { type: [String], default: [] }, // CPT / HCPCS
    // Line items arrive in payer-specific shapes from the UI/NPHIES — kept
    // Mixed deliberately so strict mode can't silently drop variant keys.
    lineItems: { type: [mongoose.Schema.Types.Mixed], default: [] },

    status: {
      type: String,
      enum: [
        'draft',
        'pending',
        'submitted',
        'accepted',
        'approved',
        'partially_approved',
        'denied',
        'rejected',
        'paid',
        'cancelled',
      ],
      default: 'draft',
      index: true,
    },
    submittedAt: { type: Date },
    submissionError: { type: String, default: null },

    // NPHIES
    nphiesClaimId: { type: String, index: true },
    nphiesResponse: { type: mongoose.Schema.Types.Mixed },

    // التسوية (adjudication)
    adjudicatedAt: { type: Date },
    rejectionReason: { type: String, default: null },
    rejectionCode: { type: String, default: null },
    adjudication: {
      processDate: Date,
      denialReasons: [
        {
          code: String,
          reason: { ar: String, en: String },
        },
      ],
    },

    notes: { type: String },

    // Soft delete (family pattern)
    deletedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'smart_insurance_claims',
  }
);

smartInsuranceClaimSchema.index({ branchId: 1, status: 1 });
smartInsuranceClaimSchema.index({ policyId: 1, status: 1 });
smartInsuranceClaimSchema.index({ beneficiaryId: 1, createdAt: -1 });
smartInsuranceClaimSchema.index({ status: 1, submittedAt: -1 });
smartInsuranceClaimSchema.index({ deletedAt: 1 });

// W978-canonical async hook (no `next`): dual-write halalas siblings +
// self-heal the submitted-requires-timestamp invariant.
smartInsuranceClaimSchema.pre('save', async function () {
  require('../intelligence/money.lib').deriveHalalas(this, ['billedAmount', 'approvedAmount']);
  if (this.status === 'submitted' && !this.submittedAt) {
    this.submittedAt = new Date();
  }
});

module.exports =
  mongoose.models.SmartInsuranceClaim ||
  mongoose.model('SmartInsuranceClaim', smartInsuranceClaimSchema);
