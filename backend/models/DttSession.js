'use strict';

/**
 * DttSession — Wave 689.
 *
 * "جلسة التدريب بالمحاولات المنفصلة (ABA/DTT)" — a structured Applied
 * Behavior Analysis discrete-trial teaching session with TRIAL-BY-TRIAL
 * data collection.
 *
 * Why a dedicated model (the 2026-05-31 audit gap):
 *   • BehaviorPlan (FBA/BIP) + ABC data + AutismProfile existed, and
 *     RehabSession captured AGGREGATE trial counts per goal — but nothing
 *     recorded GRANULAR discrete-trial data (per-trial prompt level +
 *     response), which is the core unit of ABA progress measurement.
 *   • The clinical metric is the INDEPENDENT-CORRECT rate (correct
 *     response at the independent prompt level) per target, trended across
 *     sessions to decide mastery and prompt-fading. That requires storing
 *     each trial's promptLevel + response, not just a count.
 *   • A session teaches several TARGETS (each ~ a VB-MAPP/ABLLS skill);
 *     each target holds its trials and a mastery criterion.
 *
 * Wave-18 invariants:
 *   • programArea ∈ PROGRAM_AREAS; status ∈ STATUSES
 *   • status=completed ⇒ at least one target with at least one trial
 *   • status=cancelled ⇒ cancelReason required
 *   • every target with masteryAchieved=true must have trials recorded
 */

const mongoose = require('mongoose');

const PROGRAM_AREAS = [
  'communication',
  'social',
  'motor',
  'academic',
  'self_help',
  'play',
  'behavior_reduction',
];
const STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show'];
// Prompt hierarchy (most → least support); 'independent' = no prompt.
const PROMPT_LEVELS = [
  'full_physical',
  'partial_physical',
  'modeling',
  'gestural',
  'verbal',
  'independent',
];
const RESPONSES = ['correct', 'incorrect', 'no_response'];

const TrialSchema = new mongoose.Schema(
  {
    sequence: { type: Number, default: 0, min: 0 },
    promptLevel: { type: String, enum: PROMPT_LEVELS, required: true },
    response: { type: String, enum: RESPONSES, required: true },
    notes: { type: String, default: '', maxlength: 200 },
  },
  { _id: false }
);

const TargetSchema = new mongoose.Schema(
  {
    targetName: { type: String, required: true, maxlength: 200 },
    curriculumRef: { type: String, default: '', maxlength: 120 }, // "VB-MAPP Mand-5", "ABLLS B-7"
    masteryCriterionPct: { type: Number, default: 80, min: 0, max: 100 },
    trials: { type: [TrialSchema], default: () => [] },
    masteryAchieved: { type: Boolean, default: false },
  },
  { _id: true }
);

const DttSessionSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    carePlanVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CarePlanVersion',
      default: null,
    },
    // Cross-link to the governing behavior plan. Plain ObjectId (no ref) —
    // the BIP model name is not a registered Mongoose model under a stable
    // 'BehaviorPlan' name; resolve via lazy lookup at the caller if needed.
    behaviorPlanId: { type: mongoose.Schema.Types.ObjectId, default: null },

    therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    therapistName: { type: String, default: '', maxlength: 100 },

    sessionDate: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, default: null, min: 0, max: 480 },
    programArea: { type: String, enum: PROGRAM_AREAS, required: true, index: true },

    targets: { type: [TargetSchema], default: () => [] },

    reinforcersUsed: { type: [String], default: () => [] },
    behaviorsObserved: { type: [String], default: () => [] }, // challenging behaviors in-session

    status: { type: String, enum: STATUSES, default: 'scheduled', index: true },
    sessionNotes: { type: String, default: '', maxlength: 1000 },
    cancelReason: { type: String, default: '', maxlength: 300 },
  },
  { timestamps: true, collection: 'dtt_sessions' }
);

DttSessionSchema.index({ beneficiaryId: 1, sessionDate: -1 });
DttSessionSchema.index({ branchId: 1, status: 1 });
DttSessionSchema.index({ programArea: 1, sessionDate: -1 });

DttSessionSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

DttSessionSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!PROGRAM_AREAS.includes(this.programArea)) {
    this.invalidate('programArea', `must be one of ${PROGRAM_AREAS.join(',')}`);
    ok = false;
  }
  if (!STATUSES.includes(this.status)) {
    this.invalidate('status', `must be one of ${STATUSES.join(',')}`);
    ok = false;
  }
  if (this.status === 'completed') {
    const hasTrial =
      Array.isArray(this.targets) &&
      this.targets.some(t => Array.isArray(t.trials) && t.trials.length > 0);
    if (!hasTrial) {
      this.invalidate('targets', 'completed session needs at least one target with trial data');
      ok = false;
    }
  }
  if (this.status === 'cancelled' && !String(this.cancelReason || '').trim()) {
    this.invalidate('cancelReason', 'cancelReason required when status=cancelled');
    ok = false;
  }
  if (Array.isArray(this.targets)) {
    for (const t of this.targets) {
      if (t.masteryAchieved && (!Array.isArray(t.trials) || t.trials.length === 0)) {
        this.invalidate('targets', `target "${t.targetName}" marked mastered but has no trials`);
        ok = false;
        break;
      }
    }
  }
  return ok;
});

/** Total trials across all targets. */
DttSessionSchema.virtual('totalTrials').get(function () {
  if (!Array.isArray(this.targets)) return 0;
  return this.targets.reduce((n, t) => n + (Array.isArray(t.trials) ? t.trials.length : 0), 0);
});

/**
 * Independent-correct rate (%) across the whole session: trials whose
 * response is correct AND prompt level is independent. This is the headline
 * ABA progress metric. null when no trials.
 */
DttSessionSchema.virtual('independentCorrectRate').get(function () {
  const total = this.totalTrials;
  if (!total) return null;
  let indCorrect = 0;
  for (const t of this.targets || []) {
    for (const tr of t.trials || []) {
      if (tr.response === 'correct' && tr.promptLevel === 'independent') indCorrect++;
    }
  }
  return Math.round((indCorrect / total) * 100);
});

DttSessionSchema.set('toJSON', { virtuals: true });
DttSessionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.models.DttSession || mongoose.model('DttSession', DttSessionSchema);

module.exports.PROGRAM_AREAS = PROGRAM_AREAS;
module.exports.STATUSES = STATUSES;
module.exports.PROMPT_LEVELS = PROMPT_LEVELS;
module.exports.RESPONSES = RESPONSES;
