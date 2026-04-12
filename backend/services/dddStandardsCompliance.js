'use strict';
/**
 * StandardsCompliance Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddStandardsCompliance.js
 */

const {
  DDDComplianceStandard,
  DDDStdComplianceAssessment,
  DDDGapAnalysis,
  DDDComplianceScore,
  STANDARD_FRAMEWORKS,
  COMPLIANCE_STATUSES,
  REQUIREMENT_PRIORITIES,
  EVIDENCE_TYPES,
  GAP_CATEGORIES,
  ASSESSMENT_METHODS,
  BUILTIN_REGULATORY_BODIES,
} = require('../models/DddStandardsCompliance');

const BaseCrudService = require('./base/BaseCrudService');

class StandardsCompliance extends BaseCrudService {
  constructor() {
    super('StandardsCompliance', {}, {
      complianceStandards: DDDComplianceStandard,
      stdComplianceAssessments: DDDStdComplianceAssessment,
      gapAnalysiss: DDDGapAnalysis,
      complianceScores: DDDComplianceScore,
    });
  }

  /* ── Standards ── */
  async createStandard(data) { return this._create(DDDComplianceStandard, data); }
  async listStandards(filter = {}, page = 1, limit = 20) { return this._list(DDDComplianceStandard, filter, { page: page, limit: limit, sort: { framework: 1, standardRef: 1 } }); }
  async getStandardById(id) { return this._getById(DDDComplianceStandard, id); }
  async updateStandard(id, data) { return this._update(DDDComplianceStandard, id, data); }

  /* ── Assessments ── */
  async createAssessment(data) { return this._create(DDDStdComplianceAssessment, data); }
  async listAssessments(filter = {}, page = 1, limit = 20) { return this._list(DDDStdComplianceAssessment, filter, { page: page, limit: limit, sort: { assessmentDate: -1 } }); }

  /* ── Gap Analysis ── */
  async createGapAnalysis(data) { return this._create(DDDGapAnalysis, data); }
  async listGapAnalyses(filter = {}, page = 1, limit = 20) { return this._list(DDDGapAnalysis, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async updateGapAnalysis(id, data) { return this._update(DDDGapAnalysis, id, data); }

  /* ── Scores ── */
  async recordScore(data) { return this._create(DDDComplianceScore, data); }
  async listScores(filter = {}) { return this._list(DDDComplianceScore, filter, { sort: { assessmentDate: -1 } }); }

  /* ── Analytics ── */
  async getFrameworkCompliance(framework) {
    const standards = await DDDComplianceStandard.find({ framework, isActive: true }).lean();
    const latest = await DDDStdComplianceAssessment.aggregate([
      { $sort: { assessmentDate: -1 } },
      {
        $group: {
          _id: '$standardId',
          latestStatus: { $first: '$status' },
          latestScore: { $first: '$score' },
        },
      },
    ]);
    return { framework, totalStandards: standards.length, assessments: latest };
  }

  async getOpenGaps() {
    return DDDGapAnalysis.find({ status: { $in: ['open', 'in_progress'] } })
      .sort({ gapSeverity: 1 })
      .lean();
  }

}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new StandardsCompliance();
