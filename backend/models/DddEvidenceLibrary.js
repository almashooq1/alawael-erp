'use strict';
/**
 * DddEvidenceLibrary Model
 * Auto-extracted from services/dddEvidenceLibrary.js
 * Schemas, constants, and Mongoose model registrations.
 */
const mongoose = require('mongoose');

/* ─── Constants ─── */
const EVIDENCE_LEVELS = [
  'level_1a_systematic_review',
  'level_1b_rct',
  'level_2a_cohort',
  'level_2b_outcomes_research',
  'level_3_case_control',
  'level_4_case_series',
  'level_5_expert_opinion',
  'clinical_guideline',
  'consensus_statement',
  'best_practice',
  'emerging_evidence',
  'traditional_practice',
];

const EVIDENCE_STATUSES = [
  'draft',
  'under_review',
  'approved',
  'published',
  'archived',
  'superseded',
  'retracted',
  'pending_update',
  'in_translation',
  'active',
];

const PRACTICE_DOMAINS = [
  'physical_therapy',
  'occupational_therapy',
  'speech_therapy',
  'psychology',
  'social_work',
  'nursing',
  'assistive_technology',
  'early_intervention',
  'vocational_rehab',
  'pain_management',
  'neurological_rehab',
  'pediatric_rehab',
];

const RECOMMENDATION_GRADES = [
  'grade_a_strong',
  'grade_b_moderate',
  'grade_c_weak',
  'grade_d_against',
  'grade_i_insufficient',
  'good_practice_point',
  'expert_consensus',
  'conditional',
  'strong_for',
  'strong_against',
];

const GUIDELINE_TYPES = [
  'clinical_practice',
  'treatment_protocol',
  'assessment_guideline',
  'care_pathway',
  'discharge_criteria',
  'safety_guideline',
  'prevention_guideline',
  'screening_tool',
  'outcome_measure',
  'quality_standard',
  'ethical_guideline',
  'documentation_standard',
];

const SOURCE_TYPES = [
  'pubmed',
  'cochrane',
  'pedro',
  'cinahl',
  'embase',
  'web_of_science',
  'scopus',
  'google_scholar',
  'clinical_trials_gov',
  'who',
  'nice',
  'internal',
];

const BUILTIN_EVIDENCE_CATEGORIES = [
  'stroke_rehabilitation',
  'spinal_cord_injury',
  'traumatic_brain_injury',
  'cerebral_palsy',
  'autism_spectrum',
  'intellectual_disability',
  'musculoskeletal',
  'chronic_pain',
  'mental_health_rehab',
  'geriatric_rehabilitation',
];

/* ─── Schemas ─── */
const evidenceItemSchema = new mongoose.Schema(
  {
    evidenceId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    level: { type: String, enum: EVIDENCE_LEVELS, required: true },
    status: { type: String, enum: EVIDENCE_STATUSES, default: 'draft' },
    domain: { type: String, enum: PRACTICE_DOMAINS },
    source: { type: String, enum: SOURCE_TYPES },
    citation: { type: String },
    doi: { type: String },
    abstract: { type: String },
    findings: { type: String },
    implications: { type: String },
    keywords: [String],
    authors: [{ name: String, affiliation: String }],
    publishedDate: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

evidenceItemSchema.index({ evidenceId: 1 }, { unique: true });
evidenceItemSchema.index({ level: 1, domain: 1 });
evidenceItemSchema.index({ keywords: 1 });

const guidelineSchema = new mongoose.Schema(
  {
    guidelineId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    type: { type: String, enum: GUIDELINE_TYPES, required: true },
    status: { type: String, enum: EVIDENCE_STATUSES, default: 'draft' },
    domain: { type: String, enum: PRACTICE_DOMAINS },
    version: { type: String, default: '1.0' },
    recommendations: [
      {
        text: String,
        grade: { type: String, enum: RECOMMENDATION_GRADES },
        evidenceIds: [String],
        notes: String,
      },
    ],
    targetPopulation: { type: String },
    scope: { type: String },
    developedBy: { type: String },
    approvedDate: { type: Date },
    reviewDate: { type: Date },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

guidelineSchema.index({ guidelineId: 1 }, { unique: true });
guidelineSchema.index({ type: 1, status: 1 });

const evidenceReviewSchema = new mongoose.Schema(
  {
    reviewId: { type: String, required: true, unique: true },
    evidenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDEvidenceItem' },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 10 },
    methodology: { type: Number, min: 1, max: 10 },
    applicability: { type: Number, min: 1, max: 10 },
    comments: { type: String },
    recommendation: { type: String, enum: ['include', 'exclude', 'revise', 'needs_more_info'] },
    reviewedAt: { type: Date, default: Date.now },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

evidenceReviewSchema.index({ reviewId: 1 }, { unique: true });
evidenceReviewSchema.index({ evidenceId: 1 });

const evidenceSummarySchema = new mongoose.Schema(
  {
    summaryId: { type: String, required: true, unique: true },
    topic: { type: String, required: true },
    domain: { type: String, enum: PRACTICE_DOMAINS },
    evidenceCount: { type: Number, default: 0 },
    overallLevel: { type: String, enum: EVIDENCE_LEVELS },
    keyFindings: [String],
    gaps: [String],
    lastUpdated: { type: Date, default: Date.now },
    generatedBy: { type: String },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

evidenceSummarySchema.index({ summaryId: 1 }, { unique: true });
evidenceSummarySchema.index({ domain: 1 });

/* ─── Models ─── */
const DDDEvidenceItem =
  mongoose.models.DDDEvidenceItem || mongoose.model('DDDEvidenceItem', evidenceItemSchema);
const DDDGuideline =
  mongoose.models.DDDGuideline || mongoose.model('DDDGuideline', guidelineSchema);
const DDDEvidenceReview =
  mongoose.models.DDDEvidenceReview || mongoose.model('DDDEvidenceReview', evidenceReviewSchema);
const DDDEvidenceSummary =
  mongoose.models.DDDEvidenceSummary || mongoose.model('DDDEvidenceSummary', evidenceSummarySchema);

module.exports = {
  DDDEvidenceItem,
  DDDGuideline,
  DDDEvidenceReview,
  DDDEvidenceSummary,
  EVIDENCE_LEVELS,
  EVIDENCE_STATUSES,
  PRACTICE_DOMAINS,
  RECOMMENDATION_GRADES,
  GUIDELINE_TYPES,
  SOURCE_TYPES,
  BUILTIN_EVIDENCE_CATEGORIES,
};
