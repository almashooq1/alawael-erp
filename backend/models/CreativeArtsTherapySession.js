'use strict';

/**
 * CreativeArtsTherapySession — Wave 685.
 *
 * "جلسة العلاج بالفنون التعبيرية" — a structured session of an expressive/
 * creative-arts therapy modality (music, art, drama, dance-movement, play)
 * for a beneficiary.
 *
 * Why a dedicated model (the 2026-05-31 audit gap):
 *   • Music therapy and art therapy existed ONLY as enum values in the
 *     generic TherapySession.therapy_type — no modality-specific data
 *     (instruments/mediums used, interventions, the artwork/recording
 *     artifact, engagement, mood before/after) could be captured.
 *   • Creative-arts therapies measure outcome by ENGAGEMENT + MOOD SHIFT,
 *     not by a standardized score — so this model surfaces moodBefore/
 *     moodAfter (ranked) and an engagementLevel that dashboards roll up.
 *   • One unified model (modality enum) rather than 5 near-identical ones,
 *     to avoid the fragmentation the doctrine warns about.
 *
 * Wave-18 invariants:
 *   • modality ∈ MODALITIES; status ∈ STATUSES
 *   • format=group ⇒ groupSize ≥ 2
 *   • status=completed ⇒ engagementLevel set + (responseNotes OR progressNotes)
 *   • status=cancelled ⇒ cancelReason required
 *   • moodBefore/moodAfter (when set) ∈ MOODS
 */

const mongoose = require('mongoose');

const MODALITIES = ['music', 'art', 'drama', 'dance_movement', 'play'];
const STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show'];
const FORMATS = ['individual', 'group'];
const ENGAGEMENT_LEVELS = ['none', 'low', 'moderate', 'high'];
const MOODS = ['distressed', 'anxious', 'sad', 'neutral', 'content', 'happy'];

// Positivity rank for mood-shift computation (higher = more positive).
const MOOD_RANK = Object.freeze({
  distressed: 0,
  anxious: 1,
  sad: 2,
  neutral: 3,
  content: 4,
  happy: 5,
});

const CreativeArtsTherapySessionSchema = new mongoose.Schema(
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
    therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    therapistName: { type: String, default: '', maxlength: 100 },

    modality: { type: String, enum: MODALITIES, required: true, index: true },
    sessionDate: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, default: null, min: 0, max: 480 },

    format: { type: String, enum: FORMATS, default: 'individual' },
    groupSize: { type: Number, default: null, min: 1, max: 50 },

    // Modality-specific free lists (instruments, art mediums, props, ...).
    materialsUsed: { type: [String], default: () => [] },
    interventions: { type: [String], default: () => [] },
    goalsAddressed: { type: [String], default: () => [] },

    engagementLevel: { type: String, enum: ENGAGEMENT_LEVELS.concat([null]), default: null },
    moodBefore: { type: String, enum: MOODS.concat([null]), default: null },
    moodAfter: { type: String, enum: MOODS.concat([null]), default: null },
    responseNotes: { type: String, default: '', maxlength: 1000 },

    // Artwork photo / audio recording / video clip of the creative output.
    artifactType: { type: String, enum: ['image', 'audio', 'video', 'none'], default: 'none' },
    artifactRef: { type: String, default: '', maxlength: 300 },

    progressNotes: { type: String, default: '', maxlength: 1000 },
    nextSessionDate: { type: Date, default: null },

    status: { type: String, enum: STATUSES, default: 'scheduled', index: true },
    cancelReason: { type: String, default: '', maxlength: 300 },
    notes: { type: String, default: '', maxlength: 1000 },
  },
  { timestamps: true, collection: 'creative_arts_therapy_sessions' }
);

CreativeArtsTherapySessionSchema.index({ beneficiaryId: 1, sessionDate: -1 });
CreativeArtsTherapySessionSchema.index({ branchId: 1, status: 1 });
CreativeArtsTherapySessionSchema.index({ modality: 1, sessionDate: -1 });

CreativeArtsTherapySessionSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

CreativeArtsTherapySessionSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!MODALITIES.includes(this.modality)) {
    this.invalidate('modality', `must be one of ${MODALITIES.join(',')}`);
    ok = false;
  }
  if (!STATUSES.includes(this.status)) {
    this.invalidate('status', `must be one of ${STATUSES.join(',')}`);
    ok = false;
  }
  if (this.format === 'group' && !(this.groupSize >= 2)) {
    this.invalidate('groupSize', 'groupSize must be >= 2 for a group session');
    ok = false;
  }
  if (this.status === 'completed') {
    if (!this.engagementLevel) {
      this.invalidate('engagementLevel', 'engagementLevel required when status=completed');
      ok = false;
    }
    if (!String(this.responseNotes || '').trim() && !String(this.progressNotes || '').trim()) {
      this.invalidate('progressNotes', 'completed session needs responseNotes or progressNotes');
      ok = false;
    }
  }
  if (this.status === 'cancelled' && !String(this.cancelReason || '').trim()) {
    this.invalidate('cancelReason', 'cancelReason required when status=cancelled');
    ok = false;
  }
  return ok;
});

/**
 * Mood shift on the positivity rank (moodAfter − moodBefore). null when
 * either mood is unset. Surfaced for outcome dashboards.
 */
CreativeArtsTherapySessionSchema.virtual('moodShift').get(function () {
  if (this.moodBefore == null || this.moodAfter == null) return null;
  const before = MOOD_RANK[this.moodBefore];
  const after = MOOD_RANK[this.moodAfter];
  if (typeof before !== 'number' || typeof after !== 'number') return null;
  return after - before;
});

CreativeArtsTherapySessionSchema.virtual('moodImproved').get(function () {
  const shift = this.moodShift;
  return typeof shift === 'number' && shift > 0;
});

CreativeArtsTherapySessionSchema.set('toJSON', { virtuals: true });
CreativeArtsTherapySessionSchema.set('toObject', { virtuals: true });

// ── W1057: unified-core linkage ───────────────────────────────────────
// On completion (status → 'completed'), publish creative_arts_therapy.completed
// so the cross-module subscriber records a clinical milestone on the
// beneficiary's CareTimeline. NON-callback hooks only.
CreativeArtsTherapySessionSchema.pre('save', function () {
  this.$__creativeArtsCompletedNow =
    this.status === 'completed' && (this.isNew || this.isModified('status'));
});

function emitCreativeArtsTherapyCompleted(doc) {
  if (!doc || !doc.$__creativeArtsCompletedNow) return;
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.publish('creative-arts-therapy', 'creative_arts_therapy.completed', {
      sessionId: String(doc._id),
      beneficiaryId: doc.beneficiaryId ? String(doc.beneficiaryId) : null,
      ...(doc.branchId ? { branchId: String(doc.branchId) } : {}),
      modality: doc.modality,
      engagementLevel: doc.engagementLevel,
      completedAt: doc.sessionDate || doc.updatedAt,
    });
  } catch (_err) {
    /* bus optional — never block the write */
  }
}

CreativeArtsTherapySessionSchema.post('save', emitCreativeArtsTherapyCompleted);

module.exports =
  mongoose.models.CreativeArtsTherapySession ||
  mongoose.model('CreativeArtsTherapySession', CreativeArtsTherapySessionSchema);

module.exports.MODALITIES = MODALITIES;
module.exports.STATUSES = STATUSES;
module.exports.FORMATS = FORMATS;
module.exports.ENGAGEMENT_LEVELS = ENGAGEMENT_LEVELS;
module.exports.MOODS = MOODS;
module.exports.MOOD_RANK = MOOD_RANK;
