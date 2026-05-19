'use strict';

/**
 * qr-token.lib.js — Wave 124.
 *
 * Pure helpers to mint + verify rotating QR tokens for branch
 * check-in/out. The QR rendered on the kiosk display rotates every
 * WINDOW_SECONDS so a photographed QR can't be replayed past one
 * window. Token format:
 *
 *   v1.<branchId>.<windowEpoch>.<purpose>.<hmacShort>
 *
 *   - windowEpoch = floor(eventTimeSec / WINDOW_SECONDS)
 *   - hmac = HMAC-SHA256(secret, "${v1}|${branchId}|${windowEpoch}|${purpose}")
 *   - hmacShort = first 16 hex chars
 *
 * Verification accepts the current window AND the previous one to
 * tolerate clock skew + render-then-scan latency.
 *
 * Public API:
 *   mintQrToken({ branchId, purpose, secret, at?, windowSeconds? })
 *   verifyQrToken({ token, secret, branchId?, at?, windowSeconds?, allowPreviousWindow? })
 *
 * Returns ok:true with { branchId, purpose, windowEpoch, ageSec } on
 * success or ok:false with { reason } on failure.
 */

const crypto = require('crypto');

const DEFAULT_WINDOW_SECONDS = 30;
const VERSION = 'v1';
const PURPOSES = Object.freeze(['check-in', 'check-out']);

function _hmac(secret, payload) {
  return crypto
    .createHmac('sha256', String(secret))
    .update(String(payload))
    .digest('hex')
    .slice(0, 16);
}

function _windowEpoch(atMs, windowSeconds) {
  return Math.floor(Math.floor(atMs / 1000) / windowSeconds);
}

function mintQrToken({
  branchId,
  purpose = 'check-in',
  secret,
  at = Date.now(),
  windowSeconds = DEFAULT_WINDOW_SECONDS,
} = {}) {
  if (!branchId) throw new Error('qr-token: branchId required');
  if (!secret) throw new Error('qr-token: secret required');
  if (!PURPOSES.includes(purpose)) {
    throw new Error(`qr-token: purpose must be one of ${PURPOSES.join(',')}`);
  }
  const atMs = at instanceof Date ? at.getTime() : Number(at);
  const epoch = _windowEpoch(atMs, windowSeconds);
  const payload = `${VERSION}|${branchId}|${epoch}|${purpose}`;
  const sig = _hmac(secret, payload);
  return `${VERSION}.${branchId}.${epoch}.${purpose}.${sig}`;
}

function verifyQrToken({
  token,
  secret,
  branchId = null,
  at = Date.now(),
  windowSeconds = DEFAULT_WINDOW_SECONDS,
  allowPreviousWindow = true,
} = {}) {
  if (typeof token !== 'string' || !token) {
    return { ok: false, reason: 'TOKEN_MISSING' };
  }
  const parts = token.split('.');
  if (parts.length !== 5) {
    return { ok: false, reason: 'TOKEN_MALFORMED' };
  }
  const [ver, tokenBranch, epochStr, purpose, sig] = parts;
  if (ver !== VERSION) return { ok: false, reason: 'TOKEN_VERSION_UNSUPPORTED' };
  if (!PURPOSES.includes(purpose)) return { ok: false, reason: 'TOKEN_PURPOSE_INVALID' };
  if (branchId && String(branchId) !== tokenBranch) {
    return { ok: false, reason: 'TOKEN_BRANCH_MISMATCH' };
  }
  const tokenEpoch = Number(epochStr);
  if (!Number.isFinite(tokenEpoch)) return { ok: false, reason: 'TOKEN_EPOCH_INVALID' };
  if (!secret) return { ok: false, reason: 'TOKEN_SECRET_MISSING' };

  const atMs = at instanceof Date ? at.getTime() : Number(at);
  const currentEpoch = _windowEpoch(atMs, windowSeconds);

  const acceptableEpochs = allowPreviousWindow ? [currentEpoch, currentEpoch - 1] : [currentEpoch];
  if (!acceptableEpochs.includes(tokenEpoch)) {
    return {
      ok: false,
      reason: tokenEpoch > currentEpoch ? 'TOKEN_FROM_FUTURE' : 'TOKEN_EXPIRED',
      currentEpoch,
      tokenEpoch,
    };
  }
  const expected = _hmac(secret, `${VERSION}|${tokenBranch}|${tokenEpoch}|${purpose}`);
  // Timing-safe compare.
  if (expected.length !== sig.length) {
    return { ok: false, reason: 'TOKEN_SIGNATURE_INVALID' };
  }
  if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'))) {
    return { ok: false, reason: 'TOKEN_SIGNATURE_INVALID' };
  }
  return {
    ok: true,
    branchId: tokenBranch,
    purpose,
    windowEpoch: tokenEpoch,
    ageSec: Math.max(0, Math.floor(atMs / 1000) - tokenEpoch * windowSeconds),
  };
}

module.exports = {
  mintQrToken,
  verifyQrToken,
  DEFAULT_WINDOW_SECONDS,
  PURPOSES,
};
