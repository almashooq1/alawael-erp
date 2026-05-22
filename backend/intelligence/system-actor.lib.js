'use strict';

/**
 * system-actor.lib.js — Wave 275q.
 *
 * Pure helper exporting a synthetic "system actor" used by trusted
 * internal callers (scheduler cron jobs, background workers, replay
 * scripts) to satisfy service-layer MFA tier guards established in
 * [[wave275-service-layer-mfa-pilot]] and subsequent waves.
 *
 * Why this exists:
 *   W275 service-layer adoption blocked on cron-shaped services
 *   (sync-worker syncAll, fraud-score decayAllScores, face-enrollment
 *   confirmEnrollment, zkteco syncAttendanceLogs, etc.) because the
 *   scheduler / workers don't have an authenticated user session and
 *   can't supply a real { mfaLevel, mfaAssertedAt }. The route-only
 *   workaround (W275e/g/j/L/n) closes HTTP attack surface but leaves
 *   the service-layer check absent — a non-HTTP caller (CLI replay,
 *   internal service-to-service call from a future feature) could
 *   bypass entirely.
 *
 *   This lib offers a documented, traceable alternative: trusted
 *   internal callers supply a system actor with tier 3 + fresh
 *   assertion timestamp. Service-layer guards see a valid actor and
 *   pass. The actor's userId is a recognisable sentinel
 *   (`system:scheduler` etc.) so audit logs can attribute the
 *   non-human origin precisely.
 *
 * Security note (read before USING outside the scheduler):
 *   This is NOT a back door for human users. The exported function
 *   produces an in-process JavaScript object — it never crosses the
 *   wire, never reaches the auth layer. If a future contributor uses
 *   this to "skip MFA for a busy admin", that's a misuse and the
 *   audit log will surface `userId=system:*` for an operation that
 *   should have a human userId. Reviewers should reject any HTTP
 *   handler that imports from this file.
 *
 * Public surface:
 *   makeSystemActor({ id?, role?, now? }) → { userId, role, mfaLevel,
 *     mfaAssertedAt, ip }
 *   SYSTEM_USER_IDS — frozen object of canonical sentinel IDs
 *   SYSTEM_ROLES    — frozen object of canonical role names
 *   isSystemActor(actor) — heuristic for "did this originate
 *     from a trusted internal caller?" — useful when an audit-log
 *     writer wants to distinguish human vs. machine actors
 */

const SYSTEM_USER_IDS = Object.freeze({
  SCHEDULER: 'system:scheduler',
  WORKER: 'system:worker',
  REPLAY: 'system:replay',
  CLI: 'system:cli',
});

const SYSTEM_ROLES = Object.freeze({
  SCHEDULER: 'system-scheduler',
  WORKER: 'system-worker',
  REPLAY: 'system-replay',
  CLI: 'system-cli',
});

// Highest tier — system actors should pass any T1/T2/T3 service-layer
// guard. Hardcoded 3 (not configurable per-call) so future contributors
// don't reduce the bar by accident.
const SYSTEM_MFA_TIER = 3;

/**
 * Build a synthetic system actor satisfying service-layer MFA tier
 * guards. Caller MUST own the trust decision — see header comment.
 *
 * @param {object} [opts]
 * @param {string} [opts.id]   — userId override; default 'system:scheduler'
 * @param {string} [opts.role] — role override; default 'system-scheduler'
 * @param {() => Date} [opts.now] — clock injection (tests). Default real Date.
 * @returns {{ userId: string, role: string, mfaLevel: number, mfaAssertedAt: Date, ip: null }}
 */
function makeSystemActor(opts = {}) {
  const id =
    typeof opts.id === 'string' && opts.id.length > 0 ? opts.id : SYSTEM_USER_IDS.SCHEDULER;
  const role =
    typeof opts.role === 'string' && opts.role.length > 0 ? opts.role : SYSTEM_ROLES.SCHEDULER;
  const now = typeof opts.now === 'function' ? opts.now : () => new Date();
  return {
    userId: id,
    role,
    mfaLevel: SYSTEM_MFA_TIER,
    mfaAssertedAt: now(),
    ip: null, // not network-attributable
  };
}

/**
 * Heuristic: does `actor` look like it came from a trusted internal
 * caller (vs. a human user via HTTP)? Used by audit-log writers to
 * tag rows with `actor_kind=system|human`.
 *
 * @param {object|null|undefined} actor
 * @returns {boolean}
 */
function isSystemActor(actor) {
  if (!actor || typeof actor.userId !== 'string') return false;
  return actor.userId.startsWith('system:');
}

module.exports = {
  makeSystemActor,
  isSystemActor,
  SYSTEM_USER_IDS,
  SYSTEM_ROLES,
  SYSTEM_MFA_TIER,
};
