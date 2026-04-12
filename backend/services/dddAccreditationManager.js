'use strict';
/**
 * AccreditationManager Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddAccreditationManager.js
 */

const {
  DDDAccreditationCycle,
  DDDSelfAssessment,
  DDDSurveyFinding,
  DDDCorrectiveAction,
  ACCREDITATION_TYPES,
  ACCREDITATION_STATUSES,
  SURVEY_TYPES,
  FINDING_SEVERITIES,
  CORRECTIVE_ACTION_STATUSES,
  STANDARD_CHAPTERS,
  BUILTIN_ACCREDITATION_BODIES,
} = require('../models/DddAccreditationManager');

const BaseCrudService = require('./base/BaseCrudService');

class AccreditationManager extends BaseCrudService {
  constructor() {
    super('AccreditationManager', {}, {
      accreditationCycles: DDDAccreditationCycle,
      selfAssessments: DDDSelfAssessment,
      surveyFindings: DDDSurveyFinding,
      correctiveActions: DDDCorrectiveAction,
    });
  }

  /* ── Cycles ── */
  async createCycle(data) { return this._create(DDDAccreditationCycle, data); }
  async listCycles(filter = {}, page = 1, limit = 20) { return this._list(DDDAccreditationCycle, filter, { page: page, limit: limit, sort: { cycleStartDate: -1 } }); }
  async getCycleById(id) { return this._getById(DDDAccreditationCycle, id); }
  async updateCycle(id, data) { return this._update(DDDAccreditationCycle, id, data); }

  /* ── Self Assessments ── */
  async createSelfAssessment(data) { return this._create(DDDSelfAssessment, data); }
  async listSelfAssessments(filter = {}, page = 1, limit = 20) { return this._list(DDDSelfAssessment, filter, { page: page, limit: limit, sort: { assessmentDate: -1 } }); }

  /* ── Survey Findings ── */
  async createFinding(data) { return this._create(DDDSurveyFinding, data); }
  async listFindings(filter = {}, page = 1, limit = 20) { return this._list(DDDSurveyFinding, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }

  /* ── Corrective Actions ── */
  async createCorrectiveAction(data) { return this._create(DDDCorrectiveAction, data); }
  async listCorrectiveActions(filter = {}, page = 1, limit = 20) { return this._list(DDDCorrectiveAction, filter, { page: page, limit: limit, sort: { targetDate: 1 } }); }
  async updateCorrectiveAction(id, data) { return this._update(DDDCorrectiveAction, id, data); }

  /* ── Analytics ── */
  async getAccreditationSummary() {
    const [total, awarded, preparing, expired] = await Promise.all([
      DDDAccreditationCycle.countDocuments(),
      DDDAccreditationCycle.countDocuments({ status: 'awarded' }),
      DDDAccreditationCycle.countDocuments({ status: 'preparing' }),
      DDDAccreditationCycle.countDocuments({ status: 'expired' }),
    ]);
    return { total, awarded, preparing, expired };
  }

  async getOverdueActions() {
    return DDDCorrectiveAction.find({
      status: { $nin: ['closed', 'cancelled', 'verified'] },
      targetDate: { $lt: new Date() },
    })
      .sort({ targetDate: 1 })
      .lean();
  }

}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new AccreditationManager();
