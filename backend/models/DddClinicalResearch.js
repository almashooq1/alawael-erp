'use strict';
/**
 * DddClinicalResearch — Mongoose Models & Constants
 * Auto-extracted from services/dddClinicalResearch.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const RESEARCH_DOMAINS = [
  'physical_therapy',
  'occupational_therapy',
  'speech_therapy',
  'behavioral_science',
  'neuroscience',
  'rehabilitation_engineering',
  'assistive_technology',
  'clinical_psychology',
  'social_work',
  'public_health',
  'biomedical_informatics',
  'epidemiology',
];

const STUDY_STATUSES = [
  'draft',
  'submitted',
  'irb_review',
  'approved',
  'recruiting',
  'active',
  'data_collection',
  'analysis',
  'completed',
  'suspended',
  'terminated',
  'withdrawn',
];

const STUDY_DESIGNS = [
  'randomized_controlled',
  'quasi_experimental',
  'cohort',
  'case_control',
  'cross_sectional',
  'longitudinal',
  'single_case',
  'mixed_methods',
  'qualitative',
  'systematic_review',
  'meta_analysis',
  'pragmatic_trial',
];

const IRB_REVIEW_TYPES = [
  'full_board',
  'expedited',
  'exempt',
  'continuing',
  'amendment',
  'adverse_event',
  'protocol_deviation',
  'closure',
  'suspension',
  'annual_renewal',
];

const ETHICS_CATEGORIES = [
  'informed_consent',
  'vulnerable_population',
  'data_privacy',
  'conflict_of_interest',
  'risk_assessment',
  'benefit_analysis',
  'deception_debriefing',
  'genetic_research',
  'pediatric',
  'disability_specific',
];

const FUNDING_SOURCES = [
  'government_grant',
  'institutional',
  'private_foundation',
  'industry_sponsored',
  'crowdfunding',
  'self_funded',
  'international_agency',
  'ngo',
  'cooperative_agreement',
  'fellowship',
];

const BUILTIN_RESEARCH_CONFIGS = [
  {
    code: 'RCT_STANDARD',
    label: 'Standard RCT Protocol',
    design: 'randomized_controlled',
    minSample: 30,
  },
  { code: 'SINGLE_CASE', label: 'Single Case Experimental', design: 'single_case', minSample: 1 },
  { code: 'COHORT_LONG', label: 'Longitudinal Cohort', design: 'longitudinal', minSample: 50 },
  { code: 'MIXED_METHOD', label: 'Mixed Methods Study', design: 'mixed_methods', minSample: 20 },
  { code: 'SYS_REVIEW', label: 'Systematic Review', design: 'systematic_review', minSample: 0 },
  { code: 'META_ANAL', label: 'Meta-Analysis', design: 'meta_analysis', minSample: 0 },
  { code: 'QUAL_STUDY', label: 'Qualitative Research', design: 'qualitative', minSample: 10 },
  { code: 'QUASI_EXP', label: 'Quasi-Experimental', design: 'quasi_experimental', minSample: 20 },
  { code: 'CROSS_SEC', label: 'Cross-Sectional Survey', design: 'cross_sectional', minSample: 100 },
  { code: 'PRAGMATIC', label: 'Pragmatic Trial', design: 'pragmatic_trial', minSample: 40 },
];

/* ═══════════════════ Schemas ═══════════════════ */

/* ═══════════════════ Schemas ═══════════════════ */

const researchStudySchema = new Schema(
  {
    title: { type: String, required: true },
    domain: { type: String, enum: RESEARCH_DOMAINS, required: true },
    status: { type: String, enum: STUDY_STATUSES, default: 'draft' },
    designType: { type: String, enum: STUDY_DESIGNS },
    principalInvestigator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    coInvestigators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    abstract: { type: String },
    hypothesis: { type: String },
    sampleSize: { type: Number },
    startDate: { type: Date },
    endDate: { type: Date },
    fundingSource: { type: String, enum: FUNDING_SOURCES },
    fundingAmount: { type: Number },
    departmentId: { type: Schema.Types.ObjectId },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
researchStudySchema.index({ domain: 1, status: 1 });
researchStudySchema.index({ principalInvestigator: 1 });

const irbSubmissionSchema = new Schema(
  {
    studyId: { type: Schema.Types.ObjectId, ref: 'DDDResearchStudy', required: true },
    reviewType: { type: String, enum: IRB_REVIEW_TYPES, required: true },
    submittedAt: { type: Date, default: Date.now },
    reviewDate: { type: Date },
    decision: {
      type: String,
      enum: ['approved', 'approved_with_conditions', 'deferred', 'disapproved', 'pending'],
    },
    conditions: [{ type: String }],
    expirationDate: { type: Date },
    irbNumber: { type: String },
    reviewerNotes: { type: String },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
irbSubmissionSchema.index({ studyId: 1, reviewType: 1 });
irbSubmissionSchema.index({ decision: 1, submittedAt: -1 });

const ethicsReviewSchema = new Schema(
  {
    studyId: { type: Schema.Types.ObjectId, ref: 'DDDResearchStudy', required: true },
    category: { type: String, enum: ETHICS_CATEGORIES, required: true },
    riskLevel: {
      type: String,
      enum: ['minimal', 'low', 'moderate', 'high', 'very_high'],
      default: 'minimal',
    },
    reviewDate: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    outcome: {
      type: String,
      enum: ['cleared', 'concerns_raised', 'requires_modification', 'rejected', 'pending'],
    },
    findings: { type: String },
    recommendations: [{ type: String }],
    consentFormRef: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
ethicsReviewSchema.index({ studyId: 1, category: 1 });

const researchFundingSchema = new Schema(
  {
    studyId: { type: Schema.Types.ObjectId, ref: 'DDDResearchStudy', required: true },
    source: { type: String, enum: FUNDING_SOURCES, required: true },
    grantNumber: { type: String },
    awardedAmount: { type: Number },
    disbursedAmount: { type: Number, default: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
    status: {
      type: String,
      enum: ['applied', 'awarded', 'active', 'expended', 'closed', 'revoked'],
      default: 'applied',
    },
    reportingSchedule: { type: String },
    managedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
researchFundingSchema.index({ studyId: 1, source: 1 });
researchFundingSchema.index({ status: 1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDResearchStudy =
  mongoose.models.DDDResearchStudy || mongoose.model('DDDResearchStudy', researchStudySchema);
const DDDIrbSubmission =
  mongoose.models.DDDIrbSubmission || mongoose.model('DDDIrbSubmission', irbSubmissionSchema);
const DDDEthicsReview =
  mongoose.models.DDDEthicsReview || mongoose.model('DDDEthicsReview', ethicsReviewSchema);
const DDDResearchFunding =
  mongoose.models.DDDResearchFunding || mongoose.model('DDDResearchFunding', researchFundingSchema);

/* ═══════════════════ Domain Class ═══════════════════ */

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  RESEARCH_DOMAINS,
  STUDY_STATUSES,
  STUDY_DESIGNS,
  IRB_REVIEW_TYPES,
  ETHICS_CATEGORIES,
  FUNDING_SOURCES,
  BUILTIN_RESEARCH_CONFIGS,
  DDDResearchStudy,
  DDDIrbSubmission,
  DDDEthicsReview,
  DDDResearchFunding,
};
