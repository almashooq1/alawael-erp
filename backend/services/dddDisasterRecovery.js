'use strict';
/**
 * DisasterRecovery Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddDisasterRecovery.js
 */

const {
  DDDRecoveryPlan,
  DDDBackupSchedule,
  DDDRecoveryTest,
  DDDRecoveryLog,
  DISASTER_TYPES,
  RECOVERY_STATUSES,
  BACKUP_TYPES,
  RTO_LEVELS,
  RPO_LEVELS,
  RECOVERY_STRATEGIES,
  BUILTIN_RECOVERY_PLANS,
} = require('../models/DddDisasterRecovery');

const BaseCrudService = require('./base/BaseCrudService');

class DisasterRecovery extends BaseCrudService {
  constructor() {
    super('DisasterRecovery', {
      description: 'Disaster recovery planning, backups, and continuity',
      version: '1.0.0',
    }, {
      recoveryPlans: DDDRecoveryPlan,
      backupSchedules: DDDBackupSchedule,
      recoveryTests: DDDRecoveryTest,
      recoveryLogs: DDDRecoveryLog,
    })
  }

  async initialize() {
    await this._seedPlans();
    this.log('Disaster Recovery initialised ✓');
    return true;
  }

  async _seedPlans() {
    for (const p of BUILTIN_RECOVERY_PLANS) {
      const exists = await DDDRecoveryPlan.findOne({ code: p.code }).lean();
      if (!exists) await DDDRecoveryPlan.create(p);
    }
  }

  /* ── Plans ── */
  async listPlans(filters = {}) {
    const q = {};
    if (filters.disasterType) q.disasterType = filters.disasterType;
    if (filters.status) q.status = filters.status;
    return DDDRecoveryPlan.find(q).sort({ name: 1 }).lean();
  }
  async getPlan(id) { return this._getById(DDDRecoveryPlan, id); }
  async createPlan(data) { return this._create(DDDRecoveryPlan, data); }
  async updatePlan(id, data) { return this._update(DDDRecoveryPlan, id, data); }

  /* ── Backup Schedules ── */
  async listBackups(filters = {}) {
    const q = {};
    if (filters.backupType) q.backupType = filters.backupType;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDBackupSchedule.find(q).sort({ name: 1 }).lean();
  }
  async createBackup(data) {
    if (!data.code) data.code = `BKP-${Date.now()}`;
    return DDDBackupSchedule.create(data);
  }
  async updateBackup(id, data) { return this._update(DDDBackupSchedule, id, data); }

  /* ── Recovery Tests ── */
  async listTests(filters = {}) {
    const q = {};
    if (filters.status) q.status = filters.status;
    return DDDRecoveryTest.find(q).sort({ scheduledDate: -1 }).lean();
  }
  async scheduleTest(data) {
    if (!data.testCode) data.testCode = `DRTEST-${Date.now()}`;
    return DDDRecoveryTest.create(data);
  }
  async completeTest(id, results) {
    return DDDRecoveryTest.findByIdAndUpdate(
      id,
      { ...results, status: results.passed ? 'passed' : 'failed', completedAt: new Date() },
      { new: true }
    ).lean();
  }

  /* ── Recovery Logs ── */
  async listLogs() {
    return DDDRecoveryLog.find().sort({ triggeredAt: -1 }).limit(100).lean();
  }
  async triggerRecovery(data) {
    if (!data.logCode) data.logCode = `DRLOG-${Date.now()}`;
    return DDDRecoveryLog.create(data);
  }
  async updateLog(id, data) { return this._update(DDDRecoveryLog, id, data); }
  async resolveRecovery(id, postMortem) {
    return DDDRecoveryLog.findByIdAndUpdate(
      id,
      { status: 'fully_recovered', resolvedAt: new Date(), postMortem },
      { new: true }
    ).lean();
  }

  /* ── Analytics ── */
  async getRecoveryAnalytics() {
    const [plans, backups, tests, logs] = await Promise.all([
      DDDRecoveryPlan.countDocuments(),
      DDDBackupSchedule.countDocuments(),
      DDDRecoveryTest.countDocuments(),
      DDDRecoveryLog.countDocuments(),
    ]);
    const activeRecoveries = await DDDRecoveryLog.countDocuments({
      status: { $in: ['triggered', 'in_recovery', 'partially_recovered'] },
    });
    return { plans, backups, tests, logs, activeRecoveries };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new DisasterRecovery();
