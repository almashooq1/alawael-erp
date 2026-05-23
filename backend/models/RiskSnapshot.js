'use strict';
/**
 * RiskSnapshot — Wave 288.
 *
 * Persisted daily snapshot of `getBeneficiaryRiskProfile()` output.
 * One document per (beneficiary, sweep-run). Powers trend queries,
 * tier-change detection, and clinical audit trails.
 *
 * Why store a derived view?
 *   - The sources mutate constantly; a snapshot freezes "what we knew
 *     at T". Required for retrospective clinical reviews + PDPL audit.
 *   - Tier-change detection needs a stable "previous tier" — without
 *     snapshots we'd have to recompute history each sweep.
 *
 * Retention: 365 days (auto-TTL). Tier escalations are also surfaced
 * as AiAlert documents, which follow their own retention policy.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const TIERS = ['low', 'moderate', 'high', 'critical'];

const RiskSnapshotSchema = new Schema(
  {
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true, index: true },
    episodeId: { type: Schema.Types.ObjectId, ref: 'EpisodeOfCare', default: null },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },

    sweepRunId: { type: String, required: true, index: true },

    // Snapshot of the canonical RiskProfile (W287).
    overallScore: { type: Number, min: 0, max: 100, default: null },
    overallTier: { type: String, enum: [...TIERS, null], default: null },
    sources: { type: Schema.Types.Mixed, default: {} },
    topFactors: { type: [Schema.Types.Mixed], default: [] },
    composite: { type: Schema.Types.Mixed, default: {} },
    reason: { type: String, required: true },
    explanation: { type: String, default: '' },

    // Tier-transition metadata (filled by sweeper if previous snapshot found).
    previousTier: { type: String, enum: [...TIERS, null], default: null },
    tierDelta: {
      type: String,
      enum: ['escalated', 'deescalated', 'unchanged', 'first', null],
      default: null,
    },

    computedAt: { type: Date, required: true, index: true },

    // Auto-purge after 1 year — clinical history beyond that lives in
    // CarePlan / AuditEvent, not in this rollup collection.
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true, collection: 'risk_snapshots' }
);

// Most common query: latest snapshot for a beneficiary.
RiskSnapshotSchema.index({ beneficiaryId: 1, computedAt: -1 });
// Per-sweep dashboards: all snapshots in a run, ordered by escalation.
RiskSnapshotSchema.index({ sweepRunId: 1, tierDelta: 1 });

module.exports = mongoose.models.RiskSnapshot || mongoose.model('RiskSnapshot', RiskSnapshotSchema);
module.exports.TIERS = TIERS;
