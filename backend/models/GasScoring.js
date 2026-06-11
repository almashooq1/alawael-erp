/**
 * GasScoring — تسجيل تحقيق هدف على مقياس GAS
 * ════════════════════════════════════════════════════════════════════
 * Wave 264 — GAS Foundation
 *
 * One record per scoring event. Stores the achieved level (-2..+2)
 * AGAINST a specific GasScale version, the actor, and the evidence.
 *
 * Wave-18 invariants:
 *   - achievedLevel must be one of [-2, -1, 0, 1, 2]
 *   - scoredAt cannot be in the future (>60s tolerance for clock skew)
 *   - One scoring per (scaleId, purpose, scoredAt-day) max — guard
 *     against accidental duplicate clicks. Enforced in service, not
 *     at index level (allows backfill / corrections).
 *
 * @module models/GasScoring
 */

'use strict';

const mongoose = require('mongoose');

const gasScoringSchema = new mongoose.Schema(
  {
    // ── Context ───────────────────────────────────────────────────
    scaleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GasScale',
      required: true,
      index: true,
    },
    // Denormalized for query convenience — populated by service from
    // the scale. Allows beneficiary-scoped roll-ups without a join.
    goalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TherapeuticGoal',
      required: true,
      index: true,
    },
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },

    // ── Scoring ────────────────────────────────────────────────────
    achievedLevel: {
      type: Number,
      enum: [-2, -1, 0, 1, 2],
      required: true,
      index: true,
    },
    scoredAt: { type: Date, required: true, default: Date.now, index: true },
    scoredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    purpose: {
      type: String,
      enum: ['baseline', 'progress', 'discharge', 'review'],
      default: 'progress',
      index: true,
    },

    // ── Evidence ──────────────────────────────────────────────────
    evidence_ar: { type: String, trim: true },
    evidence_en: { type: String, trim: true },
    // Optional links to artefacts that justify the level (session
    // notes, video, measure application, etc.). Just IDs — service
    // doesn't dereference.
    relatedSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClinicalSession' },
    relatedMeasureAppId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MeasureApplication',
    },

    // ── Snapshot fields (frozen at scoring time) ──────────────────
    // Captures key scale parameters as they were AT the moment of
    // scoring — so a later supersede of the scale doesn't silently
    // re-interpret old scorings.
    snapshot: {
      scaleVersion: { type: Number, required: true },
      weight: { type: Number, required: true },
      expectedOutcomeLevel: { type: Number, required: true },
      baselineLevel: { type: Number, required: true },
      levelDescription_ar: { type: String },
    },

    // ── Status ────────────────────────────────────────────────────
    // 'active' = canonical record; 'superseded' = a later scoring
    // (correction) replaces this one for analytics. The original
    // is never deleted (audit trail).
    status: {
      type: String,
      enum: ['active', 'superseded'],
      default: 'active',
      required: true,
      index: true,
    },
    supersededBy: { type: mongoose.Schema.Types.ObjectId, ref: 'GasScoring' },
    supersedeReason_ar: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

gasScoringSchema.index({ scaleId: 1, scoredAt: -1 });
gasScoringSchema.index({ beneficiaryId: 1, scoredAt: -1, status: 1 });
gasScoringSchema.index({ goalId: 1, scoredAt: -1, status: 1 });

gasScoringSchema.pre('save', function preSaveInvariants() {
  if (this.scoredAt && this.scoredAt.getTime() > Date.now() + 60 * 1000) {
    throw new Error('scoredAt cannot be in the future');
  }
});

// ─── Virtuals ───────────────────────────────────────────────────────────────
// Did this scoring meet or exceed expected? Useful for quick filters
// on dashboards.
gasScoringSchema.virtual('metExpected').get(function metExpected() {
  if (this.snapshot && typeof this.snapshot.expectedOutcomeLevel === 'number') {
    return this.achievedLevel >= this.snapshot.expectedOutcomeLevel;
  }
  return this.achievedLevel >= 0;
});

// ── Unified-core producer (W1101): emit when a GAS level is first scored ──
gasScoringSchema.pre('save', function flagGasScoringRecorded() {
  this.$__gasScoringRecorded = this.isNew && this.status === 'active';
});

gasScoringSchema.post('save', function emitGasScoringRecorded(doc) {
  if (!doc.$__gasScoringRecorded) return;
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    const expected =
      doc.snapshot && typeof doc.snapshot.expectedOutcomeLevel === 'number'
        ? doc.snapshot.expectedOutcomeLevel
        : 0;
    integrationBus.publish('gas-scoring', 'gas_scoring.recorded', {
      scoringId: String(doc._id),
      beneficiaryId: String(doc.beneficiaryId),
      ...(doc.branchId ? { branchId: String(doc.branchId) } : {}),
      goalId: doc.goalId ? String(doc.goalId) : undefined,
      achievedLevel: doc.achievedLevel,
      purpose: doc.purpose,
      metExpected: doc.achievedLevel >= expected,
      scoredAt: doc.scoredAt || new Date(),
    });
  } catch (_err) {
    /* non-blocking: timeline linkage must never break a save */
  }
});

module.exports = mongoose.models.GasScoring || mongoose.model('GasScoring', gasScoringSchema);
