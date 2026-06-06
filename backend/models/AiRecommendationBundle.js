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

// W428: optimistic concurrency. The service's approve/reject/discard
// path is findById → mutate → save with a pre-save hook that runs
// validateTransition and appends to history[]. Without OCC, two
// concurrent approve() calls would both pass validateTransition
// (both saw `status='PENDING_REVIEW'`), both append a history entry,
// both save — silently producing a duplicate audit-trail entry plus
// firing downstream events twice (notification, plan_review).
//
// With `optimisticConcurrency: true`, Mongoose tracks __v on every
// save; the second concurrent save throws VersionError. The W422-style
// safeError helper surfaces this as a 500 (caller can retry) rather
// than silently double-emitting. This is the right semantic for an
// MFA-gated supervisor decision: only one user should win the
// transition, the other gets a "someone else just modified this"
// signal and refreshes.
aiRecommendationBundleSchema.set('optimisticConcurrency', true);

// ── W334 Pass 2 — capture pre-edit status for post-init transition validation ──
aiRecommendationBundleSchema.post('init', function (doc) {
  doc.$__originalStatus = doc.status;
});

// ── W334 Pass 2 — pre-save hook: validate status transitions + append history ──
// Service callers MUST set `doc.$__transitionActor` / `$__transitionReason` /
// `$__transitionNotes` / `$__transitionMfaTier` before save() when changing
// status. The hook calls lib.validateTransition; on failure it throws with
// the lib's structured error code so callers can branch on `err.code`.
//
// Idempotent: re-saving without a status change is a no-op (no history entry).
// New docs go straight to the default state without triggering validation
// (creation flow is separate from transition flow).
aiRecommendationBundleSchema.pre('save', async function () {
  // New doc — no transition to validate. History will be seeded by the
  // service layer's createDraft() if needed (e.g. DRAFT→DISCARDED on low
  // confidence happens in service code, not in the pre-save hook).
  if (this.isNew) {
    this.$__originalStatus = this.status;
    return;
  }
  if (!this.isModified('status')) return;

  const fromStatus = this.$__originalStatus;
  const toStatus = this.status;

  // Skip validation if the from-status was never captured (very rare —
  // typically only when a doc is constructed without post('init'), e.g. in
  // tests). Defer to the lib in that case via a permissive path.
  if (!fromStatus) {
    this.$__originalStatus = toStatus;
    return;
  }

  const result = lib.validateTransition({
    from: fromStatus,
    to: toStatus,
    actor: this.$__transitionActor,
    reasonCode: this.$__transitionReason,
    notes: this.$__transitionNotes,
    mfaTier: this.$__transitionMfaTier,
  });

  if (!result.ok) {
    const err = new Error(result.message);
    err.code = result.code;
    err.fromStatus = fromStatus;
    err.toStatus = toStatus;
    throw err;
  }

  // Append to history (append-only audit per W325 P2 / W325 P3 pattern)
  this.history.push({
    fromStatus: result.entry.fromStatus,
    toStatus: result.entry.toStatus,
    actor: result.entry.actor,
    reasonCode: result.entry.reasonCode,
    notes: result.entry.notes,
    at: result.entry.at,
  });

  // Update the captured original status for any subsequent in-process save
  this.$__originalStatus = toStatus;
  // Clear transient transition context so it can't leak into later saves
  this.$__transitionActor = undefined;
  this.$__transitionReason = undefined;
  this.$__transitionNotes = undefined;
  this.$__transitionMfaTier = undefined;

  
});

module.exports =
  mongoose.models.AiRecommendationBundle ||
  mongoose.model('AiRecommendationBundle', aiRecommendationBundleSchema);
