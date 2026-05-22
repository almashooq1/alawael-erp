'use strict';

/**
 * requireMfaTier.js — Wave 273.
 *
 * Closes the CLAUDE.md gap "Don't bypass loadMfaActor middleware on
 * routes that touch ... payroll override" across the biometric/
 * attendance/hikvision route surface. Wave 86 shipped `loadMfaActor`
 * (populator) + service-layer guard `checkMfaTier`. Wave 95 wired
 * that pattern into beneficiary-lifecycle. Wave 273 extends the
 * SAME pattern as a ROUTE-LAYER guard so the 14+ services under
 * `intelligence/hikvision-*` and `services/hr/*` don't need
 * per-service refactoring to close the immediate auth gap.
 *
 * Two exports:
 *
 *   • attachMfaActor — lazy variant of Wave-86 `loadMfaActor`. Reads
 *     `req.app._mfaChallengeService` at request time (not at module
 *     load — the service is wired late in `app.js` startup) and
 *     populates `req.actor` with { userId, role, ip, mfaLevel,
 *     mfaAssertedAt }. When no MFA service is wired (test env,
 *     misconfig), defaults to mfaLevel=0 so downstream guards FAIL
 *     CLOSED — never silently accept.
 *
 *   • requireMfaTier(requiredTier, { maxAgeMin? }) — factory returning
 *     an Express middleware that rejects 401/403 when:
 *       - no authenticated user           → 401 ACTOR_REQUIRED
 *       - mfaLevel < requiredTier         → 403 MFA_TIER_REQUIRED
 *       - mfaAssertedAt is stale > maxAgeMin
 *                                         → 403 MFA_FRESHNESS_REQUIRED
 *     Diagnostic fields ({ actorTier, requiredTier, ageMin, maxAgeMin })
 *     mirror the beneficiary-lifecycle response shape so the
 *     web-admin can render an actionable "step-up to tier N" prompt.
 *
 * Mounting chain:
 *
 *   authenticate → attachMfaActor → [requirePerm(...) → requireMfaTier(N) → handler]
 *
 * Where `requirePerm` is the route's RBAC gate (already present in
 * hikvision routes via governance.hasPermission, in biometric/zkteco
 * via authorizeRole). MFA is an INDEPENDENT layer — defense in depth.
 *
 * Default freshness windows mirror DEFAULT_TIER_*_EXPIRY_MS in
 * mfa-challenge.service: tier 2 → 5 min, tier 3 → 90 s. Caller can
 * widen these with `maxAgeMin` (or pass `null` to disable freshness
 * check, e.g. for read-only sensitive endpoints).
 */

const { loadMfaActor } = require('./mfa-actor');

const DEFAULT_FRESHNESS_MIN_BY_TIER = Object.freeze({
  1: 60, // 1 hour — tier 1 is "session-bound", broad window
  2: 15, // 15 min — covers the 5-min mfa-challenge ttl + admin think-time
  3: 5, //   5 min — tightest; matches DEFAULT_TIER_3_EXPIRY_MS (90s) with headroom
});

/**
 * Lazy variant of Wave-86 loadMfaActor that resolves the MFA service
 * from `req.app._mfaChallengeService` per-request. Falls back to a
 * fail-closed actor (mfaLevel=0) when no service is wired, so
 * downstream requireMfaTier rejects with MFA_TIER_REQUIRED rather
 * than silently passing.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
function attachMfaActor(req, _res, next) {
  const mfaService = req.app && req.app._mfaChallengeService;
  if (mfaService && typeof mfaService.getUserMfaState === 'function') {
    return loadMfaActor(mfaService)(req, _res, next);
  }
  // Fail-closed default: caller has authenticated but no MFA service
  // is wired. Downstream requireMfaTier(N>=1) will reject with
  // MFA_TIER_REQUIRED. Routes that DON'T require MFA simply ignore
  // req.actor.mfaLevel.
  const userId = (req.user && (req.user.id || req.user._id)) || null;
  const role = (req.user && (req.user.role || req.user.roleCode)) || null;
  const ip = req.ip || (req.connection && req.connection.remoteAddress) || null;
  req.actor = {
    ...(req.actor || {}),
    userId,
    role,
    ip,
    mfaLevel: 0,
    mfaAssertedAt: null,
  };
  return next();
}

/**
 * Compute age of an MFA assertion in whole minutes. Returns Infinity
 * when the assertion is missing — that yields the safe "stale" answer
 * for the freshness check.
 *
 * @param {Date|string|null|undefined} assertedAt
 * @param {Date} now
 * @returns {number} age in minutes (Infinity if missing/invalid)
 */
function _ageInMinutes(assertedAt, now) {
  if (!assertedAt) return Infinity;
  const t = assertedAt instanceof Date ? assertedAt.getTime() : Date.parse(assertedAt);
  if (!Number.isFinite(t)) return Infinity;
  return Math.floor((now.getTime() - t) / 60000);
}

/**
 * Factory returning an Express middleware that gates a route on the
 * caller's MFA tier + assertion freshness.
 *
 * @param {number} requiredTier — 1, 2, or 3
 * @param {object} [opts]
 * @param {number|null} [opts.maxAgeMin] — assertion freshness window in
 *        minutes. Defaults to DEFAULT_FRESHNESS_MIN_BY_TIER[requiredTier].
 *        Pass `null` to disable the freshness check entirely (sensitive
 *        READS that only care about tier, not recency).
 * @param {() => Date} [opts.now] — clock injection (tests).
 * @returns {import('express').RequestHandler}
 */
function requireMfaTier(requiredTier, opts = {}) {
  if (!Number.isInteger(requiredTier) || requiredTier < 1 || requiredTier > 3) {
    throw new Error('requireMfaTier: requiredTier must be 1, 2, or 3');
  }
  const maxAgeMin =
    opts.maxAgeMin === null
      ? null
      : typeof opts.maxAgeMin === 'number'
        ? opts.maxAgeMin
        : DEFAULT_FRESHNESS_MIN_BY_TIER[requiredTier];
  const now = typeof opts.now === 'function' ? opts.now : () => new Date();

  return function mfaTierGuard(req, res, next) {
    if (!req.user || !(req.user.id || req.user._id)) {
      return res.status(401).json({
        success: false,
        message: 'يلزم تسجيل الدخول',
        reason: 'ACTOR_REQUIRED',
      });
    }
    const actor = req.actor || { mfaLevel: 0, mfaAssertedAt: null };
    const actorTier = typeof actor.mfaLevel === 'number' ? actor.mfaLevel : 0;

    if (actorTier < requiredTier) {
      return res.status(403).json({
        success: false,
        message: 'يلزم رفع مستوى التحقق الثنائي لتنفيذ هذه العملية',
        reason: 'MFA_TIER_REQUIRED',
        requiredTier,
        actorTier,
      });
    }

    if (maxAgeMin !== null) {
      const ageMin = _ageInMinutes(actor.mfaAssertedAt, now());
      if (ageMin > maxAgeMin) {
        return res.status(403).json({
          success: false,
          message: 'انتهت صلاحية التحقق الثنائي، يرجى إعادة التحقق',
          reason: 'MFA_FRESHNESS_REQUIRED',
          requiredTier,
          actorTier,
          maxAgeMin,
          ageMin: Number.isFinite(ageMin) ? ageMin : null,
        });
      }
    }

    return next();
  };
}

module.exports = {
  attachMfaActor,
  requireMfaTier,
  DEFAULT_FRESHNESS_MIN_BY_TIER,
  _ageInMinutes,
};
