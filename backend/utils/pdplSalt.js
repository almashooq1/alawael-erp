'use strict';

/**
 * pdplSalt.js — single source of truth for PDPL hash salts.
 *
 * Why this exists:
 *
 *   PDPL Article 6 special-category data (biometric / national ID /
 *   IP / device fingerprint) MUST be hashed irreversibly before
 *   landing in audit logs. The hashing primitive itself (sha256) is
 *   public, so irreversibility depends entirely on the secrecy of
 *   the salt.
 *
 *   Pre-W505 the codebase had four call-sites resolving the salt as
 *   `process.env.JWT_SECRET || 'pdpl-salt'` (or sibling literals
 *   'alawael-pdpl-salt' / 'pdpl-yakeen-salt'). If JWT_SECRET is
 *   accidentally unset in production:
 *
 *     - the fallback literal is hardcoded in source on GitHub,
 *     - an attacker (insider, leaked log copy, breach blast-radius)
 *       knows the literal,
 *     - they can brute-force the 4-billion IPv4 space or the
 *       10-billion Saudi NID space against any hash from the leak,
 *     - giving them the underlying IP / NID in plaintext.
 *
 *   This breaks the irreversibility requirement and turns a hashed
 *   log into a plaintext one.
 *
 * Contract:
 *
 *   getPdplSalt(label):
 *     - production AND JWT_SECRET unset → throws (fail-fast at
 *       module-load time — the call-sites resolve their SALT once
 *       at require-time, so this surfaces during boot, not later).
 *     - test → returns deterministic 'pdpl-test-<label>' (so
 *       hashes are reproducible across the test suite).
 *     - dev → returns 'pdpl-dev-<label>' and emits a one-time
 *       console.warn so the operator can't pretend they didn't
 *       see it.
 *     - any env with JWT_SECRET set → returns the secret verbatim.
 *
 *   `label` exists ONLY to differentiate per-module fallbacks in
 *   dev/test, so a developer running multiple services locally
 *   doesn't get colliding hashes across modules. In production the
 *   label is irrelevant — JWT_SECRET is the salt, period.
 *
 * Migration record:
 *
 *   W505 (2026-05-27) replaced four call-sites:
 *     - routes/nafath.routes.js (hashIp)
 *     - services/nafathSigningService.js (_hashIp)
 *     - services/adapterAuditLogger.js (hashString)
 *     - services/yakeenVerificationService.js (SALT)
 *
 *   Drift guard: __tests__/pdpl-salt-no-literal-fallback-wave505.test.js
 *   asserts that NO source file under backend/ matches
 *   `process.env.JWT_SECRET || '...'` patterns anymore (this file
 *   itself is the sole legal escape via getPdplSalt).
 */

const warnedLabels = new Set();

function getPdplSalt(label = 'default') {
  const v = process.env.JWT_SECRET;
  if (v) return v;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET is required in production for PDPL hash salt — refusing to start with a known-literal fallback (de-anonymization risk on audit logs)'
    );
  }

  if (process.env.NODE_ENV === 'test') {
    return 'pdpl-test-' + label;
  }

  if (!warnedLabels.has(label)) {
    warnedLabels.add(label);

    console.warn(
      '[pdplSalt] JWT_SECRET unset for label "' +
        label +
        '" — using dev fallback. PDPL hashes will be de-anonymizable. Do NOT deploy.'
    );
  }
  return 'pdpl-dev-' + label;
}

module.exports = { getPdplSalt };
