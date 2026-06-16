'use strict';

/**
 * W1360 — `.env.example` ↔ strict-required env drift guard (ratchet-down).
 *
 * THE GAP (documented W1353, GAPS Item 7): config/validateEnv.js `strictOverrides`
 * requires 5 security-critical keys in production / CI, but backend/.env.example
 * documents only MONGODB_URI + JWT_SECRET as assignable keys — so deploying from
 * the template fails at CI=true / production on three missing keys:
 *   JWT_REFRESH_SECRET · ENCRYPTION_KEY · SESSION_SECRET
 *
 * The two-line fix (add the keys + this guard) was deferred because .env.example
 * is being edited by a parallel session (conflict avoidance). This guard ships
 * the LOCKING half NOW, using the W1355 / W325c ratchet-down pattern so it is
 * purely additive (a test file — it does NOT touch the contended .env.example):
 *
 *   1. CONTAINMENT — every strict-required key that is absent from .env.example
 *      MUST be in KNOWN_MISSING_BASELINE. A NEW strict key added to validateEnv
 *      without a matching .env.example entry (and not baselined) fails CI → the
 *      gap can never silently GROW.
 *   2. RATCHET-DOWN — every baselined key that IS now present in .env.example
 *      fails CI, forcing its removal from the baseline in the same commit that
 *      closes the gap → the moment the parallel session adds the 3 keys, this
 *      guard turns red until the baseline is emptied, guaranteeing closure.
 *   3. SOURCE-OF-TRUTH — the guard reads STRICT_REQUIRED_KEYS from
 *      validateEnv.js (not a hand-copied list), so it can never drift from the
 *      schema it documents.
 *
 * Pure-static: reads two files as text, no DB, no boot. <100ms.
 *
 * Run: cd backend && npx jest --config=jest.config.js \
 *   __tests__/env-example-strict-keys-drift-wave1360.test.js
 */

const fs = require('fs');
const path = require('path');

const { STRICT_REQUIRED_KEYS } = require('../config/validateEnv');

const ENV_EXAMPLE = path.join(__dirname, '..', '.env.example');

/**
 * Strict-required keys NOT yet documented as assignable in .env.example.
 * BASELINE (2026-06-16): the 3 keys the W1353 threat-modeling pass surfaced.
 * Ratchet DOWN only — never add to this set to silence a new gap; instead add
 * the key to .env.example. Remove an entry here in the SAME commit that adds it
 * to .env.example.
 */
const KNOWN_MISSING_BASELINE = new Set(['JWT_REFRESH_SECRET', 'ENCRYPTION_KEY', 'SESSION_SECRET']);

/**
 * Collect the assignable keys from a .env file's text — lines of the shape
 * `KEY=...` (ignoring `# comment` lines and blanks). Mirrors how dotenv loads.
 * @param {string} text
 * @returns {Set<string>}
 */
function assignableKeys(text) {
  const keys = new Set();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const m = /^([A-Z0-9_]+)\s*=/.exec(line);
    if (m) keys.add(m[1]);
  }
  return keys;
}

describe('W1360 — .env.example covers strict-required env keys (ratchet-down)', () => {
  const envText = fs.readFileSync(ENV_EXAMPLE, 'utf8');
  const documented = assignableKeys(envText);

  test('STRICT_REQUIRED_KEYS is sourced from validateEnv (non-empty list of strings)', () => {
    expect(Array.isArray(STRICT_REQUIRED_KEYS)).toBe(true);
    expect(STRICT_REQUIRED_KEYS.length).toBeGreaterThan(0);
    for (const k of STRICT_REQUIRED_KEYS) expect(typeof k).toBe('string');
  });

  test('containment: any strict key absent from .env.example is in the known baseline', () => {
    const undocumented = STRICT_REQUIRED_KEYS.filter(k => !documented.has(k));
    const unexpected = undocumented.filter(k => !KNOWN_MISSING_BASELINE.has(k));
    expect(unexpected).toEqual([]);
  });

  test('ratchet-down: every baselined key is STILL genuinely missing (else remove it)', () => {
    const baselinedButPresent = [...KNOWN_MISSING_BASELINE].filter(k => documented.has(k));
    expect(baselinedButPresent).toEqual([]);
  });

  test('baseline only names real strict-required keys (no typos / stale entries)', () => {
    const strictSet = new Set(STRICT_REQUIRED_KEYS);
    const notStrict = [...KNOWN_MISSING_BASELINE].filter(k => !strictSet.has(k));
    expect(notStrict).toEqual([]);
  });

  test('the two already-documented strict keys stay documented (no regression)', () => {
    // MONGODB_URI + JWT_SECRET are present today; lock them so a future edit
    // that drops them is caught (they are NOT in the missing baseline).
    expect(documented.has('MONGODB_URI')).toBe(true);
    expect(documented.has('JWT_SECRET')).toBe(true);
    expect(KNOWN_MISSING_BASELINE.has('MONGODB_URI')).toBe(false);
    expect(KNOWN_MISSING_BASELINE.has('JWT_SECRET')).toBe(false);
  });
});
