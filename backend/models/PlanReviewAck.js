'use strict';
/**
 * PlanReviewAck — Wave 295
 *
 * Tamper-evident audit log for CRITICAL plan-review lifecycle events:
 *   - action='ACK'           : a clinician acknowledged a review
 *   - action='SLA_ESCALATED' : the SLA sweeper raised a warning/urgent alert
 *   - action='TRIGGERED'     : the W290 risk auto-trigger created the review
 *
 * Each entry chains to the previous entry for the SAME planReviewId via
 * `priorHash → currentHash` (sha256). The first entry per review is the
 * chain genesis (priorHash = null). This lets quality + audit verify that
 * no entry was inserted, edited, or removed retroactively.
 */

const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const ACTIONS = ['TRIGGERED', 'ACK', 'SLA_ESCALATED'];

const PlanReviewAckSchema = new Schema(
  {
    planReviewId: { type: Types.ObjectId, ref: 'PlanReview', required: true, index: true },
    beneficiaryId: { type: Types.ObjectId, ref: 'Beneficiary', required: true, index: true },
    branchId: { type: String, index: true, default: null },
    action: { type: String, enum: ACTIONS, required: true },
    // For SLA_ESCALATED: 1=warning(24h), 2=urgent(48h). Null otherwise.
    level: { type: Number, default: null, min: 0, max: 2 },
    actorUserId: { type: Types.ObjectId, ref: 'User', default: null },
    occurredAt: { type: Date, required: true, default: () => new Date(), index: true },
    // Compact, opaque-to-consumers payload (sweepRunId, alertId, etc.).
    payload: { type: Object, default: {} },
    // Hash-chain integrity fields (W18 invariant pattern).
    priorHash: { type: String, default: null },
    currentHash: { type: String, required: true },
  },
  { timestamps: true, collection: 'planreviewacks' }
);

// Quick lookup of the latest entry per review for the chain walker.
PlanReviewAckSchema.index({ planReviewId: 1, occurredAt: -1 });
// Prevent duplicate ACK entries per (review, actor) — defensive.
PlanReviewAckSchema.index(
  { planReviewId: 1, action: 1, actorUserId: 1 },
  { unique: true, partialFilterExpression: { action: 'ACK' } }
);

PlanReviewAckSchema.statics.ACTIONS = ACTIONS;

module.exports =
  mongoose.models.PlanReviewAck || mongoose.model('PlanReviewAck', PlanReviewAckSchema);
module.exports.ACTIONS = ACTIONS;
