'use strict';
/**
 * EmergencyResponse Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddEmergencyResponse.js
 */

const {
  DDDEmergencyPlan,
  DDDEmergencyEvent,
  DDDResponseTeam,
  DDDEmergencyDrill,
  EMERGENCY_TYPES,
  EMERGENCY_STATUSES,
  RESPONSE_LEVELS,
  TEAM_ROLES,
  DRILL_TYPES,
  DRILL_STATUSES,
  BUILTIN_EMERGENCY_PLANS,
} = require('../models/DddEmergencyResponse');

const BaseCrudService = require('./base/BaseCrudService');

class EmergencyResponse extends BaseCrudService {
  constructor() {
    super('EmergencyResponse', {
      description: 'Emergency protocols, response teams & drill management',
      version: '1.0.0',
    }, {
      emergencyPlans: DDDEmergencyPlan,
      emergencyEvents: DDDEmergencyEvent,
      responseTeams: DDDResponseTeam,
      emergencyDrills: DDDEmergencyDrill,
    })
  }

  async initialize() {
    await this._seedPlans();
    this.log('Emergency Response initialised ✓');
    return true;
  }

  async _seedPlans() {
    for (const p of BUILTIN_EMERGENCY_PLANS) {
      const exists = await DDDEmergencyPlan.findOne({ code: p.code }).lean();
      if (!exists) await DDDEmergencyPlan.create(p);
    }
  }

  /* ── Plans ── */
  async listPlans(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDEmergencyPlan.find(q).sort({ name: 1 }).lean();
  }
  async getPlan(id) { return this._getById(DDDEmergencyPlan, id); }
  async createPlan(data) { return this._create(DDDEmergencyPlan, data); }
  async updatePlan(id, data) { return this._update(DDDEmergencyPlan, id, data); }

  /* ── Events ── */
  async listEvents(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDEmergencyEvent.find(q).sort({ activatedAt: -1 }).limit(100).lean();
  }
  async activateEmergency(data) {
    if (!data.eventCode) data.eventCode = `EMR-${Date.now()}`;
    data.status = 'activated';
    data.activatedAt = new Date();
    return DDDEmergencyEvent.create(data);
  }
  async updateEvent(id, data) { return this._update(DDDEmergencyEvent, id, data); }
  async deactivateEmergency(id, userId) {
    return DDDEmergencyEvent.findByIdAndUpdate(
      id,
      { status: 'deactivated', deactivatedAt: new Date(), deactivatedBy: userId },
      { new: true }
    ).lean();
  }

  /* ── Teams ── */
  async listTeams() { return this._list(DDDResponseTeam, { isActive: true }, { sort: { name: 1 } }); }
  async createTeam(data) {
    if (!data.teamCode) data.teamCode = `TEAM-${Date.now()}`;
    return DDDResponseTeam.create(data);
  }
  async updateTeam(id, data) { return this._update(DDDResponseTeam, id, data); }

  /* ── Drills ── */
  async listDrills(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDEmergencyDrill.find(q).sort({ scheduledDate: -1 }).lean();
  }
  async scheduleDrill(data) {
    if (!data.drillCode) data.drillCode = `DRILL-${Date.now()}`;
    return DDDEmergencyDrill.create(data);
  }
  async updateDrill(id, data) { return this._update(DDDEmergencyDrill, id, data); }
  async completeDrill(id, results) {
    return DDDEmergencyDrill.findByIdAndUpdate(
      id,
      { ...results, status: 'completed', completedAt: new Date() },
      { new: true }
    ).lean();
  }

  /* ── Analytics ── */
  async getEmergencyAnalytics() {
    const [plans, events, teams, drills] = await Promise.all([
      DDDEmergencyPlan.countDocuments(),
      DDDEmergencyEvent.countDocuments(),
      DDDResponseTeam.countDocuments(),
      DDDEmergencyDrill.countDocuments(),
    ]);
    const activeEvents = await DDDEmergencyEvent.countDocuments({
      status: { $in: ['activated', 'responding', 'contained'] },
    });
    return { plans, events, activeEvents, teams, drills };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new EmergencyResponse();
