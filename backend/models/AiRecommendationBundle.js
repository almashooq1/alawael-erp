'use strict';

/**
 * AiRecommendationBundle — W334 Pass 1.
 *
 * Persistence for the AI Recommendations & Decision Support engine. Produced
 * by sweeper (plateau detection / overdue reassessment / etc.) → LLM narrative
 * drafting → confidence classification → supervisor queue → approve/reject.
 *
 * Doctrine inheritance:
 *   - `.github/prompts/07-ai-recommendations.prompt.md` (stub + design)
 *   - `.github/prompts/02-assessment-measures-engine.prompt.md` (signal sources)
 *   - `.github/prompts/03-goals-care-plan-engine.prompt.md` (downstream plan_review)
 *
 * State machine + transition validation: `backend/intelligence/ai-recommendation-lifecycle.lib.js`.
 *
 * Canonical refs:
 *   - W324+W329 compliant (beneficiaryId → 'Beneficiary')
 *   - W326 compliant (branchId → 'Branch')
 *   - W327 compliant (reviewedBy → 'User')
 *   - ADR-013 link (llmTelemetryCallId → 'LlmTelemetryCall')
 */

const mongoose = require('mongoose');
const lib = require('../intelligence/ai-recommendation-lifecycle.lib');

const signalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    weight: { type: Number, required: true, min: 0, max: 1 },
    evidence: { type: String, trim: true },
  },
  { _id: false }
);

const historyEntrySchema = new mongoose.Schema(
  {
    fromStatus: { type: String, enum: lib.LIFECYCLE_STATES },
    toStatus: { type: String, enum: lib.LIFECYCLE_STATES, required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reasonCode: { type: String, trim: true },
    notes: { type: String, trim: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const aiRecommendationBundleSchema = new mongoose.Schema(
  {
    // ── Ownership ──────────────────────────────────────────────────────
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'EpisodeOfCare' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },

    // ── Recommendation type + lifecycle ────────────────────────────────
    type: {
      type: String,
      enum: [
        'INCREASE_DOSAGE_AND_REASSESS',
        'REVISE_GOAL',
        'ESCALATE_TO_QUALITY',
        'TRIGGER_REASSESSMENT',
        'ADJUST_HOME_PROGRAM',
        'PLAN_REVIEW_DUE',
      ],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: lib.LIFECYCLE_STATES,
      default: 'DRAFT',
      required: true,
      index: true,
    },

    // ── Confidence + explainability (ADR-011 heuristic-first) ───────────
    confidence: { type: Number, min: 0, max: 1, required: true },
    signals: [signalSchema],
    draftAction: { type: mongoose.Schema.Types.Mixed },
    reviewerHint: { type: String, trim: true },

    // ── Review metadata ────────────────────────────────────────────────
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewDecision: {
      type: String,
      enum: ['approved', 'rejected', null],
      default: null,
    },
    reviewReasonCode: { type: String, trim: true },
    reviewNotes: { type: String, trim: true },

    // ── Expiry (sweeper closes stale PENDING_REVIEW) ───────────────────
    expiresAt: { type: Date, index: true },

    // ── ADR-013 telemetry link ─────────────────────────────────────────
    llmTelemetryCallId: { type: mongoose.Schema.Types.ObjectId, ref: 'LlmTelemetryCall' },

    // ── Append-only audit history (W325 P2 pattern) ────────────────────
    history: [historyEntrySchema],
  },
  { timestamps: true, collection: 'ai_recommendation_bundles' }
);

// Indexes for common reads
aiRecommendationBundleSchema.index({ status: 1, branchId: 1, createdAt: -1 }); // supervisor queue
aiRecommendationBundleSchema.index({ beneficiaryId: 1, status: 1, createdAt: -1 }); // beneficiary timeline
aiRecommendationBundleSchema.index({ status: 1, expiresAt: 1 }); // expiry sweeper

module.exports =
  mongoose.models.AiRecommendationBundle ||
  mongoose.model('AiRecommendationBundle', aiRecommendationBundleSchema);
