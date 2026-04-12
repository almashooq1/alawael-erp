'use strict';
/**
 * PerformanceEvaluator Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddPerformanceEvaluator.js
 */

const {
  DDDPerformanceReview,
  DDDPerformanceGoal,
  DDDPerfEvalFeedback,
  DDDPerformanceKPI,
  REVIEW_TYPES,
  REVIEW_STATUSES,
  RATING_SCALES,
  GOAL_STATUSES,
  FEEDBACK_TYPES,
  KPI_CATEGORIES,
  BUILTIN_KPIS,
} = require('../models/DddPerformanceEvaluator');

const BaseCrudService = require('./base/BaseCrudService');

class PerformanceEvaluator extends BaseCrudService {
  constructor() {
    super('PerformanceEvaluator', {
      description: 'Performance reviews, KPIs, feedback & goal tracking',
      version: '1.0.0',
    }, {
      performanceReviews: DDDPerformanceReview,
      performanceGoals: DDDPerformanceGoal,
      perfEvalFeedbacks: DDDPerfEvalFeedback,
      performanceKPIs: DDDPerformanceKPI,
    })
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
  async getReview(id) { return this._getById(DDDPerformanceReview, id); }
  async createReview(data) {
    if (!data.reviewCode) data.reviewCode = `REV-${Date.now()}`;
    return DDDPerformanceReview.create(data);
  }
  async updateReview(id, data) { return this._update(DDDPerformanceReview, id, data, { runValidators: true }); }
  async submitReview(id) {
    return DDDPerformanceReview.findByIdAndUpdate(id, { status: 'manager_review' }, { new: true }).lean();
  }
  async approveReview(id, rating, score) {
    return DDDPerformanceReview.findByIdAndUpdate(
      id,
      { status: 'approved', overallRating: rating, overallScore: score },
      { new: true }
    ).lean();
  }
  async acknowledgeReview(id) {
    return DDDPerformanceReview.findByIdAndUpdate(
      id,
      { status: 'acknowledged', acknowledgedAt: new Date() },
      { new: true }
    ).lean();
  }
  async completeReview(id) {
    return DDDPerformanceReview.findByIdAndUpdate(
      id,
      { status: 'completed', completedAt: new Date() },
      { new: true }
    ).lean();
  }

  /* ── Goals ── */
  async listGoals(staffId, filters = {}) {
    const q = { staffId };
    if (filters.status) q.status = filters.status;
    if (filters.category) q.category = filters.category;
    return DDDPerformanceGoal.find(q).sort({ dueDate: 1 }).lean();
  }
  async createGoal(data) { return this._create(DDDPerformanceGoal, data); }
  async updateGoal(id, data) { return this._update(DDDPerformanceGoal, id, data, { runValidators: true }); }
  async updateGoalProgress(id, currentValue) {
    return DDDPerformanceGoal.findByIdAndUpdate(
      id,
      { currentValue, status: 'in_progress' },
      { new: true }
    ).lean();
  }
  async completeGoal(id, rating) {
    return DDDPerformanceGoal.findByIdAndUpdate(
      id,
      { status: rating || 'completed', completedDate: new Date() },
      { new: true }
    ).lean();
  }

  /* ── Feedback ── */
  async listFeedback(staffId, filters = {}) {
    const q = { staffId };
    if (filters.reviewId) q.reviewId = filters.reviewId;
    if (filters.type) q.type = filters.type;
    return DDDPerfEvalFeedback.find(q).sort({ createdAt: -1 }).lean();
  }
  async submitFeedback(data) {
    data.submittedAt = new Date();
    return DDDPerfEvalFeedback.create(data);
  }

  /* ── KPIs ── */
  async listKPIs(filters = {}) {
    const q = {};
    if (filters.category) q.category = filters.category;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDPerformanceKPI.find(q).sort({ category: 1 }).lean();
  }
  async createKPI(data) { return this._create(DDDPerformanceKPI, data); }
  async updateKPI(id, data) { return this._update(DDDPerformanceKPI, id, data, { runValidators: true }); }

  /* ── Analytics ── */
  async getPerformanceAnalytics() {
    const [reviews, goals, feedbacks, kpis] = await Promise.all([
      DDDPerformanceReview.countDocuments(),
      DDDPerformanceGoal.countDocuments(),
      DDDPerfEvalFeedback.countDocuments(),
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
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new PerformanceEvaluator();
