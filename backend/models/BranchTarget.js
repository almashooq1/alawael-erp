/**
 * BranchTarget.js — نموذج أهداف الفروع
 * Monthly / quarterly / annual KPI targets per branch
 * Set by HQ, tracked in real-time
 */
const mongoose = require('mongoose');

const KPITargetSchema = new mongoose.Schema({
  metric: {
    type: String,
    required: true,
    enum: [
      'monthly_revenue', // الإيراد الشهري (ر.س)
      'patients_count', // عدد المرضى الإجمالي
      'sessions_count', // عدد الجلسات
      'session_completion_rate', // نسبة إتمام الجلسات (%)
      'attendance_rate', // نسبة الحضور (%)
      'satisfaction_score', // رضا الأسر (1-5)
      'new_patients', // مرضى جدد
      'staff_utilization', // نسبة استغلال الكوادر (%)
      'cost_per_session', // التكلفة لكل جلسة (ر.س)
      'revenue_per_patient', // الإيراد لكل مريض (ر.س)
      'discharge_rate', // معدل التصريح (%)
      'waitlist_clearance', // معدل خلو قائمة الانتظار (%)
    ],
  },
  target_value: { type: Number, required: true },
  stretch_value: { type: Number }, // الهدف المتمدد (طموح)
  minimum_value: { type: Number }, // الحد الأدنى المقبول
  unit: { type: String, default: '' }, // %, ر.س, جلسة, مريض
  weight: { type: Number, default: 1, min: 0, max: 10 }, // وزن المؤشر في المؤشر المركب
});

const BranchTargetSchema = new mongoose.Schema(
  {
    branch_code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    period_type: {
      type: String,
      enum: ['monthly', 'quarterly', 'annual'],
      required: true,
    },
    period_year: { type: Number, required: true }, // e.g. 2026
    period_month: { type: Number, min: 1, max: 12 }, // 1-12 (for monthly)
    period_quarter: { type: Number, min: 1, max: 4 }, // 1-4 (for quarterly)

    kpis: [KPITargetSchema],

    // Meta
    set_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    set_by_name: { type: String },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approved_at: { type: Date },
    status: {
      type: String,
      enum: ['draft', 'approved', 'active', 'closed'],
      default: 'draft',
    },
    notes: { type: String, maxlength: 500 },
  },
  {
    timestamps: true,
    collection: 'branch_targets',
  }
);

// Compound index: one target per branch per period
BranchTargetSchema.index(
  { branch_code: 1, period_type: 1, period_year: 1, period_month: 1, period_quarter: 1 },
  { unique: true, sparse: true }
);

/**
 * Get or create default targets for a branch
 * @param {string} branchCode
 * @param {number} year
 * @param {number} month
 */
BranchTargetSchema.statics.getMonthlyTargets = function (branchCode, year, month) {
  return this.findOne({
    branch_code: branchCode,
    period_type: 'monthly',
    period_year: year,
    period_month: month,
  });
};

/**
 * Calculate achievement percentage for a specific metric
 */
BranchTargetSchema.methods.getAchievement = function (metricName, actualValue) {
  const kpi = this.kpis.find(k => k.metric === metricName);
  if (!kpi || !kpi.target_value) return null;
  const pct = Math.round((actualValue / kpi.target_value) * 100);
  return {
    metric: metricName,
    target: kpi.target_value,
    actual: actualValue,
    achievement_pct: pct,
    status:
      pct >= 100 ? 'achieved' : pct >= 85 ? 'on_track' : pct >= 70 ? 'at_risk' : 'below_target',
    stretch_achieved: kpi.stretch_value ? actualValue >= kpi.stretch_value : false,
  };
};

module.exports = mongoose.models.BranchTarget || mongoose.model('BranchTarget', BranchTargetSchema);
