'use strict';
/**
 * CommunityProgram Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddCommunityProgram.js
 */

const {
  DDDProgram,
  DDDProgramEnrollment,
  DDDProgramActivity,
  DDDProgramOutcome,
  PROGRAM_TYPES,
  PROGRAM_STATUSES,
  ENROLLMENT_STATUSES,
  ACTIVITY_TYPES,
  OUTCOME_TYPES,
  FUNDING_SOURCES,
  BUILTIN_PROGRAMS,
} = require('../models/DddCommunityProgram');

const BaseCrudService = require('./base/BaseCrudService');

class CommunityProgram extends BaseCrudService {
  constructor() {
    super('CommunityProgram', {
      description: 'Community programs, enrollments & outcome tracking',
      version: '1.0.0',
    }, {
      programs: DDDProgram,
      programEnrollments: DDDProgramEnrollment,
      programActivitys: DDDProgramActivity,
      programOutcomes: DDDProgramOutcome,
    })
  }

  async initialize() {
    await this._seedPrograms();
    this.log('Community Program initialised ✓');
    return true;
  }

  async _seedPrograms() {
    for (const p of BUILTIN_PROGRAMS) {
      const exists = await DDDProgram.findOne({ code: p.code }).lean();
      if (!exists) await DDDProgram.create(p);
    }
  }

  /* ── Programs ── */
  async listPrograms(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDProgram.find(q).sort({ name: 1 }).lean();
  }
  async getProgram(id) { return this._getById(DDDProgram, id); }
  async createProgram(data) { return this._create(DDDProgram, data); }
  async updateProgram(id, data) { return this._update(DDDProgram, id, data); }

  /* ── Enrollments ── */
  async listEnrollments(filters = {}) {
    const q = {};
    if (filters.programId) q.programId = filters.programId;
    if (filters.status) q.status = filters.status;
    return DDDProgramEnrollment.find(q).sort({ enrolledAt: -1 }).lean();
  }
  async enrollParticipant(data) {
    if (!data.enrollmentCode) data.enrollmentCode = `ENRL-${Date.now()}`;
    data.enrolledAt = new Date();
    data.status = 'enrolled';
    return DDDProgramEnrollment.create(data);
  }
  async updateEnrollment(id, data) { return this._update(DDDProgramEnrollment, id, data); }

  /* ── Activities ── */
  async listActivities(programId) {
    const q = programId ? { programId } : {};
    return DDDProgramActivity.find(q).sort({ scheduledDate: 1 }).lean();
  }
  async createActivity(data) {
    if (!data.activityCode) data.activityCode = `PACT-${Date.now()}`;
    return DDDProgramActivity.create(data);
  }

  /* ── Outcomes ── */
  async listOutcomes(programId) {
    const q = programId ? { programId } : {};
    return DDDProgramOutcome.find(q).sort({ measureDate: -1 }).lean();
  }
  async recordOutcome(data) {
    if (!data.outcomeCode) data.outcomeCode = `POUT-${Date.now()}`;
    if (data.baselineValue && data.targetValue && data.actualValue) {
      data.achievementPercent = Math.min(
        100,
        Math.round(
          ((data.actualValue - data.baselineValue) / (data.targetValue - data.baselineValue)) * 100
        )
      );
    }
    return DDDProgramOutcome.create(data);
  }

  /* ── Analytics ── */
  async getProgramAnalytics() {
    const [programs, enrollments, activities, outcomes] = await Promise.all([
      DDDProgram.countDocuments(),
      DDDProgramEnrollment.countDocuments(),
      DDDProgramActivity.countDocuments(),
      DDDProgramOutcome.countDocuments(),
    ]);
    const activePrograms = await DDDProgram.countDocuments({
      status: { $in: ['active', 'in_progress'] },
    });
    return { programs, enrollments, activities, outcomes, activePrograms };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new CommunityProgram();
