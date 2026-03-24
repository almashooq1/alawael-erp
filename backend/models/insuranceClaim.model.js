/**
 * Insurance Claim Model — نموذج مطالبات التأمين الطبي
 *
 * Schemas:
 *   InsuranceContract  — عقود التأمين مع شركات التأمين
 *   PreAuthorization   — طلبات الموافقة المسبقة
 *   InsuranceClaim     — مطالبات التأمين
 *   ClaimItem          — بنود المطالبة
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// ═══════════════════════════════════════════════════════════════════════════
// INSURANCE CONTRACT — عقود التأمين
// ═══════════════════════════════════════════════════════════════════════════

const InsuranceContractSchema = new Schema(
  {
    contractNumber: { type: String, required: true, unique: true },
    name: {
      ar: { type: String, required: true },
      en: { type: String },
    },
    insuranceCompany: {
      name: { ar: String, en: String },
      code: String,
      contactPerson: String,
      phone: String,
      email: String,
      address: String,
    },
    type: {
      type: String,
      enum: ['individual', 'group', 'government', 'cooperative', 'supplementary'],
      default: 'group',
    },
    classType: {
      type: String,
      enum: ['vip', 'gold', 'silver', 'bronze', 'basic'],
      default: 'basic',
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['draft', 'active', 'suspended', 'expired', 'terminated'],
      default: 'draft',
    },
    coverageDetails: {
      maxCoverageAmount: Number,
      deductible: { type: Number, default: 0 },
      coPayPercentage: { type: Number, default: 20 },
      coPayMax: Number,
      networkType: { type: String, enum: ['in_network', 'out_network', 'both'], default: 'in_network' },
    },
    coveredServices: [
      {
        serviceCategory: {
          type: String,
          enum: [
            'consultation', 'therapy_session', 'diagnostic', 'laboratory',
            'radiology', 'pharmacy', 'surgical', 'rehabilitation',
            'speech_therapy', 'occupational_therapy', 'physical_therapy',
            'psychological', 'dental', 'optical', 'emergency', 'inpatient',
          ],
        },
        coveragePercentage: { type: Number, default: 80 },
        maxPerVisit: Number,
        maxPerYear: Number,
        requiresPreAuth: { type: Boolean, default: false },
        waitingPeriod: Number, // Days
      },
    ],
    exclusions: [String],
    tpaCode: String, // Third-party administrator
    chiIntegration: {
      enabled: { type: Boolean, default: false },
      payerId: String,
      receiverId: String,
    },
    notes: String,
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

InsuranceContractSchema.index({ contractNumber: 1 });
InsuranceContractSchema.index({ status: 1, endDate: 1 });
InsuranceContractSchema.index({ 'insuranceCompany.code': 1 });

// ═══════════════════════════════════════════════════════════════════════════
// PRE-AUTHORIZATION — الموافقة المسبقة
// ═══════════════════════════════════════════════════════════════════════════

const PreAuthorizationSchema = new Schema(
  {
    preAuthNumber: {
      type: String,
      unique: true,
      default: function () {
        return 'PA-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
      },
    },
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    contract: { type: Schema.Types.ObjectId, ref: 'InsuranceContract', required: true },
    membershipNumber: String,
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    requestDate: { type: Date, default: Date.now },
    urgency: {
      type: String,
      enum: ['routine', 'urgent', 'emergency'],
      default: 'routine',
    },
    diagnosis: [
      {
        code: String, // ICD-10
        description: { ar: String, en: String },
        type: { type: String, enum: ['primary', 'secondary'] },
      },
    ],
    requestedServices: [
      {
        serviceCode: String,
        serviceDescription: { ar: String, en: String },
        category: String,
        quantity: { type: Number, default: 1 },
        estimatedCost: Number,
        sessions: Number,
        duration: String,
      },
    ],
    totalEstimatedCost: Number,
    status: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'partially_approved', 'denied', 'expired', 'cancelled'],
      default: 'pending',
    },
    approvalDetails: {
      approvedBy: String,
      approvedDate: Date,
      approvedAmount: Number,
      approvedSessions: Number,
      validFrom: Date,
      validTo: Date,
      referenceNumber: String,
      conditions: [String],
    },
    denialReason: String,
    attachments: [
      {
        name: String,
        path: String,
        type: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    nphiesRequest: {
      bundleId: String,
      requestId: String,
      sentAt: Date,
      responseAt: Date,
      responseStatus: String,
    },
    notes: String,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

PreAuthorizationSchema.index({ preAuthNumber: 1 });
PreAuthorizationSchema.index({ beneficiary: 1, status: 1 });
PreAuthorizationSchema.index({ contract: 1 });

// ═══════════════════════════════════════════════════════════════════════════
// INSURANCE CLAIM — مطالبة التأمين
// ═══════════════════════════════════════════════════════════════════════════

const InsuranceClaimSchema = new Schema(
  {
    claimNumber: {
      type: String,
      unique: true,
      default: function () {
        return 'CLM-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
      },
    },
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    contract: { type: Schema.Types.ObjectId, ref: 'InsuranceContract', required: true },
    preAuthorization: { type: Schema.Types.ObjectId, ref: 'PreAuthorization' },
    membershipNumber: String,
    claimType: {
      type: String,
      enum: ['institutional', 'professional', 'pharmacy', 'oral_health', 'vision'],
      default: 'institutional',
    },
    priority: {
      type: String,
      enum: ['normal', 'stat', 'deferred'],
      default: 'normal',
    },
    visitDate: { type: Date, required: true },
    admissionDate: Date,
    dischargeDate: Date,
    provider: {
      practitioner: { type: Schema.Types.ObjectId, ref: 'User' },
      department: { type: Schema.Types.ObjectId, ref: 'Department' },
      facilityCode: String,
    },
    diagnosis: [
      {
        code: String, // ICD-10
        description: { ar: String, en: String },
        type: { type: String, enum: ['principal', 'secondary', 'admitting'] },
        onAdmission: Boolean,
      },
    ],
    procedures: [
      {
        code: String, // CPT / HCPCS
        description: { ar: String, en: String },
        date: Date,
      },
    ],
    totalGross: { type: Number, required: true },
    totalDiscount: { type: Number, default: 0 },
    totalNet: { type: Number, required: true },
    patientShare: { type: Number, default: 0 },
    payerShare: { type: Number, default: 0 },
    status: {
      type: String,
      enum: [
        'draft', 'submitted', 'acknowledged', 'under_review',
        'approved', 'partially_approved', 'denied', 'appealed',
        'paid', 'partially_paid', 'cancelled', 'voided',
      ],
      default: 'draft',
    },
    submissionDate: Date,
    submissionMethod: {
      type: String,
      enum: ['manual', 'electronic', 'nphies', 'portal'],
      default: 'manual',
    },
    adjudication: {
      processDate: Date,
      adjudicatedBy: String,
      approvedAmount: Number,
      deniedAmount: Number,
      adjustmentAmount: Number,
      paymentAmount: Number,
      denialReasons: [
        {
          code: String,
          reason: { ar: String, en: String },
        },
      ],
    },
    payment: {
      date: Date,
      amount: Number,
      method: { type: String, enum: ['bank_transfer', 'check', 'offset'] },
      reference: String,
    },
    resubmission: {
      isResubmission: { type: Boolean, default: false },
      originalClaimId: { type: Schema.Types.ObjectId, ref: 'InsuranceClaim' },
      resubmissionReason: String,
    },
    nphiesData: {
      bundleId: String,
      claimId: String,
      sentAt: Date,
      responseAt: Date,
      responseOutcome: String,
    },
    attachments: [
      {
        name: String,
        path: String,
        type: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    notes: String,
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

InsuranceClaimSchema.index({ claimNumber: 1 });
InsuranceClaimSchema.index({ beneficiary: 1, status: 1 });
InsuranceClaimSchema.index({ contract: 1 });
InsuranceClaimSchema.index({ status: 1, submissionDate: -1 });

// ═══════════════════════════════════════════════════════════════════════════
// CLAIM ITEM — بند المطالبة
// ═══════════════════════════════════════════════════════════════════════════

const ClaimItemSchema = new Schema(
  {
    claim: { type: Schema.Types.ObjectId, ref: 'InsuranceClaim', required: true },
    sequence: { type: Number, required: true },
    serviceCode: { type: String, required: true },
    serviceDescription: {
      ar: { type: String },
      en: { type: String },
    },
    category: {
      type: String,
      enum: [
        'consultation', 'therapy', 'diagnostic', 'laboratory',
        'radiology', 'pharmacy', 'procedure', 'accommodation',
        'supplies', 'other',
      ],
    },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    totalNet: { type: Number, required: true },
    factor: { type: Number, default: 1 },
    tax: { type: Number, default: 0 },
    bodySite: String,
    servicedDate: Date,
    diagnosisLinkId: [Number],
    adjudication: {
      approvedAmount: Number,
      deniedAmount: Number,
      adjustmentReason: String,
      status: { type: String, enum: ['pending', 'approved', 'denied', 'adjusted'] },
    },
    notes: String,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ClaimItemSchema.index({ claim: 1, sequence: 1 });

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  InsuranceContract: mongoose.model('InsuranceContract', InsuranceContractSchema),
  PreAuthorization: mongoose.model('PreAuthorization', PreAuthorizationSchema),
  InsuranceClaim: mongoose.model('InsuranceClaim', InsuranceClaimSchema),
  ClaimItem: mongoose.model('ClaimItem', ClaimItemSchema),
};
