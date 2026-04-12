'use strict';
/**
 * BackupManager Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddBackupManager.js
 */

const {
  DDDBackupJob,
  DDDRestoreOperation,
  DDDBackupPolicy,
  DDDBackupVerification,
  BACKUP_TYPES,
  BACKUP_STATUSES,
  STORAGE_TARGETS,
  RETENTION_POLICIES,
  DATA_SOURCES,
  ENCRYPTION_METHODS,
  BUILTIN_BACKUP_SCHEDULES,
} = require('../models/DddBackupManager');

const BaseCrudService = require('./base/BaseCrudService');

class BackupManager extends BaseCrudService {
  constructor() {
    super('BackupManager', {}, {
      backupJobs: DDDBackupJob,
      restoreOperations: DDDRestoreOperation,
      backupPolicys: DDDBackupPolicy,
      backupVerifications: DDDBackupVerification,
    });
  }

  async createJob(data) { return this._create(DDDBackupJob, data); }
  async listJobs(filter = {}, page = 1, limit = 20) { return this._list(DDDBackupJob, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async updateJobStatus(id, status, extra = {}) {
    return DDDBackupJob.findByIdAndUpdate(id, { status, ...extra }, { new: true }).lean();
  }

  async createRestore(data) { return this._create(DDDRestoreOperation, data); }
  async listRestores(filter = {}, page = 1, limit = 20) { return this._list(DDDRestoreOperation, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }

  async createPolicy(data) { return this._create(DDDBackupPolicy, data); }
  async listPolicies(filter = {}, page = 1, limit = 20) { return this._list(DDDBackupPolicy, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async updatePolicy(id, data) { return this._update(DDDBackupPolicy, id, data); }

  async createVerification(data) { return this._create(DDDBackupVerification, data); }
  async listVerifications(filter = {}, page = 1, limit = 20) { return this._list(DDDBackupVerification, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }

  async getBackupStats() {
    const [jobs, restores, policies, verifications] = await Promise.all([
      DDDBackupJob.countDocuments({ status: 'completed' }),
      DDDRestoreOperation.countDocuments(),
      DDDBackupPolicy.countDocuments({ isActive: true }),
      DDDBackupVerification.countDocuments({ status: 'passed' }),
    ]);
    return {
      completedBackups: jobs,
      totalRestores: restores,
      activePolicies: policies,
      passedVerifications: verifications,
    };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new BackupManager();
