'use strict';

/**
 * DDD Data Migration Engine
 * ═══════════════════════════════════════════════════════════════════════
 * Schema migration engine with data transformations, version tracking,
 * rollback support, and migration history.
 *
 * Features:
 *  - Migration definition & registration
 *  - Up / down (rollback) lifecycle
 *  - Dry-run mode
 *  - Batch execution & ordering
 *  - Data transformation helpers
 *  - Lock mechanism to prevent concurrent migrations
 *  - Full history & audit trail
 *
 * @module dddDataMigration
 */

const mongoose = require('mongoose');
const { Router } = require('express');

/* ═══════════════════════════════════════════════════════════════════════
   1. Models
   ═══════════════════════════════════════════════════════════════════════ */
const migrationSchema = new mongoose.Schema(
  {
    migrationId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: String,
    version: { type: String, required: true },
    domain: String,
    batch: { type: Number, default: 1 },
    order: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'rolled-back'],
      default: 'pending',
    },

    type: {
      type: String,
      enum: ['schema', 'data', 'index', 'seed', 'cleanup', 'transform'],
      default: 'data',
    },

    /* Execution record */
    startedAt: Date,
    completedAt: Date,
    duration: Number, // ms
    recordsAffected: { type: Number, default: 0 },
    error: String,
    dryRun: { type: Boolean, default: false },

    /* Rollback */
    rollbackAt: Date,
    rollbackBy: { type: mongoose.Schema.Types.ObjectId },
    rollbackError: String,

    executedBy: { type: mongoose.Schema.Types.ObjectId },
    metadata: mongoose.Schema.Types.Mixed,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

migrationSchema.index({ status: 1, batch: 1 });
migrationSchema.index({ domain: 1, version: 1 });

const DDDMigration =
  mongoose.models.DDDMigration || mongoose.model('DDDMigration', migrationSchema);

/* ── Migration Lock ── */
const migrationLockSchema = new mongoose.Schema(
  {
    lockKey: { type: String, default: 'ddd-migration-lock', unique: true },
    lockedBy: String,
    lockedAt: { type: Date, default: Date.now },
    expiresAt: Date,
  },
  { timestamps: true }
);

const DDDMigrationLock =
  mongoose.models.DDDMigrationLock || mongoose.model('DDDMigrationLock', migrationLockSchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. Builtin Migration Definitions
   ═══════════════════════════════════════════════════════════════════════ */
const BUILTIN_MIGRATIONS = [
  {
    migrationId: 'mig-001-beneficiary-add-riskLevel',
    name: 'Add riskLevel field to Beneficiary',
    version: '2.0.0',
    domain: 'core',
    type: 'schema',
    order: 1,
    up: async dryRun => {
      const model = mongoose.models.Beneficiary;
      if (!model) return { affected: 0 };
      if (dryRun) {
        const count = await model.countDocuments({ riskLevel: { $exists: false } });
        return { affected: count };
      }
      const result = await model.updateMany(
        { riskLevel: { $exists: false } },
        { $set: { riskLevel: 'low' } }
      );
      return { affected: result.modifiedCount };
    },
    down: async () => {
      const model = mongoose.models.Beneficiary;
      if (!model) return { affected: 0 };
      const result = await model.updateMany({}, { $unset: { riskLevel: '' } });
      return { affected: result.modifiedCount };
    },
  },
  {
    migrationId: 'mig-002-episode-phase-index',
    name: 'Add compound index on EpisodeOfCare (beneficiary + phase)',
    version: '2.0.0',
    domain: 'episodes',
    type: 'index',
    order: 2,
    up: async dryRun => {
      if (dryRun) return { affected: 0 };
      const model = mongoose.models.EpisodeOfCare;
      if (!model) return { affected: 0 };
      await model.collection.createIndex({ beneficiary: 1, currentPhase: 1 });
      return { affected: 1 };
    },
    down: async () => {
      const model = mongoose.models.EpisodeOfCare;
      if (!model) return { affected: 0 };
      try {
        await model.collection.dropIndex('beneficiary_1_currentPhase_1');
      } catch {
        /* index may not exist */
      }
      return { affected: 1 };
    },
  },
  {
    migrationId: 'mig-003-session-normalize-status',
    name: 'Normalize ClinicalSession status values',
    version: '2.0.0',
    domain: 'sessions',
    type: 'data',
    order: 3,
    up: async dryRun => {
      const model = mongoose.models.ClinicalSession;
      if (!model) return { affected: 0 };
      const mapping = { 'in-progress': 'in_progress', cancelled: 'canceled' };
      let total = 0;
      for (const [from, to] of Object.entries(mapping)) {
        if (dryRun) {
          total += await model.countDocuments({ status: from });
        } else {
          const r = await model.updateMany({ status: from }, { $set: { status: to } });
          total += r.modifiedCount;
        }
      }
      return { affected: total };
    },
    down: async () => ({ affected: 0 }),
  },
  {
    migrationId: 'mig-004-goals-add-progressHistory',
    name: 'Initialize progressHistory on TherapeuticGoal',
    version: '2.0.0',
    domain: 'goals',
    type: 'schema',
    order: 4,
    up: async dryRun => {
      const model = mongoose.models.TherapeuticGoal;
      if (!model) return { affected: 0 };
      if (dryRun)
        return { affected: await model.countDocuments({ progressHistory: { $exists: false } }) };
      const r = await model.updateMany(
        { progressHistory: { $exists: false } },
        { $set: { progressHistory: [] } }
      );
      return { affected: r.modifiedCount };
    },
    down: async () => {
      const model = mongoose.models.TherapeuticGoal;
      if (!model) return { affected: 0 };
      const r = await model.updateMany({}, { $unset: { progressHistory: '' } });
      return { affected: r.modifiedCount };
    },
  },
  {
    migrationId: 'mig-005-workflow-createdAt-index',
    name: 'Add index on WorkflowTask createdAt',
    version: '2.0.0',
    domain: 'workflow',
    type: 'index',
    order: 5,
    up: async dryRun => {
      if (dryRun) return { affected: 0 };
      const model = mongoose.models.WorkflowTask;
      if (!model) return { affected: 0 };
      await model.collection.createIndex({ createdAt: -1 });
      return { affected: 1 };
    },
    down: async () => ({ affected: 0 }),
  },
  {
    migrationId: 'mig-006-assessment-scores-default',
    name: 'Set default scores object on assessments',
    version: '2.0.0',
    domain: 'assessments',
    type: 'data',
    order: 6,
    up: async dryRun => {
      const model = mongoose.models.ClinicalAssessment;
      if (!model) return { affected: 0 };
      if (dryRun) return { affected: await model.countDocuments({ scores: { $exists: false } }) };
      const r = await model.updateMany({ scores: { $exists: false } }, { $set: { scores: {} } });
      return { affected: r.modifiedCount };
    },
    down: async () => ({ affected: 0 }),
  },
  {
    migrationId: 'mig-007-family-language-pref',
    name: 'Add languagePreference to FamilyMember',
    version: '2.1.0',
    domain: 'family',
    type: 'schema',
    order: 7,
    up: async dryRun => {
      const model = mongoose.models.FamilyMember;
      if (!model) return { affected: 0 };
      if (dryRun)
        return { affected: await model.countDocuments({ languagePreference: { $exists: false } }) };
      const r = await model.updateMany(
        { languagePreference: { $exists: false } },
        { $set: { languagePreference: 'ar' } }
      );
      return { affected: r.modifiedCount };
    },
    down: async () => {
      const model = mongoose.models.FamilyMember;
      if (!model) return { affected: 0 };
      const r = await model.updateMany({}, { $unset: { languagePreference: '' } });
      return { affected: r.modifiedCount };
    },
  },
  {
    migrationId: 'mig-008-cleanup-soft-deleted',
    name: 'Archive soft-deleted records older than 1 year',
    version: '2.1.0',
    domain: '*',
    type: 'cleanup',
    order: 8,
    up: async dryRun => {
      const cutoff = new Date(Date.now() - 365 * 86400000);
      let total = 0;
      const models = ['Beneficiary', 'ClinicalSession', 'WorkflowTask'];
      for (const name of models) {
        const model = mongoose.models[name];
        if (!model) continue;
        if (dryRun) {
          total += await model.countDocuments({ isDeleted: true, updatedAt: { $lt: cutoff } });
        } else {
          const r = await model.deleteMany({ isDeleted: true, updatedAt: { $lt: cutoff } });
          total += r.deletedCount;
        }
      }
      return { affected: total };
    },
    down: async () => ({ affected: 0, note: 'Cleanup is irreversible' }),
  },
  {
    migrationId: 'mig-009-quality-add-complianceScore',
    name: 'Add complianceScore to QualityAudit',
    version: '2.1.0',
    domain: 'quality',
    type: 'schema',
    order: 9,
    up: async dryRun => {
      const model = mongoose.models.QualityAudit;
      if (!model) return { affected: 0 };
      if (dryRun)
        return { affected: await model.countDocuments({ complianceScore: { $exists: false } }) };
      const r = await model.updateMany(
        { complianceScore: { $exists: false } },
        { $set: { complianceScore: 0 } }
      );
      return { affected: r.modifiedCount };
    },
    down: async () => {
      const model = mongoose.models.QualityAudit;
      if (!model) return { affected: 0 };
      const r = await model.updateMany({}, { $unset: { complianceScore: '' } });
      return { affected: r.modifiedCount };
    },
  },
  {
    migrationId: 'mig-010-kpi-snapshot-ttl',
    name: 'Add TTL index on KPISnapshot',
    version: '2.1.0',
    domain: 'dashboards',
    type: 'index',
    order: 10,
    up: async dryRun => {
      if (dryRun) return { affected: 0 };
      const model = mongoose.models.KPISnapshot;
      if (!model) return { affected: 0 };
      try {
        await model.collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 90 * 86400 });
      } catch {
        /* index may already exist */
      }
      return { affected: 1 };
    },
    down: async () => ({ affected: 0 }),
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   3. Lock Management
   ═══════════════════════════════════════════════════════════════════════ */
async function acquireLock(lockedBy = 'system', ttlMs = 300000) {
  const expiresAt = new Date(Date.now() + ttlMs);
  try {
    await DDDMigrationLock.findOneAndUpdate(
      {
        lockKey: 'ddd-migration-lock',
        $or: [{ expiresAt: { $lt: new Date() } }, { expiresAt: null }],
      },
      { lockedBy, lockedAt: new Date(), expiresAt },
      { upsert: true }
    );
    return true;
  } catch {
    return false;
  }
}

async function releaseLock() {
  await DDDMigrationLock.deleteOne({ lockKey: 'ddd-migration-lock' });
}

/* ═══════════════════════════════════════════════════════════════════════
   4. Migration Execution
   ═══════════════════════════════════════════════════════════════════════ */
async function runMigration(migDef, options = {}) {
  const { dryRun = false, executedBy } = options;

  /* Register or find existing */
  let record = await DDDMigration.findOne({ migrationId: migDef.migrationId });
  if (record && record.status === 'completed' && !dryRun) {
    return { skipped: true, migrationId: migDef.migrationId, reason: 'already-completed' };
  }

  if (!record) {
    record = await DDDMigration.create({
      migrationId: migDef.migrationId,
      name: migDef.name,
      version: migDef.version,
      domain: migDef.domain,
      type: migDef.type,
      order: migDef.order,
      batch: migDef.batch || 1,
    });
  }

  record.status = 'running';
  record.startedAt = new Date();
  record.dryRun = dryRun;
  record.executedBy = executedBy;
  await record.save();

  try {
    const result = await migDef.up(dryRun);
    record.status = dryRun ? 'pending' : 'completed';
    record.completedAt = new Date();
    record.duration = Date.now() - record.startedAt.getTime();
    record.recordsAffected = result?.affected || 0;
    await record.save();
    return { success: true, migrationId: migDef.migrationId, dryRun, ...result };
  } catch (err) {
    record.status = 'failed';
    record.error = err.message;
    record.completedAt = new Date();
    record.duration = Date.now() - record.startedAt.getTime();
    await record.save();
    return { success: false, migrationId: migDef.migrationId, error: err.message };
  }
}

async function rollbackMigration(migrationId, options = {}) {
  const { rollbackBy } = options;
  const record = await DDDMigration.findOne({ migrationId });
  if (!record) return { success: false, error: 'Migration not found' };

  const migDef = BUILTIN_MIGRATIONS.find(m => m.migrationId === migrationId);
  if (!migDef || !migDef.down) return { success: false, error: 'No rollback function available' };

  try {
    const result = await migDef.down();
    record.status = 'rolled-back';
    record.rollbackAt = new Date();
    record.rollbackBy = rollbackBy;
    await record.save();
    return { success: true, migrationId, ...result };
  } catch (err) {
    record.rollbackError = err.message;
    await record.save();
    return { success: false, migrationId, error: err.message };
  }
}

async function runAllPending(options = {}) {
  const locked = await acquireLock(options.lockedBy || 'auto');
  if (!locked) return { success: false, error: 'Migration lock held by another process' };

  try {
    const completed = await DDDMigration.find({ status: 'completed' }).distinct('migrationId');
    const pending = BUILTIN_MIGRATIONS.filter(m => !completed.includes(m.migrationId)).sort(
      (a, b) => a.order - b.order
    );

    const results = [];
    for (const mig of pending) {
      results.push(await runMigration(mig, options));
    }
    return { success: true, total: results.length, results };
  } finally {
    await releaseLock();
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   5. Migration Dashboard
   ═══════════════════════════════════════════════════════════════════════ */
async function getMigrationDashboard() {
  const [all, byStatus, recent] = await Promise.all([
    DDDMigration.countDocuments({ isDeleted: { $ne: true } }),
    DDDMigration.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    DDDMigration.find({ isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
  ]);

  const pending = BUILTIN_MIGRATIONS.filter(
    m => !recent.some(r => r.migrationId === m.migrationId && r.status === 'completed')
  );

  return {
    totalRecorded: all,
    byStatus: byStatus.reduce((m, r) => ({ ...m, [r._id]: r.count }), {}),
    pendingCount: pending.length,
    pendingMigrations: pending.map(m => ({ id: m.migrationId, name: m.name, version: m.version })),
    recentHistory: recent,
    builtinTotal: BUILTIN_MIGRATIONS.length,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   6. Router
   ═══════════════════════════════════════════════════════════════════════ */
function createDataMigrationRouter() {
  const router = Router();

  /* Dashboard */
  router.get('/migrations/dashboard', async (_req, res) => {
    try {
      res.json({ success: true, ...(await getMigrationDashboard()) });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* List all migrations */
  router.get('/migrations', async (req, res) => {
    try {
      const query = { isDeleted: { $ne: true } };
      if (req.query.status) query.status = req.query.status;
      if (req.query.domain) query.domain = req.query.domain;
      const list = await DDDMigration.find(query).sort({ order: 1 }).lean();
      res.json({ success: true, count: list.length, migrations: list });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Run all pending */
  router.post('/migrations/run', async (req, res) => {
    try {
      const result = await runAllPending({
        dryRun: req.body.dryRun === true,
        executedBy: req.user?._id,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Run single migration */
  router.post('/migrations/:migrationId/run', async (req, res) => {
    try {
      const migDef = BUILTIN_MIGRATIONS.find(m => m.migrationId === req.params.migrationId);
      if (!migDef) return res.status(404).json({ success: false, error: 'Migration not found' });
      const result = await runMigration(migDef, {
        dryRun: req.body.dryRun === true,
        executedBy: req.user?._id,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Rollback */
  router.post('/migrations/:migrationId/rollback', async (req, res) => {
    try {
      const result = await rollbackMigration(req.params.migrationId, {
        rollbackBy: req.user?._id,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Dry run all */
  router.post('/migrations/dry-run', async (req, res) => {
    try {
      const result = await runAllPending({ dryRun: true, executedBy: req.user?._id });
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════
   Exports
   ═══════════════════════════════════════════════════════════════════════ */
module.exports = {
  DDDMigration,
  DDDMigrationLock,
  BUILTIN_MIGRATIONS,
  acquireLock,
  releaseLock,
  runMigration,
  rollbackMigration,
  runAllPending,
  getMigrationDashboard,
  createDataMigrationRouter,
};
