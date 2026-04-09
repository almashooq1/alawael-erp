/**
 * WorkflowTransitionLog — سجل تدقيق الانتقالات
 *
 * كل انتقال بين مراحل الحلقة العلاجية يُسجَّل هنا بشكل غير قابل للحذف.
 * يوفر Audit Trail كامل لرحلة المستفيد.
 *
 * @module domains/workflow/models/WorkflowTransitionLog
 */

const mongoose = require('mongoose');

const transitionLogSchema = new mongoose.Schema(
  {
    // ─── Context ────────────────────────────────────────────
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    episodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EpisodeOfCare',
      required: true,
      index: true,
    },

    // ─── Transition ─────────────────────────────────────────
    fromPhase: {
      type: String,
      required: true,
      enum: [
        'new',
        'referral',
        'intake',
        'triage',
        'initial_assessment',
        'mdt_review',
        'care_plan_approval',
        'active_treatment',
        'reassessment',
        'outcome_review',
        'discharge_planning',
        'discharge',
        'post_discharge_followup',
      ],
    },
    toPhase: {
      type: String,
      required: true,
      enum: [
        'referral',
        'intake',
        'triage',
        'initial_assessment',
        'mdt_review',
        'care_plan_approval',
        'active_treatment',
        'reassessment',
        'outcome_review',
        'discharge_planning',
        'discharge',
        'post_discharge_followup',
        'closed',
      ],
    },

    // ─── Status ─────────────────────────────────────────────
    status: {
      type: String,
      enum: ['success', 'failed', 'exception'],
      default: 'success',
    },

    // ─── Exception Handling ─────────────────────────────────
    isException: { type: Boolean, default: false },
    exceptionReason: { type: String },
    exceptionApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ─── Execution ──────────────────────────────────────────
    executedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    executedAt: { type: Date, default: Date.now },

    // ─── Metadata ───────────────────────────────────────────
    reason: { type: String },
    notes: { type: String },
    warnings: [{ type: String }],

    // ─── Validation Snapshot ────────────────────────────────
    validationResult: {
      valid: Boolean,
      errors: [String],
      warnings: [String],
    },

    // ─── Duration ───────────────────────────────────────────
    durationInPhase: {
      days: Number,
      hours: Number,
    },

    // ─── Context Snapshot (read-only data at time of transition) ──
    contextSnapshot: {
      assessmentCount: Number,
      sessionCount: Number,
      activeGoals: Number,
      completedGoals: Number,
      riskLevel: String,
    },

    // ─── Multi-tenant ───────────────────────────────────────
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────

transitionLogSchema.index({ episodeId: 1, executedAt: 1 });
transitionLogSchema.index({ beneficiaryId: 1, executedAt: -1 });
transitionLogSchema.index({ fromPhase: 1, toPhase: 1 });
transitionLogSchema.index({ isException: 1 });

// ─── Statics ──────────────────────────────────────────────────────────────

/**
 * الحصول على تاريخ الرحلة لحلقة علاجية
 */
transitionLogSchema.statics.getJourneyHistory = function (episodeId) {
  return this.find({ episodeId }).populate('executedBy', 'name role').sort({ executedAt: 1 });
};

/**
 * الحصول على متوسط الوقت في كل مرحلة
 */
transitionLogSchema.statics.getAveragePhaseTime = async function (filters = {}) {
  const match = {};
  if (filters.branchId) match.branchId = new mongoose.Types.ObjectId(filters.branchId);

  return this.aggregate([
    { $match: { ...match, 'durationInPhase.days': { $exists: true } } },
    {
      $group: {
        _id: '$fromPhase',
        avgDays: { $avg: '$durationInPhase.days' },
        maxDays: { $max: '$durationInPhase.days' },
        minDays: { $min: '$durationInPhase.days' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

/**
 * إحصائيات الاستثناءات
 */
transitionLogSchema.statics.getExceptionStats = async function (filters = {}) {
  const match = { isException: true };
  if (filters.branchId) match.branchId = new mongoose.Types.ObjectId(filters.branchId);
  if (filters.from) match.executedAt = { $gte: new Date(filters.from) };
  if (filters.to) {
    match.executedAt = match.executedAt || {};
    match.executedAt.$lte = new Date(filters.to);
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: { from: '$fromPhase', to: '$toPhase' },
        count: { $sum: 1 },
        reasons: { $push: '$exceptionReason' },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

// ─── Prevent modification ─────────────────────────────────────────────────
transitionLogSchema.pre('updateOne', function () {
  throw new Error('سجلات التدقيق غير قابلة للتعديل');
});
transitionLogSchema.pre('updateMany', function () {
  throw new Error('سجلات التدقيق غير قابلة للتعديل');
});

const WorkflowTransitionLog =
  mongoose.models.WorkflowTransitionLog ||
  mongoose.model('WorkflowTransitionLog', transitionLogSchema);

module.exports = WorkflowTransitionLog;
