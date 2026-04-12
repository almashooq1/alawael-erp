'use strict';
/**
 * SafetyManager Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddSafetyManager.js
 */

const {
  DDDSafetyInspection,
  DDDHazardReport,
  DDDSafetyPolicy,
  DDDSafetyTraining,
  HAZARD_TYPES,
  HAZARD_STATUSES,
  INSPECTION_TYPES,
  RISK_LEVELS,
  SAFETY_CATEGORIES,
  TRAINING_TYPES,
  BUILTIN_SAFETY_POLICIES,
} = require('../models/DddSafetyManager');

const BaseCrudService = require('./base/BaseCrudService');

class SafetyManager extends BaseCrudService {
  constructor() {
    super('SafetyManager', {
      description: 'Safety inspections, hazard tracking & policy management',
      version: '1.0.0',
    }, {
      safetyInspections: DDDSafetyInspection,
      hazardReports: DDDHazardReport,
      safetyPolicys: DDDSafetyPolicy,
      safetyTrainings: DDDSafetyTraining,
    })
  }

  async initialize() {
    await this._seedPolicies();
    this.log('Safety Manager initialised ✓');
    return true;
  }

  async _seedPolicies() {
    for (const p of BUILTIN_SAFETY_POLICIES) {
      const exists = await DDDSafetyPolicy.findOne({ code: p.code }).lean();
      if (!exists) await DDDSafetyPolicy.create(p);
    }
  }

  /* ── Inspections ── */
  async listInspections(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDSafetyInspection.find(q).sort({ scheduledDate: -1 }).lean();
  }
  async getInspection(id) { return this._getById(DDDSafetyInspection, id); }
  async scheduleInspection(data) {
    if (!data.inspectionCode) data.inspectionCode = `INSP-${Date.now()}`;
    return DDDSafetyInspection.create(data);
  }
  async updateInspection(id, data) { return this._update(DDDSafetyInspection, id, data); }
  async completeInspection(id, results) {
    return DDDSafetyInspection.findByIdAndUpdate(
      id,
      { ...results, status: 'completed', completedAt: new Date() },
      { new: true }
    ).lean();
  }

  /* ── Hazards ── */
  async listHazards(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    if (filters.riskLevel) q.riskLevel = filters.riskLevel;
    return DDDHazardReport.find(q).sort({ reportedAt: -1 }).lean();
  }
  async reportHazard(data) {
    if (!data.hazardCode) data.hazardCode = `HAZ-${Date.now()}`;
    return DDDHazardReport.create(data);
  }
  async updateHazard(id, data) { return this._update(DDDHazardReport, id, data); }
  async resolveHazard(id, rootCause) {
    return DDDHazardReport.findByIdAndUpdate(
      id,
      { status: 'resolved', resolvedAt: new Date(), rootCause },
      { new: true }
    ).lean();
  }

  /* ── Policies ── */
  async listPolicies(filters = {}) {
    const q = {};
    if (filters.category) q.category = filters.category;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDSafetyPolicy.find(q).sort({ name: 1 }).lean();
  }
  async getPolicy(id) { return this._getById(DDDSafetyPolicy, id); }
  async createPolicy(data) { return this._create(DDDSafetyPolicy, data); }
  async updatePolicy(id, data) { return this._update(DDDSafetyPolicy, id, data); }

  /* ── Training ── */
  async listTrainings(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDSafetyTraining.find(q).sort({ scheduledDate: -1 }).lean();
  }
  async scheduleTraining(data) {
    if (!data.trainingCode) data.trainingCode = `STRAIN-${Date.now()}`;
    return DDDSafetyTraining.create(data);
  }
  async updateTraining(id, data) { return this._update(DDDSafetyTraining, id, data); }

  /* ── Analytics ── */
  async getSafetyAnalytics() {
    const [inspections, hazards, policies, trainings] = await Promise.all([
      DDDSafetyInspection.countDocuments(),
      DDDHazardReport.countDocuments(),
      DDDSafetyPolicy.countDocuments(),
      DDDSafetyTraining.countDocuments(),
    ]);
    const openHazards = await DDDHazardReport.countDocuments({
      status: { $in: ['reported', 'under_review', 'confirmed'] },
    });
    const criticalHazards = await DDDHazardReport.countDocuments({
      riskLevel: { $in: ['critical', 'extreme', 'imminent_danger'] },
    });
    return { inspections, hazards, openHazards, criticalHazards, policies, trainings };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new SafetyManager();
