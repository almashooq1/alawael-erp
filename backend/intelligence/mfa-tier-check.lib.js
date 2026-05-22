'use strict';

/**
 * _checkMfaTier.lib.js — Wave 275c.
 *
 * Pure shared helper for service-layer MFA tier enforcement. Extracted
 * from the inline duplicates in:
 *   - [[wave275-service-layer-mfa-pilot]] (payroll-period.service)
 *   - [[wave275b-fraud-detection-mfa]] (hikvision-fraud-detection.service)
 *
 * Extraction triggered by the 3rd adopter (W275c face-enrollment), per
 * CLAUDE.md "three similar lines is better than a premature
 * abstraction". W275c refactors the prior 2 adopters to import from
 * this lib + adds face-enrollment as the 3rd consumer.
 *
 * Reason codes ALWAYS come from `intelligence/hikvision.registry.js`
 * REASON enum because that's the canonical enum that
 * `routes/hikvision.routes.js::REASON_TO_STATUS` consults to map
 * service rejections to HTTP 403. If a future non-hikvision service
 * adopts this lib, either (a) add the codes to hikvision.registry
 * with a renaming pass to a more neutral home, or (b) accept the
 * domain-shaped names as the canonical service-layer MFA contract.
 *
 * Why pure (no factory, no closure):
 *   - Lib has zero stateful dependencies — caller passes everything in
 *   - Each service still owns its `enforceMfa` factory flag and clock
 *     injection; the lib just performs the check
 *   - Trivially unit-testable in isolation
 */

const reg = require('./hikvision.registry');

/**
 * Check MFA tier + freshness for an actor. Pure function.
 *
 * @param {object} actor — { userId, mfaLevel?, mfaAssertedAt? }
 * @param {number} requiredTier — 1, 2, or 3
 * @param {number} maxAgeMin — freshness window in minutes
 * @param {object} [opts]
 * @param {boolean} [opts.enforceMfa=true] — when false, returns { ok: true } unconditionally.
 *   Callers from the W275/b/c pattern pass `{ enforceMfa }` from their
 *   factory closure so the same call site works whether the factory
 *   was constructed with enforceMfa=true or false.
 * @param {() => Date} [opts.now] — clock injection (tests). Defaults to `() => new Date()`.
 * @returns {{ ok: true } | { ok: false, reason: string, requiredTier: number, actorTier: number, maxAgeMin?: number, ageMin?: number|null }}
 */
function checkMfaTier(actor, requiredTier, maxAgeMin, opts = {}) {
  const enforceMfa = opts.enforceMfa !== false; // default true (security-first when omitted)
  if (!enforceMfa) return { ok: true };

  const now = typeof opts.now === 'function' ? opts.now : () => new Date();
  const actorTier = typeof (actor && actor.mfaLevel) === 'number' ? actor.mfaLevel : 0;

  if (actorTier < requiredTier) {
    return {
      ok: false,
      reason: reg.REASON.MFA_TIER_REQUIRED,
      requiredTier,
      actorTier,
    };
  }

  const assertedAt = actor && actor.mfaAssertedAt;
  if (!assertedAt) {
    return {
      ok: false,
      reason: reg.REASON.MFA_FRESHNESS_REQUIRED,
      requiredTier,
      actorTier,
      maxAgeMin,
      ageMin: null,
    };
  }
  const t = assertedAt instanceof Date ? assertedAt.getTime() : Date.parse(assertedAt);
  if (!Number.isFinite(t)) {
    return {
      ok: false,
      reason: reg.REASON.MFA_FRESHNESS_REQUIRED,
      requiredTier,
      actorTier,
      maxAgeMin,
      ageMin: null,
    };
  }
  const ageMin = Math.floor((now().getTime() - t) / 60000);
  if (ageMin > maxAgeMin) {
    return {
      ok: false,
      reason: reg.REASON.MFA_FRESHNESS_REQUIRED,
      requiredTier,
      actorTier,
      maxAgeMin,
      ageMin,
    };
  }
  return { ok: true };
}

module.exports = {
  checkMfaTier,
};
