'use strict';

const crypto = require('crypto');

/**
 * timingSafeCompare(a, b) — W1181 canonical constant-time string
 * comparison for secrets (API keys, HMAC signatures, OTP codes).
 *
 * Why: plain `===` short-circuits on the first differing byte,
 * leaking the matched-prefix length through response timing — an
 * attacker can recover a secret byte-by-byte. `crypto.timingSafeEqual`
 * fixes that but throws on unequal-length buffers, so this wrapper:
 *
 *   - returns false for any non-string operand (fail closed),
 *   - pre-checks byte length (length of a fixed-width digest or a
 *     server-side key is not secret) and returns false on mismatch,
 *   - wraps the comparator in try/catch so it ALWAYS returns boolean.
 *
 * Usage:
 *   const timingSafeCompare = require('../utils/timingSafeCompare');
 *   if (!timingSafeCompare(providedKey, process.env.SECRET || '')) { ... 401 }
 *
 * Drift guard: __tests__/timing-unsafe-secret-compare-wave1181.test.js
 * fails CI on any new `===`/`!==` comparison of secret-named operands
 * in routes/ + domains/ + services/ + middleware/.
 */
function timingSafeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  try {
    return crypto.timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

module.exports = timingSafeCompare;
