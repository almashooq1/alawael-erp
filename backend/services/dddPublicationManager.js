'use strict';
/**
 * PublicationManager Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddPublicationManager.js
 */

const {
  DDDManuscript,
  DDDAuthorship,
  DDDCitationRecord,
  DDDDisseminationEvent,
  PUBLICATION_TYPES,
  PUBLICATION_STATUSES,
  JOURNAL_TIERS,
  AUTHOR_ROLES,
  DISSEMINATION_CHANNELS,
  CITATION_DATABASES,
  BUILTIN_PUBLICATION_TEMPLATES,
} = require('../models/DddPublicationManager');

const BaseCrudService = require('./base/BaseCrudService');

class PublicationManager extends BaseCrudService {
  constructor() {
    super('PublicationManager', {}, {
      manuscripts: DDDManuscript,
      authorships: DDDAuthorship,
      citationRecords: DDDCitationRecord,
      disseminationEvents: DDDDisseminationEvent,
    });
  }

  async createManuscript(data) { return this._create(DDDManuscript, data); }
  async listManuscripts(filter = {}, page = 1, limit = 20) { return this._list(DDDManuscript, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async updateManuscript(id, data) { return this._update(DDDManuscript, id, data); }

  async addAuthorship(data) { return this._create(DDDAuthorship, data); }
  async listAuthorships(filter = {}, page = 1, limit = 20) { return this._list(DDDAuthorship, filter, { page: page, limit: limit, sort: { position: 1 } }); }

  async recordCitation(data) { return this._create(DDDCitationRecord, data); }
  async listCitations(filter = {}, page = 1, limit = 20) { return this._list(DDDCitationRecord, filter, { page: page, limit: limit, sort: { recordedAt: -1 } }); }

  async createDissemination(data) { return this._create(DDDDisseminationEvent, data); }
  async listDisseminations(filter = {}, page = 1, limit = 20) { return this._list(DDDDisseminationEvent, filter, { page: page, limit: limit, sort: { eventDate: -1 } }); }

  async getPublicationStats() {
    const [manuscripts, published, totalCitations, events] = await Promise.all([
      DDDManuscript.countDocuments(),
      DDDManuscript.countDocuments({ status: 'published' }),
      DDDCitationRecord.aggregate([{ $group: { _id: null, total: { $sum: '$citationCount' } } }]),
      DDDDisseminationEvent.countDocuments(),
    ]);
    return {
      totalManuscripts: manuscripts,
      publishedCount: published,
      totalCitations: totalCitations[0]?.total || 0,
      disseminationEvents: events,
    };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new PublicationManager();
