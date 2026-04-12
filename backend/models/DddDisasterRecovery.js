'use strict';
/**
 * DddDisasterRecovery — Mongoose Models & Constants
 * Auto-extracted from services/dddDisasterRecovery.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

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

/* ═══════════════════ Schemas ═══════════════════ */

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


/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  DISASTER_TYPES,
  RECOVERY_STATUSES,
  BACKUP_TYPES,
  RTO_LEVELS,
  RPO_LEVELS,
  RECOVERY_STRATEGIES,
  BUILTIN_RECOVERY_PLANS,
  DDDRecoveryPlan,
  DDDBackupSchedule,
  DDDRecoveryTest,
  DDDRecoveryLog,
};
