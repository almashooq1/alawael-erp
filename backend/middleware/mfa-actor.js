'use strict';

/**
 * mfa-actor.js — Wave 86.
 *
 * Two small middlewares that close blocker B3 from the Session-Waves
 * 64-83 critical review:
 *   "UI gating bypasses backend enforcement = security theater."
 *
 *   • loadMfaActor(mfaService)
 *       Populates `req.actor` with { userId, role, ip, mfaLevel,
 *       mfaAssertedAt }. mfaLevel is sourced from the in-process
 *       MFA state map exposed by the Wave-86-extended
 *       mfa-challenge.service. Defaults to 0 when the user has
 *       never verified MFA in this process lifetime.
 *
 *       Mount this AFTER `authenticate` (which sets req.user) but
 *       BEFORE any `requireMfa(tier)` middleware. The existing
 *       mfaService.requireMfa(tier) factory reads `req.actor`, so
 *       chaining is:
 *         authenticate → loadMfaActor(mfa) → requireMfa(N) → handler
 *
 *   • buildActorFromReq(req)
 *       Pure helper for service-layer code that needs an actor
 *       object (e.g. lifecycle.service.approveTransition). Reads the
 *       same fields loadMfaActor would have written, without
 *       depending on middleware order. Service layer can call this
 *       directly and pass the result into `actor: ...` in service
 *       calls so the service's own MFA-tier guard works whether
 *       middleware ran or not (defense in depth).
 *
 * NEITHER of these mutates state. They just READ from the
 * mfaService's getUserMfaState. The only writer is verifyChallenge.
 */

/**
 * @param {object} mfaService — output of createMfaChallengeService()
 *                              with the Wave-86 `getUserMfaState` method.
 * @returns Express middleware `(req, res, next) => void`
 */
function loadMfaActor(mfaService) {
  if (!mfaService || typeof mfaService.getUserMfaState !== 'function') {
    throw new Error('loadMfaActor: mfaService.getUserMfaState is required');
  }
  return function mfaActorMiddleware(req, _res, next) {
    const userId = req.user?.id || req.user?._id || null;
    const role = req.user?.role || req.user?.roleCode || null;
    const ip = req.ip || (req.connection && req.connection.remoteAddress) || null;

    const mfaState = userId
      ? mfaService.getUserMfaState(userId)
      : { mfaLevel: 0, mfaAssertedAt: null };

    // Preserve any actor fields a prior middleware may have set.
    req.actor = {
      ...(req.actor || {}),
      userId,
      role,
      ip,
      mfaLevel: mfaState.mfaLevel,
      mfaAssertedAt: mfaState.mfaAssertedAt,
    };
    return next();
  };
}

/**
 * Synchronous actor builder for service-layer code paths that don't
 * go through the middleware chain (background workers, tests, jobs
 * that construct synthetic actors). Reads the same MFA state map
 * the middleware would.
 *
 * @param {object} req       — Express request (must have `user`)
 * @param {object} mfaService — Wave-86-extended MFA service (optional;
 *                              when absent, mfaLevel defaults to 0)
 * @returns {object} actor
 */
function buildActorFromReq(req, mfaService = null) {
  const userId = req.user?.id || req.user?._id || null;
  const role = req.user?.role || req.user?.roleCode || null;
  const ip = req.ip || (req.connection && req.connection.remoteAddress) || null;
  let mfaLevel = 0;
  let mfaAssertedAt = null;
  if (mfaService && typeof mfaService.getUserMfaState === 'function' && userId) {
    const s = mfaService.getUserMfaState(userId);
    mfaLevel = s.mfaLevel || 0;
    mfaAssertedAt = s.mfaAssertedAt || null;
  }
  return { userId, role, ip, mfaLevel, mfaAssertedAt };
}

module.exports = {
  loadMfaActor,
  buildActorFromReq,
};
