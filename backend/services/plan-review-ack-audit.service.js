'use strict';
/**
 * plan-review-ack-audit.service.js — Wave 295
 *
 * Append-only, hash-chained audit log for CRITICAL plan-review lifecycle
 * events. Wraps the `PlanReviewAck` model and exposes:
 *
 *   recordTriggered({ planReviewId, beneficiaryId, branchId?, sweepRunId?, alertId? })
 *   recordAck({ planReviewId, beneficiaryId, branchId?, actorUserId })
 *   recordSlaEscalation({ planReviewId, beneficiaryId, branchId?, level, alertId? })
 *   verify({ planReviewId })  → { ok, chainLength, brokenAt?, reason? }
 *
 * Chain semantics (per planReviewId):
 *   entry[0].priorHash   = null
 *   entry[i].priorHash   = entry[i-1].currentHash
 *   entry[i].currentHash = sha256(canon(entry[i]) | priorHash)
 *
 * All write paths are best-effort from the caller's POV: failures are
 * logged but never thrown — the operational action (ack / sweep)
 * already succeeded, the audit row is the historical breadcrumb.
 */

const { hashLinkedPayload } = require('../intelligence/hash-chain.lib');

function canonicalize({
  action,
  level,
  planReviewId,
  beneficiaryId,
  actorUserId,
  occurredAt,
  payload,
}) {
  // Deterministic, ordered, primitive-only — never include Date objects directly.
  const parts = [
    `action=${action}`,
    `level=${level == null ? '' : String(level)}`,
    `review=${String(planReviewId || '')}`,
    `ben=${String(beneficiaryId || '')}`,
    `actor=${String(actorUserId || '')}`,
    `at=${occurredAt instanceof Date ? occurredAt.toISOString() : String(occurredAt || '')}`,
    `payload=${stableStringify(payload || {})}`,
  ];
  return parts.join('|');
}

function stableStringify(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

class PlanReviewAckAuditService {
  constructor(deps = {}) {
    if (!deps.PlanReviewAckModel) {
      throw new Error('PlanReviewAckAuditService: PlanReviewAckModel required');
    }
    this.Model = deps.PlanReviewAckModel;
    this.logger = deps.logger || { info() {}, warn() {}, error() {} };
  }

  /** @private */
  async _append({
    action,
    level = null,
    planReviewId,
    beneficiaryId,
    branchId = null,
    actorUserId = null,
    payload = {},
    now = new Date(),
  }) {
    if (!planReviewId) return { ok: false, reason: 'PLAN_REVIEW_REQUIRED' };
    if (!beneficiaryId) return { ok: false, reason: 'BENEFICIARY_REQUIRED' };
    try {
      // Walk back to the latest entry to chain off it. Single-doc query.
      const prev = await this.Model.findOne({ planReviewId })
        .sort({ occurredAt: -1 })
        .select('currentHash')
        .lean();
      const priorHash = (prev && prev.currentHash) || null;
      const occurredAt = now;
      const canon = canonicalize({
        action,
        level,
        planReviewId,
        beneficiaryId,
        actorUserId,
        occurredAt,
        payload,
      });
      const currentHash = hashLinkedPayload(canon, priorHash);
      const doc = await this.Model.create({
        planReviewId,
        beneficiaryId,
        branchId,
        action,
        level,
        actorUserId,
        occurredAt,
        payload,
        priorHash,
        currentHash,
      });
      return { ok: true, entryId: doc._id, currentHash };
    } catch (err) {
      this.logger.warn('[plan-review-ack-audit] append failed', {
        action,
        planReviewId: String(planReviewId),
        err: err && err.message,
      });
      return { ok: false, reason: 'APPEND_FAILED', error: err && err.message };
    }
  }

  recordTriggered(args) {
    return this._append({ ...args, action: 'TRIGGERED' });
  }

  recordAck(args) {
    return this._append({ ...args, action: 'ACK' });
  }

  recordSlaEscalation(args) {
    return this._append({ ...args, action: 'SLA_ESCALATED' });
  }

  /**
   * Re-verify the hash chain for a single PlanReview.
   * @returns {Promise<{ok:boolean, chainLength:number, brokenAt?:number, reason?:string}>}
   */
  async verify({ planReviewId }) {
    if (!planReviewId) return { ok: false, reason: 'PLAN_REVIEW_REQUIRED', chainLength: 0 };
    const entries = await this.Model.find({ planReviewId })
      .sort({ occurredAt: 1 })
      .select(
        'action level planReviewId beneficiaryId actorUserId occurredAt payload priorHash currentHash'
      )
      .lean();
    let prevHash = null;
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if ((e.priorHash || null) !== prevHash) {
        return {
          ok: false,
          chainLength: entries.length,
          brokenAt: i,
          reason: 'PRIOR_HASH_MISMATCH',
        };
      }
      const canon = canonicalize({
        action: e.action,
        level: e.level,
        planReviewId: e.planReviewId,
        beneficiaryId: e.beneficiaryId,
        actorUserId: e.actorUserId,
        occurredAt: e.occurredAt,
        payload: e.payload,
      });
      const recomputed = hashLinkedPayload(canon, prevHash);
      if (recomputed !== e.currentHash) {
        return {
          ok: false,
          chainLength: entries.length,
          brokenAt: i,
          reason: 'CURRENT_HASH_MISMATCH',
        };
      }
      prevHash = e.currentHash;
    }
    return { ok: true, chainLength: entries.length };
  }
}

module.exports = {
  PlanReviewAckAuditService,
  canonicalize,
  stableStringify,
};
