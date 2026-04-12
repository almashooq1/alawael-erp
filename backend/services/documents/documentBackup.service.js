/**
 * Document Backup & Recovery Service — خدمة النسخ الاحتياطي والاسترداد
 * ──────────────────────────────────────────────────────────────────
 * نسخ تلقائي • استرداد زمني • لقطات (snapshots) • سياسات احتفاظ
 * التحقق من سلامة النسخ • جدولة النسخ • تقارير
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const logger = require('../../utils/logger');

/* ══════════════════════════════════════════════════════════════
   MODELS
   ══════════════════════════════════════════════════════════════ */

const backupJobSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['full', 'incremental', 'differential', 'snapshot'],
      default: 'full',
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    priority: { type: String, enum: ['urgent', 'high', 'normal', 'low'], default: 'normal' },

    scope: {
      type: { type: String, enum: ['all', 'collection', 'query', 'documents'], default: 'all' },
      collections: [String],
      query: { type: mongoose.Schema.Types.Mixed },
      documentIds: [{ type: mongoose.Schema.Types.ObjectId }],
      departments: [String],
      categories: [String],
    },

    stats: {
      totalDocuments: { type: Number, default: 0 },
      totalSize: { type: Number, default: 0 }, // bytes
      compressedSize: { type: Number, default: 0 },
      processedDocs: { type: Number, default: 0 },
      failedDocs: { type: Number, default: 0 },
      skippedDocs: { type: Number, default: 0 },
    },

    progress: { type: Number, default: 0, min: 0, max: 100 },
    checksum: String,
    storageLocation: String,
    compressionType: { type: String, enum: ['none', 'gzip', 'lz4', 'zstd'], default: 'gzip' },
    encrypted: { type: Boolean, default: false },

    startedAt: Date,
    completedAt: Date,
    duration: Number, // seconds
    expiresAt: Date,

    schedule: {
      enabled: { type: Boolean, default: false },
      cron: String,
      timezone: { type: String, default: 'Asia/Riyadh' },
      lastRun: Date,
      nextRun: Date,
    },

    retentionPolicy: {
      keepDays: { type: Number, default: 30 },
      keepWeekly: { type: Number, default: 4 },
      keepMonthly: { type: Number, default: 12 },
      keepYearly: { type: Number, default: 3 },
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    error: String,
    logs: [{ message: String, level: String, timestamp: { type: Date, default: Date.now } }],
  },
  { timestamps: true, collection: 'backup_jobs' }
);

backupJobSchema.index({ status: 1, createdAt: -1 });
backupJobSchema.index({ type: 1 });
backupJobSchema.index({ expiresAt: 1 });

const BackupJob = mongoose.models.BackupJob || mongoose.model('BackupJob', backupJobSchema);

/* ─── Recovery Job ─── */
const recoveryJobSchema = new mongoose.Schema(
  {
    backupId: { type: mongoose.Schema.Types.ObjectId, ref: 'BackupJob', required: true },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    type: { type: String, enum: ['full', 'selective', 'point_in_time'], default: 'full' },

    scope: {
      documentIds: [{ type: mongoose.Schema.Types.ObjectId }],
      collections: [String],
      restorePoint: Date,
    },

    options: {
      overwriteExisting: { type: Boolean, default: false },
      restoreMetadata: { type: Boolean, default: true },
      restorePermissions: { type: Boolean, default: true },
      dryRun: { type: Boolean, default: false },
      targetCollection: String,
    },

    stats: {
      totalDocuments: { type: Number, default: 0 },
      restoredDocs: { type: Number, default: 0 },
      failedDocs: { type: Number, default: 0 },
      skippedDocs: { type: Number, default: 0 },
      conflictDocs: { type: Number, default: 0 },
    },

    progress: { type: Number, default: 0 },
    startedAt: Date,
    completedAt: Date,
    duration: Number,
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    error: String,
    logs: [{ message: String, level: String, timestamp: { type: Date, default: Date.now } }],
  },
  { timestamps: true, collection: 'recovery_jobs' }
);

recoveryJobSchema.index({ backupId: 1 });
recoveryJobSchema.index({ status: 1, createdAt: -1 });

const RecoveryJob = mongoose.models.RecoveryJob || mongoose.model('RecoveryJob', recoveryJobSchema);

/* ─── Snapshot ─── */
const snapshotSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    version: { type: Number, default: 1 },
    name: String,
    description: String,
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    checksum: String,
    size: Number,
    tags: [String],
    autoCreated: { type: Boolean, default: false },
    trigger: String, // what triggered the snapshot
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    expiresAt: Date,
  },
  { timestamps: true, collection: 'document_snapshots' }
);

snapshotSchema.index({ documentId: 1, version: -1 });
snapshotSchema.index({ createdAt: -1 });
snapshotSchema.index({ expiresAt: 1 });

const Snapshot = mongoose.models.DocSnapshot || mongoose.model('DocSnapshot', snapshotSchema);

/* ─── Backup Policy ─── */
const backupPolicySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: String,
    description: String,
    isActive: { type: Boolean, default: true },

    schedule: {
      frequency: { type: String, enum: ['hourly', 'daily', 'weekly', 'monthly'], default: 'daily' },
      time: { type: String, default: '02:00' }, // HH:mm
      dayOfWeek: { type: Number, min: 0, max: 6 },
      dayOfMonth: { type: Number, min: 1, max: 28 },
      timezone: { type: String, default: 'Asia/Riyadh' },
    },

    scope: {
      type: { type: String, enum: ['all', 'collection', 'query'], default: 'all' },
      collections: [String],
      query: mongoose.Schema.Types.Mixed,
    },

    backupType: { type: String, enum: ['full', 'incremental', 'differential'], default: 'full' },
    compression: { type: String, enum: ['none', 'gzip', 'lz4'], default: 'gzip' },
    encryption: { type: Boolean, default: true },

    retention: {
      keepDays: { type: Number, default: 30 },
      keepWeekly: { type: Number, default: 4 },
      keepMonthly: { type: Number, default: 12 },
      maxBackups: { type: Number, default: 100 },
    },

    notifications: {
      onSuccess: { type: Boolean, default: false },
      onFailure: { type: Boolean, default: true },
      recipients: [String],
    },

    lastRun: Date,
    nextRun: Date,
    runCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'backup_policies' }
);

const BackupPolicy =
  mongoose.models.BackupPolicy || mongoose.model('BackupPolicy', backupPolicySchema);

/* ══════════════════════════════════════════════════════════════
   SERVICE
   ══════════════════════════════════════════════════════════════ */

class DocumentBackupService {
  /* ══════ Backup Jobs ══════ */

  async createBackup(data, userId) {
    const job = await BackupJob.create({
      ...data,
      createdBy: userId,
      logs: [{ message: 'تم إنشاء مهمة النسخ الاحتياطي', level: 'info' }],
    });

    // Start backup process
    this._runBackup(job._id).catch(err => {
      logger.error('Backup failed:', err);
    });

    return { success: true, job };
  }

  async _runBackup(jobId) {
    const job = await BackupJob.findById(jobId);
    if (!job) return;

    job.status = 'running';
    job.startedAt = new Date();
    job.logs.push({ message: 'بدء عملية النسخ الاحتياطي', level: 'info' });
    await job.save();

    try {
      // Build query
      let query = {};
      if (job.scope?.type === 'documents' && job.scope.documentIds?.length) {
        query._id = { $in: job.scope.documentIds };
      } else if (job.scope?.query) {
        query = job.scope.query;
      }

      // Get documents
      const Document = mongoose.model('Document');
      const docs = await Document.find(query).lean();

      job.stats.totalDocuments = docs.length;
      job.logs.push({ message: `تم العثور على ${docs.length} مستند`, level: 'info' });

      let totalSize = 0;
      let processed = 0;
      let failed = 0;

      for (const doc of docs) {
        try {
          const docJson = JSON.stringify(doc);
          const docSize = Buffer.byteLength(docJson, 'utf8');
          totalSize += docSize;
          processed++;

          // Create snapshot for each document
          const lastSnap = await Snapshot.findOne({ documentId: doc._id }).sort({ version: -1 });
          const nextVersion = (lastSnap?.version || 0) + 1;

          await Snapshot.create({
            documentId: doc._id,
            version: nextVersion,
            name: `Backup-${job.name}-v${nextVersion}`,
            data: doc,
            checksum: crypto.createHash('sha256').update(docJson).digest('hex'),
            size: docSize,
            autoCreated: true,
            trigger: `backup:${job._id}`,
            expiresAt: job.retentionPolicy?.keepDays
              ? new Date(Date.now() + job.retentionPolicy.keepDays * 86400000)
              : undefined,
          });

          job.progress = Math.round((processed / docs.length) * 100);
          if (processed % 50 === 0) await job.save(); // periodic save
        } catch (e) {
          failed++;
          job.logs.push({ message: `خطأ في المستند ${doc._id}: ${e.message}`, level: 'error' });
        }
      }

      job.stats.processedDocs = processed;
      job.stats.failedDocs = failed;
      job.stats.totalSize = totalSize;
      job.stats.compressedSize = Math.round(totalSize * 0.4); // Simulated compression ratio
      job.checksum = crypto
        .createHash('sha256')
        .update(`${job._id}-${processed}-${totalSize}`)
        .digest('hex');
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      job.duration = Math.round((Date.now() - job.startedAt.getTime()) / 1000);
      job.logs.push({
        message: `اكتملت العملية: ${processed} مستند، ${failed} خطأ`,
        level: 'info',
      });
    } catch (err) {
      job.status = 'failed';
      job.error = err.message;
      job.logs.push({ message: `فشل: ${err.message}`, level: 'error' });
    }

    await job.save();
  }

  async getBackup(jobId) {
    const job = await BackupJob.findById(jobId).populate('createdBy', 'name email');
    if (!job) throw new Error('مهمة النسخ الاحتياطي غير موجودة');
    return { success: true, job };
  }

  async getBackups(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;

    const [backups, total] = await Promise.all([
      BackupJob.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('createdBy', 'name')
        .lean(),
      BackupJob.countDocuments(query),
    ]);
    return { success: true, backups, total, page, pages: Math.ceil(total / limit) };
  }

  async cancelBackup(jobId) {
    const job = await BackupJob.findById(jobId);
    if (!job) throw new Error('المهمة غير موجودة');
    if (!['pending', 'running'].includes(job.status)) throw new Error('لا يمكن إلغاء هذه المهمة');
    job.status = 'cancelled';
    job.logs.push({ message: 'تم إلغاء المهمة', level: 'warn' });
    await job.save();
    return { success: true };
  }

  async deleteBackup(jobId) {
    // Delete related snapshots
    const job = await BackupJob.findById(jobId);
    if (job) {
      await Snapshot.deleteMany({ trigger: `backup:${job._id}` });
    }
    await BackupJob.findByIdAndDelete(jobId);
    return { success: true };
  }

  async verifyBackup(jobId) {
    const job = await BackupJob.findById(jobId);
    if (!job) throw new Error('المهمة غير موجودة');
    if (job.status !== 'completed') throw new Error('النسخة غير مكتملة');

    const snapshots = await Snapshot.find({ trigger: `backup:${job._id}` });
    let verified = 0;
    let corrupted = 0;

    for (const snap of snapshots) {
      const dataJson = JSON.stringify(snap.data);
      const checksum = crypto.createHash('sha256').update(dataJson).digest('hex');
      if (checksum === snap.checksum) verified++;
      else corrupted++;
    }

    return {
      success: true,
      totalSnapshots: snapshots.length,
      verified,
      corrupted,
      isIntact: corrupted === 0,
    };
  }

  /* ══════ Recovery ══════ */

  async createRecovery(backupId, options = {}, userId) {
    const backup = await BackupJob.findById(backupId);
    if (!backup) throw new Error('النسخة الاحتياطية غير موجودة');
    if (backup.status !== 'completed') throw new Error('النسخة غير مكتملة');

    const recovery = await RecoveryJob.create({
      backupId,
      type: options.type || 'full',
      scope: options.scope || {},
      options: options.options || {},
      requestedBy: userId,
      logs: [{ message: 'تم إنشاء مهمة الاسترداد', level: 'info' }],
    });

    // Run recovery
    this._runRecovery(recovery._id).catch(err => {
      logger.error('Recovery failed:', err);
    });

    return { success: true, recovery };
  }

  async _runRecovery(recoveryId) {
    const recovery = await RecoveryJob.findById(recoveryId);
    if (!recovery) return;

    recovery.status = 'running';
    recovery.startedAt = new Date();
    recovery.logs.push({ message: 'بدء عملية الاسترداد', level: 'info' });
    await recovery.save();

    try {
      const backup = await BackupJob.findById(recovery.backupId);
      const snapshots = await Snapshot.find({ trigger: `backup:${backup._id}` });

      // Filter if selective
      let targetSnapshots = snapshots;
      if (recovery.type === 'selective' && recovery.scope?.documentIds?.length) {
        const idSet = new Set(recovery.scope.documentIds.map(String));
        targetSnapshots = snapshots.filter(s => idSet.has(String(s.documentId)));
      }

      recovery.stats.totalDocuments = targetSnapshots.length;
      let restored = 0,
        failed = 0,
        skipped = 0,
        conflicts = 0;

      const Document = mongoose.model('Document');

      for (const snap of targetSnapshots) {
        try {
          if (recovery.options?.dryRun) {
            restored++;
            continue;
          }

          const existing = await Document.findById(snap.documentId);
          if (existing && !recovery.options?.overwriteExisting) {
            conflicts++;
            skipped++;
            continue;
          }

          if (existing) {
            // Create snapshot before overwriting
            const lastSnap2 = await Snapshot.findOne({ documentId: snap.documentId }).sort({
              version: -1,
            });
            await Snapshot.create({
              documentId: snap.documentId,
              version: (lastSnap2?.version || 0) + 1,
              name: 'Pre-recovery snapshot',
              data: existing.toObject(),
              checksum: crypto
                .createHash('sha256')
                .update(JSON.stringify(existing.toObject()))
                .digest('hex'),
              autoCreated: true,
              trigger: `recovery:${recovery._id}`,
            });

            await Document.findByIdAndUpdate(snap.documentId, { $set: snap.data });
          } else {
            await Document.create(snap.data);
          }
          restored++;
          recovery.progress = Math.round((restored / targetSnapshots.length) * 100);
        } catch (e) {
          failed++;
          recovery.logs.push({ message: `خطأ: ${snap.documentId}: ${e.message}`, level: 'error' });
        }
      }

      recovery.stats.restoredDocs = restored;
      recovery.stats.failedDocs = failed;
      recovery.stats.skippedDocs = skipped;
      recovery.stats.conflictDocs = conflicts;
      recovery.status = 'completed';
      recovery.progress = 100;
      recovery.completedAt = new Date();
      recovery.duration = Math.round((Date.now() - recovery.startedAt.getTime()) / 1000);
      recovery.logs.push({ message: `اكتمل الاسترداد: ${restored} مستند`, level: 'info' });
    } catch (err) {
      recovery.status = 'failed';
      recovery.error = err.message;
      recovery.logs.push({ message: `فشل: ${err.message}`, level: 'error' });
    }

    await recovery.save();
  }

  async getRecovery(recoveryId) {
    const recovery = await RecoveryJob.findById(recoveryId)
      .populate('backupId', 'name type')
      .populate('requestedBy', 'name email');
    if (!recovery) throw new Error('مهمة الاسترداد غير موجودة');
    return { success: true, recovery };
  }

  async getRecoveries(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.backupId) query.backupId = filters.backupId;

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;

    const [recoveries, total] = await Promise.all([
      RecoveryJob.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('backupId', 'name type')
        .populate('requestedBy', 'name')
        .lean(),
      RecoveryJob.countDocuments(query),
    ]);
    return { success: true, recoveries, total, page, pages: Math.ceil(total / limit) };
  }

  /* ══════ Snapshots ══════ */

  async createSnapshot(documentId, data = {}, userId) {
    const doc = await mongoose.model('Document').findById(documentId).lean();
    if (!doc) throw new Error('المستند غير موجود');

    const lastSnap = await Snapshot.findOne({ documentId }).sort({ version: -1 });
    const version = (lastSnap?.version || 0) + 1;
    const dataJson = JSON.stringify(doc);

    const snapshot = await Snapshot.create({
      documentId,
      version,
      name: data.name || `لقطة v${version}`,
      description: data.description,
      data: doc,
      checksum: crypto.createHash('sha256').update(dataJson).digest('hex'),
      size: Buffer.byteLength(dataJson, 'utf8'),
      tags: data.tags || [],
      autoCreated: false,
      trigger: 'manual',
      createdBy: userId,
      expiresAt: data.expiresAt,
    });

    return { success: true, snapshot };
  }

  async getSnapshots(documentId, filters = {}) {
    const query = { documentId };
    if (filters.tags?.length) query.tags = { $in: filters.tags };

    const snapshots = await Snapshot.find(query)
      .sort({ version: -1 })
      .populate('createdBy', 'name')
      .lean();

    return { success: true, snapshots };
  }

  async getSnapshot(snapshotId) {
    const snapshot = await Snapshot.findById(snapshotId).populate('createdBy', 'name email');
    if (!snapshot) throw new Error('اللقطة غير موجودة');
    return { success: true, snapshot };
  }

  async restoreSnapshot(snapshotId, userId) {
    const snapshot = await Snapshot.findById(snapshotId);
    if (!snapshot) throw new Error('اللقطة غير موجودة');

    const Document = mongoose.model('Document');
    const existing = await Document.findById(snapshot.documentId);

    if (existing) {
      // Save current state first
      const currentJson = JSON.stringify(existing.toObject());
      const lastSnap = await Snapshot.findOne({ documentId: snapshot.documentId }).sort({
        version: -1,
      });
      await Snapshot.create({
        documentId: snapshot.documentId,
        version: (lastSnap?.version || 0) + 1,
        name: 'قبل الاسترداد',
        data: existing.toObject(),
        checksum: crypto.createHash('sha256').update(currentJson).digest('hex'),
        size: Buffer.byteLength(currentJson, 'utf8'),
        autoCreated: true,
        trigger: `restore:${snapshotId}`,
        createdBy: userId,
      });

      await Document.findByIdAndUpdate(snapshot.documentId, { $set: snapshot.data });
    }

    return { success: true, restored: true, documentId: snapshot.documentId };
  }

  async deleteSnapshot(snapshotId) {
    await Snapshot.findByIdAndDelete(snapshotId);
    return { success: true };
  }

  async compareSnapshots(snapshotId1, snapshotId2) {
    const [s1, s2] = await Promise.all([
      Snapshot.findById(snapshotId1).lean(),
      Snapshot.findById(snapshotId2).lean(),
    ]);
    if (!s1 || !s2) throw new Error('اللقطة غير موجودة');

    const changes = [];
    const d1 = s1.data || {};
    const d2 = s2.data || {};

    const allKeys = new Set([...Object.keys(d1), ...Object.keys(d2)]);
    for (const key of allKeys) {
      if (key === '_id' || key === '__v') continue;
      const v1 = JSON.stringify(d1[key]);
      const v2 = JSON.stringify(d2[key]);
      if (v1 !== v2) {
        changes.push({
          field: key,
          oldValue: d1[key],
          newValue: d2[key],
          type: !d1[key] ? 'added' : !d2[key] ? 'removed' : 'modified',
        });
      }
    }

    return {
      success: true,
      snapshot1: { id: s1._id, version: s1.version, createdAt: s1.createdAt },
      snapshot2: { id: s2._id, version: s2.version, createdAt: s2.createdAt },
      changes,
      totalChanges: changes.length,
    };
  }

  /* ══════ Backup Policies ══════ */

  async createPolicy(data, userId) {
    const policy = await BackupPolicy.create({ ...data, createdBy: userId });
    return { success: true, policy };
  }

  async updatePolicy(policyId, data) {
    const policy = await BackupPolicy.findByIdAndUpdate(policyId, { $set: data }, { new: true });
    if (!policy) throw new Error('السياسة غير موجودة');
    return { success: true, policy };
  }

  async getPolicies(filters = {}) {
    const query = {};
    if (filters.active !== undefined) query.isActive = filters.active;
    const policies = await BackupPolicy.find(query).sort({ createdAt: -1 }).lean();
    return { success: true, policies };
  }

  async deletePolicy(policyId) {
    await BackupPolicy.findByIdAndUpdate(policyId, { isActive: false });
    return { success: true };
  }

  async runPolicy(policyId, userId) {
    const policy = await BackupPolicy.findById(policyId);
    if (!policy) throw new Error('السياسة غير موجودة');

    const result = await this.createBackup(
      {
        name: `${policy.name} — ${new Date().toLocaleDateString('ar-SA')}`,
        type: policy.backupType,
        scope: policy.scope,
        compressionType: policy.compression,
        encrypted: policy.encryption,
        retentionPolicy: policy.retention,
      },
      userId
    );

    policy.lastRun = new Date();
    policy.runCount++;
    await policy.save();

    return result;
  }

  /* ══════ Cleanup ══════ */

  async cleanupExpired() {
    const now = new Date();
    const expired = await Snapshot.deleteMany({ expiresAt: { $lt: now } });
    const expiredBackups = await BackupJob.deleteMany({ expiresAt: { $lt: now } });
    return {
      success: true,
      deletedSnapshots: expired.deletedCount,
      deletedBackups: expiredBackups.deletedCount,
    };
  }

  /* ══════ Stats ══════ */

  async getStats() {
    const [
      totalBackups,
      completedBackups,
      totalRecoveries,
      totalSnapshots,
      policies,
      sizeStats,
      recentBackups,
    ] = await Promise.all([
      BackupJob.countDocuments(),
      BackupJob.countDocuments({ status: 'completed' }),
      RecoveryJob.countDocuments(),
      Snapshot.countDocuments(),
      BackupPolicy.countDocuments({ isActive: true }),
      BackupJob.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: null,
            totalSize: { $sum: '$stats.totalSize' },
            compressedSize: { $sum: '$stats.compressedSize' },
            totalDocs: { $sum: '$stats.processedDocs' },
          },
        },
      ]),
      BackupJob.find({ status: 'completed' })
        .sort({ completedAt: -1 })
        .limit(5)
        .select('name type completedAt stats.totalDocuments duration')
        .lean(),
    ]);

    return {
      success: true,
      totalBackups,
      completedBackups,
      failedBackups: totalBackups - completedBackups,
      totalRecoveries,
      totalSnapshots,
      activePolicies: policies,
      totalBackupSize: sizeStats[0]?.totalSize || 0,
      compressedSize: sizeStats[0]?.compressedSize || 0,
      totalDocsBacked: sizeStats[0]?.totalDocs || 0,
      compressionRatio: sizeStats[0]?.totalSize
        ? Math.round((1 - sizeStats[0].compressedSize / sizeStats[0].totalSize) * 100)
        : 0,
      recentBackups,
    };
  }
}

module.exports = new DocumentBackupService();
