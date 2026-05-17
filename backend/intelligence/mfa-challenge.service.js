'use strict';

/**
 * mfa-challenge.service.js — Wave 36.
 *
 * Step-up MFA flow operationalising Constitution §12. The Wave-31
 * decide() already DENIES privileged actions when `actor.mfaLevel`
 * falls below the action's required tier — but the platform had no
 * way to actually CHALLENGE the user for a higher tier. This service
 * is that channel.
 *
 *   Flow:
 *     1. User attempts a tier-2 action (e.g. finance.invoices.approve)
 *        with only tier-1 session.
 *     2. decide() returns { reason: 'STEP_UP_MFA_REQUIRED', requiredTier: 2 }.
 *     3. Frontend calls POST /api/v1/mfa/challenge { requiredTier }.
 *     4. Service issues a challengeId + the user's enrolled method
 *        (totp/sms/biometric — caller picks).
 *     5. User enters the OTP; frontend POSTs to /:challengeId/verify.
 *     6. Service verifies via the user's stored secret; on success,
 *        the SESSION is upgraded — `session.mfaLevel = requiredTier`,
 *        `session.mfaAssertedAt = now`. Subsequent decide() calls
 *        pass the policy layer.
 *
 * Design choices:
 *   • Mongo-free at this layer — the service holds an in-memory Map
 *     of pending challenges keyed by `challengeId`. Wave 37 wires
 *     real persistence via a Challenge collection.
 *   • TOTP verifier is INJECTED (default uses `speakeasy` if available,
 *     else a stub that fails closed). Lets tests deterministically
 *     assert tier upgrades.
 *   • Challenge expiry: 5 min default for tier 2, 90s for tier 3
 *     (tighter window for the most sensitive actions).
 *   • Session upgrades are EVENT-DRIVEN — the service emits
 *     `mfa-asserted` so the caller's session store can persist the
 *     new tier (we don't tie this service to any specific session
 *     framework).
 */

const DEFAULT_TIER_2_EXPIRY_MS = 5 * 60 * 1000;
const DEFAULT_TIER_3_EXPIRY_MS = 90 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

// ─── Wave 37 — Brute-force protections ─────────────────────────────
// Red-team finding #4: per-challenge MAX_VERIFY_ATTEMPTS resets when
// the attacker creates a fresh challenge. These per-USER ceilings
// close that gap.
const DEFAULT_USER_MAX_FAILED_PER_24H = 10;
const DEFAULT_MAX_CHALLENGES_PER_HOUR = 6;
const DEFAULT_USER_LOCKOUT_MS = 30 * 60 * 1000; // 30 min
const DEFAULT_BACKOFF_BASE_MS = 2000; // 2s × 2^(attempt-1) → 2/4/8/16s
const WINDOW_24H_MS = 24 * 60 * 60 * 1000;
const WINDOW_1H_MS = 60 * 60 * 1000;

// Reason codes (kept in sync with decide() reasons from Wave 31)
const REASON = Object.freeze({
  CHALLENGE_REQUIRED: 'CHALLENGE_REQUIRED',
  INVALID_TIER: 'INVALID_TIER',
  USER_REQUIRED: 'USER_REQUIRED',
  USER_NOT_ENROLLED: 'USER_NOT_ENROLLED',
  CHALLENGE_NOT_FOUND: 'CHALLENGE_NOT_FOUND',
  CHALLENGE_EXPIRED: 'CHALLENGE_EXPIRED',
  CHALLENGE_ALREADY_VERIFIED: 'CHALLENGE_ALREADY_VERIFIED',
  CHALLENGE_LOCKED: 'CHALLENGE_LOCKED',
  OTP_INVALID: 'OTP_INVALID',
  // Wave 37
  USER_TEMP_LOCKED: 'USER_TEMP_LOCKED',
  CHALLENGE_RATE_LIMITED: 'CHALLENGE_RATE_LIMITED',
  VERIFY_TOO_SOON: 'VERIFY_TOO_SOON',
});

function nowDate() {
  return new Date();
}

function generateId() {
  // Per-process counter + timestamp — sufficient for in-memory store.
  generateId.n = (generateId.n || 0) + 1;
  return `mfa-${Date.now()}-${generateId.n}`;
}

/**
 * @param {object} opts
 *   - mfaSettingsModel   — Mongoose model (User MFA enrollment)
 *                          Looked up by userId. Optional in tests.
 *   - totpVerifier       — function ({ secret, token }) => boolean
 *                          Defaults to speakeasy if available; else
 *                          a stub that fails closed (no enrollment
 *                          path exists in test env).
 *   - sessionUpdater     — async function ({ userId, mfaLevel,
 *                                            mfaAssertedAt }) => void
 *                          Called on successful verify. Caller wires
 *                          to its session store (express-session,
 *                          JWT refresh, Redis, etc.).
 *   - auditLogger        — { log({ action, ... }) } from Wave 26
 *   - logger             — console-compatible
 *   - now                — clock injection
 */
function createMfaChallengeService({
  mfaSettingsModel = null,
  totpVerifier = null,
  sessionUpdater = null,
  auditLogger = null,
  logger = console,
  now = nowDate,
  // Wave 37 — brute-force protections. Tests can disable each by
  // passing Infinity / 0.
  userMaxFailedPer24h = DEFAULT_USER_MAX_FAILED_PER_24H,
  maxChallengesPerHour = DEFAULT_MAX_CHALLENGES_PER_HOUR,
  userLockoutMs = DEFAULT_USER_LOCKOUT_MS,
  backoffBaseMs = DEFAULT_BACKOFF_BASE_MS,
} = {}) {
  void logger;

  // In-memory store: challengeId → challenge
  const store = new Map();

  // Wave 37 — per-user state, keyed by userId.
  //   failed:      [Date]  sliding 24h window of failed-verify timestamps
  //   challenges:  [Date]  sliding  1h window of challenge-create timestamps
  //   lockedUntil: Date|null
  const userStats = new Map();

  // Default TOTP verifier — prefer speakeasy when present, else stub
  // that always fails. Tests pass their own deterministic verifier.
  const verifier = totpVerifier || _defaultTotpVerifier(logger);

  // ─── helpers ──────────────────────────────────────────────

  async function _audit(action, actor, metadata) {
    if (!auditLogger || typeof auditLogger.log !== 'function') return;
    try {
      await auditLogger.log({
        action,
        actorUserId: actor?.userId || null,
        actorRole: actor?.role || null,
        entityType: 'MfaChallenge',
        entityId: metadata?.challengeId || null,
        ipAddress: actor?.ip || null,
        metadata: metadata || {},
      });
    } catch (err) {
      logger.warn && logger.warn(`[mfa] audit ${action} failed: ${err.message}`);
    }
  }

  function _expiryFor(tier) {
    return tier >= 3 ? DEFAULT_TIER_3_EXPIRY_MS : DEFAULT_TIER_2_EXPIRY_MS;
  }

  // ─── Wave 37 — per-user state helpers ─────────────────────

  function _getUserStats(userId) {
    let s = userStats.get(userId);
    if (!s) {
      s = { failed: [], challenges: [], lockedUntil: null };
      userStats.set(userId, s);
    }
    return s;
  }

  function _pruneOlder(arr, cutoffMs) {
    while (arr.length && arr[0].getTime() < cutoffMs) arr.shift();
  }

  function _checkUserLockout(userId) {
    const stats = _getUserStats(userId);
    const nowMs = now().getTime();
    _pruneOlder(stats.failed, nowMs - WINDOW_24H_MS);
    if (stats.lockedUntil && now() < stats.lockedUntil) {
      return {
        locked: true,
        lockedUntil: stats.lockedUntil,
        retryAfterMs: stats.lockedUntil.getTime() - nowMs,
      };
    }
    if (stats.lockedUntil && now() >= stats.lockedUntil) {
      // Lockout window passed — clear it. Failure history still slides.
      stats.lockedUntil = null;
    }
    return { locked: false };
  }

  async function _loadEnrollment(userId) {
    if (!mfaSettingsModel) return null;
    try {
      return await mfaSettingsModel
        .findOne({ userId })
        .select('userId methods totpSecret enrolled')
        .lean();
    } catch (err) {
      logger.warn && logger.warn(`[mfa] enrollment lookup failed: ${err.message}`);
      return null;
    }
  }

  // ─── createChallenge ───────────────────────────────────────

  /**
   * Issue a step-up challenge for the actor.
   *
   * Returns { ok, challengeId, requiredTier, expiresAt,
   *           method, instructions }
   * OR     { ok: false, reason }
   *
   * The challenge is held in memory until verified or expired.
   * The CALLER decides which method to use (totp/sms/biometric) —
   * the service exposes the user's enrolled methods so the UI can
   * present the right prompt.
   */
  async function createChallenge({ userId, requiredTier, actor = {}, method = 'totp' }) {
    if (!userId) return { ok: false, reason: REASON.USER_REQUIRED };
    if (![2, 3].includes(requiredTier)) {
      return { ok: false, reason: REASON.INVALID_TIER };
    }

    // Wave 37 — refuse if user is currently locked out
    const lockState = _checkUserLockout(userId);
    if (lockState.locked) {
      await _audit('mfa.challenge.user_locked', actor, {
        targetUserId: userId,
        lockedUntil: lockState.lockedUntil,
      });
      return {
        ok: false,
        reason: REASON.USER_TEMP_LOCKED,
        lockedUntil: lockState.lockedUntil,
        retryAfterMs: lockState.retryAfterMs,
      };
    }

    // Wave 37 — challenge-creation rate limit (sliding 1h window)
    const stats = _getUserStats(userId);
    const nowMs = now().getTime();
    _pruneOlder(stats.challenges, nowMs - WINDOW_1H_MS);
    if (stats.challenges.length >= maxChallengesPerHour) {
      const oldest = stats.challenges[0];
      const retryAfterMs = oldest.getTime() + WINDOW_1H_MS - nowMs;
      await _audit('mfa.challenge.rate_limited', actor, {
        targetUserId: userId,
        windowCount: stats.challenges.length,
        retryAfterMs,
      });
      return {
        ok: false,
        reason: REASON.CHALLENGE_RATE_LIMITED,
        retryAfterMs,
      };
    }
    stats.challenges.push(now());

    const enrollment = await _loadEnrollment(userId);
    // Optional enrollment check — when no mfaSettingsModel is wired
    // (tests), we proceed without enrollment, but the verifier will
    // reject the OTP.

    const id = generateId();
    const createdAt = now();
    const expiresAt = new Date(createdAt.getTime() + _expiryFor(requiredTier));
    const challenge = {
      _id: id,
      challengeId: id,
      userId,
      requiredTier,
      method,
      createdAt,
      expiresAt,
      verifiedAt: null,
      attemptCount: 0,
      enrolledMethods: enrollment?.methods || [],
      // Keep the secret reference for verify — never expose this
      // outward. SMS/biometric use different verification but the
      // store shape is the same.
      _totpSecret: enrollment?.totpSecret || null,
    };
    store.set(id, challenge);

    await _audit('mfa.challenge.created', actor, {
      challengeId: id,
      requiredTier,
      method,
    });

    return {
      ok: true,
      challengeId: id,
      requiredTier,
      method,
      expiresAt,
      instructions: _instructionsFor(method, requiredTier),
    };
  }

  function _instructionsFor(method, tier) {
    if (method === 'totp') {
      return tier >= 3
        ? 'Enter the 6-digit code from your authenticator (90s expiry — tier 3 critical)'
        : 'Enter the 6-digit code from your authenticator';
    }
    if (method === 'sms') {
      return tier >= 3
        ? 'Enter the 6-digit code from the SMS (90s)'
        : 'Enter the 6-digit code from the SMS';
    }
    if (method === 'biometric') {
      return tier >= 3
        ? 'Confirm via biometric on your registered device'
        : 'Confirm via biometric';
    }
    return 'Provide the requested verification token';
  }

  // ─── verifyChallenge ───────────────────────────────────────

  /**
   * Verify the user's OTP/biometric token for the challenge.
   *
   * On success:
   *   • Marks the challenge verified
   *   • Calls sessionUpdater (if wired) to upgrade session.mfaLevel
   *   • Emits audit event
   *   • Returns { ok: true, sessionUpgrade: { mfaLevel, assertedAt } }
   *
   * On failure:
   *   • Increments attemptCount
   *   • After MAX_VERIFY_ATTEMPTS → challenge locked
   *   • Returns structured reason for the UI
   */
  async function verifyChallenge({ challengeId, token, actor = {} }) {
    const c = store.get(challengeId);
    if (!c) return { ok: false, reason: REASON.CHALLENGE_NOT_FOUND };
    if (c.verifiedAt) return { ok: false, reason: REASON.CHALLENGE_ALREADY_VERIFIED };
    if (now() > c.expiresAt) {
      return { ok: false, reason: REASON.CHALLENGE_EXPIRED };
    }
    if (c.attemptCount >= MAX_VERIFY_ATTEMPTS) {
      return { ok: false, reason: REASON.CHALLENGE_LOCKED, attemptCount: c.attemptCount };
    }

    // Wave 37 — user-level lockout (spans across challenges)
    const lockState = _checkUserLockout(c.userId);
    if (lockState.locked) {
      return {
        ok: false,
        reason: REASON.USER_TEMP_LOCKED,
        lockedUntil: lockState.lockedUntil,
        retryAfterMs: lockState.retryAfterMs,
      };
    }

    // Wave 37 — exponential backoff between failed attempts on the same
    // challenge. attemptCount has not been incremented yet, so on the
    // 2nd verify call (after 1 failure) required delay = base × 2^0.
    if (c.lastFailedAt && backoffBaseMs > 0 && c.attemptCount > 0) {
      const requiredDelayMs = backoffBaseMs * Math.pow(2, c.attemptCount - 1);
      const elapsedMs = now().getTime() - c.lastFailedAt.getTime();
      if (elapsedMs < requiredDelayMs) {
        return {
          ok: false,
          reason: REASON.VERIFY_TOO_SOON,
          retryAfterMs: requiredDelayMs - elapsedMs,
        };
      }
    }

    c.attemptCount += 1;

    let pass = false;
    try {
      pass = await verifier({
        method: c.method,
        secret: c._totpSecret,
        token,
        userId: c.userId,
        tier: c.requiredTier,
      });
    } catch (err) {
      logger.warn && logger.warn(`[mfa] verifier threw: ${err.message}`);
      pass = false;
    }

    if (!pass) {
      // Wave 37 — record failure on both the challenge AND the user.
      c.lastFailedAt = now();
      const stats = _getUserStats(c.userId);
      stats.failed.push(now());
      _pruneOlder(stats.failed, now().getTime() - WINDOW_24H_MS);

      let userLockedNow = false;
      if (stats.failed.length >= userMaxFailedPer24h) {
        stats.lockedUntil = new Date(now().getTime() + userLockoutMs);
        userLockedNow = true;
        await _audit('mfa.user.locked', actor, {
          targetUserId: c.userId,
          lockedUntil: stats.lockedUntil,
          failedCount: stats.failed.length,
        });
      }

      await _audit('mfa.challenge.failed', actor, {
        challengeId,
        attempt: c.attemptCount,
        userFailedCount: stats.failed.length,
      });

      if (userLockedNow) {
        return {
          ok: false,
          reason: REASON.USER_TEMP_LOCKED,
          lockedUntil: stats.lockedUntil,
          retryAfterMs: userLockoutMs,
        };
      }

      return {
        ok: false,
        reason: REASON.OTP_INVALID,
        attemptsRemaining: MAX_VERIFY_ATTEMPTS - c.attemptCount,
      };
    }

    // Wave 37 — successful verify clears the per-user failure counter
    // so a legitimate login resets the slate.
    const successStats = _getUserStats(c.userId);
    successStats.failed = [];
    successStats.lockedUntil = null;

    // Success — mark + upgrade session
    c.verifiedAt = now();
    const sessionUpgrade = {
      userId: c.userId,
      mfaLevel: c.requiredTier,
      mfaAssertedAt: c.verifiedAt,
    };

    if (typeof sessionUpdater === 'function') {
      try {
        await sessionUpdater(sessionUpgrade);
      } catch (err) {
        logger.warn && logger.warn(`[mfa] sessionUpdater failed: ${err.message}`);
        // Don't unwind the verification — the client can re-auth if
        // session store hiccups, and the audit trail still captures
        // the successful assertion.
      }
    }

    await _audit('mfa.challenge.verified', actor, {
      challengeId,
      mfaLevel: c.requiredTier,
    });

    return { ok: true, sessionUpgrade };
  }

  // ─── getChallengeStatus ────────────────────────────────────

  function getChallengeStatus(challengeId) {
    const c = store.get(challengeId);
    if (!c) return { ok: false, reason: REASON.CHALLENGE_NOT_FOUND };
    const expired = now() > c.expiresAt;
    const locked = c.attemptCount >= MAX_VERIFY_ATTEMPTS;
    return {
      ok: true,
      challengeId,
      requiredTier: c.requiredTier,
      method: c.method,
      verified: !!c.verifiedAt,
      verifiedAt: c.verifiedAt,
      expired,
      locked,
      expiresAt: c.expiresAt,
      attemptCount: c.attemptCount,
      attemptsRemaining: Math.max(0, MAX_VERIFY_ATTEMPTS - c.attemptCount),
    };
  }

  // ─── requireMfa middleware factory ─────────────────────────

  /**
   * Express middleware factory. Returns a middleware that:
   *   • Lets the request pass if actor.mfaLevel >= tier AND fresh
   *   • Else 401 with body { reason: 'STEP_UP_MFA_REQUIRED', requiredTier,
   *                          challengeUrl: '/api/v1/mfa/challenge' }
   *   • Client calls challengeUrl, completes the flow, retries the
   *     original action.
   */
  function requireMfa(tier, opts = {}) {
    const freshnessMin = opts.freshnessMin || (tier >= 3 ? 5 : 15);
    return function mfaMiddleware(req, res, next) {
      const actor = req.actor || {};
      const actorTier = typeof actor.mfaLevel === 'number' ? actor.mfaLevel : 1;
      if (actorTier < tier) {
        return res.status(401).json({
          success: false,
          reason: 'STEP_UP_MFA_REQUIRED',
          requiredTier: tier,
          challengeUrl: '/api/v1/mfa/challenge',
        });
      }
      // Freshness check
      const mfaAt = actor.mfaAssertedAt ? new Date(actor.mfaAssertedAt) : null;
      const ageMin = mfaAt ? (now() - mfaAt) / 60_000 : Infinity;
      if (ageMin > freshnessMin) {
        return res.status(401).json({
          success: false,
          reason: 'MFA_FRESHNESS_REQUIRED',
          requiredTier: tier,
          maxAgeMin: freshnessMin,
          challengeUrl: '/api/v1/mfa/challenge',
        });
      }
      return next();
    };
  }

  // ─── Wave 37 — admin unlock + read-only state inspector ────

  /**
   * Clear a user's lockout + failed-attempt history. Intended for
   * admin/help-desk use after out-of-band identity confirmation.
   * The CALLER is responsible for permission gating — this service
   * trusts that whoever calls it has already passed an authz decide().
   */
  async function unlockUser({ userId, actor = {} } = {}) {
    if (!userId) return { ok: false, reason: REASON.USER_REQUIRED };
    const stats = userStats.get(userId);
    if (stats) {
      stats.failed = [];
      stats.lockedUntil = null;
    }
    await _audit('mfa.user.unlocked', actor, { targetUserId: userId });
    return { ok: true };
  }

  function getUserState(userId) {
    const stats = userStats.get(userId);
    if (!stats) {
      return {
        userId,
        failedCount: 0,
        challengeCount: 0,
        locked: false,
        lockedUntil: null,
      };
    }
    const nowMs = now().getTime();
    _pruneOlder(stats.failed, nowMs - WINDOW_24H_MS);
    _pruneOlder(stats.challenges, nowMs - WINDOW_1H_MS);
    return {
      userId,
      failedCount: stats.failed.length,
      challengeCount: stats.challenges.length,
      locked: !!(stats.lockedUntil && now() < stats.lockedUntil),
      lockedUntil: stats.lockedUntil,
    };
  }

  return {
    createChallenge,
    verifyChallenge,
    getChallengeStatus,
    requireMfa,
    unlockUser,
    getUserState,
    REASON,
    // Test seam
    _store: store,
    _userStats: userStats,
  };
}

// ─── Default speakeasy-backed verifier ──────────────────────────

function _defaultTotpVerifier(logger) {
  let speakeasy = null;
  try {
    speakeasy = require('speakeasy');
  } catch {
    /* speakeasy unavailable — stub will fail */
  }
  return async function ({ method, secret, token }) {
    if (method !== 'totp') {
      // SMS / biometric verification require their own channels; the
      // default verifier rejects (caller must inject a custom one).
      logger.warn && logger.warn(`[mfa] non-totp method '${method}' requires injected verifier`);
      return false;
    }
    if (!speakeasy || !secret || !token) return false;
    try {
      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: String(token),
        window: 1, // accept 1 step of drift in each direction (30s)
      });
    } catch {
      return false;
    }
  };
}

module.exports = {
  createMfaChallengeService,
  REASON,
  DEFAULT_TIER_2_EXPIRY_MS,
  DEFAULT_TIER_3_EXPIRY_MS,
  MAX_VERIFY_ATTEMPTS,
  // Wave 37
  DEFAULT_USER_MAX_FAILED_PER_24H,
  DEFAULT_MAX_CHALLENGES_PER_HOUR,
  DEFAULT_USER_LOCKOUT_MS,
  DEFAULT_BACKOFF_BASE_MS,
  WINDOW_24H_MS,
  WINDOW_1H_MS,
};
