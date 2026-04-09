/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Performance Evaluator — Phase 20 · Human Resources & Staff Management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Performance reviews, KPI tracking, 360-degree feedback, goal setting,
 * competency assessments, and professional development planning.
 *
 * Aggregates
 *   DDDPerformanceReview   — periodic evaluation cycle
 *   DDDPerformanceGoal     — individual performance goals
 *   DDDFeedback            — 360-degree feedback entries
 *   DDDPerformanceKPI      — measurable KPI for staff evaluation
 *
 * Canonical links
 *   staffId      → DDDStaffProfile (dddStaffManager)
 *   reviewerId   → DDDStaffProfile (dddStaffManager)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { Router } = require('express');

class BaseDomainModule {
  constructor(name, opts = {}) {
    this.name = name;
    this.opts = opts;
  }
  log(msg) {
    console.log(`[${this.name}] ${msg}`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CONSTANTS                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

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

const DDDFeedback = mongoose.models.DDDFeedback || mongoose.model('DDDFeedback', feedbackSchema);

/* ── Performance KPI ───────────────────────────────────────────────────── */
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

class PerformanceEvaluator extends BaseDomainModule {
  constructor() {
    super('PerformanceEvaluator', {
      description: 'Performance reviews, KPIs, feedback & goal tracking',
      version: '1.0.0',
    });
  }

  async initialize() {
    await this._seedKPIs();
    this.log('Performance Evaluator initialised ✓');
    return true;
  }

  async _seedKPIs() {
    for (const k of BUILTIN_KPIS) {
      const exists = await DDDPerformanceKPI.findOne({ code: k.code }).lean();
      if (!exists) await DDDPerformanceKPI.create({ ...k, isActive: true });
    }
  }

  /* ── Reviews ── */
  async listReviews(filters = {}) {
    const q = {};
    if (filters.staffId) q.staffId = filters.staffId;
    if (filters.reviewerId) q.reviewerId = filters.reviewerId;
    if (filters.status) q.status = filters.status;
    if (filters.type) q.type = filters.type;
    return DDDPerformanceReview.find(q).sort({ periodEnd: -1 }).lean();
  }
  async getReview(id) {
    return DDDPerformanceReview.findById(id).lean();
  }
  async createReview(data) {
    if (!data.reviewCode) data.reviewCode = `REV-${Date.now()}`;
    return DDDPerformanceReview.create(data);
  }
  async updateReview(id, data) {
    return DDDPerformanceReview.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }
  async submitReview(id) {
    return DDDPerformanceReview.findByIdAndUpdate(id, { status: 'manager_review' }, { new: true });
  }
  async approveReview(id, rating, score) {
    return DDDPerformanceReview.findByIdAndUpdate(
      id,
      { status: 'approved', overallRating: rating, overallScore: score },
      { new: true }
    );
  }
  async acknowledgeReview(id) {
    return DDDPerformanceReview.findByIdAndUpdate(
      id,
      { status: 'acknowledged', acknowledgedAt: new Date() },
      { new: true }
    );
  }
  async completeReview(id) {
    return DDDPerformanceReview.findByIdAndUpdate(
      id,
      { status: 'completed', completedAt: new Date() },
      { new: true }
    );
  }

  /* ── Goals ── */
  async listGoals(staffId, filters = {}) {
    const q = { staffId };
    if (filters.status) q.status = filters.status;
    if (filters.category) q.category = filters.category;
    return DDDPerformanceGoal.find(q).sort({ dueDate: 1 }).lean();
  }
  async createGoal(data) {
    return DDDPerformanceGoal.create(data);
  }
  async updateGoal(id, data) {
    return DDDPerformanceGoal.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }
  async updateGoalProgress(id, currentValue) {
    return DDDPerformanceGoal.findByIdAndUpdate(
      id,
      { currentValue, status: 'in_progress' },
      { new: true }
    );
  }
  async completeGoal(id, rating) {
    return DDDPerformanceGoal.findByIdAndUpdate(
      id,
      { status: rating || 'completed', completedDate: new Date() },
      { new: true }
    );
  }

  /* ── Feedback ── */
  async listFeedback(staffId, filters = {}) {
    const q = { staffId };
    if (filters.reviewId) q.reviewId = filters.reviewId;
    if (filters.type) q.type = filters.type;
    return DDDFeedback.find(q).sort({ createdAt: -1 }).lean();
  }
  async submitFeedback(data) {
    data.submittedAt = new Date();
    return DDDFeedback.create(data);
  }

  /* ── KPIs ── */
  async listKPIs(filters = {}) {
    const q = {};
    if (filters.category) q.category = filters.category;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDPerformanceKPI.find(q).sort({ category: 1 }).lean();
  }
  async createKPI(data) {
    return DDDPerformanceKPI.create(data);
  }
  async updateKPI(id, data) {
    return DDDPerformanceKPI.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Analytics ── */
  async getPerformanceAnalytics() {
    const [reviews, goals, feedbacks, kpis] = await Promise.all([
      DDDPerformanceReview.countDocuments(),
      DDDPerformanceGoal.countDocuments(),
      DDDFeedback.countDocuments(),
      DDDPerformanceKPI.countDocuments(),
    ]);
    const activeReviews = await DDDPerformanceReview.countDocuments({
      status: { $in: ['draft', 'self_assessment', 'peer_feedback', 'manager_review'] },
    });
    const activeGoals = await DDDPerformanceGoal.countDocuments({
      status: { $in: ['active', 'in_progress'] },
    });
    return { reviews, activeReviews, goals, activeGoals, feedbacks, kpis };
  }

  async healthCheck() {
    const [reviews, goals, feedbacks, kpis] = await Promise.all([
      DDDPerformanceReview.countDocuments(),
      DDDPerformanceGoal.countDocuments(),
      DDDFeedback.countDocuments(),
      DDDPerformanceKPI.countDocuments(),
    ]);
    return { status: 'healthy', reviews, goals, feedbacks, kpis };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createPerformanceEvaluatorRouter() {
  const router = Router();
  const svc = new PerformanceEvaluator();

  /* Reviews */
  router.get('/performance/reviews', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listReviews(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/performance/reviews/:id', async (req, res) => {
    try {
      const d = await svc.getReview(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/performance/reviews', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createReview(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/performance/reviews/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateReview(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/performance/reviews/:id/submit', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.submitReview(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/performance/reviews/:id/approve', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.approveReview(req.params.id, req.body.rating, req.body.score),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/performance/reviews/:id/acknowledge', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.acknowledgeReview(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/performance/reviews/:id/complete', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.completeReview(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Goals */
  router.get('/performance/goals/:staffId', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listGoals(req.params.staffId, req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/performance/goals', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createGoal(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/performance/goals/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateGoal(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/performance/goals/:id/progress', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.updateGoalProgress(req.params.id, req.body.currentValue),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/performance/goals/:id/complete', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.completeGoal(req.params.id, req.body.rating) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Feedback */
  router.get('/performance/feedback/:staffId', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listFeedback(req.params.staffId, req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/performance/feedback', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.submitFeedback(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* KPIs */
  router.get('/performance/kpis', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listKPIs(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/performance/kpis', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createKPI(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/performance/kpis/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateKPI(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics & Health */
  router.get('/performance/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getPerformanceAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/performance/health', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  EXPORTS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

module.exports = {
  PerformanceEvaluator,
  DDDPerformanceReview,
  DDDPerformanceGoal,
  DDDFeedback,
  DDDPerformanceKPI,
  REVIEW_TYPES,
  REVIEW_STATUSES,
  RATING_SCALES,
  GOAL_STATUSES,
  FEEDBACK_TYPES,
  KPI_CATEGORIES,
  BUILTIN_KPIS,
  createPerformanceEvaluatorRouter,
};
