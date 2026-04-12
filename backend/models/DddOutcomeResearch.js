'use strict';
/**
 * DddOutcomeResearch — Mongoose Models & Constants
 * Auto-extracted from services/dddOutcomeResearch.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const OUTCOME_DOMAINS = [
  'functional_independence',
  'mobility',
  'communication',
  'cognitive_function',
  'pain',
  'quality_of_life',
  'participation',
  'caregiver_burden',
  'self_care',
  'psychosocial',
  'vocational',
  'educational',
];

const MEASUREMENT_LEVELS = [
  'nominal',
  'ordinal',
  'interval',
  'ratio',
  'dichotomous',
  'categorical',
  'continuous',
  'likert_scale',
  'visual_analog',
  'count',
];

const DATA_COLLECTION_METHODS = [
  'self_report',
  'clinician_rated',
  'observer_rated',
  'computerized',
  'wearable_sensor',
  'performance_based',
  'interview',
  'medical_record',
  'proxy_report',
  'mixed_method',
];

const ANALYSIS_TYPES = [
  't_test',
  'anova',
  'chi_square',
  'regression',
  'mixed_model',
  'survival_analysis',
  'factor_analysis',
  'sem',
  'meta_analysis',
  'bayesian',
];

const VALIDITY_TYPES = [
  'content',
  'construct',
  'criterion',
  'face',
  'convergent',
  'discriminant',
  'predictive',
  'concurrent',
  'ecological',
  'internal',
];

const RELIABILITY_TYPES = [
  'test_retest',
  'inter_rater',
  'intra_rater',
  'internal_consistency',
  'parallel_forms',
  'split_half',
  'cronbach_alpha',
  'icc',
  'kappa',
  'bland_altman',
];

const BUILTIN_OUTCOME_MEASURES = [
  {
    code: 'FIM',
    name: 'Functional Independence Measure',
    domain: 'functional_independence',
    items: 18,
  },
  { code: 'BARTHEL', name: 'Barthel Index', domain: 'self_care', items: 10 },
  { code: 'SF36', name: 'SF-36 Health Survey', domain: 'quality_of_life', items: 36 },
  { code: 'BERG', name: 'Berg Balance Scale', domain: 'mobility', items: 14 },
  { code: 'VAS_PAIN', name: 'Visual Analog Scale - Pain', domain: 'pain', items: 1 },
  { code: 'GMFM', name: 'Gross Motor Function Measure', domain: 'mobility', items: 88 },
  {
    code: 'COPM',
    name: 'Canadian Occupational Performance Measure',
    domain: 'participation',
    items: 5,
  },
  { code: 'PHQ9', name: 'Patient Health Questionnaire-9', domain: 'psychosocial', items: 9 },
  { code: 'MMSE', name: 'Mini-Mental State Examination', domain: 'cognitive_function', items: 30 },
  {
    code: 'CELF5',
    name: 'Clinical Evaluation of Language Fundamentals',
    domain: 'communication',
    items: 45,
  },
];

/* ═══════════════════ Schemas ═══════════════════ */

/* ═══════════════════ Schemas ═══════════════════ */

const outcomeMeasureSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, unique: true, required: true },
    domain: { type: String, enum: OUTCOME_DOMAINS, required: true },
    measurementLevel: { type: String, enum: MEASUREMENT_LEVELS },
    itemCount: { type: Number },
    scoringRange: { min: Number, max: Number },
    administrationTime: { type: Number },
    collectionMethod: { type: String, enum: DATA_COLLECTION_METHODS },
    validityTypes: [{ type: String, enum: VALIDITY_TYPES }],
    reliabilityTypes: [{ type: String, enum: RELIABILITY_TYPES }],
    normativeData: { type: Boolean, default: false },
    copyright: { type: String },
    version: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
outcomeMeasureSchema.index({ domain: 1, code: 1 });

const dataCollectionSchema = new Schema(
  {
    measureId: { type: Schema.Types.ObjectId, ref: 'DDDOutcomeMeasure', required: true },
    studyId: { type: Schema.Types.ObjectId, ref: 'DDDResearchStudy' },
    participantId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    collectedAt: { type: Date, default: Date.now },
    collectionMethod: { type: String, enum: DATA_COLLECTION_METHODS },
    rawScore: { type: Number },
    standardScore: { type: Number },
    percentileRank: { type: Number },
    itemResponses: [{ itemNum: Number, response: Schema.Types.Mixed, score: Number }],
    timepoint: { type: String },
    collectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isValid: { type: Boolean, default: true },
    notes: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
dataCollectionSchema.index({ measureId: 1, participantId: 1, collectedAt: -1 });
dataCollectionSchema.index({ studyId: 1, timepoint: 1 });

const cohortDefinitionSchema = new Schema(
  {
    name: { type: String, required: true },
    studyId: { type: Schema.Types.ObjectId, ref: 'DDDResearchStudy' },
    inclusionCriteria: [{ field: String, operator: String, value: Schema.Types.Mixed }],
    exclusionCriteria: [{ field: String, operator: String, value: Schema.Types.Mixed }],
    estimatedSize: { type: Number },
    actualSize: { type: Number },
    status: { type: String, enum: ['draft', 'active', 'frozen', 'archived'], default: 'draft' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    description: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
cohortDefinitionSchema.index({ studyId: 1, status: 1 });

const analysisResultSchema = new Schema(
  {
    studyId: { type: Schema.Types.ObjectId, ref: 'DDDResearchStudy' },
    cohortId: { type: Schema.Types.ObjectId, ref: 'DDDCohortDefinition' },
    analysisType: { type: String, enum: ANALYSIS_TYPES, required: true },
    measureId: { type: Schema.Types.ObjectId, ref: 'DDDOutcomeMeasure' },
    sampleSize: { type: Number },
    testStatistic: { type: Number },
    pValue: { type: Number },
    effectSize: { type: Number },
    confidenceInterval: { lower: Number, upper: Number },
    significanceLevel: { type: Number, default: 0.05 },
    isSignificant: { type: Boolean },
    summary: { type: String },
    analysedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
analysisResultSchema.index({ studyId: 1, analysisType: 1 });
analysisResultSchema.index({ measureId: 1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDOutcomeMeasure =
  mongoose.models.DDDOutcomeMeasure || mongoose.model('DDDOutcomeMeasure', outcomeMeasureSchema);
const DDDOutcomeDataCollection =
  mongoose.models.DDDOutcomeDataCollection || mongoose.model('DDDOutcomeDataCollection', dataCollectionSchema);
const DDDCohortDefinition =
  mongoose.models.DDDCohortDefinition ||
  mongoose.model('DDDCohortDefinition', cohortDefinitionSchema);
const DDDAnalysisResult =
  mongoose.models.DDDAnalysisResult || mongoose.model('DDDAnalysisResult', analysisResultSchema);

/* ═══════════════════ Domain Class ═══════════════════ */

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  OUTCOME_DOMAINS,
  MEASUREMENT_LEVELS,
  DATA_COLLECTION_METHODS,
  ANALYSIS_TYPES,
  VALIDITY_TYPES,
  RELIABILITY_TYPES,
  BUILTIN_OUTCOME_MEASURES,
  DDDOutcomeMeasure,
  DDDOutcomeDataCollection,
  DDDCohortDefinition,
  DDDAnalysisResult,
};
