/**
 * nphiesReconciliationService — the async half of the NPHIES claim lifecycle.
 *
 * Two callers:
 *   1. Webhook receiver (backend/routes/nphies-webhook.routes.js) — when
 *      NPHIES pushes a status update (APPROVED / REJECTED / PENDING_REVIEW)
 *      we normalize the payload and apply it to the claim.
 *   2. Scheduled sweeper — walks PENDING_REVIEW claims older than N minutes
 *      and polls NPHIES for status. This is the fallback for missed webhooks
 *      (networks go down; NPHIES retries don't always reach us).
 *
 * Both paths converge on `applyClaimUpdate()` so there is exactly one code
 * path that mutates a claim's submission record. That path always emits an
 * audit record and returns the before/after snapshot so the caller can log.
 */

'use strict';

const DefaultClaim = require('../models/NphiesClaim');
const defaultAdapter = require('./nphiesAdapter');
const logger = require('../utils/logger');

function _mapStatus(raw) {
  const map = {
    APPROVED: 'APPROVED',
    ACCEPTED: 'APPROVED',
    REJECTED: 'REJECTED',
    DENIED: 'REJECTED',
    PENDING: 'PENDING_REVIEW',
    PENDING_REVIEW: 'PENDING_REVIEW',
    IN_REVIEW: 'PENDING_REVIEW',
  };
  return map[String(raw || '').toUpperCase()] || 'PENDING_REVIEW';
}

function createService({ claimModel = DefaultClaim, adapter = defaultAdapter } = {}) {
  /**
   * Shared mutation path for both webhook + sweeper. Passing the full update
   * dict (not just status) so the webhook's richer fields (e.g. reason code
   * from NPHIES) are preserved.
   */
  async function applyClaimUpdate({ claim, update, source }) {
    const before = claim.toObject ? claim.toObject() : { ...claim };

    claim.nphies = claim.nphies || {};
    claim.nphies.submission = {
      ...(claim.nphies.submission || {}),
      status: _mapStatus(update.status),
      claimReference: update.claimReference || claim.nphies.submission?.claimReference,
      reason: update.reason ?? claim.nphies.submission?.reason,
      message: update.message ?? claim.nphies.submission?.message,
      mode: update.mode || claim.nphies.submission?.mode,
      updatedAt: new Date(),
      updatedBy: source, // 'webhook' | 'sweeper' | 'manual'
    };

    if (_mapStatus(update.status) === 'APPROVED') {
      claim.approvedAmount = update.approvedAmount ?? claim.totalAmount;
      claim.patientShare = update.remainingBalance ?? claim.patientShare ?? 0;
      claim.status = 'PAID';
    } else if (_mapStatus(update.status) === 'REJECTED') {
      claim.status = 'DENIED';
    } else if (_mapStatus(update.status) === 'PENDING_REVIEW') {
      claim.status = 'SUBMITTED';
    }

    await claim.save();
    logger.info('[nphies-recon] claim updated', {
      claimId: String(claim._id),
      source,
      status: claim.nphies.submission.status,
    });
    return { before, after: claim.toObject(), changed: true };
  }

  /**
   * Webhook entry point. Expects a normalized payload already extracted from
   * the provider envelope (webhook route does HMAC + shape validation first).
   * The claimReference field is how we find the claim — NPHIES emits it on
   * every callback.
   */
  async function processWebhook(payload) {
    if (!payload || !payload.claimReference) {
      const e = new Error('webhook payload missing claimReference');
      e.code = 'INVALID_WEBHOOK_PAYLOAD';
      throw e;
    }
    const claim = await claimModel.findOne({
      'nphies.submission.claimReference': payload.claimReference,
    });
    if (!claim) {
      // Unknown reference — NPHIES may send a spurious callback after a
      // support intervention. We surface it but don't error the webhook so
      // the provider doesn't keep retrying.
      logger.warn('[nphies-recon] webhook for unknown claimReference', {
        ref: payload.claimReference,
      });
      return { matched: false, claimReference: payload.claimReference };
    }
    const result = await applyClaimUpdate({ claim, update: payload, source: 'webhook' });
    return { matched: true, claimId: String(claim._id), ...result };
  }

  /**
   * Scheduled sweeper — processes up to `batchSize` oldest PENDING_REVIEW
   * claims that haven't been touched in `minAgeMs` (default 15 min). Polls
   * the NPHIES adapter for each and applies the outcome if changed.
   */
  async function sweep({ batchSize = 25, minAgeMs = 15 * 60 * 1000 } = {}) {
    const cutoff = new Date(Date.now() - minAgeMs);
    const q = {
      'nphies.submission.status': 'PENDING_REVIEW',
      $or: [
        { 'nphies.submission.updatedAt': { $lt: cutoff } },
        { 'nphies.submission.updatedAt': { $exists: false } },
      ],
    };
    const claims = await claimModel
      .find(q)
      .sort({ 'nphies.submission.submittedAt': 1 })
      .limit(batchSize);

    const stats = { scanned: claims.length, changed: 0, errors: 0, unchanged: 0 };
    for (const claim of claims) {
      try {
        const ref = claim.nphies?.submission?.claimReference;
        if (!ref) {
          stats.unchanged++;
          continue;
        }
        const poll =
          typeof adapter.pollClaim === 'function'
            ? await adapter.pollClaim({
                claimReference: ref,
                memberId: claim.memberId,
                insurerId: claim.insurerId,
              })
            : null;
        if (!poll || _mapStatus(poll.status) === 'PENDING_REVIEW') {
          stats.unchanged++;
          continue;
        }
        await applyClaimUpdate({ claim, update: poll, source: 'sweeper' });
        stats.changed++;
      } catch (err) {
        stats.errors++;
        logger.warn('[nphies-recon] sweep error', { claimId: String(claim._id), err: err.message });
      }
    }
    return stats;
  }

  return { applyClaimUpdate, processWebhook, sweep };
}

module.exports = { createService };
module.exports.defaultService = createService();
