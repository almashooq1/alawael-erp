/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Disaster Recovery — Phase 23 · Emergency & Incident Management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Disaster recovery planning, backup strategies, recovery testing,
 * business continuity, and recovery logging.
 *
 * Aggregates
 *   DDDRecoveryPlan     — documented disaster recovery plan
 *   DDDBackupSchedule   — scheduled backup configuration
 *   DDDRecoveryTest     — recovery test / exercise
 *   DDDRecoveryLog      — recovery execution log
 *
 * Canonical links
 *   createdBy → User
 *   planId    → DDDRecoveryPlan
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { Router } = require('express');

class BaseDomainModule {
  constructor(name, opts = {}) {
    this.name = name;
    this.opts = opts;
  }
  log(msg) {
    console.log(`[${this.name}] ${msg}`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CONSTANTS                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

const DISASTER_TYPES = [
  'natural_disaster',
  'cyber_attack',
  'hardware_failure',
  'software_failure',
  'network_outage',
  'data_corruption',
  'power_failure',
  'facility_damage',
  'ransomware',
  'human_error',
  'vendor_failure',
  'pandemic',
];

const RECOVERY_STATUSES = [
  'draft',
  'approved',
  'active',
  'triggered',
  'in_recovery',
  'partially_recovered',
  'fully_recovered',
  'post_mortem',
  'archived',
  'needs_update',
];

const BACKUP_TYPES = [
  'full_backup',
  'incremental_backup',
  'differential_backup',
  'snapshot',
  'mirror',
  'continuous_replication',
  'offsite',
  'cloud_backup',
  'tape_backup',
  'database_dump',
];

const RTO_LEVELS = [
  'immediate',
  '1_hour',
  '4_hours',
  '8_hours',
  '24_hours',
  '48_hours',
  '72_hours',
  '1_week',
  '2_weeks',
  '1_month',
];

const RPO_LEVELS = [
  'zero_loss',
  '15_minutes',
  '1_hour',
  '4_hours',
  '24_hours',
  '48_hours',
  '72_hours',
  '1_week',
];

const RECOVERY_STRATEGIES = [
  'hot_site',
  'warm_site',
  'cold_site',
  'cloud_failover',
  'mutual_agreement',
  'mobile_site',
  'hybrid_recovery',
  'containerised_failover',
];

/* ── Built-in recovery plans ────────────────────────────────────────────── */
const BUILTIN_RECOVERY_PLANS = [
  {
    code: 'DRPLAN-DB',
    name: 'Database Recovery Plan',
    nameAr: 'خطة استعادة قواعد البيانات',
    disasterType: 'data_corruption',
    rto: '4_hours',
    rpo: '15_minutes',
    strategy: 'cloud_failover',
  },
  {
    code: 'DRPLAN-NET',
    name: 'Network Recovery Plan',
    nameAr: 'خطة استعادة الشبكة',
    disasterType: 'network_outage',
    rto: '1_hour',
    rpo: '15_minutes',
    strategy: 'hot_site',
  },
  {
    code: 'DRPLAN-SRV',
    name: 'Server Recovery Plan',
    nameAr: 'خطة استعادة الخوادم',
    disasterType: 'hardware_failure',
    rto: '4_hours',
    rpo: '1_hour',
    strategy: 'cloud_failover',
  },
  {
    code: 'DRPLAN-APP',
    name: 'Application Recovery Plan',
    nameAr: 'خطة استعادة التطبيقات',
    disasterType: 'software_failure',
    rto: '8_hours',
    rpo: '4_hours',
    strategy: 'containerised_failover',
  },
  {
    code: 'DRPLAN-CYBER',
    name: 'Cyber Attack Recovery Plan',
    nameAr: 'خطة التعافي من الهجمات السيبرانية',
    disasterType: 'cyber_attack',
    rto: '24_hours',
    rpo: '1_hour',
    strategy: 'hot_site',
  },
  {
    code: 'DRPLAN-RANSOM',
    name: 'Ransomware Recovery Plan',
    nameAr: 'خطة التعافي من برامج الفدية',
    disasterType: 'ransomware',
    rto: '48_hours',
    rpo: '24_hours',
    strategy: 'cold_site',
  },
  {
    code: 'DRPLAN-POWER',
    name: 'Power Failure Recovery Plan',
    nameAr: 'خطة التعافي من انقطاع الكهرباء',
    disasterType: 'power_failure',
    rto: '1_hour',
    rpo: '15_minutes',
    strategy: 'hot_site',
  },
  {
    code: 'DRPLAN-FACIL',
    name: 'Facility Disaster Plan',
    nameAr: 'خطة كوارث المنشأة',
    disasterType: 'facility_damage',
    rto: '72_hours',
    rpo: '24_hours',
    strategy: 'mobile_site',
  },
  {
    code: 'DRPLAN-VENDOR',
    name: 'Vendor Failure Plan',
    nameAr: 'خطة فشل المورد',
    disasterType: 'vendor_failure',
    rto: '48_hours',
    rpo: '4_hours',
    strategy: 'mutual_agreement',
  },
  {
    code: 'DRPLAN-FULL',
    name: 'Full Disaster Recovery Plan',
    nameAr: 'خطة التعافي الشامل من الكوارث',
    disasterType: 'natural_disaster',
    rto: '24_hours',
    rpo: '4_hours',
    strategy: 'hybrid_recovery',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Recovery Plan ─────────────────────────────────────────────────────── */
const recoveryPlanSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },
    disasterType: { type: String, enum: DISASTER_TYPES, required: true },
    status: { type: String, enum: RECOVERY_STATUSES, default: 'draft' },
    rto: { type: String, enum: RTO_LEVELS },
    rpo: { type: String, enum: RPO_LEVELS },
    strategy: { type: String, enum: RECOVERY_STRATEGIES },
    steps: [
      {
        order: Number,
        title: String,
        description: String,
        responsible: String,
        estimatedTime: String,
      },
    ],
    dependencies: [{ system: String, criticality: String, contact: String }],
    contactList: [{ name: String, role: String, phone: String, email: String }],
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    nextReviewDate: { type: Date },
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDRecoveryPlan =
  mongoose.models.DDDRecoveryPlan || mongoose.model('DDDRecoveryPlan', recoveryPlanSchema);

/* ── Backup Schedule ───────────────────────────────────────────────────── */
const backupScheduleSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    backupType: { type: String, enum: BACKUP_TYPES, required: true },
    planId: { type: Schema.Types.ObjectId, ref: 'DDDRecoveryPlan' },
    targetSystem: { type: String, required: true },
    cronExpression: { type: String },
    frequency: { type: String },
    retentionDays: { type: Number, default: 30 },
    storageLocation: { type: String },
    encryptionEnabled: { type: Boolean, default: true },
    lastRunAt: { type: Date },
    lastStatus: { type: String, enum: ['success', 'failed', 'partial', 'running', 'skipped'] },
    nextRunAt: { type: Date },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDBackupSchedule =
  mongoose.models.DDDBackupSchedule || mongoose.model('DDDBackupSchedule', backupScheduleSchema);

/* ── Recovery Test ─────────────────────────────────────────────────────── */
const recoveryTestSchema = new Schema(
  {
    testCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    planId: { type: Schema.Types.ObjectId, ref: 'DDDRecoveryPlan' },
    type: {
      type: String,
      enum: ['full_test', 'partial_test', 'tabletop', 'simulation', 'parallel_test'],
    },
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'passed', 'failed', 'partial_pass', 'cancelled'],
    },
    scheduledDate: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    actualRto: { type: String },
    actualRpo: { type: String },
    score: { type: Number, min: 0, max: 100 },
    findings: [{ area: String, observation: String, severity: String, recommendation: String }],
    conductedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDRecoveryTest =
  mongoose.models.DDDRecoveryTest || mongoose.model('DDDRecoveryTest', recoveryTestSchema);

/* ── Recovery Log ──────────────────────────────────────────────────────── */
const recoveryLogSchema = new Schema(
  {
    logCode: { type: String, required: true, unique: true },
    planId: { type: Schema.Types.ObjectId, ref: 'DDDRecoveryPlan' },
    disasterType: { type: String, enum: DISASTER_TYPES },
    triggeredAt: { type: Date, default: Date.now },
    triggeredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: RECOVERY_STATUSES, default: 'triggered' },
    steps: [
      {
        step: Number,
        title: String,
        startedAt: Date,
        completedAt: Date,
        status: String,
        notes: String,
      },
    ],
    actualRto: { type: String },
    actualRpo: { type: String },
    dataLost: { type: Boolean, default: false },
    resolvedAt: { type: Date },
    postMortem: { type: String },
    lessonsLearned: [{ type: String }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

recoveryLogSchema.index({ triggeredAt: -1 });

const DDDRecoveryLog =
  mongoose.models.DDDRecoveryLog || mongoose.model('DDDRecoveryLog', recoveryLogSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class DisasterRecovery extends BaseDomainModule {
  constructor() {
    super('DisasterRecovery', {
      description: 'Disaster recovery planning, backups, and continuity',
      version: '1.0.0',
    });
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
  async getPlan(id) {
    return DDDRecoveryPlan.findById(id).lean();
  }
  async createPlan(data) {
    return DDDRecoveryPlan.create(data);
  }
  async updatePlan(id, data) {
    return DDDRecoveryPlan.findByIdAndUpdate(id, data, { new: true });
  }

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
  async updateBackup(id, data) {
    return DDDBackupSchedule.findByIdAndUpdate(id, data, { new: true });
  }

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
    );
  }

  /* ── Recovery Logs ── */
  async listLogs() {
    return DDDRecoveryLog.find().sort({ triggeredAt: -1 }).limit(100).lean();
  }
  async triggerRecovery(data) {
    if (!data.logCode) data.logCode = `DRLOG-${Date.now()}`;
    return DDDRecoveryLog.create(data);
  }
  async updateLog(id, data) {
    return DDDRecoveryLog.findByIdAndUpdate(id, data, { new: true });
  }
  async resolveRecovery(id, postMortem) {
    return DDDRecoveryLog.findByIdAndUpdate(
      id,
      { status: 'fully_recovered', resolvedAt: new Date(), postMortem },
      { new: true }
    );
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

  async healthCheck() {
    const [plans, activeBackups] = await Promise.all([
      DDDRecoveryPlan.countDocuments({ isActive: true }),
      DDDBackupSchedule.countDocuments({ isActive: true }),
    ]);
    return { status: 'healthy', activePlans: plans, activeBackups };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createDisasterRecoveryRouter() {
  const router = Router();
  const svc = new DisasterRecovery();

  /* Plans */
  router.get('/disaster-recovery/plans', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPlans(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/disaster-recovery/plans/:id', async (req, res) => {
    try {
      const d = await svc.getPlan(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/disaster-recovery/plans', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPlan(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Backups */
  router.get('/disaster-recovery/backups', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listBackups(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/disaster-recovery/backups', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createBackup(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Tests */
  router.get('/disaster-recovery/tests', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listTests(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/disaster-recovery/tests', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.scheduleTest(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Recovery Logs */
  router.get('/disaster-recovery/logs', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.listLogs() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/disaster-recovery/trigger', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.triggerRecovery(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/disaster-recovery/logs/:id/resolve', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.resolveRecovery(req.params.id, req.body.postMortem),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics & Health */
  router.get('/disaster-recovery/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getRecoveryAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/disaster-recovery/health', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  EXPORTS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

module.exports = {
  DisasterRecovery,
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
  createDisasterRecoveryRouter,
};
