'use strict';
/**
 * DDD Workforce Analytics Service
 * ────────────────────────────────
 * Phase 29 – Workforce & Professional Development (Module 1/4)
 *
 * Tracks workforce composition, staffing ratios, turnover metrics,
 * workload distribution, and productivity analytics across the platform.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */
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
  },
  { timestamps: true }
);
workforceSnapshotSchema.index({ period: 1, periodStart: -1 });
workforceSnapshotSchema.index({ department: 1, periodStart: -1 });

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
    workloadCategory: { type: String, enum: WORKLOAD_CATEGORIES, default: 'optimal' },
    specializations: [{ type: String }],
    certifications: [{ name: String, issuer: String, expiryDate: Date }],
    performanceRating: { type: Number, min: 0, max: 5 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
staffProfileSchema.index({ department: 1, status: 1 });
staffProfileSchema.index({ userId: 1 }, { unique: true });

const workloadEntrySchema = new Schema(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'DDDStaffProfile', required: true },
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
  },
  { timestamps: true }
);
workloadEntrySchema.index({ staffId: 1, date: -1 });

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
  },
  { timestamps: true }
);
kpiRecordSchema.index({ kpiCode: 1, periodDate: -1 });
kpiRecordSchema.index({ department: 1, kpiCode: 1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDWorkforceSnapshot =
  mongoose.models.DDDWorkforceSnapshot ||
  mongoose.model('DDDWorkforceSnapshot', workforceSnapshotSchema);
const DDDStaffProfile =
  mongoose.models.DDDStaffProfile || mongoose.model('DDDStaffProfile', staffProfileSchema);
const DDDWorkloadEntry =
  mongoose.models.DDDWorkloadEntry || mongoose.model('DDDWorkloadEntry', workloadEntrySchema);
const DDDKPIRecord =
  mongoose.models.DDDKPIRecord || mongoose.model('DDDKPIRecord', kpiRecordSchema);

/* ═══════════════════ Domain Class ═══════════════════ */
class WorkforceAnalytics {
  /* ── Snapshots ── */
  async createSnapshot(data) {
    return DDDWorkforceSnapshot.create(data);
  }
  async listSnapshots(filter = {}, page = 1, limit = 20) {
    return DDDWorkforceSnapshot.find(filter)
      .sort({ periodStart: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async getSnapshotById(id) {
    return DDDWorkforceSnapshot.findById(id).lean();
  }

  /* ── Staff Profiles ── */
  async createStaffProfile(data) {
    return DDDStaffProfile.create(data);
  }
  async listStaffProfiles(filter = {}, page = 1, limit = 20) {
    return DDDStaffProfile.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async getStaffProfileById(id) {
    return DDDStaffProfile.findById(id).lean();
  }
  async updateStaffProfile(id, data) {
    return DDDStaffProfile.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  /* ── Workload Entries ── */
  async createWorkloadEntry(data) {
    return DDDWorkloadEntry.create(data);
  }
  async listWorkloadEntries(filter = {}, page = 1, limit = 20) {
    return DDDWorkloadEntry.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  /* ── KPI Records ── */
  async createKPIRecord(data) {
    if (data.targetValue != null && data.actualValue != null) {
      data.variance = data.actualValue - data.targetValue;
    }
    return DDDKPIRecord.create(data);
  }
  async listKPIRecords(filter = {}, page = 1, limit = 20) {
    return DDDKPIRecord.find(filter)
      .sort({ periodDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  /* ── Analytics ── */
  async getDepartmentSummary(department) {
    const profiles = await DDDStaffProfile.find({ department, status: 'active' }).lean();
    return {
      department,
      totalStaff: profiles.length,
      avgCaseload:
        profiles.reduce((s, p) => s + (p.currentCaseload || 0), 0) / (profiles.length || 1),
      avgRating:
        profiles.reduce((s, p) => s + (p.performanceRating || 0), 0) / (profiles.length || 1),
    };
  }

  async getWorkloadDistribution() {
    return DDDStaffProfile.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$workloadCategory', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  }

  /* ── Health ── */
  async healthCheck() {
    const [snapshots, profiles, workloads, kpis] = await Promise.all([
      DDDWorkforceSnapshot.countDocuments(),
      DDDStaffProfile.countDocuments(),
      DDDWorkloadEntry.countDocuments(),
      DDDKPIRecord.countDocuments(),
    ]);
    return {
      status: 'ok',
      module: 'WorkforceAnalytics',
      counts: { snapshots, profiles, workloads, kpis },
    };
  }
}

/* ═══════════════════ Router Factory ═══════════════════ */
function createWorkforceAnalyticsRouter() {
  const { Router } = require('express');
  const router = Router();
  const svc = new WorkforceAnalytics();

  router.get('/workforce-analytics/health', async (_req, res) => {
    try {
      res.json(await svc.healthCheck());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /* Snapshots */
  router.post('/workforce-analytics/snapshots', async (req, res) => {
    try {
      res.status(201).json(await svc.createSnapshot(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/workforce-analytics/snapshots', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...filter } = req.query;
      res.json(await svc.listSnapshots(filter, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /* Staff Profiles */
  router.post('/workforce-analytics/staff', async (req, res) => {
    try {
      res.status(201).json(await svc.createStaffProfile(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/workforce-analytics/staff', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...filter } = req.query;
      res.json(await svc.listStaffProfiles(filter, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.put('/workforce-analytics/staff/:id', async (req, res) => {
    try {
      res.json(await svc.updateStaffProfile(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /* Workload Entries */
  router.post('/workforce-analytics/workload', async (req, res) => {
    try {
      res.status(201).json(await svc.createWorkloadEntry(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/workforce-analytics/workload', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...filter } = req.query;
      res.json(await svc.listWorkloadEntries(filter, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /* KPI Records */
  router.post('/workforce-analytics/kpis', async (req, res) => {
    try {
      res.status(201).json(await svc.createKPIRecord(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/workforce-analytics/kpis', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...filter } = req.query;
      res.json(await svc.listKPIRecords(filter, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /* Analytics */
  router.get('/workforce-analytics/departments/:dept/summary', async (req, res) => {
    try {
      res.json(await svc.getDepartmentSummary(req.params.dept));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/workforce-analytics/distribution', async (req, res) => {
    try {
      res.json(await svc.getWorkloadDistribution());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  WORKFORCE_METRIC_TYPES,
  WORKFORCE_STATUSES,
  DEPARTMENT_TYPES,
  SKILL_LEVELS,
  WORKLOAD_CATEGORIES,
  ANALYTICS_PERIODS,
  BUILTIN_KPI_TEMPLATES,
  DDDWorkforceSnapshot,
  DDDStaffProfile,
  DDDWorkloadEntry,
  DDDKPIRecord,
  WorkforceAnalytics,
  createWorkforceAnalyticsRouter,
};
