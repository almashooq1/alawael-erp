/**
 * BipEffectiveness — قراءة فعالية خطة التدخل السلوكي
 * ════════════════════════════════════════════════════════════════════
 * Wave 267 — BIP Fidelity & Effectiveness
 *
 * Periodic measurement of the TARGET behavior + REPLACEMENT behavior
 * against the FBA's baseline_data. Answers "Is the BIP working?"
 * independently from "Did we follow it?" (which is BipFidelityCheck).
 *
 * Both must be tracked: high fidelity + low effectiveness → hypothesis
 * was wrong; low fidelity + any effectiveness → implementation issue.
 *
 * Measurement method (frequency / duration / intensity / latency) is
 * pulled from the parent FBA's target_behavior.measurement_method and
 * frozen in the reading so a later FBA revision doesn't shift past
 * trend interpretation.
 *
 * Trend direction is computed in the service from the LAST N readings
 * — not in this model — to keep schema simple.
 *
 * Wave-18 invariants:
 *   - measuredAt cannot be in the future
 *   - At least one of {frequency, durationMinutes, intensity, latencySec}
 *     must be set
 *
 * @module models/BipEffectiveness
 */

'use strict';

const mongoose = require('mongoose');

const bipEffectivenessSchema = new mongoose.Schema(
  {
    // ── Context ───────────────────────────────────────────────────
    fbaAssessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BehavioralFunctionAssessment',
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

    // ── Period ────────────────────────────────────────────────────
    measuredAt: { type: Date, required: true, default: Date.now, index: true },
    measuredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    periodStart: { type: Date }, // start of measurement period
    periodEnd: { type: Date },
    observationHours: { type: Number, min: 0 }, // hours of observation in period

    // ── Target behavior measurement ───────────────────────────────
    // Captured per the FBA's measurement_method. Multiple may be set
    // when the team tracks multiple dimensions.
    target: {
      frequency: { type: Number, min: 0 }, // count of episodes
      durationMinutes: { type: Number, min: 0 }, // total minutes
      intensity: { type: Number, min: 0, max: 10 }, // 0-10 scale (BACB convention)
      latencySec: { type: Number, min: 0 }, // avg latency to onset after antecedent
      rate: { type: Number, min: 0 }, // frequency per observation hour
    },

    // ── Replacement behavior measurement ──────────────────────────
    // The other half: are alternatives being learned/used?
    replacement: {
      frequency: { type: Number, min: 0 },
      successRate: { type: Number, min: 0, max: 100 }, // % opportunities replacement was used
      independenceLevel: {
        type: String,
        enum: ['full_prompt', 'partial_prompt', 'gestural_prompt', 'verbal_prompt', 'independent'],
      },
    },

    // ── Snapshot from FBA at measurement time ─────────────────────
    // Frozen reference for trend interpretation.
    snapshot: {
      measurementMethod: {
        type: String,
        enum: ['frequency', 'duration', 'interval', 'latency', 'intensity'],
      },
      baselineFrequency: Number,
      baselineDurationMinutes: Number,
      baselineIntensity: Number,
      bipActivatedAt: Date, // for "time since BIP started" computations
    },

    notes_ar: { type: String, trim: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

bipEffectivenessSchema.index({ fbaAssessmentId: 1, measuredAt: -1 });
bipEffectivenessSchema.index({ beneficiaryId: 1, measuredAt: -1 });

bipEffectivenessSchema.pre('save', function preSaveInvariants() {
  if (this.measuredAt && this.measuredAt.getTime() > Date.now() + 60 * 1000) {
    throw new Error('measuredAt cannot be in the future');
  }
  const t = this.target || {};
  const hasAnyTarget =
    typeof t.frequency === 'number' ||
    typeof t.durationMinutes === 'number' ||
    typeof t.intensity === 'number' ||
    typeof t.latencySec === 'number' ||
    typeof t.rate === 'number';
  if (!hasAnyTarget) {
    throw new Error(
      'at least one of target.{frequency,durationMinutes,intensity,latencySec,rate} must be set'
    );
  }
  // Auto-compute rate when frequency + observationHours both set.
  if (
    typeof this.target?.frequency === 'number' &&
    typeof this.observationHours === 'number' &&
    this.observationHours > 0 &&
    typeof this.target.rate !== 'number'
  ) {
    this.target.rate = Number((this.target.frequency / this.observationHours).toFixed(4));
  }
});

// ─── Virtuals ───────────────────────────────────────────────────────────────
// Percent change from baseline frequency. Negative = improvement when
// target behavior is the thing to REDUCE (typical case). Null when
// snapshot baseline missing.
bipEffectivenessSchema.virtual('percentChangeFromBaseline').get(function pct() {
  const baseline = this.snapshot && this.snapshot.baselineFrequency;
  const current = this.target && this.target.frequency;
  if (typeof baseline !== 'number' || baseline <= 0 || typeof current !== 'number') {
    return null;
  }
  return Number((((current - baseline) / baseline) * 100).toFixed(1));
});

module.exports =
  mongoose.models.BipEffectiveness || mongoose.model('BipEffectiveness', bipEffectivenessSchema);
