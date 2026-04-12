'use strict';
/**
 * IncidentTracker Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddIncidentTracker.js
 */

const {
  DDDIncident,
  DDDIncidentCategory,
  DDDInvestigation,
  DDDCorrectiveActionPlan,
  INCIDENT_TYPES,
  INCIDENT_STATUSES,
  SEVERITY_LEVELS,
  INVESTIGATION_STATUSES,
  CORRECTIVE_ACTION_STATUSES,
  ROOT_CAUSE_CATEGORIES,
  BUILTIN_INCIDENT_CATEGORIES,
} = require('../models/DddIncidentTracker');

const BaseCrudService = require('./base/BaseCrudService');

class IncidentTracker extends BaseCrudService {
  constructor() {
    super('IncidentTracker', {
      description: 'Incident reporting, investigation & corrective actions',
      version: '1.0.0',
    }, {
      incidents: DDDIncident,
      incidentCategorys: DDDIncidentCategory,
      investigations: DDDInvestigation,
      correctiveActionPlans: DDDCorrectiveActionPlan,
    })
  }

  async initialize() {
    await this._seedCategories();
    this.log('Incident Tracker initialised ✓');
    return true;
  }

  async _seedCategories() {
    for (const c of BUILTIN_INCIDENT_CATEGORIES) {
      const exists = await DDDIncidentCategory.findOne({ code: c.code }).lean();
      if (!exists) await DDDIncidentCategory.create(c);
    }
  }

  /* ── Incidents ── */
  async listIncidents(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    if (filters.severity) q.severity = filters.severity;
    if (filters.beneficiaryId) q.beneficiaryId = filters.beneficiaryId;
    return DDDIncident.find(q).sort({ reportedAt: -1 }).limit(100).lean();
  }
  async getIncident(id) { return this._getById(DDDIncident, id); }
  async reportIncident(data) {
    if (!data.incidentCode) data.incidentCode = `INC-${Date.now()}`;
    return DDDIncident.create(data);
  }
  async updateIncident(id, data) { return this._update(DDDIncident, id, data, { runValidators: true }); }
  async resolveIncident(id, userId) {
    return DDDIncident.findByIdAndUpdate(
      id,
      { status: 'resolved', resolvedAt: new Date(), resolvedBy: userId },
      { new: true }
    ).lean();
  }
  async searchIncidents(query) {
    return DDDIncident.find({ title: { $regex: query, $options: 'i' } })
      .sort({ reportedAt: -1 })
      .limit(50)
      .lean();
  }

  /* ── Categories ── */
  async listCategories() { return this._list(DDDIncidentCategory, { isActive: true }, { sort: { name: 1 } }); }
  async createCategory(data) { return this._create(DDDIncidentCategory, data); }

  /* ── Investigations ── */
  async listInvestigations(filters = {}) {
    const q = {};
    if (filters.status) q.status = filters.status;
    if (filters.incidentId) q.incidentId = filters.incidentId;
    return DDDInvestigation.find(q).sort({ createdAt: -1 }).lean();
  }
  async createInvestigation(data) {
    if (!data.investigationCode) data.investigationCode = `INV-${Date.now()}`;
    return DDDInvestigation.create(data);
  }
  async updateInvestigation(id, data) { return this._update(DDDInvestigation, id, data, { runValidators: true }); }

  /* ── Corrective Actions ── */
  async listCorrectiveActions(filters = {}) {
    const q = {};
    if (filters.incidentId) q.incidentId = filters.incidentId;
    if (filters.status) q.status = filters.status;
    return DDDCorrectiveActionPlan.find(q).sort({ dueDate: 1 }).lean();
  }
  async createCorrectiveAction(data) {
    if (!data.actionCode) data.actionCode = `CAP-${Date.now()}`;
    return DDDCorrectiveActionPlan.create(data);
  }
  async updateCorrectiveAction(id, data) { return this._update(DDDCorrectiveActionPlan, id, data, { runValidators: true }); }

  /* ── Analytics ── */
  async getIncidentAnalytics() {
    const [incidents, investigations, actions, categories] = await Promise.all([
      DDDIncident.countDocuments(),
      DDDInvestigation.countDocuments(),
      DDDCorrectiveActionPlan.countDocuments(),
      DDDIncidentCategory.countDocuments(),
    ]);
    const open = await DDDIncident.countDocuments({
      status: { $nin: ['resolved', 'closed', 'archived'] },
    });
    return {
      incidents,
      openIncidents: open,
      investigations,
      correctiveActions: actions,
      categories,
    };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new IncidentTracker();
