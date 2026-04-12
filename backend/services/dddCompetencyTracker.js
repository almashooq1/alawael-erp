'use strict';
/**
 * CompetencyTracker Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddCompetencyTracker.js
 */

const {
  DDDCompetencyFramework,
  DDDCompetency,
  DDDStaffCompetency,
  DDDCompetencyCredential,
  COMPETENCY_DOMAINS,
  PROFICIENCY_LEVELS,
  ASSESSMENT_METHODS,
  CREDENTIAL_TYPES,
  CREDENTIAL_STATUSES,
  COMPETENCY_STATUSES,
  BUILTIN_FRAMEWORKS,
} = require('../models/DddCompetencyTracker');

const BaseCrudService = require('./base/BaseCrudService');

class CompetencyTracker extends BaseCrudService {
  constructor() {
    super('CompetencyTracker', {
      description: 'Staff competencies, skills assessment, credentialing & proficiency tracking',
      version: '1.0.0',
    }, {
      competencyFrameworks: DDDCompetencyFramework,
      competencys: DDDCompetency,
      staffCompetencys: DDDStaffCompetency,
      competencyCredentials: DDDCompetencyCredential,
    })
  }

  async initialize() {
    await this._seedFrameworks();
    this.log('Competency Tracker initialised ✓');
    return true;
  }

  async _seedFrameworks() {
    for (const f of BUILTIN_FRAMEWORKS) {
      const exists = await DDDCompetencyFramework.findOne({ code: f.code }).lean();
      if (!exists) await DDDCompetencyFramework.create(f);
    }
  }

  /* ── Framework CRUD ── */
  async listFrameworks(filters = {}) {
    const q = {};
    if (filters.status) q.status = filters.status;
    return DDDCompetencyFramework.find(q).sort({ name: 1 }).lean();
  }
  async getFramework(id) { return this._getById(DDDCompetencyFramework, id); }
  async createFramework(data) { return this._create(DDDCompetencyFramework, data); }
  async updateFramework(id, data) { return this._update(DDDCompetencyFramework, id, data, { runValidators: true }); }

  /* ── Competency CRUD ── */
  async listCompetencies(filters = {}) {
    const q = {};
    if (filters.domain) q.domain = filters.domain;
    if (filters.frameworkId) q.frameworkId = filters.frameworkId;
    if (filters.isCore !== undefined) q.isCore = filters.isCore;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDCompetency.find(q).sort({ domain: 1, name: 1 }).lean();
  }
  async getCompetency(id) { return this._getById(DDDCompetency, id); }
  async createCompetency(data) { return this._create(DDDCompetency, data); }
  async updateCompetency(id, data) { return this._update(DDDCompetency, id, data, { runValidators: true }); }

  /* ── Staff Competency CRUD ── */
  async listStaffCompetencies(filters = {}) {
    const q = {};
    if (filters.userId) q.userId = filters.userId;
    if (filters.competencyId) q.competencyId = filters.competencyId;
    if (filters.frameworkId) q.frameworkId = filters.frameworkId;
    if (filters.status) q.status = filters.status;
    return DDDStaffCompetency.find(q)
      .populate('competencyId', 'name nameAr domain code')
      .sort({ createdAt: -1 })
      .lean();
  }
  async getStaffCompetency(id) {
    return DDDStaffCompetency.findById(id).populate('competencyId').lean();
  }

  async assignCompetency(data) { return this._create(DDDStaffCompetency, data); }

  async recordAssessment(staffCompId, assessmentData) {
    const sc = await DDDStaffCompetency.findById(staffCompId);
    if (!sc) throw new Error('Staff competency record not found');
    sc.assessments.push(assessmentData);
    sc.currentLevel = assessmentData.level || sc.currentLevel;
    sc.lastAssessedAt = new Date();

    // Determine status
    const levels = PROFICIENCY_LEVELS;
    const currentIdx = levels.indexOf(sc.currentLevel);
    const targetIdx = levels.indexOf(sc.targetLevel);
    if (currentIdx >= targetIdx)
      sc.status = currentIdx > targetIdx ? 'exceeds_expectations' : 'meets_expectations';
    else if (currentIdx === targetIdx - 1) sc.status = 'developing';
    else sc.status = 'needs_improvement';

    await sc.save();
    return sc;
  }

  /* ── Credential CRUD ── */
  async listCredentials(filters = {}) {
    const q = {};
    if (filters.userId) q.userId = filters.userId;
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDCompetencyCredential.find(q).sort({ expiryDate: 1 }).lean();
  }
  async getCredential(id) { return this._getById(DDDCompetencyCredential, id); }
  async createCredential(data) { return this._create(DDDCompetencyCredential, data); }
  async updateCredential(id, data) { return this._update(DDDCompetencyCredential, id, data, { runValidators: true }); }

  async renewCredential(id, renewalData) {
    const cred = await DDDCompetencyCredential.findById(id);
    if (!cred) throw new Error('Credential not found');
    cred.renewalHistory.push({
      renewedAt: new Date(),
      expiryDate: renewalData.newExpiryDate,
      notes: renewalData.notes,
    });
    cred.expiryDate = renewalData.newExpiryDate;
    cred.status = 'active';
    cred.renewalDate = renewalData.nextRenewalDate;
    await cred.save();
    return cred;
  }

  async getExpiringCredentials(withinDays = 90) {
    const future = new Date();
    future.setDate(future.getDate() + withinDays);
    return DDDCompetencyCredential.find({ status: 'active', expiryDate: { $lte: future, $gte: new Date() } })
      .sort({ expiryDate: 1 })
      .lean();
  }

  /* ── Gap Analysis ── */
  async getCompetencyGapAnalysis(userId, frameworkId) {
    const competencies = await DDDCompetency.find({ frameworkId, isActive: true }).lean();
    const staffComps = await DDDStaffCompetency.find({ userId, frameworkId }).lean();
    const gaps = [];
    for (const comp of competencies) {
      const sc = staffComps.find(s => String(s.competencyId) === String(comp._id));
      const currentLevel = sc ? sc.currentLevel : 'novice';
      const targetLevel = comp.requiredLevel;
      const levels = PROFICIENCY_LEVELS;
      const gap = levels.indexOf(targetLevel) - levels.indexOf(currentLevel);
      gaps.push({
        competencyId: comp._id,
        name: comp.name,
        nameAr: comp.nameAr,
        domain: comp.domain,
        currentLevel,
        targetLevel,
        gap,
        status: sc ? sc.status : 'not_assessed',
      });
    }
    return {
      userId,
      frameworkId,
      gaps: gaps.sort((a, b) => b.gap - a.gap),
      totalGaps: gaps.filter(g => g.gap > 0).length,
    };
  }

  async getStaffProfile(userId) {
    const competencies = await DDDStaffCompetency.find({ userId })
      .populate('competencyId', 'name nameAr domain')
      .lean();
    const credentials = await DDDCompetencyCredential.find({ userId }).lean();
    const byDomain = {};
    for (const sc of competencies) {
      const domain = sc.competencyId?.domain || 'unknown';
      if (!byDomain[domain]) byDomain[domain] = [];
      byDomain[domain].push(sc);
    }
    return {
      userId,
      competencies,
      credentials,
      byDomain,
      totalCompetencies: competencies.length,
      totalCredentials: credentials.length,
    };
  }

}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new CompetencyTracker();
