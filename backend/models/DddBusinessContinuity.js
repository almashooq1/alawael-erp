'use strict';
/**
 * DddBusinessContinuity — Mongoose Models & Constants
 * Auto-extracted from services/dddBusinessContinuity.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const PLAN_TYPES = [
  'business_continuity',
  'disaster_recovery',
  'crisis_management',
  'pandemic_response',
  'cyber_incident',
  'natural_disaster',
  'supply_chain',
  'communication',
  'it_recovery',
  'workplace_recovery',
  'data_protection',
  'operational_resilience',
];

const PLAN_STATUSES = [
  'draft',
  'under_review',
  'approved',
  'active',
  'expired',
  'suspended',
  'archived',
  'testing',
  'revision_required',
  'decommissioned',
];

const IMPACT_LEVELS = [
  'catastrophic',
  'critical',
  'major',
  'moderate',
  'minor',
  'negligible',
  'unknown',
  'not_assessed',
  'acceptable',
  'tolerable',
];

const BUSINESS_FUNCTIONS = [
  'patient_care',
  'clinical_documentation',
  'pharmacy',
  'billing_finance',
  'human_resources',
  'it_infrastructure',
  'communications',
  'supply_chain',
  'facilities',
  'compliance_legal',
  'research',
  'administration',
];

const EXERCISE_TYPES = [
  'tabletop',
  'walkthrough',
  'simulation',
  'full_scale',
  'functional',
  'drill',
  'notification_test',
  'parallel',
  'checklist_review',
  'component_test',
];

const RECOVERY_STRATEGIES = [
  'hot_site',
  'warm_site',
  'cold_site',
  'cloud_failover',
  'mutual_aid',
  'mobile_facility',
  'work_from_home',
  'manual_workaround',
  'outsource',
  'redundant_system',
];

const BUILTIN_BCP_TEMPLATES = [
  {
    code: 'BCP_CLINICAL',
    name: 'Clinical Services BCP',
    type: 'business_continuity',
    rto: 4,
    rpo: 1,
  },
  { code: 'DR_IT', name: 'IT Disaster Recovery', type: 'disaster_recovery', rto: 2, rpo: 0.5 },
  { code: 'CRISIS_COMM', name: 'Crisis Communications', type: 'crisis_management', rto: 1, rpo: 0 },
  { code: 'PANDEMIC_OPS', name: 'Pandemic Operations', type: 'pandemic_response', rto: 24, rpo: 4 },
  { code: 'CYBER_IR', name: 'Cyber Incident Response', type: 'cyber_incident', rto: 1, rpo: 0 },
  { code: 'FACILITY_REC', name: 'Facility Recovery', type: 'workplace_recovery', rto: 48, rpo: 24 },
  { code: 'DATA_PROT', name: 'Data Protection Plan', type: 'data_protection', rto: 2, rpo: 0.25 },
  { code: 'SUPPLY_CONT', name: 'Supply Chain Continuity', type: 'supply_chain', rto: 24, rpo: 12 },
  {
    code: 'OPS_RESIL',
    name: 'Operational Resilience',
    type: 'operational_resilience',
    rto: 4,
    rpo: 1,
  },
  {
    code: 'NATURAL_DIS',
    name: 'Natural Disaster Plan',
    type: 'natural_disaster',
    rto: 72,
    rpo: 24,
  },
];

/* ═══════════════════ Schemas ═══════════════════ */

/* ═══════════════════ Schemas ═══════════════════ */

const continuityPlanSchema = new Schema(
  {
    name: { type: String, required: true },
    planType: { type: String, enum: PLAN_TYPES, required: true },
    status: { type: String, enum: PLAN_STATUSES, default: 'draft' },
    version: { type: Number, default: 1 },
    rtoHours: { type: Number },
    rpoHours: { type: Number },
    scope: { type: String },
    objectives: [{ type: String }],
    recoveryStrategy: { type: String, enum: RECOVERY_STRATEGIES },
    keyContacts: [{ name: String, role: String, phone: String, email: String }],
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    reviewDate: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
continuityPlanSchema.index({ planType: 1, status: 1 });
continuityPlanSchema.index({ reviewDate: 1 });

const impactAnalysisSchema = new Schema(
  {
    planId: { type: Schema.Types.ObjectId, ref: 'DDDContinuityPlan', required: true },
    businessFunction: { type: String, enum: BUSINESS_FUNCTIONS, required: true },
    impactLevel: { type: String, enum: IMPACT_LEVELS, required: true },
    rtoHours: { type: Number },
    rpoHours: { type: Number },
    financialImpact: { type: Number },
    reputationalImpact: { type: String, enum: IMPACT_LEVELS },
    dependencies: [{ function: String, type: String }],
    mitigations: [{ type: String }],
    assessedAt: { type: Date, default: Date.now },
    metadata: { type: Schema.Types.Mixed, default: {} },
    assessedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
impactAnalysisSchema.index({ planId: 1, businessFunction: 1 });
impactAnalysisSchema.index({ impactLevel: 1 });

const continuityExerciseSchema = new Schema(
  {
    planId: { type: Schema.Types.ObjectId, ref: 'DDDContinuityPlan', required: true },
    exerciseType: { type: String, enum: EXERCISE_TYPES, required: true },
    name: { type: String, required: true },
    scenario: { type: String },
    scheduledDate: { type: Date },
    conductedDate: { type: Date },
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed', 'cancelled'],
      default: 'planned',
    },
    participants: [{ userId: Schema.Types.ObjectId, role: String }],
    findings: [{ issue: String, severity: String, recommendation: String }],
    overallRating: {
      type: String,
      enum: ['excellent', 'good', 'adequate', 'needs_improvement', 'failed'],
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
continuityExerciseSchema.index({ planId: 1, exerciseType: 1 });
continuityExerciseSchema.index({ scheduledDate: 1 });

const readinessAssessmentSchema = new Schema(
  {
    planId: { type: Schema.Types.ObjectId, ref: 'DDDContinuityPlan', required: true },
    assessmentDate: { type: Date, default: Date.now },
    overallScore: { type: Number, min: 0, max: 100 },
    categories: [
      {
        name: String,
        score: Number,
        maxScore: Number,
        findings: [String],
      },
    ],
    recommendations: [{ priority: String, description: String, dueDate: Date }],
    status: { type: String, enum: ['draft', 'completed', 'reviewed'], default: 'draft' },
    metadata: { type: Schema.Types.Mixed, default: {} },
    assessedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
readinessAssessmentSchema.index({ planId: 1, assessmentDate: -1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDContinuityPlan =
  mongoose.models.DDDContinuityPlan || mongoose.model('DDDContinuityPlan', continuityPlanSchema);
const DDDImpactAnalysis =
  mongoose.models.DDDImpactAnalysis || mongoose.model('DDDImpactAnalysis', impactAnalysisSchema);
const DDDContinuityExercise =
  mongoose.models.DDDContinuityExercise ||
  mongoose.model('DDDContinuityExercise', continuityExerciseSchema);
const DDDReadinessAssessment =
  mongoose.models.DDDReadinessAssessment ||
  mongoose.model('DDDReadinessAssessment', readinessAssessmentSchema);

/* ═══════════════════ Domain Class ═══════════════════ */

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  PLAN_TYPES,
  PLAN_STATUSES,
  IMPACT_LEVELS,
  BUSINESS_FUNCTIONS,
  EXERCISE_TYPES,
  RECOVERY_STRATEGIES,
  BUILTIN_BCP_TEMPLATES,
  DDDContinuityPlan,
  DDDImpactAnalysis,
  DDDContinuityExercise,
  DDDReadinessAssessment,
};
