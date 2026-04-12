'use strict';
/**
 * ██████████████████████████████████████████████████████████████
 * ██  DDD Clinical Trial — Phase 28                           ██
 * ██  Clinical trial management, enrollment & monitoring      ██
 * ██████████████████████████████████████████████████████████████
 */

const { DDDTrialMonitor, DDDTrialParticipant, DDDMonitoringEvent, DDDTrialMonitorAdverseEvent, TRIAL_TYPES, TRIAL_STATUSES, ENROLLMENT_STATUSES, MONITORING_TYPES, ADVERSE_EVENT_GRADES, RANDOMIZATION_METHODS, BUILTIN_TRIAL_TEMPLATES } = require('../models/DddClinicalTrial');

const BaseCrudService = require('./base/BaseCrudService');

class ClinicalTrial extends BaseCrudService {
  constructor() {
    super('ClinicalTrial');
  }

  async listTrials(filter = {}) { return this._list(DDDTrialMonitor, filter); }
  async getTrial(id) { return this._getById(DDDTrialMonitor, id); }
  async createTrial(data) {
    data.trialId = data.trialId || `CT-${Date.now()}`;
    return DDDTrialMonitor.create(data);
  }
  async updateTrial(id, data) { return this._update(DDDTrialMonitor, id, data); }

  async listParticipants(filter = {}) { return this._list(DDDTrialParticipant, filter); }
  async enrollParticipant(data) {
    data.participantId = data.participantId || `TP-${Date.now()}`;
    data.enrollmentDate = new Date();
    return DDDTrialParticipant.create(data);
  }
  async updateParticipant(id, data) { return this._update(DDDTrialParticipant, id, data); }

  async listMonitoringEvents(filter = {}) { return this._list(DDDMonitoringEvent, filter, { sort: { date: -1 } }); }
  async recordMonitoringEvent(data) {
    data.eventId = data.eventId || `ME-${Date.now()}`;
    return DDDMonitoringEvent.create(data);
  }

  async listAdverseEvents(filter = {}) { return this._list(DDDTrialMonitorAdverseEvent, filter, { sort: { reportedAt: -1 } }); }
  async reportAdverseEvent(data) {
    data.aeId = data.aeId || `AE-${Date.now()}`;
    return DDDTrialMonitorAdverseEvent.create(data);
  }

  async getTrialAnalytics(filter = {}) {
    const [trials, participants, monitoring, adverse] = await Promise.all([
      DDDTrialMonitor.countDocuments(filter),
      DDDTrialParticipant.countDocuments(),
      DDDMonitoringEvent.countDocuments(),
      DDDTrialMonitorAdverseEvent.countDocuments(),
    ]);
    return {
      totalTrials: trials,
      totalParticipants: participants,
      totalMonitoring: monitoring,
      totalAdverseEvents: adverse,
    };
  }
}

module.exports = new ClinicalTrial();
