'use strict';
/**
 * DddPerformanceEvaluator — Mongoose Models & Constants
 * Auto-extracted from services/dddPerformanceEvaluator.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const REVIEW_TYPES = [
  'annual',
  'semi_annual',
  'quarterly',
  'probation',
  'project_based',
  'peer_review',
  '360_degree',
  'self_assessment',
  'promotion',
  'corrective',
  'mid_year',
  'onboarding',
];

const REVIEW_STATUSES = [
  'draft',
  'self_assessment',
  'peer_feedback',
  'manager_review',
  'calibration',
  'approved',
  'acknowledged',
  'completed',
  'disputed',
  'reopened',
];

const RATING_SCALES = [
  'exceeds_expectations',
  'meets_expectations',
  'partially_meets',
  'needs_improvement',
  'unsatisfactory',
  'outstanding',
  'on_track',
  'off_track',
  'not_rated',
  'not_applicable',
];

const GOAL_STATUSES = [
  'draft',
  'active',
  'in_progress',
  'completed',
  'exceeded',
  'partially_met',
  'not_met',
  'deferred',
  'cancelled',
  'revised',
];

const FEEDBACK_TYPES = [
  'peer',
  'manager',
  'subordinate',
  'self',
  'client',
  'cross_functional',
  'mentor',
  'external',
  'patient',
  'family',
];

const KPI_CATEGORIES = [
  'clinical_quality',
  'patient_satisfaction',
  'productivity',
  'documentation',
  'compliance',
  'teamwork',
  'innovation',
  'leadership',
  'communication',
  'professional_development',
  'attendance',
  'safety',
];

/* ── Built-in KPIs ──────────────────────────────────────────────────────── */
const BUILTIN_KPIS = [
  {
    code: 'KPI-CASELOAD',
    name: 'Caseload Management',
    category: 'productivity',
    targetValue: 90,
    unit: 'percent',
  },
  {
    code: 'KPI-DOCTIME',
    name: 'Documentation Timeliness',
    category: 'documentation',
    targetValue: 95,
    unit: 'percent',
  },
  {
    code: 'KPI-PATSAT',
    name: 'Patient Satisfaction Score',
    category: 'patient_satisfaction',
    targetValue: 4.5,
    unit: 'rating',
  },
  {
    code: 'KPI-GOALACH',
    name: 'Patient Goal Achievement',
    category: 'clinical_quality',
    targetValue: 80,
    unit: 'percent',
  },
  {
    code: 'KPI-ATTEND',
    name: 'Attendance Rate',
    category: 'attendance',
    targetValue: 95,
    unit: 'percent',
  },
  {
    code: 'KPI-COMPLY',
    name: 'Compliance Score',
    category: 'compliance',
    targetValue: 100,
    unit: 'percent',
  },
  {
    code: 'KPI-COLLAB',
    name: 'Collaboration Rating',
    category: 'teamwork',
    targetValue: 4.0,
    unit: 'rating',
  },
  {
    code: 'KPI-CEUCOMP',
    name: 'CEU Completion Rate',
    category: 'professional_development',
    targetValue: 100,
    unit: 'percent',
  },
  {
    code: 'KPI-SAFETY',
    name: 'Safety Incident Rate',
    category: 'safety',
    targetValue: 0,
    unit: 'count',
  },
  {
    code: 'KPI-LEAD',
    name: 'Leadership Effectiveness',
    category: 'leadership',
    targetValue: 4.0,
    unit: 'rating',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Performance Review ────────────────────────────────────────────────── */

/* ═══════════════════ Schemas ═══════════════════ */

const performanceReviewSchema = new Schema(
  {
    reviewCode: { type: String, required: true, unique: true },
    staffId: { type: Schema.Types.ObjectId, ref: 'DDDStaffProfile', required: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: 'DDDStaffProfile', required: true },
    type: { type: String, enum: REVIEW_TYPES, required: true },
    status: { type: String, enum: REVIEW_STATUSES, default: 'draft' },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    overallRating: { type: String, enum: RATING_SCALES },
    overallScore: { type: Number, min: 0, max: 5 },
    strengths: [{ type: String }],
    areasForImprovement: [{ type: String }],
    managerComments: { type: String },
    employeeComments: { type: String },
    developmentPlan: { type: String },
    nextReviewDate: { type: Date },
    acknowledgedAt: { type: Date },
    completedAt: { type: Date },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

performanceReviewSchema.index({ staffId: 1, periodEnd: -1 });
performanceReviewSchema.index({ status: 1, type: 1 });

const DDDPerformanceReview =
  mongoose.models.DDDPerformanceReview ||
  mongoose.model('DDDPerformanceReview', performanceReviewSchema);

/* ── Performance Goal ──────────────────────────────────────────────────── */
const performanceGoalSchema = new Schema(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'DDDStaffProfile', required: true },
    reviewId: { type: Schema.Types.ObjectId, ref: 'DDDPerformanceReview' },
    title: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: GOAL_STATUSES, default: 'draft' },
    category: { type: String, enum: KPI_CATEGORIES },
    targetValue: { type: Number },
    currentValue: { type: Number, default: 0 },
    unit: { type: String },
    weight: { type: Number, default: 1 },
    dueDate: { type: Date },
    completedDate: { type: Date },
    milestones: [{ title: String, dueDate: Date, isCompleted: Boolean }],
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

performanceGoalSchema.index({ staffId: 1, status: 1 });

const DDDPerformanceGoal =
  mongoose.models.DDDPerformanceGoal || mongoose.model('DDDPerformanceGoal', performanceGoalSchema);

/* ── Feedback ──────────────────────────────────────────────────────────── */
const feedbackSchema = new Schema(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'DDDStaffProfile', required: true },
    reviewId: { type: Schema.Types.ObjectId, ref: 'DDDPerformanceReview' },
    providerId: { type: Schema.Types.ObjectId, ref: 'DDDStaffProfile' },
    type: { type: String, enum: FEEDBACK_TYPES, required: true },
    isAnonymous: { type: Boolean, default: false },
    ratings: [{ dimension: String, score: Number, comment: String }],
    overallScore: { type: Number, min: 0, max: 5 },
    strengths: { type: String },
    improvements: { type: String },
    additionalComments: { type: String },
    submittedAt: { type: Date },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

feedbackSchema.index({ staffId: 1, reviewId: 1 });

const performanceKPISchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    category: { type: String, enum: KPI_CATEGORIES, required: true },
    targetValue: { type: Number, required: true },
    unit: { type: String, required: true },
    weight: { type: Number, default: 1 },
    formula: { type: String },
    dataSource: { type: String },
    isActive: { type: Boolean, default: true },
    applicableTo: [{ type: String }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

performanceKPISchema.index({ category: 1, isActive: 1 });

const DDDPerformanceKPI =
  mongoose.models.DDDPerformanceKPI || mongoose.model('DDDPerformanceKPI', performanceKPISchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Models ═══════════════════ */

const DDDPerfEvalFeedback = mongoose.models.DDDPerfEvalFeedback || mongoose.model('DDDPerfEvalFeedback', feedbackSchema);

/* ── Performance KPI ───────────────────────────────────────────────────── */

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  REVIEW_TYPES,
  REVIEW_STATUSES,
  RATING_SCALES,
  GOAL_STATUSES,
  FEEDBACK_TYPES,
  KPI_CATEGORIES,
  BUILTIN_KPIS,
  DDDPerformanceReview,
  DDDPerformanceGoal,
  DDDPerfEvalFeedback,
  DDDPerformanceKPI,
};
