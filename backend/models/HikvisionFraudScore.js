'use strict';

/**
 * HikvisionFraudScore — Wave 100 Phase 5.
 *
 * One row per employee. Stores the AGGREGATE score derived from the
 * employee's active fraud flags (decayed over time) for fast UI lookup.
 *
 * The score is computed by `hikvision-fraud-score.service.recomputeScore`.
 * Source of truth remains the underlying `HikvisionFraudFlag` rows —
 * this collection is denormalised for query speed.
 *
 * Band classification (traffic-light UI):
 *   low      → score ≤ 20
 *   medium   → 21..50
 *   high     → 51..80
 *   critical → 81..100
 *
 * Wave-18 invariants:
 *   • currentScore in [0, 100]
 *   • band ∈ FRAUD_SEVERITIES
 *   • flagCount.open + flagCount.acknowledged ≤ flagCount.total
 */

const mongoose = require('mongoose');
const reg = require('../intelligence/hikvision.registry');

const FlagCountSchema = new mongoose.Schema(
  {
    open: { type: Number, default: 0, min: 0 },
    acknowledged: { type: Number, default: 0, min: 0 },
    dismissed: { type: Number, default: 0, min: 0 },
    escalated: { type: Number, default: 0, min: 0 },
    expired: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const HikvisionFraudScoreSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      unique: true,
      index: true,
    },

    currentScore: { type: Number, default: 0, min: 0, max: 100 },
    band: {
      type: String,
      enum: reg.FRAUD_SEVERITIES,
      default: reg.FRAUD_SEVERITY.LOW,
      index: true,
    },

    flagCount: { type: FlagCountSchema, default: () => ({}) },

    // The most-recent flag that bumped this score — for fast UI display.
    lastFlagId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HikvisionFraudFlag',
      default: null,
    },
    lastFlagAt: { type: Date, default: null },

    lastComputedAt: { type: Date, default: Date.now },

    // Branch where most flags occurred (for analytics filtering).
    primaryBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
  },
  { timestamps: true, collection: 'hikvision_fraud_scores' }
);

HikvisionFraudScoreSchema.index({ band: 1, currentScore: -1 });
HikvisionFraudScoreSchema.index({ primaryBranchId: 1, band: 1 });

// ─── Wave-18 invariants ──────────────────────────────────────────
HikvisionFraudScoreSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

HikvisionFraudScoreSchema.path('__invariants').validate(function () {
  let ok = true;

  if (this.currentScore < 0 || this.currentScore > 100) {
    this.invalidate('currentScore', 'currentScore must be in [0, 100]');
    ok = false;
  }

  // Cross-check band consistency. If invalid, fix-and-warn rather than
  // reject — keeping a wrong band in DB is worse than emitting it.
  if (this.flagCount) {
    const sum =
      (this.flagCount.open || 0) +
      (this.flagCount.acknowledged || 0) +
      (this.flagCount.dismissed || 0) +
      (this.flagCount.escalated || 0) +
      (this.flagCount.expired || 0);
    if (this.flagCount.total && sum > this.flagCount.total) {
      this.invalidate(
        'flagCount',
        `sum of states (${sum}) exceeds total (${this.flagCount.total})`
      );
      ok = false;
    }
  }

  return ok;
});

module.exports =
  mongoose.models.HikvisionFraudScore ||
  mongoose.model('HikvisionFraudScore', HikvisionFraudScoreSchema);

module.exports.HikvisionFraudScoreSchema = HikvisionFraudScoreSchema;
