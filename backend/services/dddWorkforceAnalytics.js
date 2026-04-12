'use strict';
/**
 * DDD Workforce Analytics Service
 * ────────────────────────────────
 * Phase 29 – Workforce & Professional Development (Module 1/4)
 *
 * Pure business-logic service — DB-backed via Mongoose models.
 * Models live in ../models/WorkforceAnalytics.js
 * Routes  live in ../routes/ddd-workforce-analytics.routes.js
 *
 * Singleton export — use directly, do NOT call `new`.
 */

const {
  DDDWorkforceSnapshot,
  DDDStaffProfile,
  DDDWorkloadEntry,
  DDDKPIRecord,
  DEPARTMENT_TYPES,
  BUILTIN_KPI_TEMPLATES,
} = require('../models/WorkforceAnalytics');

const BaseCrudService = require('./base/BaseCrudService');

/* ═══════════════════ Helpers ═══════════════════ */

/** Build pagination metadata for list endpoints */
function paginationMeta(total, page, limit) {
  const pages = Math.ceil(total / limit) || 1;
  return { total, page, limit, pages, hasNext: page < pages, hasPrev: page > 1 };
}

/* ═══════════════════ Domain Service ═══════════════════ */
class WorkforceAnalyticsService extends BaseCrudService {
  constructor() {
    super('WorkforceAnalyticsService', {}, {
      workforceSnapshots: DDDWorkforceSnapshot,
      staffProfiles: DDDStaffProfile,
      workloadEntrys: DDDWorkloadEntry,
      kPIRecords: DDDKPIRecord,
    });
  }

  /* ─────────────────── Snapshots ─────────────────── */

  async createSnapshot(data, userId) {
    if (!data.period || !data.periodStart || !data.periodEnd) {
      throw Object.assign(new Error('period, periodStart, periodEnd are required'), {
        status: 400,
      });
    }
    // Auto-compute turnover if headcount provided
    if (data.totalHeadcount > 0 && data.separations != null) {
      data.turnoverRate = +((data.separations / data.totalHeadcount) * 100).toFixed(2);
      data.retentionRate = +(100 - data.turnoverRate).toFixed(2);
    }
    data.createdBy = userId;
    return DDDWorkforceSnapshot.create(data);
  }

  async listSnapshots(filter = {}, page = 1, limit = 20) {
    const [docs, total] = await Promise.all([
      DDDWorkforceSnapshot.find(filter)
        .sort({ periodStart: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DDDWorkforceSnapshot.countDocuments(filter),
    ]);
    return { data: docs, pagination: paginationMeta(total, page, limit) };
  }

  async getSnapshotById(id) {
    const doc = await DDDWorkforceSnapshot.findById(id).lean();
    if (!doc) throw Object.assign(new Error('Snapshot not found'), { status: 404 });
    return doc;
  }

  /* ─────────────────── Staff Profiles ─────────────────── */

  async createStaffProfile(data, userId) {
    if (!data.userId || !data.employeeId || !data.department || !data.hireDate) {
      throw Object.assign(new Error('userId, employeeId, department, hireDate are required'), {
        status: 400,
      });
    }
    if (!DEPARTMENT_TYPES.includes(data.department)) {
      throw Object.assign(new Error(`Invalid department: ${data.department}`), { status: 400 });
    }
    data.createdBy = userId;
    return DDDStaffProfile.create(data);
  }

  async listStaffProfiles(filter = {}, page = 1, limit = 20) {
    const [docs, total] = await Promise.all([
      DDDStaffProfile.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DDDStaffProfile.countDocuments(filter),
    ]);
    return { data: docs, pagination: paginationMeta(total, page, limit) };
  }

  async getStaffProfileById(id) {
    const doc = await DDDStaffProfile.findById(id).lean();
    if (!doc) throw Object.assign(new Error('Staff profile not found'), { status: 404 });
    return doc;
  }

  async updateStaffProfile(id, data, userId) {
    data.updatedBy = userId;
    const doc = await DDDStaffProfile.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).lean();
    if (!doc) throw Object.assign(new Error('Staff profile not found'), { status: 404 });
    return doc;
  }

  async deleteStaffProfile(id) {
    const doc = await DDDStaffProfile.findByIdAndDelete(id);
    if (!doc) throw Object.assign(new Error('Staff profile not found'), { status: 404 });
    return { deleted: true, id };
  }

  /* ─────────────────── Workload Entries ─────────────────── */

  async createWorkloadEntry(data, userId) {
    if (!data.staffId || !data.date) {
      throw Object.assign(new Error('staffId, date are required'), { status: 400 });
    }
    // Auto-compute overtime
    if (data.actualHours > data.scheduledHours) {
      data.overtimeHours = +(data.actualHours - data.scheduledHours).toFixed(2);
    }
    // Auto-compute productivity score
    if (data.scheduledHours > 0 && data.sessionsCompleted != null) {
      const utilization = ((data.actualHours || 0) / data.scheduledHours) * 100;
      data.productivityScore = Math.min(100, Math.round(utilization));
    }
    data.createdBy = userId;
    return DDDWorkloadEntry.create(data);
  }

  async listWorkloadEntries(filter = {}, page = 1, limit = 20) {
    const [docs, total] = await Promise.all([
      DDDWorkloadEntry.find(filter)
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('staffId', 'employeeId department skillLevel')
        .lean(),
      DDDWorkloadEntry.countDocuments(filter),
    ]);
    return { data: docs, pagination: paginationMeta(total, page, limit) };
  }

  /* ─────────────────── KPI Records ─────────────────── */

  async createKPIRecord(data, userId) {
    if (!data.kpiCode || !data.period || !data.periodDate || data.actualValue == null) {
      throw Object.assign(new Error('kpiCode, period, periodDate, actualValue are required'), {
        status: 400,
      });
    }
    // Auto-fill name from built-in templates
    const template = BUILTIN_KPI_TEMPLATES.find(t => t.code === data.kpiCode);
    if (template) {
      data.kpiName = data.kpiName || template.name;
      data.targetValue = data.targetValue ?? template.target;
    }
    // Compute variance & alert level
    if (data.targetValue != null) {
      data.variance = +(data.actualValue - data.targetValue).toFixed(2);
      const pctDeviation = Math.abs(data.variance / data.targetValue) * 100;
      data.alertLevel = pctDeviation > 25 ? 'critical' : pctDeviation > 10 ? 'warning' : 'normal';
    }
    data.createdBy = userId;
    return DDDKPIRecord.create(data);
  }

  async listKPIRecords(filter = {}, page = 1, limit = 20) {
    const [docs, total] = await Promise.all([
      DDDKPIRecord.find(filter)
        .sort({ periodDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DDDKPIRecord.countDocuments(filter),
    ]);
    return { data: docs, pagination: paginationMeta(total, page, limit) };
  }

  /** Get KPI dashboard — latest value per KPI code for a department */
  async getKPIDashboard(department) {
    const pipeline = [
      ...(department ? [{ $match: { department } }] : []),
      { $sort: { periodDate: -1 } },
      {
        $group: {
          _id: '$kpiCode',
          kpiName: { $first: '$kpiName' },
          latestValue: { $first: '$actualValue' },
          target: { $first: '$targetValue' },
          variance: { $first: '$variance' },
          trend: { $first: '$trend' },
          alertLevel: { $first: '$alertLevel' },
          asOf: { $first: '$periodDate' },
        },
      },
      { $sort: { _id: 1 } },
    ];
    return DDDKPIRecord.aggregate(pipeline);
  }

  /* ─────────────────── Analytics ─────────────────── */

  async getDepartmentSummary(department) {
    if (!DEPARTMENT_TYPES.includes(department)) {
      throw Object.assign(new Error(`Invalid department: ${department}`), { status: 400 });
    }
    const [profiles, recentKPIs, workloadDist] = await Promise.all([
      DDDStaffProfile.find({ department, status: 'active' }).lean(),
      DDDKPIRecord.find({ department }).sort({ periodDate: -1 }).limit(10).lean(),
      DDDStaffProfile.aggregate([
        { $match: { department, status: 'active' } },
        { $group: { _id: '$workloadCategory', count: { $sum: 1 } } },
      ]),
    ]);

    const count = profiles.length || 1;
    return {
      department,
      totalStaff: profiles.length,
      avgCaseload: +(profiles.reduce((s, p) => s + (p.currentCaseload || 0), 0) / count).toFixed(1),
      avgRating: +(profiles.reduce((s, p) => s + (p.performanceRating || 0), 0) / count).toFixed(2),
      workloadDistribution: workloadDist,
      recentKPIs,
      atCapacityCount: profiles.filter(
        p => p.workloadCategory === 'over_capacity' || p.workloadCategory === 'critical'
      ).length,
    };
  }

  async getWorkloadDistribution() {
    return DDDStaffProfile.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$workloadCategory',
          count: { $sum: 1 },
          avgCaseload: { $avg: '$currentCaseload' },
          avgRating: { $avg: '$performanceRating' },
        },
      },
      { $sort: { count: -1 } },
    ]);
  }

  /** Turnover trend — monthly separations vs headcount over last 12 snapshots */
  async getTurnoverTrend(department, monthsBack = 12) {
    const filter = { period: 'monthly' };
    if (department) filter.department = department;

    return DDDWorkforceSnapshot.find(filter)
      .sort({ periodStart: -1 })
      .limit(monthsBack)
      .select('periodStart department totalHeadcount separations turnoverRate retentionRate')
      .lean();
  }

  /** Overtime analysis per department */
  async getOvertimeAnalysis() {
    return DDDWorkloadEntry.aggregate([
      {
        $group: {
          _id: null,
          totalOvertime: { $sum: '$overtimeHours' },
          avgOvertime: { $avg: '$overtimeHours' },
          totalScheduled: { $sum: '$scheduledHours' },
          totalActual: { $sum: '$actualHours' },
          entries: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          totalOvertime: 1,
          avgOvertime: { $round: ['$avgOvertime', 2] },
          overtimePercent: {
            $round: [
              {
                $multiply: [{ $divide: ['$totalOvertime', { $max: ['$totalScheduled', 1] }] }, 100],
              },
              2,
            ],
          },
          entries: 1,
        },
      },
    ]);
  }

  /* ─────────────────── Retention Analysis (DB-backed) ─────────────────── */

  async predictAttritionRisk(staffId) {
    const profile = await DDDStaffProfile.findById(staffId).lean();
    if (!profile) throw Object.assign(new Error('Staff profile not found'), { status: 404 });

    let riskScore = 0;

    // Tenure factor
    const tenureYears =
      (Date.now() - new Date(profile.hireDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (tenureYears < 1) riskScore += 30;
    else if (tenureYears < 2) riskScore += 20;
    else if (tenureYears < 5) riskScore += 10;

    // Performance factor (high performers = higher market risk)
    if ((profile.performanceRating || 3) > 4) riskScore += 20;
    if ((profile.performanceRating || 3) < 2.5) riskScore -= 10;

    // Workload factor
    if (profile.workloadCategory === 'over_capacity') riskScore += 15;
    if (profile.workloadCategory === 'critical') riskScore += 25;

    // Caseload factor
    if (profile.currentCaseload > profile.maxCaseload) riskScore += 15;

    riskScore = Math.max(0, Math.min(100, riskScore));
    const riskLevel = riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low';

    return {
      staffId: profile._id,
      employeeId: profile.employeeId,
      department: profile.department,
      riskScore,
      riskLevel,
      factors: {
        tenureYears: +tenureYears.toFixed(1),
        performanceRating: profile.performanceRating,
        workloadCategory: profile.workloadCategory,
        caseloadRatio: profile.maxCaseload
          ? +(profile.currentCaseload / profile.maxCaseload).toFixed(2)
          : null,
      },
      retentionActions: this._suggestRetentionActions(riskScore),
      analyzedAt: new Date(),
    };
  }

  _suggestRetentionActions(riskScore) {
    if (riskScore > 70) {
      return [
        'immediate-conversation',
        'compensation-review',
        'career-planning',
        'workload-rebalance',
      ];
    }
    if (riskScore > 40) {
      return ['regular-check-in', 'development-plan', 'recognition', 'flexibility-options'];
    }
    return ['standard-engagement'];
  }

  /* ─────────────────── KPI Templates ─────────────────── */

  getKPITemplates() {
    return BUILTIN_KPI_TEMPLATES;
  }

}

/* ═══════════════════ Singleton Export ═══════════════════ */
// Service exports singleton — use directly, do NOT call `new`
module.exports = new WorkforceAnalyticsService();
