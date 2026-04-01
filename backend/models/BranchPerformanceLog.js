/**
 * BranchPerformanceLog.js — سجل الأداء اليومي للفروع
 * Daily snapshot of all KPIs per branch for trend analysis & forecasting
 * Immutable — written once per day per branch (cron job)
 */
const mongoose = require('mongoose');

const BranchPerformanceLogSchema = new mongoose.Schema(
  {
    branch_code: { type: String, required: true, uppercase: true, trim: true, index: true },
    snapshot_date: { type: Date, required: true, index: true }, // date only (00:00:00)
    snapshot_date_str: { type: String }, // 'YYYY-MM-DD' for easy querying

    // ── Patients ─────────────────────────────────────────────────────────────
    patients: {
      total_active: { type: Number, default: 0 },
      new_today: { type: Number, default: 0 },
      discharged_today: { type: Number, default: 0 },
      on_waitlist: { type: Number, default: 0 },
      present_today: { type: Number, default: 0 },
      absent_today: { type: Number, default: 0 },
      attendance_rate: { type: Number, default: 0 }, // %
    },

    // ── Sessions ─────────────────────────────────────────────────────────────
    sessions: {
      scheduled: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      cancelled: { type: Number, default: 0 },
      no_show: { type: Number, default: 0 },
      completion_rate: { type: Number, default: 0 }, // %
      avg_duration_min: { type: Number, default: 0 },
    },

    // ── Finance ──────────────────────────────────────────────────────────────
    finance: {
      daily_revenue: { type: Number, default: 0 },
      mtd_revenue: { type: Number, default: 0 }, // Month-to-date
      daily_expenses: { type: Number, default: 0 },
      mtd_expenses: { type: Number, default: 0 },
      revenue_per_session: { type: Number, default: 0 },
      collections_rate: { type: Number, default: 0 }, // %
    },

    // ── Staff ────────────────────────────────────────────────────────────────
    staff: {
      total_active: { type: Number, default: 0 },
      therapists_on_duty: { type: Number, default: 0 },
      staff_utilization_rate: { type: Number, default: 0 }, // %
      overtime_hours: { type: Number, default: 0 },
    },

    // ── Transport ────────────────────────────────────────────────────────────
    transport: {
      vehicles_active: { type: Number, default: 0 },
      trips_completed: { type: Number, default: 0 },
      patients_transported: { type: Number, default: 0 },
      on_time_rate: { type: Number, default: 0 }, // %
    },

    // ── Quality ──────────────────────────────────────────────────────────────
    quality: {
      satisfaction_score: { type: Number, default: 0 }, // 1-5
      complaints_today: { type: Number, default: 0 },
      incidents_today: { type: Number, default: 0 },
      cbahi_compliance_score: { type: Number, default: 0 }, // %
    },

    // ── Composite Score ───────────────────────────────────────────────────────
    performance_score: { type: Number, default: 0 }, // 0-100 weighted composite
    performance_grade: {
      type: String,
      enum: ['A+', 'A', 'B+', 'B', 'C', 'D', 'F'],
      default: 'C',
    },
    ranking_among_branches: { type: Number }, // 1 = best

    // Target achievement for the day
    target_achievement: {
      revenue_pct: { type: Number, default: 0 },
      sessions_pct: { type: Number, default: 0 },
      attendance_pct: { type: Number, default: 0 },
      overall_pct: { type: Number, default: 0 },
    },

    // Anomalies detected
    anomalies: [
      {
        metric: String,
        value: Number,
        expected_range: { min: Number, max: Number },
        severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
        description: String,
      },
    ],

    // Source
    generated_by: { type: String, default: 'cron' }, // 'cron' | 'manual'
    is_finalized: { type: Boolean, default: false }, // end-of-day final snapshot
  },
  {
    timestamps: true,
    collection: 'branch_performance_logs',
  }
);

// Unique: one log per branch per day
BranchPerformanceLogSchema.index({ branch_code: 1, snapshot_date_str: 1 }, { unique: true });

// Range queries
BranchPerformanceLogSchema.index({ snapshot_date: 1, performance_score: -1 });
BranchPerformanceLogSchema.index({ branch_code: 1, snapshot_date: -1 });

/**
 * Get last N days for a branch
 */
BranchPerformanceLogSchema.statics.getRecentLogs = function (branchCode, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  return this.find({ branch_code: branchCode, snapshot_date: { $gte: since } })
    .sort({ snapshot_date: 1 })
    .lean();
};

/**
 * Get cross-branch rankings for a specific date
 */
BranchPerformanceLogSchema.statics.getRankingsForDate = function (dateStr) {
  return this.find({ snapshot_date_str: dateStr }).sort({ performance_score: -1 }).lean();
};

/**
 * Get network-wide aggregates for a date range
 */
BranchPerformanceLogSchema.statics.getNetworkAggregates = function (startDate, endDate) {
  return this.aggregate([
    { $match: { snapshot_date: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: '$snapshot_date_str',
        total_revenue: { $sum: '$finance.daily_revenue' },
        total_sessions: { $sum: '$sessions.completed' },
        total_patients: { $sum: '$patients.total_active' },
        avg_satisfaction: { $avg: '$quality.satisfaction_score' },
        avg_performance: { $avg: '$performance_score' },
        branches_count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

module.exports =
  mongoose.models.BranchPerformanceLog ||
  mongoose.model('BranchPerformanceLog', BranchPerformanceLogSchema);
