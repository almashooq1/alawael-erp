'use strict';

/**
 * GasScoreSnapshot — Wave 455.
 *
 * Persistent point-in-time snapshots of a beneficiary's composite GAS
 * T-score across all active GAS scales. Backfills the W264 gas.service
 * which only computes T-scores on demand.
 *
 * Used by:
 *   • GAS progression visualization (timeline of T-score over weeks/months)
 *   • Phase A ICF aggregate reports (W457) — branch-level GAS distribution
 *   • Family Story Books (Phase F) — quarterly T-score trend visualization
 *
 * Snapshot triggers:
 *   • Weekly cron (W455 — ENABLE_GAS_SNAPSHOT_CRON, Fridays 03:00 Asia/Riyadh)
 *   • Per-session save (future — when gas.service emits session events)
 *   • On-demand via service method (manual snapshot)
 *
 * Per Phase A of docs/blueprint/beneficiary-lifecycle-v3.md.
 */

const mongoose = require('mongoose');

const GasScoreSnapshotSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    episodeOfCareId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EpisodeOfCare',
      index: true,
    },

    // Snapshot timing
    snapshotDate: { type: Date, required: true, index: true },
    snapshotType: {
      type: String,
      enum: ['session', 'weekly', 'monthly', 'quarterly', 'annual', 'ad-hoc'],
      required: true,
      default: 'weekly',
    },

    // The composite T-score (Kiresuk formula; 50 = expected, SD = 10).
    tScore: { type: Number, required: true },
    ci95Lower: { type: Number },
    ci95Upper: { type: Number },

    // Component goals contributing to this T-score
    goals: [
      {
        goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal' },
        scaleId: { type: mongoose.Schema.Types.ObjectId, ref: 'GasScale' },
        achievedLevel: { type: Number, min: -2, max: 2 },
        weight: { type: Number, min: 1, max: 3, default: 1 },
        icfCode: { type: String, match: /^[bsde]\d+$/ },
      },
    ],

    // Calculation metadata
    goalCount: { type: Number, required: true, min: 0 },
    totalWeight: { type: Number, required: true, min: 0 },
    rhoUsed: { type: Number, default: 0.3 }, // Kiresuk default; W264 convention
    calculationVersion: { type: String, default: 'v1' },

    // Provenance
    triggeredBy: {
      type: String,
      enum: ['cron', 'manual', 'session', 'event'],
      default: 'cron',
    },
    triggeredById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Free-form notes (cron-summary, error context, etc.)
    notes: { type: String, maxlength: 500 },
  },
  {
    timestamps: true,
    collection: 'gas_score_snapshots',
  }
);

// Indexes for the common query patterns
GasScoreSnapshotSchema.index({ beneficiaryId: 1, snapshotDate: -1 });
GasScoreSnapshotSchema.index({ branchId: 1, snapshotDate: -1, snapshotType: 1 });
GasScoreSnapshotSchema.index({ episodeOfCareId: 1, snapshotDate: -1 });

// W1095 — unified-core linkage: every new GAS T-score snapshot surfaces a
// goal-attainment progress row on the per-beneficiary clinical timeline.
GasScoreSnapshotSchema.pre('save', function flagGasScoreSnapshotted() {
  this.$__gasScoreSnapshotted = this.isNew;
});

GasScoreSnapshotSchema.post('save', function emitGasScoreSnapshotted(doc) {
  if (!doc.$__gasScoreSnapshotted) return;
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.publish('gas-snapshot', 'gas_snapshot.recorded', {
      snapshotId: String(doc._id),
      beneficiaryId: doc.beneficiaryId,
      ...(doc.branchId ? { branchId: doc.branchId } : {}),
      tScore: doc.tScore,
      snapshotType: doc.snapshotType,
      goalCount: doc.goalCount,
    });
  } catch (_e) {
    /* bus optional — never block the write */
  }
});

module.exports =
  mongoose.models.GasScoreSnapshot || mongoose.model('GasScoreSnapshot', GasScoreSnapshotSchema);
