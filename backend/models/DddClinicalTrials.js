'use strict';
/**
 * DddClinicalTrials — Mongoose Models & Constants
 * Auto-extracted from services/dddClinicalTrials.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const TRIAL_PHASES = [
  'pre_clinical',
  'phase_0',
  'phase_1',
  'phase_1b',
  'phase_2',
  'phase_2b',
  'phase_3',
  'phase_3b',
  'phase_4',
  'post_market',
  'observation',
  'feasibility',
];

const TRIAL_STATUSES = [
  'planning',
  'protocol_development',
  'irb_submitted',
  'approved',
  'recruiting',
  'enrollment_complete',
  'intervention',
  'follow_up',
  'data_lock',
  'analysis',
  'completed',
  'terminated',
];

const RANDOMIZATION_METHODS = [
  'simple',
  'block',
  'stratified',
  'cluster',
  'adaptive',
  'minimization',
  'biased_coin',
  'permuted_block',
  'covariate_adaptive',
  'response_adaptive',
];

const BLINDING_TYPES = [
  'open_label',
  'single_blind',
  'double_blind',
  'triple_blind',
  'quadruple_blind',
  'assessor_blind',
  'participant_blind',
  'investigator_blind',
  'unblinded',
  'partial_blind',
];

const ADVERSE_EVENT_GRADES = [
  'grade_1_mild',
  'grade_2_moderate',
  'grade_3_severe',
  'grade_4_life_threatening',
  'grade_5_death',
  'expected',
  'unexpected',
  'related',
  'unrelated',
  'possibly_related',
];

const ENDPOINT_TYPES = [
  'primary',
  'secondary',
  'exploratory',
  'composite',
  'surrogate',
  'safety',
  'efficacy',
  'pharmacokinetic',
  'patient_reported',
  'biomarker',
];

const BUILTIN_TRIAL_TEMPLATES = [
  {
    code: 'REHAB_RCT',
    label: 'Rehabilitation RCT',
    phase: 'phase_3',
    blinding: 'double_blind',
    arms: 2,
  },
  {
    code: 'DEVICE_TRIAL',
    label: 'Medical Device Trial',
    phase: 'phase_2',
    blinding: 'single_blind',
    arms: 2,
  },
  {
    code: 'BEHAV_TRIAL',
    label: 'Behavioral Intervention',
    phase: 'phase_2',
    blinding: 'assessor_blind',
    arms: 3,
  },
  {
    code: 'OBSERV_STUDY',
    label: 'Observational Study',
    phase: 'observation',
    blinding: 'open_label',
    arms: 1,
  },
  {
    code: 'PILOT_TRIAL',
    label: 'Pilot/Feasibility',
    phase: 'feasibility',
    blinding: 'open_label',
    arms: 2,
  },
  {
    code: 'ADAPTIVE',
    label: 'Adaptive Trial Design',
    phase: 'phase_2b',
    blinding: 'double_blind',
    arms: 3,
  },
  {
    code: 'CROSSOVER',
    label: 'Crossover Trial',
    phase: 'phase_3',
    blinding: 'double_blind',
    arms: 2,
  },
  {
    code: 'POST_MARKET',
    label: 'Post-Market Surveillance',
    phase: 'post_market',
    blinding: 'open_label',
    arms: 1,
  },
  {
    code: 'PEDS_TRIAL',
    label: 'Pediatric Trial',
    phase: 'phase_2',
    blinding: 'double_blind',
    arms: 2,
  },
  {
    code: 'TECH_TRIAL',
    label: 'Technology-Assisted Rehab',
    phase: 'phase_3',
    blinding: 'assessor_blind',
    arms: 2,
  },
];

/* ═══════════════════ Schemas ═══════════════════ */

/* ═══════════════════ Schemas ═══════════════════ */

const clinicalTrialSchema = new Schema(
  {
    title: { type: String, required: true },
    registryId: { type: String },
    phase: { type: String, enum: TRIAL_PHASES, required: true },
    status: { type: String, enum: TRIAL_STATUSES, default: 'planning' },
    blindingType: { type: String, enum: BLINDING_TYPES, default: 'open_label' },
    randomization: { type: String, enum: RANDOMIZATION_METHODS },
    studyId: { type: Schema.Types.ObjectId, ref: 'DDDResearchStudy' },
    arms: [{ name: String, description: String, targetSize: Number }],
    targetEnrollment: { type: Number },
    actualEnrollment: { type: Number, default: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
    sponsorId: { type: Schema.Types.ObjectId },
    sites: [{ name: String, location: String, piId: Schema.Types.ObjectId }],
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
clinicalTrialSchema.index({ phase: 1, status: 1 });
clinicalTrialSchema.index({ registryId: 1 });

const trialEnrollmentSchema = new Schema(
  {
    trialId: { type: Schema.Types.ObjectId, ref: 'DDDClinicalTrial', required: true },
    participantId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    arm: { type: String },
    enrolledAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: [
        'screening',
        'enrolled',
        'randomized',
        'active',
        'completed',
        'withdrawn',
        'lost_to_followup',
        'excluded',
      ],
      default: 'screening',
    },
    consentDate: { type: Date },
    consentVersion: { type: String },
    withdrawalReason: { type: String },
    withdrawalDate: { type: Date },
    siteId: { type: Schema.Types.ObjectId },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
trialEnrollmentSchema.index({ trialId: 1, status: 1 });
trialEnrollmentSchema.index({ participantId: 1 });

const adverseEventSchema = new Schema(
  {
    trialId: { type: Schema.Types.ObjectId, ref: 'DDDClinicalTrial', required: true },
    participantId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    grade: { type: String, enum: ADVERSE_EVENT_GRADES, required: true },
    description: { type: String, required: true },
    onsetDate: { type: Date },
    resolutionDate: { type: Date },
    isSerious: { type: Boolean, default: false },
    relatedness: {
      type: String,
      enum: ['definite', 'probable', 'possible', 'unlikely', 'unrelated'],
    },
    actionTaken: { type: String },
    outcome: {
      type: String,
      enum: ['recovered', 'recovering', 'not_recovered', 'fatal', 'unknown'],
    },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
adverseEventSchema.index({ trialId: 1, grade: 1 });
adverseEventSchema.index({ isSerious: 1 });

const trialEndpointSchema = new Schema(
  {
    trialId: { type: Schema.Types.ObjectId, ref: 'DDDClinicalTrial', required: true },
    endpointType: { type: String, enum: ENDPOINT_TYPES, required: true },
    name: { type: String, required: true },
    description: { type: String },
    measurementTool: { type: String },
    timepoints: [{ label: String, dayOffset: Number }],
    targetDifference: { type: Number },
    statisticalTest: { type: String },
    result: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['defined', 'collecting', 'analyzed', 'reported'],
      default: 'defined',
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
trialEndpointSchema.index({ trialId: 1, endpointType: 1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDClinicalTrial =
  mongoose.models.DDDClinicalTrial || mongoose.model('DDDClinicalTrial', clinicalTrialSchema);
const DDDTrialEnrollment =
  mongoose.models.DDDTrialEnrollment || mongoose.model('DDDTrialEnrollment', trialEnrollmentSchema);
const DDDAdverseEvent =
  mongoose.models.DDDAdverseEvent || mongoose.model('DDDAdverseEvent', adverseEventSchema);
const DDDTrialEndpoint =
  mongoose.models.DDDTrialEndpoint || mongoose.model('DDDTrialEndpoint', trialEndpointSchema);

/* ═══════════════════ Domain Class ═══════════════════ */

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  TRIAL_PHASES,
  TRIAL_STATUSES,
  RANDOMIZATION_METHODS,
  BLINDING_TYPES,
  ADVERSE_EVENT_GRADES,
  ENDPOINT_TYPES,
  BUILTIN_TRIAL_TEMPLATES,
  DDDClinicalTrial,
  DDDTrialEnrollment,
  DDDAdverseEvent,
  DDDTrialEndpoint,
};
