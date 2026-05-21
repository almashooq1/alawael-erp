/**
 * TherapeuticGoal Model — نموذج الأهداف العلاجية
 *
 * أهداف SMART مرتبطة بالمستفيد والحلقة وخطة الرعاية.
 * تدعم: طويلة المدى، قصيرة المدى، أهداف جلسة.
 *
 * @module domains/goals/models/TherapeuticGoal
 */

const mongoose = require('mongoose');

// ─── Wave 235: Goal-Measure Linkage sub-schema ──────────────────────────
//
// Rich linkage between an objective and a measure. Embedded array on
// each objective allows multiple measures per objective with explicit
// PRIMARY/SECONDARY semantics, weights for weighted progress, and a
// per-link review cycle.
//
// Legacy `objective.measureId` (single ObjectId) remains for back-
// compat with W216 measureGoalUpdater — pre-save mirrors PRIMARY link
// measureId there so existing consumers keep working.
const LINK_TYPES = Object.freeze({
  PRIMARY: 'PRIMARY',
  SECONDARY: 'SECONDARY',
  SCREENING_ONLY: 'SCREENING_ONLY',
  PROXY: 'PROXY',
  CONTRAINDICATED: 'CONTRAINDICATED',
});

const LINK_STATUSES = Object.freeze({
  ACTIVE: 'active',
  FLAGGED: 'flagged',
  UNDER_REVIEW: 'under_review',
  UNLINKED: 'unlinked',
  ACHIEVED: 'achieved',
});

const measureLinkSchema = new mongoose.Schema(
  {
    measureId: { type: mongoose.Schema.Types.ObjectId, ref: 'Measure', required: true },
    measureCode: { type: String, required: true }, // snapshot for audit
    linkType: {
      type: String,
      enum: Object.values(LINK_TYPES),
      required: true,
    },
    expectedTarget: {
      value: Number,
      direction: {
        type: String,
        enum: ['reach_at_least', 'reach_at_most', 'change_by'],
      },
      changeFromBaseline: Number,
      achievedByDate: Date,
    },
    weight: { type: Number, min: 0, max: 1, default: 1 },
    reviewIntervalDays: Number, // defaults from measure.reassessment.standardIntervalDays
    nextLinkReviewAt: { type: Date, index: true },
    mcidExpectation: {
      unitsByReview: Number,
      minimumAcceptable: Number,
    },
    interventionRefs: [String], // care-plan-program codes; ≥1 required
    evidenceThreshold: {
      maxAdminsWithoutMcid: { type: Number, default: 3 },
      flagAtPlateauDays: { type: Number, default: 60 },
      autoFlagOnRegression: { type: Boolean, default: true },
    },
    // Audit & governance
    linkedAt: { type: Date, default: Date.now },
    linkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    linkRationale: { type: String, required: true }, // ≥10 chars enforced in pre-validate
    lastReviewedAt: Date,
    lastReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewHistory: [
      {
        reviewedAt: { type: Date, required: true },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        verdict: {
          type: String,
          enum: ['continue', 'modify_target', 'add_secondary', 'unlink', 'flag'],
          required: true,
        },
        notes: String,
        interpretationCategorySnapshot: String, // W232 category at review time
        _id: false,
      },
    ],
    status: {
      type: String,
      enum: Object.values(LINK_STATUSES),
      default: LINK_STATUSES.ACTIVE,
      index: true,
    },
    unlinkedAt: Date,
    unlinkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    unlinkReason: String,
  },
  { _id: true }
);

const objectiveSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    title_ar: String,
    baseline: String,
    target: String,
    criteria: String,
    timeline: String,
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'achieved', 'discontinued', 'modified'],
      default: 'not_started',
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    measureId: { type: mongoose.Schema.Types.ObjectId, ref: 'Measure' }, // legacy — mirrored to PRIMARY link
    measureLinks: [measureLinkSchema], // W235
    trialData: [
      { date: Date, attempts: Number, successes: Number, accuracy: Number, notes: String },
    ],
    notes: String,
  },
  { _id: true }
);

const progressEntrySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, default: Date.now },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClinicalSession' },
    value: { type: Number, required: true },
    rating: {
      type: String,
      enum: ['not_attempted', 'emerging', 'developing', 'achieved', 'maintained', 'regressed'],
    },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String,
  },
  { _id: true }
);

const therapeuticGoalSchema = new mongoose.Schema(
  {
    // ── Core Links ─────────────────────────────────────────────────────
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
    carePlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UnifiedCarePlan',
    },
    parentGoalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TherapeuticGoal',
    },

    // ── Identity ───────────────────────────────────────────────────────
    goalNumber: { type: String, unique: true, sparse: true },
    title: { type: String, required: true },
    title_ar: String,
    description: String,

    // ── SMART Components ───────────────────────────────────────────────
    specific: String,
    measurable: String,
    achievable: String,
    relevant: String,
    timeBound: String,

    // ── Classification ─────────────────────────────────────────────────
    type: {
      type: String,
      enum: ['long_term', 'short_term', 'session', 'maintenance', 'discharge'],
      required: true,
    },
    domain: {
      type: String,
      enum: [
        'motor_gross',
        'motor_fine',
        'speech',
        'language',
        'communication',
        'cognitive',
        'social',
        'behavioral',
        'sensory',
        'self_care',
        'academic',
        'vocational',
        'play',
        'feeding',
        'community',
        'emotional',
        'adaptive',
        'other',
      ],
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },

    // ── Target & Progress ──────────────────────────────────────────────
    baseline: {
      value: Number,
      description: String,
      date: Date,
    },
    target: {
      value: { type: Number, required: true },
      description: String,
      criteria: String,
    },
    currentProgress: { type: Number, min: 0, max: 100, default: 0 },

    // ── Status ─────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: [
        'draft',
        'active',
        'achieved',
        'partially_achieved',
        'not_achieved',
        'discontinued',
        'deferred',
        'modified',
      ],
      default: 'draft',
      index: true,
    },

    // ── Timeline ───────────────────────────────────────────────────────
    startDate: { type: Date, required: true },
    targetDate: Date,
    achievedDate: Date,

    // ── Objectives (Sub-goals) ─────────────────────────────────────────
    objectives: [objectiveSchema],

    // ── Progress History ───────────────────────────────────────────────
    progressHistory: [progressEntrySchema],

    // ── Specialist ─────────────────────────────────────────────────────
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    assignedRole: String,

    // ── Trend ──────────────────────────────────────────────────────────
    trend: {
      direction: { type: String, enum: ['improving', 'stable', 'declining'] },
      slope: Number,
      daysToTarget: Number,
    },

    // ── Audit ──────────────────────────────────────────────────────────
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
    tags: [String],
    notes: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'therapeutic_goals',
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────

therapeuticGoalSchema.index({ beneficiaryId: 1, status: 1 });
therapeuticGoalSchema.index({ episodeId: 1, type: 1 });
therapeuticGoalSchema.index({ assignedTo: 1, status: 1 });
therapeuticGoalSchema.index({ status: 1, targetDate: 1 });
therapeuticGoalSchema.index({ parentGoalId: 1 });

// ─── Virtuals ───────────────────────────────────────────────────────────────

therapeuticGoalSchema.virtual('objectivesProgress').get(function () {
  if (!this.objectives || this.objectives.length === 0) return 0;
  const total = this.objectives.reduce((s, o) => s + (o.progress || 0), 0);
  return Math.round(total / this.objectives.length);
});

therapeuticGoalSchema.virtual('isOverdue').get(function () {
  if (!this.targetDate) return false;
  return this.status === 'active' && new Date() > new Date(this.targetDate);
});

therapeuticGoalSchema.virtual('daysRemaining').get(function () {
  if (!this.targetDate) return null;
  return Math.ceil((new Date(this.targetDate) - new Date()) / (1000 * 60 * 60 * 24));
});

therapeuticGoalSchema.virtual('childGoals', {
  ref: 'TherapeuticGoal',
  localField: '_id',
  foreignField: 'parentGoalId',
});

// ─── Pre-validate (W235 — Goal-Measure Linkage invariants) ──────────────
//
// Enforced PER-OBJECTIVE for any objective with `measureLinks[]`:
//   1. exactly one ACTIVE link is PRIMARY (CONTRAINDICATED skipped entirely)
//   2. PRIMARY.weight >= 0.5
//   3. sum of weights on contributing (non-CONTRAINDICATED, non-unlinked) links = 1.0 (±0.01)
//   4. linkRationale ≥ 10 chars on every link
//   5. interventionRefs.length ≥ 1 on every contributing link
//   6. unlinked status requires unlinkReason
//   7. CONTRAINDICATED links can have weight=0 and skip rules 1-3 contribution
therapeuticGoalSchema.pre('validate', function () {
  if (!Array.isArray(this.objectives)) return;
  this.objectives.forEach((obj, objIdx) => {
    if (!Array.isArray(obj.measureLinks) || obj.measureLinks.length === 0) return;
    const contributing = obj.measureLinks.filter(
      l => l.linkType !== 'CONTRAINDICATED' && l.status !== 'unlinked'
    );
    // Rule 4 + 5 + 6 apply to ALL links, contributing or not.
    obj.measureLinks.forEach((link, linkIdx) => {
      if (!link.linkRationale || String(link.linkRationale).trim().length < 10) {
        throw new Error(
          `TherapeuticGoal: objectives[${objIdx}].measureLinks[${linkIdx}].linkRationale must be ≥ 10 chars`
        );
      }
      if (link.linkType !== 'CONTRAINDICATED' && link.status !== 'unlinked') {
        if (!Array.isArray(link.interventionRefs) || link.interventionRefs.length < 1) {
          throw new Error(
            `TherapeuticGoal: objectives[${objIdx}].measureLinks[${linkIdx}].interventionRefs must have ≥ 1 entry`
          );
        }
      }
      if (link.status === 'unlinked' && (!link.unlinkReason || !String(link.unlinkReason).trim())) {
        throw new Error(
          `TherapeuticGoal: objectives[${objIdx}].measureLinks[${linkIdx}].unlinkReason required when status=unlinked`
        );
      }
    });
    if (contributing.length === 0) return; // all unlinked/contraindicated — nothing to check
    // Rule 1: exactly one PRIMARY
    const primaryLinks = contributing.filter(l => l.linkType === 'PRIMARY');
    if (primaryLinks.length !== 1) {
      throw new Error(
        `TherapeuticGoal: objectives[${objIdx}] must have exactly 1 PRIMARY measureLink (found ${primaryLinks.length})`
      );
    }
    // Rule 2: PRIMARY.weight >= 0.5
    if ((primaryLinks[0].weight ?? 0) < 0.5) {
      throw new Error(
        `TherapeuticGoal: objectives[${objIdx}] PRIMARY measureLink weight must be ≥ 0.5 (got ${primaryLinks[0].weight})`
      );
    }
    // Rule 3: sum of weights = 1.0 (± 0.01)
    const sum = contributing.reduce((s, l) => s + (l.weight ?? 0), 0);
    if (Math.abs(sum - 1) > 0.01) {
      throw new Error(
        `TherapeuticGoal: objectives[${objIdx}] contributing measureLinks weights must sum to 1.0 (got ${sum.toFixed(3)})`
      );
    }
  });
});

// ─── Pre-save ───────────────────────────────────────────────────────────────

// Mongoose-9 throw-style pre-save (next param not reliably passed
// in all paths under modern Kareem); same fix pattern as W210 hooks.
therapeuticGoalSchema.pre('save', function () {
  // W235 — Mirror PRIMARY link.measureId to legacy objective.measureId
  //         so W216 measureGoalUpdater (queries on objectives[].measureId)
  //         continues to work without changes.
  if (Array.isArray(this.objectives)) {
    this.objectives.forEach(obj => {
      if (Array.isArray(obj.measureLinks) && obj.measureLinks.length > 0) {
        const primary = obj.measureLinks.find(
          l => l.linkType === 'PRIMARY' && l.status !== 'unlinked'
        );
        if (primary) obj.measureId = primary.measureId;
      }
    });
  }

  if (!this.goalNumber && this.isNew) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.goalNumber = `GL-${dateStr}-${random}`;
  }

  // Auto-update status based on progress
  if (this.currentProgress >= 100 && this.status === 'active') {
    this.status = 'achieved';
    this.achievedDate = new Date();
  }

  // Calculate trend from progress history
  if (this.progressHistory && this.progressHistory.length >= 2) {
    const sorted = [...this.progressHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
    const last = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    if (!this.trend) this.trend = {};
    const delta = last.value - prev.value;
    this.trend.direction = delta > 0 ? 'improving' : delta < 0 ? 'declining' : 'stable';
    this.trend.slope = delta;

    // Estimate days to target
    if (delta > 0 && this.target?.value) {
      const remaining = this.target.value - last.value;
      const daysBetween = Math.max(
        1,
        (new Date(last.date) - new Date(prev.date)) / (1000 * 60 * 60 * 24)
      );
      this.trend.daysToTarget = Math.ceil((remaining / delta) * daysBetween);
    }
  }
});

// ─── Instance Methods ───────────────────────────────────────────────────────

therapeuticGoalSchema.methods.recordProgress = function (entry) {
  this.progressHistory.push(entry);
  this.currentProgress = entry.value;
  return this.save();
};

// ─── Static Methods ─────────────────────────────────────────────────────────

therapeuticGoalSchema.statics.getGoalTree = async function (beneficiaryId, episodeId) {
  const match = { beneficiaryId, isDeleted: { $ne: true } };
  if (episodeId) match.episodeId = episodeId;

  const goals = await this.find(match).sort({ type: 1, priority: 1 }).lean({ virtuals: true });

  // Build tree: long_term → short_term → session
  const longTerm = goals.filter(g => g.type === 'long_term');
  longTerm.forEach(lt => {
    lt.children = goals.filter(g => g.parentGoalId?.toString() === lt._id.toString());
    lt.children.forEach(st => {
      st.children = goals.filter(g => g.parentGoalId?.toString() === st._id.toString());
    });
  });

  return longTerm;
};

therapeuticGoalSchema.statics.getStatistics = async function (filter = {}) {
  const match = { isDeleted: { $ne: true } };
  if (filter.beneficiaryId) match.beneficiaryId = new mongoose.Types.ObjectId(filter.beneficiaryId);
  if (filter.episodeId) match.episodeId = new mongoose.Types.ObjectId(filter.episodeId);
  if (filter.branchId) match.branchId = new mongoose.Types.ObjectId(filter.branchId);

  const [stats] = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        achieved: { $sum: { $cond: [{ $eq: ['$status', 'achieved'] }, 1, 0] } },
        avgProgress: { $avg: '$currentProgress' },
      },
    },
  ]);

  return {
    ...(stats || { total: 0, active: 0, achieved: 0, avgProgress: 0 }),
    achievementRate:
      stats && stats.total > 0 ? Math.round((stats.achieved / stats.total) * 100) : 0,
  };
};

const TherapeuticGoal =
  mongoose.models.TherapeuticGoal || mongoose.model('TherapeuticGoal', therapeuticGoalSchema);

module.exports = {
  TherapeuticGoal,
  therapeuticGoalSchema,
  // W235 — exported for service + tests
  LINK_TYPES,
  LINK_STATUSES,
  measureLinkSchema,
};
