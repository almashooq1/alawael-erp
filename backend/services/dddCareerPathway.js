'use strict';
/**
 * CareerPathway Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddCareerPathway.js
 */

const {
  DDDCareerPath,
  DDDSkillAssessment,
  DDDSuccessionPlan,
  DDDDevelopmentActivity,
  PATHWAY_TYPES,
  PATHWAY_STATUSES,
  DEVELOPMENT_AREAS,
  MILESTONE_TYPES,
  SKILL_GAP_LEVELS,
  SUCCESSION_PRIORITIES,
  BUILTIN_PATHWAY_TEMPLATES,
} = require('../models/DddCareerPathway');

const BaseCrudService = require('./base/BaseCrudService');

class CareerPathway extends BaseCrudService {
  constructor() {
    super('CareerPathway', {}, {
      careerPaths: DDDCareerPath,
      skillAssessments: DDDSkillAssessment,
      successionPlans: DDDSuccessionPlan,
      developmentActivitys: DDDDevelopmentActivity,
    });
  }

  /* ── Career Paths ── */
  async createCareerPath(data) { return this._create(DDDCareerPath, data); }
  async listCareerPaths(filter = {}, page = 1, limit = 20) { return this._list(DDDCareerPath, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async getCareerPathById(id) { return this._getById(DDDCareerPath, id); }
  async updateCareerPath(id, data) { return this._update(DDDCareerPath, id, data); }

  /* ── Skill Assessments ── */
  async createSkillAssessment(data) { return this._create(DDDSkillAssessment, data); }
  async listSkillAssessments(filter = {}, page = 1, limit = 20) { return this._list(DDDSkillAssessment, filter, { page: page, limit: limit, sort: { assessmentDate: -1 } }); }

  /* ── Succession Plans ── */
  async createSuccessionPlan(data) { return this._create(DDDSuccessionPlan, data); }
  async listSuccessionPlans(filter = {}) { return this._list(DDDSuccessionPlan, filter, { sort: { priority: 1 } }); }
  async updateSuccessionPlan(id, data) { return this._update(DDDSuccessionPlan, id, data); }

  /* ── Development Activities ── */
  async createActivity(data) { return this._create(DDDDevelopmentActivity, data); }
  async listActivities(filter = {}, page = 1, limit = 20) { return this._list(DDDDevelopmentActivity, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }

  /* ── Analytics ── */
  async getPathwayStats() {
    const [total, active, completed, assessments] = await Promise.all([
      DDDCareerPath.countDocuments(),
      DDDCareerPath.countDocuments({ status: 'active' }),
      DDDCareerPath.countDocuments({ status: 'completed' }),
      DDDSkillAssessment.countDocuments(),
    ]);
    return { total, active, completed, skillAssessments: assessments };
  }

  async getSuccessionCoverage() {
    return DDDSuccessionPlan.aggregate([
      { $group: { _id: '$riskLevel', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  }

}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new CareerPathway();
