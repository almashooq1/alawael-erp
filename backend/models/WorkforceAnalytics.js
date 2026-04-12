'use strict';
/**
 * Workforce Analytics Models
 * ──────────────────────────
 * Mongoose schemas for workforce snapshots, staff profiles,
 * workload tracking, and KPI records.
 *
 * Extracted from dddWorkforceAnalytics.js — single source of truth.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Enums / Constants ═══════════════════ */

const WORKFORCE_METRIC_TYPES = [
  'headcount',
  'fte',
  'turnover_rate',
  'retention_rate',
  'absenteeism',
  'overtime_hours',
  'productivity_index',
  'caseload_ratio',
  'burnout_score',
  'satisfaction_score',
  'training_hours',
  'certification_rate',
];

const WORKFORCE_STATUSES = [
  'active',
  'on_leave',
  'suspended',
  'terminated',
  'retired',
  'probation',
  'contract_ended',
  'transferred',
  'secondment',
  'resigned',
];

const DEPARTMENT_TYPES = [
  'physiotherapy',
  'occupational_therapy',
  'speech_therapy',
  'psychology',
  'social_work',
  'nursing',
  'medical',
  'administration',
  'it',
  'finance',
  'quality',
  'research',
];

const SKILL_LEVELS = [
  'trainee',
  'junior',
  'mid_level',
  'senior',
  'specialist',
  'consultant',
  'expert',
  'lead',
  'director',
  'fellow',
];

const WORKLOAD_CATEGORIES = [
  'under_capacity',
  'optimal',
  'near_capacity',
  'over_capacity',
  'critical',
  'redistributing',
  'on_hold',
  'transitioning',
  'ramping_up',
  'winding_down',
];

const ANALYTICS_PERIODS = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'semi_annual',
  'annual',
  'ytd',
  'rolling_12m',
  'custom',
];

const BUILTIN_KPI_TEMPLATES = [
  { code: 'STAFF_PATIENT_RATIO', name: 'Staff-to-Patient Ratio', target: 5.0 },
  { code: 'AVG_CASELOAD', name: 'Average Caseload per Therapist', target: 25 },
  { code: 'TURNOVER_RATE', name: 'Annual Turnover Rate %', target: 10 },
  { code: 'TRAINING_COMPLIANCE', name: 'Training Compliance %', target: 95 },
  { code: 'OVERTIME_PCT', name: 'Overtime Percentage', target: 5 },
  { code: 'VACANCY_RATE', name: 'Vacancy Rate %', target: 8 },
  { code: 'RETENTION_90D', name: '90-Day Retention Rate', target: 90 },
  { code: 'SATISFACTION_IDX', name: 'Staff Satisfaction Index', target: 4.0 },
  { code: 'ABSENTEEISM_RATE', name: 'Absenteeism Rate %', target: 3 },
  { code: 'PRODUCTIVITY_IDX', name: 'Productivity Index', target: 85 },
];

/* ═══════════════════ Schemas ═══════════════════ */

// ── Workforce Snapshot ──
const workforceSnapshotSchema = new Schema(
  {
    period: { type: String, enum: ANALYTICS_PERIODS, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    department: { type: String, enum: DEPARTMENT_TYPES },
    totalHeadcount: { type: Number, default: 0 },
    activeFTE: { type: Number, default: 0 },
    vacancies: { type: Number, default: 0 },
    newHires: { type: Number, default: 0 },
    separations: { type: Number, default: 0 },
    turnoverRate: { type: Number, default: 0 },
    retentionRate: { type: Number, default: 0 },
    avgCaseload: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    trainingHours: { type: Number, default: 0 },
    satisfactionScore: { type: Number, min: 0, max: 5 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
workforceSnapshotSchema.index({ period: 1, periodStart: -1 });
workforceSnapshotSchema.index({ department: 1, periodStart: -1 });

// ── Staff Profile ──
const staffProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    employeeId: { type: String, required: true, unique: true },
    department: { type: String, enum: DEPARTMENT_TYPES, required: true },
    status: { type: String, enum: WORKFORCE_STATUSES, default: 'active' },
    skillLevel: { type: String, enum: SKILL_LEVELS, default: 'mid_level' },
    hireDate: { type: Date, required: true },
    currentCaseload: { type: Number, default: 0 },
    maxCaseload: { type: Number, default: 30 },
    workloadCategory: {
      type: String,
      enum: WORKLOAD_CATEGORIES,
      default: 'optimal',
    },
    specializations: [{ type: String }],
    certifications: [
      {
        name: { type: String },
        issuer: { type: String },
        expiryDate: { type: Date },
      },
    ],
    performanceRating: { type: Number, min: 0, max: 5 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
staffProfileSchema.index({ department: 1, status: 1 });
staffProfileSchema.index({ userId: 1 }, { unique: true });
staffProfileSchema.index({ employeeId: 1 }, { unique: true });

// ── Workload Entry ──
const workloadEntrySchema = new Schema(
  {
    staffId: {
      type: Schema.Types.ObjectId,
      ref: 'DDDWorkforceStaffProfile',
      required: true,
    },
    date: { type: Date, required: true },
    scheduledHours: { type: Number, default: 8 },
    actualHours: { type: Number, default: 0 },
    sessionsCompleted: { type: Number, default: 0 },
    documentationTime: { type: Number, default: 0 },
    adminTime: { type: Number, default: 0 },
    travelTime: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    productivityScore: { type: Number, min: 0, max: 100 },
    notes: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
workloadEntrySchema.index({ staffId: 1, date: -1 });

// ── KPI Record ──
const kpiRecordSchema = new Schema(
  {
    kpiCode: { type: String, required: true },
    kpiName: { type: String, required: true },
    department: { type: String, enum: DEPARTMENT_TYPES },
    period: { type: String, enum: ANALYTICS_PERIODS, required: true },
    periodDate: { type: Date, required: true },
    targetValue: { type: Number },
    actualValue: { type: Number, required: true },
    variance: { type: Number },
    trend: { type: String, enum: ['improving', 'stable', 'declining'] },
    alertLevel: { type: String, enum: ['normal', 'warning', 'critical'] },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
kpiRecordSchema.index({ kpiCode: 1, periodDate: -1 });
kpiRecordSchema.index({ department: 1, kpiCode: 1 });

/* ═══════════════════ Model Registration ═══════════════════ */

const DDDWorkforceSnapshot =
  mongoose.models.DDDWorkforceSnapshot ||
  mongoose.model('DDDWorkforceSnapshot', workforceSnapshotSchema);

const DDDWorkforceStaffProfile =
  mongoose.models.DDDWorkforceStaffProfile || mongoose.model('DDDWorkforceStaffProfile', staffProfileSchema);

const DDDWorkloadEntry =
  mongoose.models.DDDWorkloadEntry || mongoose.model('DDDWorkloadEntry', workloadEntrySchema);

const DDDKPIRecord =
  mongoose.models.DDDKPIRecord || mongoose.model('DDDKPIRecord', kpiRecordSchema);

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  // Constants
  WORKFORCE_METRIC_TYPES,
  WORKFORCE_STATUSES,
  DEPARTMENT_TYPES,
  SKILL_LEVELS,
  WORKLOAD_CATEGORIES,
  ANALYTICS_PERIODS,
  BUILTIN_KPI_TEMPLATES,
  // Models
  DDDWorkforceSnapshot,
  DDDWorkforceStaffProfile,
  DDDWorkloadEntry,
  DDDKPIRecord,
};
