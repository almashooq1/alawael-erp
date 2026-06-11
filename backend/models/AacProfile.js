/**
 * AacProfile — ملف التواصل البديل والمعزز للمستفيد
 * ════════════════════════════════════════════════════════════════════
 * Wave 263 — AAC Foundation
 *
 * One profile per beneficiary. Captures their current AAC mode, language
 * levels (per Rowland Communication Matrix), motor-access method, PECS
 * phase progression, and partner strategies. Foundation for later waves
 * (boards, vocabulary tracking, partner training logs).
 *
 * Wave-18 invariants:
 *   - PECS phase transitions are append-only (history array immutable on
 *     update); current pecsPhase MUST appear in masteredPhases when it's
 *     advanced (enforced in service.transitionPecsPhase + pre-save).
 *   - reviewIntervalDays >= 14 (no weekly churn) and <= 365.
 *   - assessedAt cannot be in the future.
 *   - One profile per beneficiary (unique index on beneficiaryId).
 *
 * @module models/AacProfile
 */

'use strict';

const mongoose = require('mongoose');

// ─── PECS phase transition sub-schema ───────────────────────────────────────
const pecsTransitionSchema = new mongoose.Schema(
  {
    fromPhase: { type: Number, min: 0, max: 6 }, // null/0 = no prior phase
    toPhase: { type: Number, min: 1, max: 6, required: true },
    transitionedAt: { type: Date, default: Date.now, required: true },
    transitionedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    criteriaMet: [{ type: String }], // e.g. 'reaches_for_picture_independently'
    notes: { type: String, trim: true },
  },
  { _id: true }
);

// ─── Main schema ────────────────────────────────────────────────────────────
const aacProfileSchema = new mongoose.Schema(
  {
    // ── Context ───────────────────────────────────────────────────
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      unique: true,
      index: true,
    },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },

    // ── Modality ───────────────────────────────────────────────────
    primaryModality: {
      type: String,
      enum: ['pre_symbolic', 'low_tech', 'mid_tech', 'high_tech', 'multi_modal'],
      required: true,
      index: true,
    },
    secondaryModalities: [
      { type: String, enum: ['pre_symbolic', 'low_tech', 'mid_tech', 'high_tech'] },
    ],
    deviceModel: { type: String, trim: true }, // e.g. 'iPad Pro + Proloquo2Go'
    deviceVendor: { type: String, trim: true },

    // ── Language levels (Rowland Communication Matrix) ────────────
    receptiveLanguageLevel: {
      type: String,
      enum: ['pre_intentional', 'pre_symbolic', 'concrete_symbols', 'abstract_symbols', 'language'],
      required: true,
    },
    expressiveLanguageLevel: {
      type: String,
      enum: ['pre_intentional', 'pre_symbolic', 'concrete_symbols', 'abstract_symbols', 'language'],
      required: true,
    },

    // ── Motor access ───────────────────────────────────────────────
    accessMethod: {
      type: String,
      enum: [
        'direct_selection',
        'partner_assisted_scanning',
        'eye_gaze',
        'switch_scanning_one',
        'switch_scanning_two',
        'auditory_scanning',
        'visual_scanning',
        'other',
      ],
      required: true,
    },
    accessNotes_ar: { type: String, trim: true },

    // ── Vocabulary estimate ────────────────────────────────────────
    currentVocabularySize: { type: Number, min: 0, default: 0 },
    vocabularyEstimatedAt: { type: Date },

    // ── PECS protocol tracking (Bondy & Frost) ────────────────────
    pecsPhase: {
      current: { type: Number, min: 1, max: 6, default: null }, // null = not on PECS protocol
      masteredPhases: [{ type: Number, min: 1, max: 6 }],
      lastTransitionAt: { type: Date },
      lastTransitionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      transitionHistory: [pecsTransitionSchema],
    },

    // ── Partner strategies (evidence-based) ───────────────────────
    corePartnerStrategies: [
      {
        type: String,
        enum: [
          'aided_language_stimulation',
          'expectant_pause',
          'choice_offering',
          'environmental_arrangement',
          'least_to_most_prompting',
          'most_to_least_prompting',
          'core_word_focus',
          'recasting',
          'modeling',
        ],
      },
    ],
    partnerStrategiesNotes_ar: { type: String, trim: true },

    // ── Assessment metadata ───────────────────────────────────────
    assessedAt: { type: Date, required: true },
    assessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lastReviewedAt: { type: Date },
    nextReviewDue: { type: Date, index: true },
    reviewIntervalDays: { type: Number, min: 14, max: 365, default: 90 },

    // ── Status ────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
      default: 'active',
      index: true,
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────
aacProfileSchema.index({ branchId: 1, status: 1 });
aacProfileSchema.index({ branchId: 1, primaryModality: 1 });
aacProfileSchema.index({ 'pecsPhase.current': 1 });

// ─── Wave-18 invariants (pre-save validation, modern mongoose 9 signature) ──
// Throws synchronously to abort save; mongoose surfaces the error as a
// ValidationError-flavoured save rejection.
aacProfileSchema.pre('save', function preSaveInvariants() {
  if (this.assessedAt && this.assessedAt.getTime() > Date.now() + 60 * 1000) {
    throw new Error('assessedAt cannot be in the future');
  }
  if (this.currentVocabularySize > 0 && !this.vocabularyEstimatedAt) {
    this.vocabularyEstimatedAt = this.assessedAt || new Date();
  }
  const anchor = this.lastReviewedAt || this.assessedAt;
  if (anchor && this.reviewIntervalDays && !this.nextReviewDue) {
    const due = new Date(anchor);
    due.setDate(due.getDate() + this.reviewIntervalDays);
    this.nextReviewDue = due;
  }
  // PECS invariant: every previously-transitioned-FROM phase below the
  // current phase must appear in masteredPhases (rules out a corrupt
  // history that skipped recording mastery).
  if (this.pecsPhase && this.pecsPhase.current && Array.isArray(this.pecsPhase.transitionHistory)) {
    const history = this.pecsPhase.transitionHistory;
    const mastered = new Set(this.pecsPhase.masteredPhases || []);
    for (const t of history) {
      if (t.fromPhase && t.fromPhase >= 1 && t.fromPhase < this.pecsPhase.current) {
        if (!mastered.has(t.fromPhase)) {
          throw new Error(
            `PECS invariant: phase ${t.fromPhase} appears in transition history but is not in masteredPhases`
          );
        }
      }
    }
  }
});

// ─── Virtuals ───────────────────────────────────────────────────────────────
aacProfileSchema.virtual('isReviewOverdue').get(function isReviewOverdue() {
  if (!this.nextReviewDue) return false;
  return this.nextReviewDue.getTime() < Date.now();
});

aacProfileSchema.virtual('pecsCurrentPhase').get(function pecsCurrentPhase() {
  return (this.pecsPhase && this.pecsPhase.current) || null;
});

// ─── W1063: unified-core linkage — AAC PECS phase advancement ────────────────
// Milestone = the PECS protocol current phase is set/advanced (new profile
// already on a phase, or an existing profile's phase moves up). Emits a
// timeline event so the beneficiary's communication progression is visible
// on the unified core. Non-callback hook style (W483 safe family).
aacProfileSchema.pre('save', function flagAacPecsAdvanced() {
  this.$__aacPecsAdvancedNow = !!(
    this.pecsPhase &&
    this.pecsPhase.current &&
    (this.isNew || this.isModified('pecsPhase.current'))
  );
});

aacProfileSchema.post('save', function emitAacPecsPhaseAdvanced(doc) {
  if (!doc.$__aacPecsAdvancedNow) return;
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.publish('aac-profile', 'aac_profile.pecs_phase_advanced', {
      profileId: String(doc._id),
      beneficiaryId: doc.beneficiaryId ? String(doc.beneficiaryId) : undefined,
      ...(doc.branchId ? { branchId: String(doc.branchId) } : {}),
      pecsPhase: doc.pecsPhase && doc.pecsPhase.current,
      primaryModality: doc.primaryModality,
      advancedAt: (doc.pecsPhase && doc.pecsPhase.lastTransitionAt) || doc.updatedAt || new Date(),
    });
  } catch (err) {
    // best-effort; never block the save on an event-bus issue
    void err;
  }
});

module.exports = mongoose.models.AacProfile || mongoose.model('AacProfile', aacProfileSchema);
