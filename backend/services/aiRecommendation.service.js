'use strict';

/**
 * aiRecommendation.service.js — W334 Pass 2.
 *
 * Service layer for AiRecommendationBundle. Encapsulates the transition
 * choreography between the model's pre-save hook (which enforces lib
 * validation) and external callers (cron sweeper, REST endpoints, supervisor
 * actions).
 *
 * Public surface:
 *   createDraft({beneficiaryId, branchId, episodeId, type, confidence, signals, draftAction, reviewerHint, llmTelemetryCallId})
 *     — produces a Bundle, classifies by confidence, persists with auto-status
 *
 *   approve({bundleId, actorUserId, mfaTier, notes})
 *     — PENDING_REVIEW → APPROVED, MFA tier 2 enforced via pre-save hook
 *
 *   reject({bundleId, actorUserId, reasonCode, notes})
 *     — PENDING_REVIEW → REJECTED, reasonCode required via pre-save hook
 *
 *   sweepExpired({now})
 *     — finds PENDING_REVIEW where expiresAt < now, transitions to EXPIRED
 *
 *   listPending({branchId, limit})
 *     — supervisor queue view
 *
 * Errors thrown carry .code from the lib (INVALID_TRANSITION /
 * REASON_CODE_REQUIRED / MFA_TIER_INSUFFICIENT) so HTTP routes can map to
 * 400/403/422 cleanly.
 */

const mongoose = require('mongoose');
const { EventEmitter } = require('events');
const lib = require('../intelligence/ai-recommendation-lifecycle.lib');

// W381 — module-level EventEmitter so this function-only service can fire
// canonical contract events (ai.recommendation_generated). Listeners can
// subscribe via aiRecommendationService.bus.on('ai.recommendation_generated', h).
// Pattern: same as integration/dddCrossModuleSubscribers.js uses for the
// cross-module wiring it does (which only listens to ai.risk_elevated today).
const bus = new EventEmitter();

// Lazy model lookup so service can be required before model registration
// (mirrors the W214 pattern used elsewhere in this codebase).
function _Bundle() {
  try {
    return mongoose.model('AiRecommendationBundle');
  } catch {
    require('../models/AiRecommendationBundle');
    return mongoose.model('AiRecommendationBundle');
  }
}

/**
 * Create a fresh Bundle from an AI sweeper signal. The status is auto-classified
 * by confidence (lib.classifyByConfidence): below 0.5 → DISCARDED, [0.5, 0.7)
 * → DRAFT (tuning band), ≥0.7 → PENDING_REVIEW (in queue with 7d expiry).
 *
 * The initial state transition (DRAFT → DISCARDED or DRAFT → PENDING_REVIEW)
 * happens inside this function via a follow-up save so the history is
 * captured. Returns the persisted document.
 */
async function createDraft({
  beneficiaryId,
  branchId,
  episodeId,
  type,
  confidence,
  signals,
  draftAction,
  reviewerHint,
  llmTelemetryCallId,
}) {
  if (!beneficiaryId) throw new Error('createDraft: beneficiaryId required');
  if (!type) throw new Error('createDraft: type required');
  if (typeof confidence !== 'number') throw new Error('createDraft: numeric confidence required');

  const Bundle = _Bundle();
  const targetStatus = lib.classifyByConfidence(confidence);

  // 1) Save the doc in DRAFT first so it gets _id + the post('init') hook
  //    has a chance to capture the original status on subsequent loads.
  const doc = new Bundle({
    beneficiaryId,
    branchId,
    episodeId,
    type,
    status: 'DRAFT',
    confidence,
    signals: signals || [],
    draftAction,
    reviewerHint,
    llmTelemetryCallId,
  });
  await doc.save();

  // 2) If confidence dictates a follow-up auto-transition, perform it now.
  //    System-driven transitions need no MFA tier and no reasonCode.
  if (targetStatus === 'DRAFT') {
    return doc; // tuning band — stays in DRAFT, not surfaced to supervisors
  }

  doc.$__transitionActor = null; // system
  doc.status = targetStatus;
  if (targetStatus === 'PENDING_REVIEW') {
    doc.expiresAt = lib.computeExpiry(new Date());
  }
  await doc.save();

  // W381: emit canonical contract event for any bundle that surfaced to the
  // supervisor queue (PENDING_REVIEW) or stays in DRAFT for tuning. DISCARDED
  // returns early at line 92 — those are intentionally silent (confidence too
  // low to warrant downstream attention).
  // Envelope per AI_RECOMMENDATION_EVENTS.GENERATED.
  // Field mapping: ruleId ← type (the bundle.type is the closest analog to
  // "which rule generated this" in the W334 lifecycle); action ← draftAction.
  bus.emit('ai.recommendation_generated', {
    recommendationId: String(doc._id),
    beneficiaryId: String(beneficiaryId),
    ruleId: type,
    confidence,
    action: draftAction || 'review',
  });

  return doc;
}

/**
 * Supervisor approval. Triggers downstream plan_review via emitted event;
 * the lib enforces MFA tier 2 at the pre-save hook layer.
 */
async function approve({ bundleId, actorUserId, mfaTier, notes }) {
  const Bundle = _Bundle();
  const doc = await Bundle.findById(bundleId);
  if (!doc) throw new Error('approve: bundle not found');

  doc.$__transitionActor = actorUserId;
  doc.$__transitionMfaTier = mfaTier;
  doc.$__transitionNotes = notes;
  doc.status = 'APPROVED';
  doc.reviewedBy = actorUserId;
  doc.reviewedAt = new Date();
  doc.reviewDecision = 'approved';
  doc.reviewNotes = notes;
  await doc.save();
  return doc;
}

/**
 * Supervisor rejection. reasonCode is required by the lib + pre-save hook.
 */
async function reject({ bundleId, actorUserId, reasonCode, notes }) {
  if (!reasonCode) {
    const err = new Error('reject: reasonCode required');
    err.code = 'REASON_CODE_REQUIRED';
    throw err;
  }

  const Bundle = _Bundle();
  const doc = await Bundle.findById(bundleId);
  if (!doc) throw new Error('reject: bundle not found');

  doc.$__transitionActor = actorUserId;
  doc.$__transitionReason = reasonCode;
  doc.$__transitionNotes = notes;
  doc.$__transitionMfaTier = 1; // tier 1 sufficient for reject per lib
  doc.status = 'REJECTED';
  doc.reviewedBy = actorUserId;
  doc.reviewedAt = new Date();
  doc.reviewDecision = 'rejected';
  doc.reviewReasonCode = reasonCode;
  doc.reviewNotes = notes;
  await doc.save();
  return doc;
}

/**
 * Cron sweeper. Finds PENDING_REVIEW with expiresAt < now, transitions each
 * to EXPIRED individually (so each save runs the pre-save hook + appends
 * history). Returns {expiredCount, errors[]} for ops visibility.
 */
async function sweepExpired({ now = new Date() } = {}) {
  const Bundle = _Bundle();
  const stale = await Bundle.find({
    status: 'PENDING_REVIEW',
    expiresAt: { $lt: now },
  }).limit(500); // batch cap

  const errors = [];
  let expiredCount = 0;
  for (const doc of stale) {
    try {
      doc.$__transitionActor = null; // system
      doc.status = 'EXPIRED';
      await doc.save();
      expiredCount++;
    } catch (err) {
      errors.push({ bundleId: doc._id, code: err.code || 'UNKNOWN', message: err.message });
    }
  }
  return { expiredCount, errors, scanned: stale.length };
}

/**
 * Supervisor queue view — PENDING_REVIEW filtered by branch.
 */
async function listPending({ branchId, limit = 50 } = {}) {
  const Bundle = _Bundle();
  const query = { status: 'PENDING_REVIEW' };
  if (branchId) query.branchId = branchId;
  return Bundle.find(query).sort({ createdAt: -1 }).limit(limit).lean();
}

module.exports = {
  createDraft,
  approve,
  reject,
  sweepExpired,
  listPending,
  bus, // W381: module-level EventEmitter for canonical contract events
};
