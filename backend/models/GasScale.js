/**
 * GasScale — مقياس تحقيق الهدف العلاجي (Goal Attainment Scaling)
 * ════════════════════════════════════════════════════════════════════
 * Wave 264 — GAS Foundation
 *
 * One scale per therapeutic goal. Five behaviourally-defined levels
 * (Kiresuk & Sherman 1968):
 *
 *   -2  : much less than expected (worst plausible deterioration)
 *   -1  : less than expected (typically the baseline)
 *    0  : expected level of outcome (the SMART target)
 *   +1  : more than expected
 *   +2  : much more than expected (best plausible improvement)
 *
 * Scales are versioned: any mid-program change creates a NEW scale
 * version with `supersedes` pointing back. Scorings reference one
 * specific version so historical interpretations don't drift.
 *
 * Wave-18 invariants:
 *   - Exactly one ACTIVE scale per goalId at a time (unique partial
 *     index on { goalId: 1 } where status='active').
 *   - All 5 levels must have a description (description_ar required).
 *   - baselineLevel must be one of -2/-1/0; expectedOutcomeLevel must
 *     be 0 (Kiresuk convention — the expected outcome anchors at 0).
 *   - Weight must be > 0 and <= 5 (typical clinical range).
 *
 * @module models/GasScale
 */

'use strict';

const mongoose = require('mongoose');

const LEVELS = [-2, -1, 0, 1, 2];

const levelSchema = new mongoose.Schema(
  {
    level: { type: Number, enum: LEVELS, required: true },
    description_ar: { type: String, required: true, trim: true },
    description_en: { type: String, trim: true },
  },
  { _id: false }
);

const gasScaleSchema = new mongoose.Schema(
  {
    // ── Context ───────────────────────────────────────────────────
    goalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TherapeuticGoal',
      required: true,
    },
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },

    // ── Scale definition ───────────────────────────────────────────
    title_ar: { type: String, required: true, trim: true },
    title_en: { type: String, trim: true },
    domain: {
      type: String,
      enum: [
        'motor',
        'communication',
        'cognitive',
        'behavioral',
        'social',
        'adl',
        'vocational',
        'academic',
        'sensory',
        'other',
      ],
      required: true,
      index: true,
    },

    // The five behaviorally-anchored levels (-2..+2).
    levels: {
      type: [levelSchema],
      validate: {
        validator: arr =>
          Array.isArray(arr) &&
          arr.length === 5 &&
          new Set(arr.map(l => l.level)).size === 5 &&
          arr.every(l => LEVELS.includes(l.level)),
        message: 'levels must contain exactly one entry per -2/-1/0/+1/+2',
      },
      required: true,
    },

    // ── Anchors ───────────────────────────────────────────────────
    // baselineLevel — where the beneficiary started. Convention: -1
    // (so any progress at all moves to 0+). Sometimes -2 if pre-
    // existing deterioration; rarely 0 (would mean already at target).
    baselineLevel: {
      type: Number,
      enum: [-2, -1, 0],
      default: -1,
      required: true,
    },
    // expectedOutcomeLevel is ALWAYS 0 per Kiresuk convention — the
    // 0-level description IS the expected SMART outcome. Stored
    // explicitly so future variants (some clinicians anchor at +1)
    // are possible without schema change.
    expectedOutcomeLevel: {
      type: Number,
      enum: [0, 1],
      default: 0,
      required: true,
    },

    // ── Weighting (composite T-score) ─────────────────────────────
    // Default 1 — equal-weight contribution to the composite
    // T-score. Higher weights for higher-priority goals (≤5
    // typical).
    weight: { type: Number, min: 0.1, max: 5, default: 1, required: true },

    // ── Version + supersession ────────────────────────────────────
    version: { type: Number, default: 1, required: true, min: 1 },
    supersedes: { type: mongoose.Schema.Types.ObjectId, ref: 'GasScale' },
    supersedeReason_ar: { type: String, trim: true },

    // ── Status ────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['active', 'superseded', 'archived'],
      default: 'active',
      required: true,
      index: true,
    },

    // ── Lifecycle ─────────────────────────────────────────────────
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    archivedAt: { type: Date },
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    archiveReason_ar: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────
// Unique active scale per goal — partial index avoids blocking
// historical superseded versions. Named explicitly so it doesn't
// collide with the field-level index on goalId.
gasScaleSchema.index(
  { goalId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' },
    name: 'goalId_active_unique',
  }
);
gasScaleSchema.index({ beneficiaryId: 1, status: 1 });
gasScaleSchema.index({ branchId: 1, domain: 1, status: 1 });

// ─── Wave-18 invariants ─────────────────────────────────────────────────────
gasScaleSchema.pre('save', function preSaveInvariants() {
  // Order the levels array predictably (-2 first → +2 last) so
  // consumers don't need to sort. Pure normalization, not validation.
  if (Array.isArray(this.levels)) {
    this.levels.sort((a, b) => a.level - b.level);
  }
  // expectedOutcomeLevel must be strictly greater than baselineLevel.
  if (this.expectedOutcomeLevel <= this.baselineLevel) {
    throw new Error('expectedOutcomeLevel must be strictly greater than baselineLevel');
  }
  // archive consistency
  if (this.status === 'archived' && !this.archivedAt) {
    this.archivedAt = new Date();
  }
});

gasScaleSchema.statics.LEVELS = LEVELS;

module.exports = mongoose.models.GasScale || mongoose.model('GasScale', gasScaleSchema);
