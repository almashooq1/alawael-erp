/**
 * dpia.service.js — DPIA lifecycle + state machine (W285).
 *
 * Pure service layer. Routes call this; this enforces state transitions
 * and emits reason-coded outcomes. MFA tier 2 is enforced at the route
 * layer (requireMfaTier(2)) for sign() — this service trusts the caller
 * has been authenticated.
 *
 * Per W275 service-layer hardening pattern: accept `enforceMfa: true`
 * factory option so non-HTTP callers (cron / worker / CLI) hit the same
 * gate. When true + actor lacks tier 2 on sign(), throws.
 */

'use strict';

const mongoose = require('mongoose');

// Allowed transitions
const TRANSITIONS = Object.freeze({
  draft: ['in_review'],
  in_review: ['approved', 'rejected'],
  approved: ['expired'],
  rejected: [], // terminal
  expired: ['in_review'], // re-review after expiry
});

function dpiaServiceFactory({ DpiaModel, mfaActorReader = null, enforceMfa = false } = {}) {
  const Dpia = DpiaModel || mongoose.model('Dpia');

  async function create(payload, actor) {
    if (!actor || !actor.userId) {
      const err = new Error('actor required');
      err.code = 'DPIA_ACTOR_REQUIRED';
      throw err;
    }
    const doc = await Dpia.create({
      featureName: payload.featureName,
      featureFlag: payload.featureFlag || null,
      dataCategories: payload.dataCategories,
      lawfulBasis: payload.lawfulBasis,
      dataSubjects: payload.dataSubjects,
      processingPurpose: payload.processingPurpose,
      crossBorderTransfer: !!payload.crossBorderTransfer,
      crossBorderJustification: payload.crossBorderJustification || null,
      retentionPeriodDays: payload.retentionPeriodDays || null,
      retentionJustification: payload.retentionJustification || null,
      authoredBy: actor.userId,
      branchId: payload.branchId || actor.branchId || null,
      version: payload.version || 1,
      status: 'draft',
    });
    return doc;
  }

  async function addRisk(dpiaId, risk, actor) {
    const dpia = await Dpia.findById(dpiaId);
    if (!dpia) {
      const err = new Error('DPIA not found');
      err.code = 'DPIA_NOT_FOUND';
      throw err;
    }
    if (dpia.status !== 'draft' && dpia.status !== 'in_review') {
      const err = new Error(`Cannot add risk in status ${dpia.status}`);
      err.code = 'DPIA_INVALID_STATE';
      throw err;
    }
    dpia.risks.push({
      description: risk.description,
      likelihood: risk.likelihood,
      impact: risk.impact,
      mitigation: risk.mitigation,
      addressedBy: actor.userId,
    });
    await dpia.save();
    return dpia;
  }

  async function transition(dpiaId, newStatus, payload = {}, actor) {
    const dpia = await Dpia.findById(dpiaId);
    if (!dpia) {
      const err = new Error('DPIA not found');
      err.code = 'DPIA_NOT_FOUND';
      throw err;
    }
    const allowed = TRANSITIONS[dpia.status] || [];
    if (!allowed.includes(newStatus)) {
      const err = new Error(
        `Invalid transition ${dpia.status} → ${newStatus}. Allowed: [${allowed.join(', ')}]`
      );
      err.code = 'DPIA_INVALID_TRANSITION';
      throw err;
    }
    if (newStatus === 'rejected' && !payload.rejectionReason) {
      const err = new Error('rejectionReason required on reject');
      err.code = 'DPIA_REJECTION_REASON_REQUIRED';
      throw err;
    }
    dpia.status = newStatus;
    if (newStatus === 'approved' || newStatus === 'rejected') {
      dpia.reviewedBy = actor.userId;
      dpia.reviewedAt = new Date();
      dpia.reviewNotes = payload.reviewNotes || null;
      if (newStatus === 'rejected') dpia.rejectionReason = payload.rejectionReason;
    }
    await dpia.save();
    return dpia;
  }

  /**
   * sign(dpiaId, actor, opts) — final sign-off after approval.
   *
   * Service-layer MFA enforcement (W275 pattern): when `enforceMfa:true`
   * was passed at factory construction, this checks actor's MFA tier
   * (defaults to tier 2 for DPIA signatures). Route layer also gates
   * via requireMfaTier(2) — service-layer is defense-in-depth for
   * non-HTTP callers.
   */
  async function sign(dpiaId, actor, opts = {}) {
    const dpia = await Dpia.findById(dpiaId);
    if (!dpia) {
      const err = new Error('DPIA not found');
      err.code = 'DPIA_NOT_FOUND';
      throw err;
    }
    if (dpia.status !== 'approved') {
      const err = new Error(`Can only sign in status 'approved' (current: ${dpia.status})`);
      err.code = 'DPIA_NOT_APPROVED';
      throw err;
    }
    if (dpia.signedAt) {
      const err = new Error('DPIA already signed');
      err.code = 'DPIA_ALREADY_SIGNED';
      throw err;
    }
    if (enforceMfa) {
      const tier = actor?.mfaTier || 0;
      if (tier < 2) {
        const err = new Error(`DPIA sign requires MFA tier 2 (actor has tier ${tier})`);
        err.code = 'DPIA_MFA_INSUFFICIENT';
        throw err;
      }
    }
    dpia.signedBy = actor.userId;
    dpia.signedAt = new Date();
    dpia.signatureMfaChallengeId = opts.mfaChallengeId || actor?.mfaChallengeId || null;
    await dpia.save();
    return dpia;
  }

  /**
   * isFeatureApproved(featureName, featureFlag?) — used by drift guards
   * and runtime checks to verify a feature has an approved+signed DPIA
   * before the gate opens.
   *
   * Returns { approved, dpia, reason }.
   */
  async function isFeatureApproved(featureName, featureFlag = null) {
    const query = featureFlag
      ? { featureFlag, status: 'approved', signedAt: { $ne: null } }
      : { featureName, status: 'approved', signedAt: { $ne: null } };

    const latest = await Dpia.findOne(query).sort({ version: -1, signedAt: -1 });
    if (!latest) {
      return { approved: false, dpia: null, reason: 'NO_SIGNED_DPIA' };
    }
    // Check expiry (365d post-sign)
    const ageMs = Date.now() - new Date(latest.signedAt).getTime();
    if (ageMs > 365 * 24 * 60 * 60 * 1000) {
      return { approved: false, dpia: latest, reason: 'DPIA_EXPIRED' };
    }
    return { approved: true, dpia: latest, reason: null };
  }

  async function listByStatus(status, opts = {}) {
    const query = status ? { status } : {};
    return Dpia.find(query)
      .sort({ updatedAt: -1 })
      .limit(opts.limit || 100)
      .lean();
  }

  return {
    create,
    addRisk,
    transition,
    sign,
    isFeatureApproved,
    listByStatus,
    // Test introspection
    _TRANSITIONS: TRANSITIONS,
  };
}

module.exports = dpiaServiceFactory;
module.exports.TRANSITIONS = TRANSITIONS;
