'use strict';

/**
 * mfa-challenge.routes.js — Wave 36.
 *
 * Step-up MFA HTTP surface for the Authorization Constitution
 * (Wave 31 §12). The 5-layer decide() denies privileged actions when
 * `actor.mfaLevel` falls below the action's required tier OR when the
 * last assertion is stale. Without these endpoints the system can
 * deny but cannot ASK — that's the gap this file closes.
 *
 * Endpoints (all behind authenticate; router mounted at /api/v1/mfa):
 *
 *   POST /challenge         → create a step-up challenge
 *                             body: { requiredTier, method? }
 *                             200 { challengeId, requiredTier, method, expiresAt, instructions }
 *
 *   POST /:id/verify        → submit OTP/biometric token
 *                             body: { token }
 *                             200 { sessionUpgrade: { mfaLevel, mfaAssertedAt } }
 *                             401 OTP_INVALID (attemptsRemaining) / CHALLENGE_LOCKED
 *                             410 CHALLENGE_EXPIRED
 *                             404 CHALLENGE_NOT_FOUND
 *
 *   GET  /:id               → poll challenge status (verified? expired? locked?)
 *
 * Status code map mirrors the insights/alerts pattern:
 *
 *   service.ok === true              → 200
 *   USER_REQUIRED                    → 401  (no actor on request)
 *   INVALID_TIER / INVALID_PAYLOAD   → 400
 *   CHALLENGE_NOT_FOUND              → 404
 *   CHALLENGE_EXPIRED                → 410  (gone — re-create one)
 *   CHALLENGE_ALREADY_VERIFIED       → 409
 *   CHALLENGE_LOCKED / OTP_INVALID   → 401
 *   USER_NOT_ENROLLED                → 412  (precondition failed — go enroll first)
 *
 * Authentication: router is mounted behind `authenticate` in app.js,
 * so `req.user.id` is always present here.
 */

const express = require('express');
const safeError = require('../utils/safeError');

const REASON_TO_STATUS = Object.freeze({
  USER_REQUIRED: 401,
  USER_NOT_ENROLLED: 412,
  INVALID_TIER: 400,
  INVALID_PAYLOAD: 400,
  CHALLENGE_NOT_FOUND: 404,
  CHALLENGE_EXPIRED: 410,
  CHALLENGE_ALREADY_VERIFIED: 409,
  CHALLENGE_LOCKED: 401,
  OTP_INVALID: 401,
  // Wave 37 — brute-force protections
  USER_TEMP_LOCKED: 429,
  CHALLENGE_RATE_LIMITED: 429,
  VERIFY_TOO_SOON: 429,
});

function actorFrom(req) {
  return {
    userId: req.user?.id || req.user?._id || null,
    role: req.user?.role || req.user?.roleCode || null,
    ip: req.ip,
  };
}

function respond(res, result) {
  if (result && result.ok) {
    return res.json({ success: true, data: result });
  }
  const status = (result && REASON_TO_STATUS[result.reason]) || 400;
  const body = {
    success: false,
    message: result?.reason || 'MFA_REJECTED',
    reason: result?.reason,
  };
  if (typeof result?.attemptsRemaining === 'number') {
    body.attemptsRemaining = result.attemptsRemaining;
  }
  if (typeof result?.attemptCount === 'number') {
    body.attemptCount = result.attemptCount;
  }
  // Wave 37 — surface retry hints + Retry-After header on rate-limit denials.
  if (typeof result?.retryAfterMs === 'number') {
    body.retryAfterMs = result.retryAfterMs;
    res.set('Retry-After', String(Math.max(1, Math.ceil(result.retryAfterMs / 1000))));
  }
  if (result?.lockedUntil) {
    body.lockedUntil = result.lockedUntil;
  }
  return res.status(status).json(body);
}

/**
 * @param {object} opts
 *   - service:  createMfaChallengeService() output (required)
 *   - logger:   console-compatible
 */
function createMfaChallengeRouter({ service, logger = console } = {}) {
  if (!service || typeof service.createChallenge !== 'function') {
    throw new Error('mfa-challenge.routes: service is required');
  }
  void logger;

  const router = express.Router();

  // POST /challenge — issue a step-up challenge for the authenticated user
  router.post('/challenge', async (req, res) => {
    try {
      const userId = req.user?.id || req.user?._id || null;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'USER_REQUIRED',
          reason: 'USER_REQUIRED',
        });
      }

      const body = req.body || {};
      const requiredTier = Number(body.requiredTier);
      if (![2, 3].includes(requiredTier)) {
        return res.status(400).json({
          success: false,
          message: 'INVALID_TIER',
          reason: 'INVALID_TIER',
        });
      }

      const method = typeof body.method === 'string' ? body.method : 'totp';
      const result = await service.createChallenge({
        userId,
        requiredTier,
        method,
        actor: actorFrom(req),
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'mfa.challenge.create');
    }
  });

  // POST /:id/verify — submit OTP/biometric token
  router.post('/:id/verify', async (req, res) => {
    try {
      const challengeId = req.params.id;
      const token = req.body?.token;
      if (!challengeId || typeof token !== 'string' || !token.trim()) {
        return res.status(400).json({
          success: false,
          message: 'INVALID_PAYLOAD',
          reason: 'INVALID_PAYLOAD',
        });
      }
      const result = await service.verifyChallenge({
        challengeId,
        token: token.trim(),
        actor: actorFrom(req),
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'mfa.challenge.verify');
    }
  });

  // GET /:id — poll challenge status
  router.get('/:id', (req, res) => {
    try {
      const result = service.getChallengeStatus(req.params.id);
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'mfa.challenge.status');
    }
  });

  return router;
}

module.exports = createMfaChallengeRouter;
module.exports.createMfaChallengeRouter = createMfaChallengeRouter;
