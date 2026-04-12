'use strict';
/**
 * ClinicalResearch Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddClinicalResearch.js
 */

const {
  DDDResearchStudy,
  DDDIrbSubmission,
  DDDEthicsReview,
  DDDResearchFunding,
  RESEARCH_DOMAINS,
  STUDY_STATUSES,
  STUDY_DESIGNS,
  IRB_REVIEW_TYPES,
  ETHICS_CATEGORIES,
  FUNDING_SOURCES,
  BUILTIN_RESEARCH_CONFIGS,
} = require('../models/DddClinicalResearch');

const BaseCrudService = require('./base/BaseCrudService');

class ClinicalResearch extends BaseCrudService {
  constructor() {
    super('ClinicalResearch', {}, {
      researchStudys: DDDResearchStudy,
      irbSubmissions: DDDIrbSubmission,
      ethicsReviews: DDDEthicsReview,
      researchFundings: DDDResearchFunding,
    });
  }

  async createStudy(data) { return this._create(DDDResearchStudy, data); }
  async listStudies(filter = {}, page = 1, limit = 20) { return this._list(DDDResearchStudy, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async updateStudy(id, data) { return this._update(DDDResearchStudy, id, data); }

  async submitIrb(data) { return this._create(DDDIrbSubmission, data); }
  async listIrbSubmissions(filter = {}, page = 1, limit = 20) { return this._list(DDDIrbSubmission, filter, { page: page, limit: limit, sort: { submittedAt: -1 } }); }

  async createEthicsReview(data) { return this._create(DDDEthicsReview, data); }
  async listEthicsReviews(filter = {}, page = 1, limit = 20) { return this._list(DDDEthicsReview, filter, { page: page, limit: limit, sort: { reviewDate: -1 } }); }

  async createFunding(data) { return this._create(DDDResearchFunding, data); }
  async listFunding(filter = {}, page = 1, limit = 20) { return this._list(DDDResearchFunding, filter, { page: page, limit: limit, sort: { startDate: -1 } }); }

  async getResearchStats() {
    const [studies, activeStudies, irbPending, fundingActive] = await Promise.all([
      DDDResearchStudy.countDocuments(),
      DDDResearchStudy.countDocuments({ status: 'active' }),
      DDDIrbSubmission.countDocuments({ decision: 'pending' }),
      DDDResearchFunding.countDocuments({ status: 'active' }),
    ]);
    return {
      totalStudies: studies,
      activeStudies,
      pendingIrb: irbPending,
      activeFunding: fundingActive,
    };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new ClinicalResearch();
