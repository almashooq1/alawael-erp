'use strict';
/**
 * ClinicalTrials Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddClinicalTrials.js
 */

const {
  DDDClinicalTrial,
  DDDTrialEnrollment,
  DDDAdverseEvent,
  DDDTrialEndpoint,
  TRIAL_PHASES,
  TRIAL_STATUSES,
  RANDOMIZATION_METHODS,
  BLINDING_TYPES,
  ADVERSE_EVENT_GRADES,
  ENDPOINT_TYPES,
  BUILTIN_TRIAL_TEMPLATES,
} = require('../models/DddClinicalTrials');

const BaseCrudService = require('./base/BaseCrudService');

class ClinicalTrials extends BaseCrudService {
  constructor() {
    super('ClinicalTrials', {}, {
      clinicalTrials: DDDClinicalTrial,
      trialEnrollments: DDDTrialEnrollment,
      adverseEvents: DDDAdverseEvent,
      trialEndpoints: DDDTrialEndpoint,
    });
  }

  async createTrial(data) { return this._create(DDDClinicalTrial, data); }
  async listTrials(filter = {}, page = 1, limit = 20) { return this._list(DDDClinicalTrial, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async updateTrial(id, data) { return this._update(DDDClinicalTrial, id, data); }

  async enrollParticipant(data) { return this._create(DDDTrialEnrollment, data); }
  async listEnrollments(filter = {}, page = 1, limit = 20) { return this._list(DDDTrialEnrollment, filter, { page: page, limit: limit, sort: { enrolledAt: -1 } }); }

  async reportAdverseEvent(data) { return this._create(DDDAdverseEvent, data); }
  async listAdverseEvents(filter = {}, page = 1, limit = 20) { return this._list(DDDAdverseEvent, filter, { page: page, limit: limit, sort: { onsetDate: -1 } }); }

  async createEndpoint(data) { return this._create(DDDTrialEndpoint, data); }
  async listEndpoints(filter = {}, page = 1, limit = 20) { return this._list(DDDTrialEndpoint, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }

  async getTrialStats() {
    const [total, recruiting, seriousAE, completed] = await Promise.all([
      DDDClinicalTrial.countDocuments(),
      DDDClinicalTrial.countDocuments({ status: 'recruiting' }),
      DDDAdverseEvent.countDocuments({ isSerious: true }),
      DDDClinicalTrial.countDocuments({ status: 'completed' }),
    ]);
    return {
      totalTrials: total,
      recruiting,
      seriousAdverseEvents: seriousAE,
      completedTrials: completed,
    };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new ClinicalTrials();
