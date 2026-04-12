'use strict';
/**
 * ██████████████████████████████████████████████████████████████
 * ██  DDD Evidence Library — Phase 28                         ██
 * ██  Evidence-based practice library & guideline management  ██
 * ██████████████████████████████████████████████████████████████
 */

const { DDDEvidenceItem, DDDGuideline, DDDEvidenceReview, DDDEvidenceSummary, EVIDENCE_LEVELS, EVIDENCE_STATUSES, PRACTICE_DOMAINS, RECOMMENDATION_GRADES, GUIDELINE_TYPES, SOURCE_TYPES, BUILTIN_EVIDENCE_CATEGORIES } = require('../models/DddEvidenceLibrary');

const BaseCrudService = require('./base/BaseCrudService');

class EvidenceLibrary extends BaseCrudService {
  constructor() {
    super('EvidenceLibrary');
  }

  async listEvidence(filter = {}) { return this._list(DDDEvidenceItem, filter, { sort: { publishedDate: -1 } }); }
  async getEvidence(id) { return this._getById(DDDEvidenceItem, id); }
  async addEvidence(data) {
    data.evidenceId = data.evidenceId || `EV-${Date.now()}`;
    return DDDEvidenceItem.create(data);
  }
  async updateEvidence(id, data) { return this._update(DDDEvidenceItem, id, data); }

  async listGuidelines(filter = {}) { return this._list(DDDGuideline, filter); }
  async getGuideline(id) { return this._getById(DDDGuideline, id); }
  async createGuideline(data) {
    data.guidelineId = data.guidelineId || `GL-${Date.now()}`;
    return DDDGuideline.create(data);
  }
  async updateGuideline(id, data) { return this._update(DDDGuideline, id, data); }

  async listReviews(filter = {}) { return this._list(DDDEvidenceReview, filter, { sort: { reviewedAt: -1 } }); }
  async submitReview(data) {
    data.reviewId = data.reviewId || `EVR-${Date.now()}`;
    return DDDEvidenceReview.create(data);
  }

  async listSummaries(filter = {}) { return this._list(DDDEvidenceSummary, filter, { sort: { lastUpdated: -1 } }); }
  async generateSummary(data) {
    data.summaryId = data.summaryId || `EVS-${Date.now()}`;
    return DDDEvidenceSummary.create(data);
  }

  async getEvidenceAnalytics(filter = {}) {
    const [items, guidelines, reviews, summaries] = await Promise.all([
      DDDEvidenceItem.countDocuments(filter),
      DDDGuideline.countDocuments(),
      DDDEvidenceReview.countDocuments(),
      DDDEvidenceSummary.countDocuments(),
    ]);
    return {
      totalEvidence: items,
      totalGuidelines: guidelines,
      totalReviews: reviews,
      totalSummaries: summaries,
    };
  }
}

module.exports = new EvidenceLibrary();
