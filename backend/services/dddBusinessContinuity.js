'use strict';
/**
 * BusinessContinuity Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddBusinessContinuity.js
 */

const {
  DDDContinuityPlan,
  DDDImpactAnalysis,
  DDDContinuityExercise,
  DDDReadinessAssessment,
  PLAN_TYPES,
  PLAN_STATUSES,
  IMPACT_LEVELS,
  BUSINESS_FUNCTIONS,
  EXERCISE_TYPES,
  RECOVERY_STRATEGIES,
  BUILTIN_BCP_TEMPLATES,
} = require('../models/DddBusinessContinuity');

const BaseCrudService = require('./base/BaseCrudService');

class BusinessContinuity extends BaseCrudService {
  constructor() {
    super('BusinessContinuity', {}, {
      continuityPlans: DDDContinuityPlan,
      impactAnalysiss: DDDImpactAnalysis,
      continuityExercises: DDDContinuityExercise,
      readinessAssessments: DDDReadinessAssessment,
    });
  }

  async createPlan(data) { return this._create(DDDContinuityPlan, data); }
  async listPlans(filter = {}, page = 1, limit = 20) { return this._list(DDDContinuityPlan, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async updatePlan(id, data) { return this._update(DDDContinuityPlan, id, data); }

  async createImpactAnalysis(data) { return this._create(DDDImpactAnalysis, data); }
  async listImpactAnalyses(filter = {}, page = 1, limit = 20) { return this._list(DDDImpactAnalysis, filter, { page: page, limit: limit, sort: { assessedAt: -1 } }); }

  async createExercise(data) { return this._create(DDDContinuityExercise, data); }
  async listExercises(filter = {}, page = 1, limit = 20) { return this._list(DDDContinuityExercise, filter, { page: page, limit: limit, sort: { scheduledDate: -1 } }); }
  async updateExercise(id, data) { return this._update(DDDContinuityExercise, id, data); }

  async createAssessment(data) { return this._create(DDDReadinessAssessment, data); }
  async listAssessments(filter = {}, page = 1, limit = 20) { return this._list(DDDReadinessAssessment, filter, { page: page, limit: limit, sort: { assessmentDate: -1 } }); }

  async getContinuityStats() {
    const [plans, analyses, exercises, assessments] = await Promise.all([
      DDDContinuityPlan.countDocuments({ status: 'active' }),
      DDDImpactAnalysis.countDocuments(),
      DDDContinuityExercise.countDocuments({ status: 'completed' }),
      DDDReadinessAssessment.countDocuments(),
    ]);
    return {
      activePlans: plans,
      totalAnalyses: analyses,
      completedExercises: exercises,
      totalAssessments: assessments,
    };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new BusinessContinuity();
