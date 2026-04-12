'use strict';
/**
 * IncidentResponse Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddIncidentResponse.js
 */

const {
  DDDSystemIncident,
  DDDResponseAction,
  DDDPostMortem,
  DDDCommunicationLog,
  INCIDENT_TYPES,
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  ESCALATION_PATHS,
  RESPONSE_ACTIONS,
  ROOT_CAUSES,
  BUILTIN_RUNBOOKS,
} = require('../models/DddIncidentResponse');

const BaseCrudService = require('./base/BaseCrudService');

class IncidentResponse extends BaseCrudService {
  constructor() {
    super('IncidentResponse', {}, {
      systemIncidents: DDDSystemIncident,
      responseActions: DDDResponseAction,
      postMortems: DDDPostMortem,
      communicationLogs: DDDCommunicationLog,
    });
  }

  async createIncident(data) { return this._create(DDDSystemIncident, data); }
  async listIncidents(filter = {}, page = 1, limit = 20) { return this._list(DDDSystemIncident, filter, { page: page, limit: limit, sort: { detectedAt: -1 } }); }
  async updateIncident(id, data) { return this._update(DDDSystemIncident, id, data); }

  async addAction(data) { return this._create(DDDResponseAction, data); }
  async listActions(filter = {}, page = 1, limit = 50) { return this._list(DDDResponseAction, filter, { page: page, limit: limit, sort: { performedAt: -1 } }); }

  async createPostMortem(data) { return this._create(DDDPostMortem, data); }
  async listPostMortems(filter = {}, page = 1, limit = 20) { return this._list(DDDPostMortem, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async updatePostMortem(id, data) { return this._update(DDDPostMortem, id, data); }

  async addCommunication(data) { return this._create(DDDCommunicationLog, data); }
  async listCommunications(filter = {}, page = 1, limit = 50) { return this._list(DDDCommunicationLog, filter, { page: page, limit: limit, sort: { sentAt: -1 } }); }

  async getIncidentStats() {
    const [active, resolved, postMortems, comms] = await Promise.all([
      DDDSystemIncident.countDocuments({
        status: { $in: ['detected', 'triaged', 'investigating', 'identified', 'mitigating'] },
      }),
      DDDSystemIncident.countDocuments({ status: { $in: ['resolved', 'closed'] } }),
      DDDPostMortem.countDocuments({ status: 'published' }),
      DDDCommunicationLog.countDocuments(),
    ]);
    return {
      activeIncidents: active,
      resolvedIncidents: resolved,
      publishedPostMortems: postMortems,
      communicationsSent: comms,
    };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new IncidentResponse();
