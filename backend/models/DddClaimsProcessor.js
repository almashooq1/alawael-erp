'use strict';
/**
 * DddClaimsProcessor — Mongoose Models & Constants
 * Auto-extracted from services/dddClaimsProcessor.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const CLAIM_STATUSES = [
  'draft',
  'validated',
  'submitted',
  'acknowledged',
  'in_review',
  'approved',
  'partially_approved',
  'denied',
  'paid',
  'partially_paid',
  'appealed',
  'resubmitted',
  'cancelled',
  'voided',
];

const CLAIM_TYPES = [
  'professional',
  'institutional',
  'pharmacy',
  'dental',
  'vision',
  'rehabilitation',
  'mental_health',
  'assistive_technology',
  'home_health',
  'transport',
];

const DENIAL_REASONS = [
  'not_covered',
  'pre_auth_missing',
  'pre_auth_expired',
  'benefit_exhausted',
  'duplicate_claim',
  'coding_error',
  'untimely_filing',
  'incomplete_documentation',
  'out_of_network',
  'non_medical_necessity',
  'patient_ineligible',
  'coordination_of_benefits',
  'prior_treatment_required',
  'experimental_treatment',
];

const APPEAL_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'denied',
  'escalated',
  'withdrawn',
  'expired',
];

const APPEAL_LEVELS = ['first_level', 'second_level', 'external_review', 'arbitration'];

const SUBMISSION_CHANNELS = ['electronic', 'portal', 'nphies', 'fax', 'mail', 'manual'];

const EOB_TYPES = ['payment', 'denial', 'adjustment', 'reversal'];

const ADJUDICATION_TYPES = [
  'eligible',
  'copay',
  'deductible',
  'coinsurance',
  'non_covered',
  'benefit',
  'tax',
  'adjustment',
];

/* ── Built-in claim templates ───────────────────────────────────────────── */
const BUILTIN_CLAIM_TEMPLATES = [
  {
    code: 'CLM-PT',
    name: 'Physical Therapy Claim',
    nameAr: 'مطالبة علاج طبيعي',
    claimType: 'rehabilitation',
  },
  {
    code: 'CLM-OT',
    name: 'Occupational Therapy Claim',
    nameAr: 'مطالبة علاج وظيفي',
    claimType: 'rehabilitation',
  },
  {
    code: 'CLM-SLP',
    name: 'Speech Therapy Claim',
    nameAr: 'مطالبة نطق ولغة',
    claimType: 'rehabilitation',
  },
  {
    code: 'CLM-PSY',
    name: 'Psychological Services Claim',
    nameAr: 'مطالبة خدمات نفسية',
    claimType: 'mental_health',
  },
  {
    code: 'CLM-ASSESS',
    name: 'Assessment Claim',
    nameAr: 'مطالبة تقييم',
    claimType: 'professional',
  },
  {
    code: 'CLM-TELE',
    name: 'Tele-Rehab Claim',
    nameAr: 'مطالبة تأهيل عن بعد',
    claimType: 'rehabilitation',
  },
  {
    code: 'CLM-DEVICE',
    name: 'Assistive Device Claim',
    nameAr: 'مطالبة أجهزة مساعدة',
    claimType: 'assistive_technology',
  },
  {
    code: 'CLM-HOME',
    name: 'Home Health Claim',
    nameAr: 'مطالبة رعاية منزلية',
    claimType: 'home_health',
  },
  {
    code: 'CLM-GROUP',
    name: 'Group Therapy Claim',
    nameAr: 'مطالبة علاج جماعي',
    claimType: 'rehabilitation',
  },
  {
    code: 'CLM-TRANS',
    name: 'Medical Transport Claim',
    nameAr: 'مطالبة نقل طبي',
    claimType: 'transport',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Claim ─────────────────────────────────────────────────────────────── */

/* ═══════════════════ Schemas ═══════════════════ */

const claimLineSchema = new Schema(
  {
    lineNumber: { type: Number, required: true },
    serviceCode: { type: String, required: true },
    description: { type: String, required: true },
    descriptionAr: { type: String },
    serviceDate: { type: Date, required: true },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, required: true },
    totalCharge: { type: Number, required: true },
    diagnosisRef: [{ type: String }],
    providerId: { type: Schema.Types.ObjectId, ref: 'User' },
    modifier: [{ type: String }],
    placeOfService: { type: String },
    adjudication: [
      {
        type: { type: String, enum: ADJUDICATION_TYPES },
        amount: { type: Number },
        reason: { type: String },
      },
    ],
    approvedAmount: { type: Number },
    deniedAmount: { type: Number },
    notes: { type: String },
  },
  { _id: true }
);

const claimSchema = new Schema(
  {
    claimNumber: { type: String, unique: true, required: true },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true, index: true },
    policyId: {
      type: Schema.Types.ObjectId,
      ref: 'DDDInsurancePolicy',
      required: true,
      index: true,
    },
    providerId: { type: Schema.Types.ObjectId, ref: 'DDDInsuranceProvider', required: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'DDDInvoice', index: true },
    preAuthId: { type: Schema.Types.ObjectId, ref: 'DDDPreAuthorization' },
    episodeId: { type: Schema.Types.ObjectId, index: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'DDDClaimBatch' },
    claimType: { type: String, enum: CLAIM_TYPES, required: true },
    status: { type: String, enum: CLAIM_STATUSES, default: 'draft' },
    priority: { type: String, enum: ['normal', 'high', 'urgent'], default: 'normal' },
    submissionChannel: { type: String, enum: SUBMISSION_CHANNELS, default: 'electronic' },
    serviceFrom: { type: Date, required: true },
    serviceTo: { type: Date },
    diagnosis: [
      {
        code: { type: String, required: true },
        system: { type: String, default: 'ICD-10' },
        description: { type: String },
        isPrimary: { type: Boolean, default: false },
      },
    ],
    lines: [claimLineSchema],
    totalCharged: { type: Number, default: 0 },
    totalApproved: { type: Number, default: 0 },
    totalDenied: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    patientShare: { type: Number, default: 0 },
    insuranceShare: { type: Number, default: 0 },
    submittedAt: { type: Date },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: { type: Date },
    adjudicatedAt: { type: Date },
    paidAt: { type: Date },
    deniedAt: { type: Date },
    denialReasons: [{ type: String, enum: DENIAL_REASONS }],
    denialNotes: { type: String },
    payerClaimRef: { type: String },
    nphiesRef: { type: String },
    eobId: { type: Schema.Types.ObjectId, ref: 'DDDEOB' },
    filingDeadline: { type: Date },
    attachments: [{ name: String, url: String, type: String }],
    history: [
      {
        action: { type: String },
        date: { type: Date, default: Date.now },
        actor: { type: String },
        notes: { type: String },
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

claimSchema.index({ status: 1, claimType: 1 });
claimSchema.index({ submittedAt: -1 });
claimSchema.index({ claimNumber: 1 });

const claimBatchSchema = new Schema(
  {
    batchNumber: { type: String, unique: true, required: true },
    providerId: { type: Schema.Types.ObjectId, ref: 'DDDInsuranceProvider', required: true },
    status: {
      type: String,
      enum: [
        'draft',
        'validated',
        'submitted',
        'processing',
        'completed',
        'partially_completed',
        'failed',
      ],
      default: 'draft',
    },
    channel: { type: String, enum: SUBMISSION_CHANNELS, default: 'electronic' },
    claimIds: [{ type: Schema.Types.ObjectId, ref: 'DDDClaim' }],
    totalClaims: { type: Number, default: 0 },
    totalCharged: { type: Number, default: 0 },
    totalApproved: { type: Number, default: 0 },
    totalDenied: { type: Number, default: 0 },
    submittedAt: { type: Date },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    completedAt: { type: Date },
    responseRef: { type: String },
    errors: [
      {
        claimId: { type: Schema.Types.ObjectId },
        code: { type: String },
        message: { type: String },
      },
    ],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDClaimBatch =
  mongoose.models.DDDClaimBatch || mongoose.model('DDDClaimBatch', claimBatchSchema);

/* ── Claim Appeal ──────────────────────────────────────────────────────── */
const claimAppealSchema = new Schema(
  {
    appealNumber: { type: String, unique: true, required: true },
    claimId: { type: Schema.Types.ObjectId, ref: 'DDDClaim', required: true, index: true },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    policyId: { type: Schema.Types.ObjectId, ref: 'DDDInsurancePolicy' },
    providerId: { type: Schema.Types.ObjectId, ref: 'DDDInsuranceProvider' },
    status: { type: String, enum: APPEAL_STATUSES, default: 'draft' },
    level: { type: String, enum: APPEAL_LEVELS, default: 'first_level' },
    denialReasons: [{ type: String, enum: DENIAL_REASONS }],
    appealReason: { type: String, required: true },
    clinicalJustification: { type: String },
    supportingDocs: [{ name: String, url: String, type: String }],
    requestedAmount: { type: Number },
    approvedAmount: { type: Number },
    submittedAt: { type: Date },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewedBy: { type: String },
    resolvedAt: { type: Date },
    deadline: { type: Date },
    history: [
      {
        action: { type: String },
        date: { type: Date, default: Date.now },
        actor: { type: String },
        notes: { type: String },
      },
    ],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

claimAppealSchema.index({ status: 1, level: 1 });

const DDDClaimAppeal =
  mongoose.models.DDDClaimAppeal || mongoose.model('DDDClaimAppeal', claimAppealSchema);

/* ── Explanation of Benefits (EOB) ─────────────────────────────────────── */
const eobSchema = new Schema(
  {
    eobNumber: { type: String, unique: true, required: true },
    claimId: { type: Schema.Types.ObjectId, ref: 'DDDClaim', required: true, index: true },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    policyId: { type: Schema.Types.ObjectId, ref: 'DDDInsurancePolicy' },
    providerId: { type: Schema.Types.ObjectId, ref: 'DDDInsuranceProvider' },
    type: { type: String, enum: EOB_TYPES, default: 'payment' },
    processedDate: { type: Date, default: Date.now },
    serviceFrom: { type: Date },
    serviceTo: { type: Date },
    totalCharged: { type: Number },
    allowedAmount: { type: Number },
    paidAmount: { type: Number },
    patientResponsibility: { type: Number },
    adjustments: [
      {
        type: { type: String, enum: ADJUDICATION_TYPES },
        amount: { type: Number },
        reason: { type: String },
      },
    ],
    lineDetails: [
      {
        serviceCode: { type: String },
        charged: { type: Number },
        allowed: { type: Number },
        paid: { type: Number },
        adjustment: { type: Number },
        remark: { type: String },
      },
    ],
    paymentRef: { type: String },
    checkNumber: { type: String },
    paymentDate: { type: Date },
    remarks: [{ code: String, description: String }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);


/* ═══════════════════ Models ═══════════════════ */

const DDDClaim = mongoose.models.DDDClaim || mongoose.model('DDDClaim', claimSchema);

/* ── Claim Batch ───────────────────────────────────────────────────────── */
const DDDEOB = mongoose.models.DDDEOB || mongoose.model('DDDEOB', eobSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  CLAIM_STATUSES,
  CLAIM_TYPES,
  DENIAL_REASONS,
  APPEAL_STATUSES,
  APPEAL_LEVELS,
  SUBMISSION_CHANNELS,
  EOB_TYPES,
  ADJUDICATION_TYPES,
  BUILTIN_CLAIM_TEMPLATES,
  DDDClaim,
  DDDClaimBatch,
  DDDClaimAppeal,
  DDDEOB,
};
