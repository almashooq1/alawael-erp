'use strict';
/**
 * ██████████████████████████████████████████████████████████████
 * ██  DDD Publication Tracker — Phase 28                      ██
 * ██  Track research publications, citations & impact         ██
 * ██████████████████████████████████████████████████████████████
 */

const { DDDPublication, DDDCitation, DDDImpactRecord, DDDDissemination, PUBLICATION_TYPES, PUBLICATION_STATUSES, JOURNAL_TIERS, AUTHOR_ROLES, IMPACT_METRICS, DISSEMINATION_CHANNELS, BUILTIN_JOURNAL_LIST } = require('../models/DddPublicationTracker');

const BaseCrudService = require('./base/BaseCrudService');

class PublicationTracker extends BaseCrudService {
  constructor() {
    super('PublicationTracker');
  }

  async listPublications(filter = {}) { return this._list(DDDPublication, filter); }
  async getPublication(id) { return this._getById(DDDPublication, id); }
  async createPublication(data) {
    data.publicationId = data.publicationId || `PUB-${Date.now()}`;
    return DDDPublication.create(data);
  }
  async updatePublication(id, data) { return this._update(DDDPublication, id, data); }

  async listCitations(filter = {}) { return this._list(DDDCitation, filter, { sort: { citedAt: -1 } }); }
  async addCitation(data) {
    data.citationId = data.citationId || `CIT-${Date.now()}`;
    return DDDCitation.create(data);
  }

  async listImpactRecords(filter = {}) { return this._list(DDDImpactRecord, filter, { sort: { measuredAt: -1 } }); }
  async recordImpact(data) {
    data.recordId = data.recordId || `IMP-${Date.now()}`;
    return DDDImpactRecord.create(data);
  }

  async listDisseminations(filter = {}) { return this._list(DDDDissemination, filter, { sort: { date: -1 } }); }
  async createDissemination(data) {
    data.disseminationId = data.disseminationId || `DIS-${Date.now()}`;
    return DDDDissemination.create(data);
  }

  async getPublicationAnalytics(filter = {}) {
    const [pubs, cites, impacts, dissem] = await Promise.all([
      DDDPublication.countDocuments(filter),
      DDDCitation.countDocuments(),
      DDDImpactRecord.countDocuments(),
      DDDDissemination.countDocuments(),
    ]);
    return {
      totalPublications: pubs,
      totalCitations: cites,
      totalImpactRecords: impacts,
      totalDisseminations: dissem,
    };
  }
}

module.exports = new PublicationTracker();
