'use strict';

/**
 * SelfAdvocacyTrainingPlan — W462.
 *
 * Per-beneficiary plan for delivering the 5-Rights self-advocacy
 * curriculum (track selection + module completion tracking). Per
 * Phase B Innovation 8 (Rights Module).
 *
 * Track + curriculum live in self-advocacy-curriculum.lib.js; this
 * model just stores the plan + completion state.
 */

const mongoose = require('mongoose');

const ModuleCompletionSchema = new mongoose.Schema(
  {
    rightCode: {
      type: String,
      enum: ['be_heard', 'consent', 'refuse', 'complain', 'community'],
      required: true,
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'skipped'],
      default: 'not_started',
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    deliveredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deliveredByRole: {
      type: String,
      enum: ['advocate', 'therapist', 'case_manager', 'family', 'peer'],
    },
    sessionsRequired: { type: Number, default: 1, min: 1, max: 10 },
    sessionsCompleted: { type: Number, default: 0, min: 0 },
    notes: { type: String, maxlength: 1000 },
    skipReason: { type: String, maxlength: 500 },
  },
  { _id: false }
);

const SelfAdvocacyTrainingPlanSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      unique: true, // one active plan per beneficiary
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },

    // Track selected via self-advocacy-curriculum.lib.selectTrack
    track: {
      type: String,
      enum: ['track_early', 'track_primary', 'track_teen', 'track_adult'],
      required: true,
    },
    trackSelectionReasoning: { type: String, maxlength: 500 },

    // 5-module completion tracking (one entry per right)
    modules: { type: [ModuleCompletionSchema], default: () => [] },

    // Computed (refreshed by pre-save) — 0-100
    completionPercentage: { type: Number, min: 0, max: 100, default: 0 },

    // Plan lifecycle
    startedAt: { type: Date, default: Date.now },
    targetCompletionDate: { type: Date },
    completedAt: { type: Date },

    status: {
      type: String,
      enum: ['active', 'on_hold', 'completed', 'archived'],
      default: 'active',
      index: true,
    },

    // Reasonable adjustments (W465 alignment — accommodations for delivery)
    reasonableAdjustments: [{ type: String, maxlength: 500 }],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, maxlength: 2000 },
  },
  {
    timestamps: true,
    collection: 'self_advocacy_training_plans',
  }
);

SelfAdvocacyTrainingPlanSchema.index({ branchId: 1, status: 1 });
SelfAdvocacyTrainingPlanSchema.index({ beneficiaryId: 1, status: 1 });

// W462 Wave-18 invariants
// W956 — async (Mongoose-9 native); a throw rejects the save exactly as
// next(err) did. No longer depends on the legacy-hook shim.
SelfAdvocacyTrainingPlanSchema.pre('save', async function () {
  // Refresh completion percentage via lib
  const curriculum = require('../intelligence/self-advocacy-curriculum.lib');
  const completedCodes = (this.modules || [])
    .filter(m => m.status === 'completed')
    .map(m => m.rightCode);
  this.completionPercentage = curriculum.completionRate(this.track, completedCodes);

  // Auto-finalize when all 5 rights completed
  if (this.completionPercentage === 100 && this.status === 'active') {
    this.status = 'completed';
    this.completedAt = this.completedAt || new Date();
  }

  // skipped status requires skipReason
  for (const m of this.modules || []) {
    if (m.status === 'skipped' && (!m.skipReason || m.skipReason.trim().length < 5)) {
      throw new Error(
        `SelfAdvocacyTrainingPlan: module '${m.rightCode}' marked skipped requires skipReason (≥5 chars)`
      );
    }
  }
});

// ── Unified-core linkage (W1120 — self-advocacy plan island → CareTimeline) ──
SelfAdvocacyTrainingPlanSchema.post('init', function () {
  this.$__prevStatus = this.status;
});
SelfAdvocacyTrainingPlanSchema.post('save', function (doc) {
  try {
    if (doc.status !== 'completed' || this.$__prevStatus === 'completed') return;
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function' || !doc.beneficiaryId) return;
    Promise.resolve(
      integrationBus.publish('self-advocacy', 'plan.completed', {
        selfAdvocacyPlanId: String(doc._id),
        beneficiaryId: String(doc.beneficiaryId),
      })
    ).catch(() => {});
  } catch (_) {
    /* never block persistence */
  }
});

module.exports =
  mongoose.models.SelfAdvocacyTrainingPlan ||
  mongoose.model('SelfAdvocacyTrainingPlan', SelfAdvocacyTrainingPlanSchema);
