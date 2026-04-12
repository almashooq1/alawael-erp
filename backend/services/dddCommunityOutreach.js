'use strict';
/**
 * CommunityOutreach Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddCommunityOutreach.js
 */

const {
  DDDOutreachProgram,
  DDDCommunityPartner,
  DDDOutreachEvent,
  DDDImpactReport,
  PROGRAM_TYPES,
  PROGRAM_STATUSES,
  TARGET_AUDIENCES,
  PARTNERSHIP_TYPES,
  OUTREACH_CHANNELS,
  IMPACT_METRICS,
  BUILTIN_OUTREACH_TEMPLATES,
} = require('../models/DddCommunityOutreach');

const BaseCrudService = require('./base/BaseCrudService');

class CommunityOutreach extends BaseCrudService {
  constructor() {
    super('CommunityOutreach', {}, {
      outreachPrograms: DDDOutreachProgram,
      communityPartners: DDDCommunityPartner,
      outreachEvents: DDDOutreachEvent,
      impactReports: DDDImpactReport,
    });
  }

  async createProgram(data) { return this._create(DDDOutreachProgram, data); }
  async listPrograms(filter = {}, page = 1, limit = 20) { return this._list(DDDOutreachProgram, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async updateProgram(id, data) { return this._update(DDDOutreachProgram, id, data); }

  async createPartner(data) { return this._create(DDDCommunityPartner, data); }
  async listPartners(filter = {}, page = 1, limit = 20) { return this._list(DDDCommunityPartner, filter, { page: page, limit: limit, sort: { organizationName: 1 } }); }

  async createEvent(data) { return this._create(DDDOutreachEvent, data); }
  async listEvents(filter = {}, page = 1, limit = 20) { return this._list(DDDOutreachEvent, filter, { page: page, limit: limit, sort: { eventDate: -1 } }); }

  async createImpactReport(data) { return this._create(DDDImpactReport, data); }
  async listImpactReports(filter = {}, page = 1, limit = 20) { return this._list(DDDImpactReport, filter, { page: page, limit: limit, sort: { reportDate: -1 } }); }

  async getOutreachStats() {
    const [programs, activePartners, events, reports] = await Promise.all([
      DDDOutreachProgram.countDocuments(),
      DDDCommunityPartner.countDocuments({ status: 'active' }),
      DDDOutreachEvent.countDocuments({ status: 'completed' }),
      DDDImpactReport.countDocuments(),
    ]);
    return {
      totalPrograms: programs,
      activePartners,
      completedEvents: events,
      impactReports: reports,
    };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new CommunityOutreach();
