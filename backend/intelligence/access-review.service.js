'use strict';

/**
 * access-review.service.js — Wave 72 (red-team #12 closure).
 *
 * Workflow orchestration on top of the Wave-38 foundations
 * (registry + AccessReviewAttestation model + simulator). Provides
 * the chokepoint that the HTTP layer (Wave 72 routes) calls — no
 * caller writes attestations directly.
 *
 * Public API:
 *   createAttestation({ cycleId, reviewType, reviewerId, reviewerRole,
 *                       targetUserId, targetRole, targetScope,
 *                       criteriaAnswers, decision, justificationAr?,
 *                       justificationEn?, evidenceLinks?,
 *                       nafathSignatureId?, coSignerNafathIds?,
 *                       actor }) → { ok, attestation } | { ok:false, reason }
 *
 *   getAttestation(id) → { ok, attestation } | { ok:false, reason:'NOT_FOUND' }
 *
 *   listAttestations(filter) → { ok, items, total }
 *     filter: { cycleId?, reviewType?, reviewerId?, targetUserId?,
 *               decision?, since?, until?, limit?, skip? }
 *
 *   getCycleStatus(cycleId) → completion metrics
 *     { ok, cycleId, totals: { byType: { ... }, byDecision: { ... },
 *                              total, revokeRate } }
 *
 *   verifyHashChain(targetUserId) — replays Merkle log for a target
 *     and reports any broken link
 *     → { ok, broken: [{ attestationId, expected, actual }] }
 *
 * Hash chain:
 *   • currentHash = sha256(cycleId|reviewType|reviewerId|targetUserId|
 *                          targetRole|decision|signedAt.iso|
 *                          priorHash||'GENESIS')
 *   • priorAttestationHash is auto-resolved from the latest
 *     attestation for the same targetUserId (DESC signedAt).
 *
 * Hard guards (returned as { ok:false, reason: '...' }):
 *   REVIEWER_REQUIRED       — reviewerId missing
 *   TARGET_REQUIRED         — targetUserId missing
 *   SELF_ATTESTATION        — reviewerId === targetUserId
 *   INVALID_REVIEW_TYPE     — not in registry
 *   INVALID_DECISION        — not in registry
 *   JUSTIFICATION_REQUIRED  — REVOKE/REVISE/ESCALATE/ROTATE without
 *                             justification
 *   COSIGNERS_REQUIRED      — PRIVILEGED/HQ/HIGH_RISK without
 *                             coSignerNafathIds
 *   MODEL_VALIDATION_FAILED — schema invariants tripped
 *
 * The route layer maps these to 4xx codes.
 */

const crypto = require('crypto');
const reg = require('./access-review.registry');

const TYPES_REQUIRING_COSIGNERS = new Set([
  reg.REVIEW_TYPE.PRIVILEGED,
  reg.REVIEW_TYPE.HQ,
  reg.REVIEW_TYPE.HIGH_RISK,
]);

const DECISIONS_REQUIRING_JUSTIFICATION = new Set([
  reg.DECISION.REVISE,
  reg.DECISION.REVOKE,
  reg.DECISION.ESCALATE,
  reg.DECISION.ROTATE,
]);

function computeHash({
  cycleId,
  reviewType,
  reviewerId,
  targetUserId,
  targetRole,
  decision,
  signedAt,
  priorHash,
}) {
  const payload = [
    String(cycleId),
    String(reviewType),
    String(reviewerId),
    String(targetUserId),
    String(targetRole),
    String(decision),
    new Date(signedAt).toISOString(),
    priorHash || 'GENESIS',
  ].join('|');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * @param {object} opts
 *   - attestationModel — mongoose model for AccessReviewAttestation
 *   - simulator        — Wave-38 simulator (optional; used for risk-score capture)
 *   - anchorLedger     — Wave-17 anchor service (optional; commits HIGH-sensitivity types)
 *   - logger
 *   - now              — () => Date (for tests)
 */
function createAccessReviewService({
  attestationModel,
  simulator = null,
  anchorLedger = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!attestationModel) {
    throw new Error('access-review.service: attestationModel is required');
  }

  async function _latestPriorHash(targetUserId) {
    try {
      const prior = await attestationModel
        .findOne({ targetUserId })
        .sort({ signedAt: -1 })
        .select('currentHash')
        .lean();
      return prior ? prior.currentHash : null;
    } catch (err) {
      logger.warn && logger.warn(`[access-review] prior-hash lookup failed: ${err.message}`);
      return null;
    }
  }

  async function createAttestation(input = {}) {
    const {
      cycleId,
      reviewType,
      reviewerId,
      reviewerRole,
      targetUserId,
      targetRole,
      targetScope,
      criteriaAnswers = {},
      decision,
      justificationAr = null,
      justificationEn = null,
      evidenceLinks = [],
      nafathSignatureId = null,
      coSignerNafathIds = [],
    } = input;

    if (!reviewerId) return { ok: false, reason: 'REVIEWER_REQUIRED' };
    if (!targetUserId) return { ok: false, reason: 'TARGET_REQUIRED' };
    if (String(reviewerId) === String(targetUserId)) {
      return { ok: false, reason: 'SELF_ATTESTATION' };
    }
    if (!reg.REVIEW_TYPES.includes(reviewType)) {
      return { ok: false, reason: 'INVALID_REVIEW_TYPE' };
    }
    if (!reg.DECISIONS.includes(decision)) {
      return { ok: false, reason: 'INVALID_DECISION' };
    }
    if (DECISIONS_REQUIRING_JUSTIFICATION.has(decision) && !justificationAr && !justificationEn) {
      return { ok: false, reason: 'JUSTIFICATION_REQUIRED' };
    }
    if (
      TYPES_REQUIRING_COSIGNERS.has(reviewType) &&
      (!Array.isArray(coSignerNafathIds) || coSignerNafathIds.length < 1)
    ) {
      return { ok: false, reason: 'COSIGNERS_REQUIRED' };
    }

    const signedAt = now();
    const priorHash = await _latestPriorHash(targetUserId);
    const currentHash = computeHash({
      cycleId,
      reviewType,
      reviewerId,
      targetUserId,
      targetRole,
      decision,
      signedAt,
      priorHash,
    });

    const doc = new attestationModel({
      cycleId,
      reviewType,
      reviewerId,
      reviewerRole,
      targetUserId,
      targetRole,
      targetScope,
      criteriaAnswers,
      decision,
      justificationAr,
      justificationEn,
      evidenceLinks,
      signedAt,
      nafathSignatureId,
      coSignerNafathIds,
      priorAttestationHash: priorHash,
      currentHash,
    });

    try {
      await doc.validate();
    } catch (err) {
      return {
        ok: false,
        reason: 'MODEL_VALIDATION_FAILED',
        errors: err.errors
          ? Object.fromEntries(
              Object.entries(err.errors).map(([k, v]) => [k, v.message || String(v)])
            )
          : { _root: err.message },
      };
    }

    let saved;
    try {
      saved = await doc.save();
    } catch (err) {
      return { ok: false, reason: 'SAVE_FAILED', error: err.message };
    }

    // Optional ledger anchor for HIGH-sensitivity types (privileged / HQ / high-risk).
    if (anchorLedger && TYPES_REQUIRING_COSIGNERS.has(reviewType)) {
      try {
        const anchorRes = await anchorLedger.commit({
          kind: 'access-review.attestation',
          payloadHash: currentHash,
          entityId: String(saved._id),
        });
        if (anchorRes && anchorRes.txId) {
          saved.anchorTxId = anchorRes.txId;
          await saved.save();
        }
      } catch (err) {
        // Anchor failure must not roll back the attestation — log and continue.
        logger.warn && logger.warn(`[access-review] anchor commit failed: ${err.message}`);
      }
    }

    // Optional simulator capture — risk score at time of attestation.
    // (Best-effort; if the simulator throws we still return the attestation.)
    let riskScoreAtDecision = null;
    if (simulator && typeof simulator.simulateActor === 'function') {
      try {
        const report = simulator.simulateActor({ userId: targetUserId, roles: [targetRole] });
        riskScoreAtDecision = report.riskScore;
      } catch {
        /* ignore */
      }
    }

    return { ok: true, attestation: saved.toObject(), riskScoreAtDecision };
  }

  async function getAttestation(id) {
    try {
      const doc = await attestationModel.findById(id).lean();
      if (!doc) return { ok: false, reason: 'NOT_FOUND' };
      return { ok: true, attestation: doc };
    } catch (err) {
      return { ok: false, reason: 'NOT_FOUND', error: err.message };
    }
  }

  async function listAttestations(filter = {}) {
    const {
      cycleId,
      reviewType,
      reviewerId,
      targetUserId,
      decision,
      since,
      until,
      limit = 50,
      skip = 0,
    } = filter;

    const q = {};
    if (cycleId) q.cycleId = cycleId;
    if (reviewType) q.reviewType = reviewType;
    if (reviewerId) q.reviewerId = reviewerId;
    if (targetUserId) q.targetUserId = targetUserId;
    if (decision) q.decision = decision;
    if (since || until) {
      q.signedAt = {};
      if (since) q.signedAt.$gte = new Date(since);
      if (until) q.signedAt.$lte = new Date(until);
    }

    const cappedLimit = Math.min(Math.max(Number(limit) || 50, 1), 500);
    const cappedSkip = Math.max(Number(skip) || 0, 0);

    const [items, total] = await Promise.all([
      attestationModel.find(q).sort({ signedAt: -1 }).skip(cappedSkip).limit(cappedLimit).lean(),
      attestationModel.countDocuments(q),
    ]);

    return { ok: true, items, total };
  }

  async function getCycleStatus(cycleId) {
    if (!cycleId) return { ok: false, reason: 'CYCLE_ID_REQUIRED' };
    const rows = await attestationModel
      .find({ cycleId })
      .select('reviewType decision signedAt')
      .lean();

    const byType = {};
    const byDecision = {};
    for (const r of rows) {
      byType[r.reviewType] = (byType[r.reviewType] || 0) + 1;
      byDecision[r.decision] = (byDecision[r.decision] || 0) + 1;
    }
    const total = rows.length;
    const revokes = byDecision[reg.DECISION.REVOKE] || 0;
    const revokeRate = total > 0 ? Math.round((revokes / total) * 10000) / 100 : 0;

    return {
      ok: true,
      cycleId,
      totals: { byType, byDecision, total, revokeRate },
    };
  }

  /**
   * Replay the hash chain for one target. Returns the broken links
   * (each as { attestationId, expected, actual }) — empty array
   * means the chain is intact.
   */
  async function verifyHashChain(targetUserId) {
    if (!targetUserId) return { ok: false, reason: 'TARGET_REQUIRED' };
    const rows = await attestationModel.find({ targetUserId }).sort({ signedAt: 1 }).lean();
    const broken = [];
    let priorHash = null;
    for (const r of rows) {
      const expected = computeHash({
        cycleId: r.cycleId,
        reviewType: r.reviewType,
        reviewerId: r.reviewerId,
        targetUserId: r.targetUserId,
        targetRole: r.targetRole,
        decision: r.decision,
        signedAt: r.signedAt,
        priorHash,
      });
      if (expected !== r.currentHash) {
        broken.push({ attestationId: String(r._id), expected, actual: r.currentHash });
      }
      priorHash = r.currentHash;
    }
    return { ok: true, broken, chainLength: rows.length };
  }

  return {
    createAttestation,
    getAttestation,
    listAttestations,
    getCycleStatus,
    verifyHashChain,
    // Re-expose simulator passthroughs for the route layer
    simulator,
  };
}

module.exports = {
  createAccessReviewService,
  computeHash,
};
