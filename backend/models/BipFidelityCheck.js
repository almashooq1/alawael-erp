/**
 * BipFidelityCheck — فحص دقّة تطبيق خطة التدخل السلوكي
 * ════════════════════════════════════════════════════════════════════
 * Wave 267 — BIP Fidelity & Effectiveness
 *
 * Periodic (typically weekly) scoring of whether the team is actually
 * implementing the Behavior Intervention Plan as designed. THE #1
 * predictor of BIP outcomes in practice — without measurement,
 * implementation drifts within 2-3 weeks of plan rollout.
 *
 * Scoring model:
 *   - Each criterion is scored 0-100% (or marked NA if not observable
 *     this period). Examples:
 *       • "Antecedent strategy X applied within 30s of trigger"
 *       • "Replacement behavior reinforced on schedule"
 *       • "Crisis procedure followed when topography ≥ 6/10"
 *   - overallFidelityPercent = mean across applicable (non-NA) criteria
 *   - Status auto-derived from overallFidelityPercent:
 *       ≥ 80% = passing
 *       60-79% = concerning  (team needs coaching)
 *       < 60% = failing      (BIP at risk of failing — escalate)
 *
 * Wave-18 invariants:
 *   - checkedAt cannot be in the future
 *   - at least one criterion required (no empty checks)
 *   - overallFidelityPercent auto-computed in pre-save
 *
 * @module models/BipFidelityCheck
 */

'use strict';

const mongoose = require('mongoose');

const FIDELITY_THRESHOLDS = Object.freeze({
  PASSING_MIN: 80,
  CONCERNING_MIN: 60,
});

const criterionSchema = new mongoose.Schema(
  {
    criterion_ar: { type: String, required: true, trim: true },
    criterion_en: { type: String, trim: true },
    // Score in percent. null when NA (not observable this period).
    score: { type: Number, min: 0, max: 100, default: null },
    notApplicable: { type: Boolean, default: false },
    notes_ar: { type: String, trim: true },
  },
  { _id: true }
);

const bipFidelityCheckSchema = new mongoose.Schema(
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
    checkedAt: { type: Date, required: true, default: Date.now, index: true },
    checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    weekStart: { type: Date }, // start of the period this check covers
    weekEnd: { type: Date },

    // ── Scoring ────────────────────────────────────────────────────
    criteria: {
      type: [criterionSchema],
      validate: {
        validator: arr => Array.isArray(arr) && arr.length >= 1,
        message: 'at least one criterion required',
      },
    },
    overallFidelityPercent: { type: Number, min: 0, max: 100 },

    // ── Status (auto-derived) ─────────────────────────────────────
    status: {
      type: String,
      enum: ['passing', 'concerning', 'failing'],
      index: true,
    },

    // ── Barriers + actions ────────────────────────────────────────
    // Free-text + structured: what blocked implementation, what's
    // the corrective action. Powers the "concerning dismissal" style
    // dashboard from W221 alerts.
    barriers: [
      {
        type: String,
        enum: [
          'staff_turnover',
          'staff_undertrained',
          'environment_change',
          'beneficiary_illness',
          'family_inconsistency',
          'resource_unavailable',
          'plan_unclear',
          'crisis_disrupted',
          'other',
        ],
      },
    ],
    barriers_notes_ar: { type: String, trim: true },
    correctiveActions_ar: { type: String, trim: true },
    requiresSupervisorReview: { type: Boolean, default: false, index: true },

    // ── Lifecycle ─────────────────────────────────────────────────
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
bipFidelityCheckSchema.index({ fbaAssessmentId: 1, checkedAt: -1 });
bipFidelityCheckSchema.index({ branchId: 1, status: 1, checkedAt: -1 });
bipFidelityCheckSchema.index({ beneficiaryId: 1, checkedAt: -1 });

// ─── Wave-18 invariants ─────────────────────────────────────────────────────
bipFidelityCheckSchema.pre('save', function preSaveInvariants() {
  if (this.checkedAt && this.checkedAt.getTime() > Date.now() + 60 * 1000) {
    throw new Error('checkedAt cannot be in the future');
  }

  // Auto-compute overallFidelityPercent across applicable (non-NA)
  // criteria. NA criteria don't contribute to the denominator —
  // matches BACB BIP-fidelity convention.
  if (Array.isArray(this.criteria) && this.criteria.length > 0) {
    const applicable = this.criteria.filter(c => !c.notApplicable && typeof c.score === 'number');
    if (applicable.length === 0) {
      // All NA — fidelity undefined; don't auto-status.
      this.overallFidelityPercent = undefined;
      this.status = undefined;
    } else {
      const sum = applicable.reduce((s, c) => s + c.score, 0);
      const mean = sum / applicable.length;
      this.overallFidelityPercent = Math.round(mean * 100) / 100;
      // Status banding
      if (this.overallFidelityPercent >= FIDELITY_THRESHOLDS.PASSING_MIN) {
        this.status = 'passing';
      } else if (this.overallFidelityPercent >= FIDELITY_THRESHOLDS.CONCERNING_MIN) {
        this.status = 'concerning';
      } else {
        this.status = 'failing';
      }
    }
  }

  // Auto-flag for supervisor review when status='failing' OR
  // any barrier requires escalation (staff_turnover, plan_unclear).
  const escalationBarriers = ['staff_turnover', 'plan_unclear', 'staff_undertrained'];
  const hasEscalation =
    Array.isArray(this.barriers) && this.barriers.some(b => escalationBarriers.includes(b));
  if (this.status === 'failing' || hasEscalation) {
    this.requiresSupervisorReview = true;
  }
});

bipFidelityCheckSchema.statics.FIDELITY_THRESHOLDS = FIDELITY_THRESHOLDS;

module.exports =
  mongoose.models.BipFidelityCheck || mongoose.model('BipFidelityCheck', bipFidelityCheckSchema);
