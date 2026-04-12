'use strict';
/**
 * DddInsuranceManager — Mongoose Models & Constants
 * Auto-extracted from services/dddInsuranceManager.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const PROVIDER_TYPES = [
  'government',
  'private',
  'cooperative',
  'self_insured',
  'international',
  'military',
  'workers_comp',
  'charity',
  'social_affairs',
  'employer_group',
];

const POLICY_STATUSES = [
  'active',
  'pending',
  'suspended',
  'expired',
  'cancelled',
  'exhausted',
  'under_review',
];

const COVERAGE_TYPES = [
  'full',
  'partial',
  'co_pay',
  'co_insurance',
  'deductible',
  'out_of_pocket_max',
  'excluded',
  'pre_auth_required',
  'case_by_case',
];

const PREAUTH_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'partially_approved',
  'denied',
  'expired',
  'appealed',
  'cancelled',
];

const NETWORK_TIERS = ['in_network', 'out_of_network', 'preferred', 'restricted'];

const BENEFIT_CATEGORIES = [
  'physical_therapy',
  'occupational_therapy',
  'speech_therapy',
  'psychological',
  'assistive_devices',
  'diagnostics',
  'tele_rehab',
  'home_care',
  'inpatient_rehab',
  'day_program',
  'group_therapy',
  'medication',
];

const PREAUTH_URGENCY = ['routine', 'urgent', 'emergency', 'retrospective'];

/* ── Built-in insurance providers ───────────────────────────────────────── */
const BUILTIN_PROVIDERS = [
  {
    code: 'CCHI-GOV',
    name: 'Council of Cooperative Health Insurance',
    nameAr: 'مجلس الضمان الصحي',
    type: 'government',
    country: 'SA',
  },
  { code: 'BUPA-SA', name: 'Bupa Arabia', nameAr: 'بوبا العربية', type: 'private', country: 'SA' },
  {
    code: 'MEDGULF',
    name: 'MedGulf Insurance',
    nameAr: 'ميدغلف للتأمين',
    type: 'private',
    country: 'SA',
  },
  { code: 'TAWUNIYA', name: 'Tawuniya', nameAr: 'التعاونية', type: 'cooperative', country: 'SA' },
  {
    code: 'WALAA',
    name: 'Walaa Insurance',
    nameAr: 'ولاء للتأمين',
    type: 'cooperative',
    country: 'SA',
  },
  {
    code: 'MALATH',
    name: 'Malath Insurance',
    nameAr: 'ملاذ للتأمين',
    type: 'private',
    country: 'SA',
  },
  {
    code: 'SOCIAL-AFF',
    name: 'Ministry of Social Affairs',
    nameAr: 'وزارة الشؤون الاجتماعية',
    type: 'social_affairs',
    country: 'SA',
  },
  {
    code: 'MILITARY-MED',
    name: 'Military Medical Services',
    nameAr: 'الخدمات الطبية العسكرية',
    type: 'military',
    country: 'SA',
  },
  {
    code: 'MOH-COVER',
    name: 'MOH Coverage Program',
    nameAr: 'برنامج تغطية وزارة الصحة',
    type: 'government',
    country: 'SA',
  },
  {
    code: 'SELF-PAY',
    name: 'Self-Pay / Uninsured',
    nameAr: 'دفع ذاتي / غير مؤمن',
    type: 'self_insured',
    country: 'SA',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Insurance Provider ────────────────────────────────────────────────── */

/* ═══════════════════ Schemas ═══════════════════ */

const insuranceProviderSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    type: { type: String, enum: PROVIDER_TYPES, required: true },
    country: { type: String, default: 'SA' },
    isActive: { type: Boolean, default: true },
    contact: {
      phone: { type: String },
      email: { type: String },
      fax: { type: String },
      website: { type: String },
      address: { type: String },
    },
    claimsPortal: {
      url: { type: String },
      apiKey: { type: String },
      format: { type: String, enum: ['HL7', 'NPHIES', 'custom', 'manual'], default: 'NPHIES' },
    },
    networkTier: { type: String, enum: NETWORK_TIERS, default: 'in_network' },
    paymentTermsDays: { type: Number, default: 45 },
    contractStart: { type: Date },
    contractEnd: { type: Date },
    serviceCategories: [{ type: String, enum: BENEFIT_CATEGORIES }],
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDInsuranceProvider =
  mongoose.models.DDDInsuranceProvider ||
  mongoose.model('DDDInsuranceProvider', insuranceProviderSchema);

/* ── Insurance Policy ──────────────────────────────────────────────────── */
const benefitLimitSchema = new Schema(
  {
    category: { type: String, enum: BENEFIT_CATEGORIES },
    coverageType: { type: String, enum: COVERAGE_TYPES, default: 'co_pay' },
    maxSessions: { type: Number },
    maxAmount: { type: Number },
    usedSessions: { type: Number, default: 0 },
    usedAmount: { type: Number, default: 0 },
    coPayPercent: { type: Number, default: 20 },
    coPayFixed: { type: Number },
    deductible: { type: Number, default: 0 },
    deductibleMet: { type: Number, default: 0 },
    preAuthRequired: { type: Boolean, default: false },
    notes: { type: String },
  },
  { _id: true }
);

const insurancePolicySchema = new Schema(
  {
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true, index: true },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'DDDInsuranceProvider',
      required: true,
      index: true,
    },
    policyNumber: { type: String, required: true },
    memberNumber: { type: String },
    groupNumber: { type: String },
    status: { type: String, enum: POLICY_STATUSES, default: 'active' },
    isPrimary: { type: Boolean, default: true },
    effectiveDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    planName: { type: String },
    planClass: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'VIP', 'economy', 'standard', 'premium'],
    },
    networkTier: { type: String, enum: NETWORK_TIERS, default: 'in_network' },
    annualLimit: { type: Number },
    lifetimeLimit: { type: Number },
    usedAnnual: { type: Number, default: 0 },
    usedLifetime: { type: Number, default: 0 },
    deductible: { type: Number, default: 0 },
    deductibleMet: { type: Number, default: 0 },
    outOfPocketMax: { type: Number },
    outOfPocketUsed: { type: Number, default: 0 },
    benefits: [benefitLimitSchema],
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verificationNotes: { type: String },
    subscriber: {
      name: { type: String },
      relationship: { type: String, enum: ['self', 'spouse', 'child', 'parent', 'other'] },
      nationalId: { type: String },
    },
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

insurancePolicySchema.index({ policyNumber: 1, providerId: 1 });
insurancePolicySchema.index({ status: 1, expiryDate: 1 });

const DDDInsurancePolicy =
  mongoose.models.DDDInsurancePolicy || mongoose.model('DDDInsurancePolicy', insurancePolicySchema);

/* ── Pre-Authorization ─────────────────────────────────────────────────── */
const preAuthSchema = new Schema(
  {
    authNumber: { type: String, unique: true, required: true },
    policyId: {
      type: Schema.Types.ObjectId,
      ref: 'DDDInsurancePolicy',
      required: true,
      index: true,
    },
    providerId: { type: Schema.Types.ObjectId, ref: 'DDDInsuranceProvider', required: true },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true, index: true },
    episodeId: { type: Schema.Types.ObjectId, index: true },
    status: { type: String, enum: PREAUTH_STATUSES, default: 'draft' },
    urgency: { type: String, enum: PREAUTH_URGENCY, default: 'routine' },
    requestedServices: [
      {
        category: { type: String, enum: BENEFIT_CATEGORIES },
        description: { type: String },
        sessions: { type: Number },
        estimatedCost: { type: Number },
        approvedSessions: { type: Number },
        approvedAmount: { type: Number },
      },
    ],
    diagnosis: [
      {
        code: { type: String },
        system: { type: String, default: 'ICD-10' },
        description: { type: String },
      },
    ],
    clinicalJustification: { type: String },
    attachments: [{ name: String, url: String, type: String }],
    submittedAt: { type: Date },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewedBy: { type: String },
    approvedAt: { type: Date },
    deniedAt: { type: Date },
    denialReason: { type: String },
    validFrom: { type: Date },
    validTo: { type: Date },
    appealDeadline: { type: Date },
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

preAuthSchema.index({ status: 1, urgency: 1 });

const DDDPreAuthorization =
  mongoose.models.DDDPreAuthorization || mongoose.model('DDDPreAuthorization', preAuthSchema);

/* ── Coverage Rule ─────────────────────────────────────────────────────── */
const coverageRuleSchema = new Schema(
  {
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'DDDInsuranceProvider',
      required: true,
      index: true,
    },
    planClass: { type: String },
    category: { type: String, enum: BENEFIT_CATEGORIES, required: true },
    coverageType: { type: String, enum: COVERAGE_TYPES, required: true },
    coPayPercent: { type: Number },
    coPayFixed: { type: Number },
    maxSessions: { type: Number },
    maxAmountPerSession: { type: Number },
    maxAmountAnnual: { type: Number },
    preAuthRequired: { type: Boolean, default: false },
    waitingPeriodDays: { type: Number, default: 0 },
    exclusions: [{ type: String }],
    conditions: [{ type: String }],
    isActive: { type: Boolean, default: true },
    effectiveFrom: { type: Date },
    effectiveTo: { type: Date },
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

coverageRuleSchema.index({ category: 1, coverageType: 1 });

const DDDCoverageRule =
  mongoose.models.DDDCoverageRule || mongoose.model('DDDCoverageRule', coverageRuleSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  PROVIDER_TYPES,
  POLICY_STATUSES,
  COVERAGE_TYPES,
  PREAUTH_STATUSES,
  NETWORK_TIERS,
  BENEFIT_CATEGORIES,
  PREAUTH_URGENCY,
  BUILTIN_PROVIDERS,
  DDDInsuranceProvider,
  DDDInsurancePolicy,
  DDDPreAuthorization,
  DDDCoverageRule,
};
