'use strict';

/**
 * SensoryDietProgram — Wave 691.
 *
 * "برنامج الحمية الحسية + جلسات الغرفة متعددة الحواس (سنوزلين)" — a
 * structured, scheduled sensory-diet plan for a beneficiary, plus a log of
 * Snoezelen / multisensory-room sessions.
 *
 * Why a dedicated model (the 2026-05-31 audit gap):
 *   • SensoryProfileAssessment (Dunn's quadrants) ASSESSES sensory needs,
 *     and AutismProfile embeds a free `sensory_diet[]` array — but there
 *     was no standalone, scheduled, reviewable sensory-diet PROGRAM with a
 *     lifecycle, nor any record of sensory-room (Snoezelen) SESSIONS and
 *     their regulation outcome.
 *   • OT practice plans a sensory diet as scheduled activities by sensory
 *     system + regulation purpose (alerting/calming/organizing), reviewed
 *     periodically; Snoezelen sessions track stimuli used + whether the
 *     beneficiary regulated. Both are surfaced here.
 *
 * Cross-link: sensoryProfileAssessmentId (the SensoryProfileAssessment the
 * diet was derived from) — stored as a plain ObjectId (no ref) since that
 * model's registered name is not guaranteed stable; resolve lazily.
 *
 * Wave-18 invariants:
 *   • status ∈ STATUSES
 *   • status=active ⇒ at least one activity
 *   • status=discontinued ⇒ discontinueReason required
 *   • every activity.sensorySystem ∈ SENSORY_SYSTEMS, .purpose ∈ PURPOSES
 *   • every snoezelen session.regulationOutcome ∈ REGULATION_OUTCOMES
 */

const mongoose = require('mongoose');

const STATUSES = ['active', 'on_hold', 'completed', 'discontinued'];
const SENSORY_SYSTEMS = [
  'proprioceptive',
  'vestibular',
  'tactile',
  'visual',
  'auditory',
  'oral',
  'interoceptive',
];
const PURPOSES = ['alerting', 'calming', 'organizing'];
const REGULATION_OUTCOMES = ['regulated', 'partially_regulated', 'no_change', 'escalated'];

const ActivitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 200 },
    sensorySystem: { type: String, enum: SENSORY_SYSTEMS, required: true },
    purpose: { type: String, enum: PURPOSES, required: true },
    frequency: { type: String, default: '', maxlength: 100 }, // "كل ساعتين", "قبل الجلسة"
    durationMinutes: { type: Number, default: null, min: 0, max: 240 },
    equipment: { type: [String], default: () => [] },
    instructions: { type: String, default: '', maxlength: 500 },
  },
  { _id: true }
);

const SnoezelenSessionSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    durationMinutes: { type: Number, default: null, min: 0, max: 240 },
    room: { type: String, default: '', maxlength: 100 },
    stimuliUsed: { type: [String], default: () => [] }, // bubble tube, fibre optics, aromatherapy...
    regulationOutcome: { type: String, enum: REGULATION_OUTCOMES, required: true },
    responseNotes: { type: String, default: '', maxlength: 500 },
    byName: { type: String, default: '', maxlength: 100 },
  },
  { _id: true }
);

const SensoryDietProgramSchema = new mongoose.Schema(
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
    // Source assessment — plain ObjectId (no ref; model name not stable).
    sensoryProfileAssessmentId: { type: mongoose.Schema.Types.ObjectId, default: null },

    therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    therapistName: { type: String, default: '', maxlength: 100 },

    status: { type: String, enum: STATUSES, default: 'active', index: true },
    startDate: { type: Date, default: Date.now },
    reviewDate: { type: Date, default: null },

    goals: { type: [String], default: () => [] },
    activities: { type: [ActivitySchema], default: () => [] },
    snoezelenSessions: { type: [SnoezelenSessionSchema], default: () => [] },

    reviewNotes: { type: String, default: '', maxlength: 1000 },
    discontinueReason: { type: String, default: '', maxlength: 300 },
    notes: { type: String, default: '', maxlength: 1000 },
  },
  { timestamps: true, collection: 'sensory_diet_programs' }
);

SensoryDietProgramSchema.index({ beneficiaryId: 1, status: 1 });
SensoryDietProgramSchema.index({ branchId: 1, status: 1 });
SensoryDietProgramSchema.index({ status: 1, reviewDate: 1 });

SensoryDietProgramSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

SensoryDietProgramSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!STATUSES.includes(this.status)) {
    this.invalidate('status', `must be one of ${STATUSES.join(',')}`);
    ok = false;
  }
  if (
    this.status === 'active' &&
    (!Array.isArray(this.activities) || this.activities.length === 0)
  ) {
    this.invalidate('activities', 'an active sensory diet needs at least one activity');
    ok = false;
  }
  if (this.status === 'discontinued' && !String(this.discontinueReason || '').trim()) {
    this.invalidate('discontinueReason', 'discontinueReason required when status=discontinued');
    ok = false;
  }
  return ok;
});

/** Snoezelen sessions whose outcome was regulating (regulated|partially). */
SensoryDietProgramSchema.virtual('regulatedSessionCount').get(function () {
  if (!Array.isArray(this.snoezelenSessions)) return 0;
  return this.snoezelenSessions.filter(
    s => s.regulationOutcome === 'regulated' || s.regulationOutcome === 'partially_regulated'
  ).length;
});

SensoryDietProgramSchema.virtual('isActive').get(function () {
  return this.status === 'active';
});

/** An active program past its review date (needs OT re-review). */
SensoryDietProgramSchema.virtual('isReviewOverdue').get(function () {
  if (!this.reviewDate) return false;
  if (this.status !== 'active') return false;
  return new Date(this.reviewDate).getTime() < Date.now();
});

SensoryDietProgramSchema.set('toJSON', { virtuals: true });
SensoryDietProgramSchema.set('toObject', { virtuals: true });

// ── W1051: unified-core linkage ───────────────────────────────────────
// On completion (status → 'completed'), publish sensory_diet.completed so
// the cross-module subscriber records a clinical milestone on the
// beneficiary's CareTimeline. NON-callback hooks only (global async save
// plugin puts Kareem in promise-adapter mode — callback hooks would break).
SensoryDietProgramSchema.pre('save', function () {
  this.$__sensoryDietCompletedNow =
    this.status === 'completed' && (this.isNew || this.isModified('status'));
});

function emitSensoryDietCompleted(doc) {
  if (!doc || !doc.$__sensoryDietCompletedNow) return;
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.publish('sensory-diet-program', 'sensory_diet.completed', {
      programId: String(doc._id),
      beneficiaryId: doc.beneficiaryId ? String(doc.beneficiaryId) : null,
      ...(doc.branchId ? { branchId: String(doc.branchId) } : {}),
      completedAt: doc.updatedAt,
    });
  } catch (_err) {
    /* bus optional — never block the write */
  }
}

SensoryDietProgramSchema.post('save', emitSensoryDietCompleted);

module.exports =
  mongoose.models.SensoryDietProgram ||
  mongoose.model('SensoryDietProgram', SensoryDietProgramSchema);

module.exports.STATUSES = STATUSES;
module.exports.SENSORY_SYSTEMS = SENSORY_SYSTEMS;
module.exports.PURPOSES = PURPOSES;
module.exports.REGULATION_OUTCOMES = REGULATION_OUTCOMES;
