'use strict';
/**
 * DDD Backup Manager Service
 * ───────────────────────────
 * Phase 33 – Disaster Recovery & Business Continuity (Module 1/4)
 *
 * Manages backup schedules, retention policies, restore operations,
 * backup verification, storage targets, and compliance tracking.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */
const BACKUP_TYPES = [
  'full',
  'incremental',
  'differential',
  'snapshot',
  'logical',
  'physical',
  'continuous',
  'archive',
  'point_in_time',
  'replica',
  'hot_backup',
  'cold_backup',
];

const BACKUP_STATUSES = [
  'scheduled',
  'running',
  'completed',
  'failed',
  'cancelled',
  'verifying',
  'verified',
  'corrupted',
  'expired',
  'archived',
];

const STORAGE_TARGETS = [
  'local_disk',
  'network_share',
  'aws_s3',
  'azure_blob',
  'gcp_storage',
  'tape',
  'offsite_vault',
  'nas',
  'san',
  'cloud_archive',
];

const RETENTION_POLICIES = [
  'daily_7',
  'daily_14',
  'daily_30',
  'weekly_4',
  'weekly_12',
  'monthly_6',
  'monthly_12',
  'yearly_3',
  'yearly_7',
  'indefinite',
];

const DATA_SOURCES = [
  'mongodb',
  'postgresql',
  'redis',
  'elasticsearch',
  'file_system',
  'object_storage',
  'config_store',
  'audit_logs',
  'media_files',
  'application_state',
];

const ENCRYPTION_METHODS = [
  'AES_256_GCM',
  'AES_256_CBC',
  'RSA_4096',
  'ChaCha20',
  'none',
  'TDE',
  'client_side',
  'server_side',
  'hybrid',
  'envelope',
];

const BUILTIN_BACKUP_SCHEDULES = [
  {
    code: 'DAILY_FULL',
    name: 'Daily Full Backup',
    type: 'full',
    cron: '0 2 * * *',
    retention: 'daily_30',
  },
  {
    code: 'HOURLY_INCR',
    name: 'Hourly Incremental',
    type: 'incremental',
    cron: '0 * * * *',
    retention: 'daily_7',
  },
  {
    code: 'WEEKLY_FULL',
    name: 'Weekly Full Archive',
    type: 'full',
    cron: '0 1 * * 0',
    retention: 'weekly_12',
  },
  {
    code: 'MONTHLY_ARC',
    name: 'Monthly Archive',
    type: 'archive',
    cron: '0 0 1 * *',
    retention: 'monthly_12',
  },
  {
    code: 'CONT_REPL',
    name: 'Continuous Replication',
    type: 'continuous',
    cron: 'continuous',
    retention: 'daily_7',
  },
  {
    code: 'DB_SNAPSHOT',
    name: 'Database Snapshot',
    type: 'snapshot',
    cron: '0 */6 * * *',
    retention: 'daily_14',
  },
  {
    code: 'CONFIG_BKP',
    name: 'Config Backup',
    type: 'logical',
    cron: '0 3 * * *',
    retention: 'weekly_4',
  },
  {
    code: 'AUDIT_ARC',
    name: 'Audit Log Archive',
    type: 'archive',
    cron: '0 4 1 * *',
    retention: 'yearly_7',
  },
  {
    code: 'MEDIA_BKP',
    name: 'Media Files Backup',
    type: 'differential',
    cron: '0 5 * * *',
    retention: 'daily_14',
  },
  {
    code: 'PIT_RESTORE',
    name: 'Point-in-Time Ready',
    type: 'point_in_time',
    cron: '*/15 * * * *',
    retention: 'daily_7',
  },
];

/* ═══════════════════ Schemas ═══════════════════ */
const backupJobSchema = new Schema(
  {
    name: { type: String, required: true },
    backupType: { type: String, enum: BACKUP_TYPES, required: true },
    status: { type: String, enum: BACKUP_STATUSES, default: 'scheduled' },
    dataSource: { type: String, enum: DATA_SOURCES, required: true },
    storageTarget: { type: String, enum: STORAGE_TARGETS, required: true },
    retentionPolicy: { type: String, enum: RETENTION_POLICIES, default: 'daily_30' },
    encryption: { type: String, enum: ENCRYPTION_METHODS, default: 'AES_256_GCM' },
    scheduleCron: { type: String },
    sizeBytes: { type: Number },
    durationMs: { type: Number },
    startedAt: { type: Date },
    completedAt: { type: Date },
    expiresAt: { type: Date },
    storagePath: { type: String },
    checksum: { type: String },
    errors: [{ message: String, timestamp: Date }],
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
backupJobSchema.index({ status: 1, dataSource: 1 });
backupJobSchema.index({ createdAt: -1 });

const restoreOperationSchema = new Schema(
  {
    backupJobId: { type: Schema.Types.ObjectId, ref: 'DDDBackupJob', required: true },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'cancelled', 'verifying'],
      default: 'pending',
    },
    targetEnvironment: {
      type: String,
      enum: ['production', 'staging', 'development', 'test', 'dr_site'],
      required: true,
    },
    restorePoint: { type: Date },
    sizeBytes: { type: Number },
    durationMs: { type: Number },
    startedAt: { type: Date },
    completedAt: { type: Date },
    verifiedAt: { type: Date },
    errors: [{ message: String, timestamp: Date }],
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
restoreOperationSchema.index({ backupJobId: 1 });
restoreOperationSchema.index({ status: 1 });

const backupPolicySchema = new Schema(
  {
    name: { type: String, required: true },
    dataSource: { type: String, enum: DATA_SOURCES, required: true },
    backupType: { type: String, enum: BACKUP_TYPES, required: true },
    storageTarget: { type: String, enum: STORAGE_TARGETS, required: true },
    retention: { type: String, enum: RETENTION_POLICIES, required: true },
    encryption: { type: String, enum: ENCRYPTION_METHODS, default: 'AES_256_GCM' },
    scheduleCron: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    lastRunAt: { type: Date },
    nextRunAt: { type: Date },
    failureNotify: [{ type: String }],
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
backupPolicySchema.index({ dataSource: 1, isActive: 1 });

const backupVerificationSchema = new Schema(
  {
    backupJobId: { type: Schema.Types.ObjectId, ref: 'DDDBackupJob', required: true },
    verificationType: {
      type: String,
      enum: ['checksum', 'restore_test', 'integrity_check', 'sample_query', 'full_validation'],
      required: true,
    },
    status: { type: String, enum: ['pending', 'running', 'passed', 'failed'], default: 'pending' },
    startedAt: { type: Date },
    completedAt: { type: Date },
    details: { type: String },
    checksumMatch: { type: Boolean },
    recordCount: { type: Number },
    metadata: { type: Schema.Types.Mixed, default: {} },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
backupVerificationSchema.index({ backupJobId: 1, status: 1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDBackupJob =
  mongoose.models.DDDBackupJob || mongoose.model('DDDBackupJob', backupJobSchema);
const DDDRestoreOperation =
  mongoose.models.DDDRestoreOperation ||
  mongoose.model('DDDRestoreOperation', restoreOperationSchema);
const DDDBackupPolicy =
  mongoose.models.DDDBackupPolicy || mongoose.model('DDDBackupPolicy', backupPolicySchema);
const DDDBackupVerification =
  mongoose.models.DDDBackupVerification ||
  mongoose.model('DDDBackupVerification', backupVerificationSchema);

/* ═══════════════════ Domain Class ═══════════════════ */
class BackupManager {
  async createJob(data) {
    return DDDBackupJob.create(data);
  }
  async listJobs(filter = {}, page = 1, limit = 20) {
    return DDDBackupJob.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async updateJobStatus(id, status, extra = {}) {
    return DDDBackupJob.findByIdAndUpdate(id, { status, ...extra }, { new: true }).lean();
  }

  async createRestore(data) {
    return DDDRestoreOperation.create(data);
  }
  async listRestores(filter = {}, page = 1, limit = 20) {
    return DDDRestoreOperation.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async createPolicy(data) {
    return DDDBackupPolicy.create(data);
  }
  async listPolicies(filter = {}, page = 1, limit = 20) {
    return DDDBackupPolicy.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async updatePolicy(id, data) {
    return DDDBackupPolicy.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async createVerification(data) {
    return DDDBackupVerification.create(data);
  }
  async listVerifications(filter = {}, page = 1, limit = 20) {
    return DDDBackupVerification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

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

  async healthCheck() {
    const [jobs, restores, policies, verifications] = await Promise.all([
      DDDBackupJob.countDocuments(),
      DDDRestoreOperation.countDocuments(),
      DDDBackupPolicy.countDocuments(),
      DDDBackupVerification.countDocuments(),
    ]);
    return {
      status: 'ok',
      module: 'BackupManager',
      counts: { jobs, restores, policies, verifications },
    };
  }
}

/* ═══════════════════ Router Factory ═══════════════════ */
function createBackupManagerRouter() {
  const { Router } = require('express');
  const router = Router();
  const svc = new BackupManager();

  router.get('/backup-manager/health', async (_req, res) => {
    try {
      res.json(await svc.healthCheck());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/backup-manager/jobs', async (req, res) => {
    try {
      res.status(201).json(await svc.createJob(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/backup-manager/jobs', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listJobs(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/backup-manager/restores', async (req, res) => {
    try {
      res.status(201).json(await svc.createRestore(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/backup-manager/restores', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listRestores(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/backup-manager/policies', async (req, res) => {
    try {
      res.status(201).json(await svc.createPolicy(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/backup-manager/policies', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listPolicies(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/backup-manager/verifications', async (req, res) => {
    try {
      res.status(201).json(await svc.createVerification(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/backup-manager/verifications', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listVerifications(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/backup-manager/stats', async (_req, res) => {
    try {
      res.json(await svc.getBackupStats());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  BACKUP_TYPES,
  BACKUP_STATUSES,
  STORAGE_TARGETS,
  RETENTION_POLICIES,
  DATA_SOURCES,
  ENCRYPTION_METHODS,
  BUILTIN_BACKUP_SCHEDULES,
  DDDBackupJob,
  DDDRestoreOperation,
  DDDBackupPolicy,
  DDDBackupVerification,
  BackupManager,
  createBackupManagerRouter,
};
