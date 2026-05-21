'use strict';

/**
 * branchReassessmentPolicy.service.js — Wave 230
 * ════════════════════════════════════════════════════════════════════
 * Per-branch override loader for the W222 lifecycle + W225 reminders.
 *
 * Two consumers:
 *
 *   1. W222 lifecycle.tick({policy}) — call getPolicy(branchId)
 *      first, pass the result.
 *
 *   2. W225 cascade.dispatch({recipientHints}) — call
 *      getRecipientHints({branchIds}) and pass the
 *      {supervisorByBranchId, qaByBranchId} maps.
 *
 * Tightening-only enforcement happens at upsert time so misconfigured
 * policies never reach the lifecycle/cascade hot paths.
 *
 * The DEFAULT_POLICY constants are pulled from
 * reassessmentLifecycle.service.js — single source of truth.
 *
 * Surface:
 *   getPolicy(branchId)
 *     → { dueSoonDays, dueNowDays, overdueDays, escalateAfterDays,
 *         breachAfterDays }  — merged W222 defaults + active overrides
 *
 *   getRawDoc(branchId)
 *     → the persisted BranchReassessmentPolicy doc or null
 *
 *   getRecipientHints({ branchIds })
 *     → { supervisorByBranchId: Map, qaByBranchId: Map }
 *
 *   upsertPolicy({ branchId, policy?, supervisorUserId?, qaReviewerId?,
 *                  effectiveFrom?, effectiveUntil?, notes?, actor })
 *     → upserts, enforces tightening-only, audits actor
 *
 *   deactivate({ branchId, actor })
 *     → soft-disable; getPolicy returns DEFAULT_POLICY thereafter
 * ════════════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const lifecycle = require('./reassessmentLifecycle.service');

const DEFAULT_POLICY = lifecycle.DEFAULT_POLICY;

// Tightening direction per field:
//   'tighter_lte'  → branch override must be ≤ default (escalate/breach
//                    fire SOONER, not later)
//   'wider_gte'    → branch override must be ≥ default (lookahead
//                    window starts EARLIER, not later — DUE_SOON
//                    7d default; branches can want 14d advance notice)
//   'wider_gte_nowindow' → DUE_NOW window from dueAt; ≥ default means
//                          wider on-the-day band
//   'tighter_lte_overdue'→ overdueDays default 1; branches CAN tighten
//                          (=0 means OVERDUE the same day as dueAt)
const TIGHTENING_DIRECTIONS = Object.freeze({
  dueSoonDays: 'wider_gte', // bigger lookahead is "stricter" surveillance
  dueNowDays: 'wider_gte_nowindow',
  overdueDays: 'tighter_lte_overdue',
  escalateAfterDays: 'tighter_lte',
  breachAfterDays: 'tighter_lte',
});

const M = {
  BranchReassessmentPolicy: () => {
    try {
      return mongoose.model('BranchReassessmentPolicy');
    } catch {
      try {
        require('../domains/goals/models/BranchReassessmentPolicy');
        return mongoose.model('BranchReassessmentPolicy');
      } catch {
        return null;
      }
    }
  },
};

function _now() {
  return new Date();
}

function _isCurrent(doc, now) {
  if (!doc || !doc.isActive) return false;
  if (doc.effectiveFrom && now < doc.effectiveFrom) return false;
  if (doc.effectiveUntil && now > doc.effectiveUntil) return false;
  return true;
}

function _assertTightening(override) {
  const errs = [];
  for (const [field, dir] of Object.entries(TIGHTENING_DIRECTIONS)) {
    const v = override?.[field];
    if (v == null) continue;
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
      errs.push(`${field}: must be a non-negative number`);
      continue;
    }
    const def = DEFAULT_POLICY[field];
    if (dir === 'tighter_lte' && v > def) {
      errs.push(`${field}: branch override (${v}) cannot exceed default (${def})`);
    }
    if (dir === 'tighter_lte_overdue' && v > def) {
      errs.push(`${field}: branch override (${v}) cannot exceed default (${def})`);
    }
    if (dir === 'wider_gte' && v < def) {
      errs.push(`${field}: branch override (${v}) cannot be less than default (${def})`);
    }
    if (dir === 'wider_gte_nowindow' && v < def) {
      errs.push(`${field}: branch override (${v}) cannot be less than default (${def})`);
    }
  }
  if (errs.length) {
    const err = new Error(`[branchReassessmentPolicy] tightening violations: ${errs.join('; ')}`);
    err.code = 'TIGHTENING_VIOLATION';
    err.details = errs;
    throw err;
  }
}

class BranchReassessmentPolicySvc {
  /**
   * Returns the merged policy (W222 defaults + active branch overrides).
   * Never throws — falls back to defaults on missing branch or DB error.
   */
  async getPolicy(branchId) {
    if (!branchId) return { ...DEFAULT_POLICY };
    const Policy = M.BranchReassessmentPolicy();
    if (!Policy) return { ...DEFAULT_POLICY };
    try {
      const doc = await Policy.findOne({ branchId }).lean();
      if (!_isCurrent(doc, _now())) return { ...DEFAULT_POLICY };
      return this._merge(doc.policy);
    } catch (err) {
      logger.warn('[branchReassessmentPolicy] getPolicy failed: %s', err.message);
      return { ...DEFAULT_POLICY };
    }
  }

  /**
   * Returns the persisted doc or null. For admin UI displaying current
   * config including non-policy fields (supervisorUserId, notes...).
   */
  async getRawDoc(branchId) {
    if (!branchId) return null;
    const Policy = M.BranchReassessmentPolicy();
    if (!Policy) return null;
    try {
      return await Policy.findOne({ branchId }).lean();
    } catch (err) {
      logger.warn('[branchReassessmentPolicy] getRawDoc failed: %s', err.message);
      return null;
    }
  }

  /**
   * Returns recipient hints in the shape W225 dispatch() expects.
   * Pre-loads policies for the listed branchIds in one query.
   */
  async getRecipientHints({ branchIds }) {
    const supervisorByBranchId = new Map();
    const qaByBranchId = new Map();
    if (!Array.isArray(branchIds) || !branchIds.length) {
      return { supervisorByBranchId, qaByBranchId };
    }
    const Policy = M.BranchReassessmentPolicy();
    if (!Policy) return { supervisorByBranchId, qaByBranchId };
    try {
      const now = _now();
      const docs = await Policy.find({
        branchId: { $in: branchIds },
        isActive: true,
      }).lean();
      for (const doc of docs) {
        if (!_isCurrent(doc, now)) continue;
        const key = String(doc.branchId);
        if (doc.supervisorUserId) supervisorByBranchId.set(key, doc.supervisorUserId);
        if (doc.qaReviewerId) qaByBranchId.set(key, doc.qaReviewerId);
      }
    } catch (err) {
      logger.warn('[branchReassessmentPolicy] getRecipientHints failed: %s', err.message);
    }
    return { supervisorByBranchId, qaByBranchId };
  }

  /**
   * Upsert the branch policy. Enforces tightening-only.
   */
  async upsertPolicy({
    branchId,
    policy,
    supervisorUserId,
    qaReviewerId,
    effectiveFrom,
    effectiveUntil,
    notes,
    actor,
  } = {}) {
    if (!branchId) throw new Error('[branchReassessmentPolicy] branchId required');
    if (!actor?.userId) {
      throw new Error('[branchReassessmentPolicy] actor.userId required for upsert');
    }
    if (policy && typeof policy === 'object') {
      _assertTightening(policy);
    }
    const Policy = M.BranchReassessmentPolicy();
    if (!Policy) throw new Error('[branchReassessmentPolicy] model unavailable');

    const update = {
      branchId,
      lastModifiedBy: actor.userId,
      isActive: true,
    };
    if (policy) update.policy = policy;
    if (supervisorUserId != null) update.supervisorUserId = supervisorUserId;
    if (qaReviewerId != null) update.qaReviewerId = qaReviewerId;
    if (effectiveFrom !== undefined) update.effectiveFrom = effectiveFrom;
    if (effectiveUntil !== undefined) update.effectiveUntil = effectiveUntil;
    if (notes !== undefined) update.notes = notes;

    // Upsert — preserve createdBy on first create only.
    const existing = await Policy.findOne({ branchId });
    if (existing) {
      Object.assign(existing, update);
      await existing.save();
      return existing;
    }
    update.createdBy = actor.userId;
    return Policy.create(update);
  }

  /**
   * Soft-disable. getPolicy returns DEFAULT_POLICY after this.
   */
  async deactivate({ branchId, actor } = {}) {
    if (!branchId) throw new Error('[branchReassessmentPolicy] branchId required');
    if (!actor?.userId) {
      throw new Error('[branchReassessmentPolicy] actor.userId required for deactivate');
    }
    const Policy = M.BranchReassessmentPolicy();
    if (!Policy) return null;
    const doc = await Policy.findOne({ branchId });
    if (!doc) return null;
    doc.isActive = false;
    doc.lastModifiedBy = actor.userId;
    await doc.save();
    return doc;
  }

  // ── Internals ──────────────────────────────────────────────────

  _merge(override) {
    if (!override) return { ...DEFAULT_POLICY };
    const out = { ...DEFAULT_POLICY };
    for (const k of Object.keys(DEFAULT_POLICY)) {
      if (override[k] != null) out[k] = override[k];
    }
    return out;
  }
}

const singleton = new BranchReassessmentPolicySvc();
module.exports = singleton;
module.exports.DEFAULT_POLICY = DEFAULT_POLICY;
module.exports.TIGHTENING_DIRECTIONS = TIGHTENING_DIRECTIONS;
