/**
 * W505 — close PDPL salt de-anonymization risk via JWT_SECRET literal
 * fallback.
 *
 * Pattern found in 4 production source files:
 *
 *   routes/nafath.routes.js          : 'pdpl-salt'
 *   services/nafathSigningService.js : 'pdpl-salt'
 *   services/adapterAuditLogger.js   : 'alawael-pdpl-salt'
 *   services/yakeenVerificationService.js : 'pdpl-yakeen-salt'
 *
 * Each computed:
 *
 *   sha256( <IP-or-NID> + ':' + (process.env.JWT_SECRET || '<literal>') )
 *
 * for use in audit logs (PDPL Article 6 requires irreversibility on
 * special-category identifiers — IP / NID / device fingerprint).
 *
 * Risk in production:
 *
 *   - JWT_SECRET unset (e.g. ENV mis-deploy, container drift, secrets-
 *     manager outage) → fallback literal is used.
 *   - The literal is hardcoded in source on GitHub (public for forks).
 *   - Anyone with a leaked audit-log copy (insider, breach blast-
 *     radius, log-aggregator misconfiguration, S3 backup exposure)
 *     can sha256(candidate + ':' + literal) and binary-compare
 *     against every hash, recovering plaintext IPs or NIDs.
 *   - IPv4 = 2^32 candidates (a few seconds on a GPU).
 *   - Saudi NID = 10-digit, ~10B candidates (still feasible against
 *     a specific target — e.g. testing whether a known NID appears
 *     in the log).
 *
 * Fix: centralise salt resolution in backend/utils/pdplSalt.js
 *   - production AND JWT_SECRET unset → THROW at module-load time
 *     (fail-fast — surfaces during boot, not in production traffic).
 *   - test → deterministic per-label fallback (reproducible tests).
 *   - dev → per-label fallback + one-time console.warn.
 *
 * Drift guard: this test scans backend/ and asserts NO source file
 * (outside the helper itself + tests + archived + node_modules)
 * matches `process.env.JWT_SECRET || '<anything>'`. Adding the
 * pattern back to a new file fails CI.
 *
 * Allow-list:
 *   - backend/utils/pdplSalt.js        : the canonical helper
 *   - backend/middleware/securityHardening.js : validator-only
 *     (uses `|| ''` for a length check, never hashes with the empty
 *     string — see test 'allow-list contract' below)
 *   - backend/seeds/**                 : seed data (offline use)
 *   - backend/scripts/dsar-hash.js     : CLI tool (offline analysis)
 *   - backend/services/sso.service.js  : already throws on unset
 *     (uses a 2-line pattern that doesn't match this regex anyway)
 *   - backend/routes/visitor-auth.routes.js : already throws on
 *     unset (W457-style guard; uses `process.env.JWT_SECRET ||
 *     process.env.AUTH_SECRET`, NOT a literal fallback — passes
 *     this regex)
 *
 * Allow-listed files (those known to legitimately reference the
 * pattern in test/seed/CLI/validator capacity) are listed in
 * KNOWN_NON_PRODUCTION_USES below.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BACKEND = path.join(__dirname, '..');

// Files allowed to retain `process.env.JWT_SECRET || '<literal>'`
// patterns (they don't hash PII with the fallback — they're test
// fixtures, validators, or CLI tools). Each entry includes the
// reason so future readers know why it's allowed.
const KNOWN_NON_PRODUCTION_USES = new Set([
  // Test environment bootstrap — sets JWT_SECRET if absent so the
  // suite doesn't crash on module-load when JWT_SECRET-using modules
  // (like sso.service.js) construct.
  'jest.env.js',
  // CLI tool for offline DSAR (Data Subject Access Request) hashing.
  // Operator runs locally with a known JWT_SECRET; the fallback is
  // for casual exploration only.
  'scripts/dsar-hash.js',
  // Seed file — runs once at install, not at request time.
  'seeds/demo-showcase.seed.js',
  // Validator-only: uses `|| ''` to length-check JWT_SECRET, never
  // hashes anything with the empty string.
  'middleware/securityHardening.js',
]);

function walkJs(root, results = []) {
  if (!fs.existsSync(root)) return results;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (
      entry.name === 'node_modules' ||
      entry.name === '_archived' ||
      entry.name === '.jest-cache' ||
      entry.name === '__tests__' ||
      entry.name === 'tests'
    ) {
      continue;
    }
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      walkJs(full, results);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      results.push(full);
    }
  }
  return results;
}

describe('W505 — no JWT_SECRET-literal fallback for PDPL salts', () => {
  const allFiles = walkJs(BACKEND);

  const offenders = [];
  // Match `process.env.JWT_SECRET || '<some literal>'` (any string
  // literal as the fallback). The `\s*` tolerates whitespace.
  // We intentionally do NOT match `... || process.env.<other>` (that
  // chains to ANOTHER secret, which is the W457 visitor-auth pattern
  // and is handled separately by visitor-auth's own guards).
  const re = /process\.env\.JWT_SECRET\s*\|\|\s*['"][^'"]+['"]/;

  for (const file of allFiles) {
    const rel = path.relative(BACKEND, file).replace(/\\/g, '/');
    if (KNOWN_NON_PRODUCTION_USES.has(rel)) continue;
    // The canonical helper documents the pre-W505 anti-pattern in its
    // header doc comment; that's intentional reference and must not
    // count as drift.
    if (rel === 'utils/pdplSalt.js') continue;
    const src = fs.readFileSync(file, 'utf8');
    // Strip line + block comments so doc-comment examples don't false-positive.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map(l => l.replace(/\/\/.*$/, ''))
      .join('\n');
    if (re.test(code)) offenders.push(rel);
  }

  test('no source file outside the allow-list uses `process.env.JWT_SECRET || "<literal>"`', () => {
    expect(offenders).toEqual([]);
  });

  test('4 W505-affected files now use getPdplSalt() helper', () => {
    const w505Files = [
      'routes/nafath.routes.js',
      'services/nafathSigningService.js',
      'services/adapterAuditLogger.js',
      'services/yakeenVerificationService.js',
    ];
    for (const rel of w505Files) {
      const full = path.join(BACKEND, rel);
      expect(fs.existsSync(full)).toBe(true);
      const src = fs.readFileSync(full, 'utf8');
      // helper is required + invoked
      expect(src).toMatch(/require\(['"][^'"]*utils\/pdplSalt['"]\)/);
      expect(src).toMatch(/getPdplSalt\(/);
      // no literal fallback remains
      expect(src).not.toMatch(re);
    }
  });

  test('helper itself fail-fasts in production', () => {
    const helperPath = path.join(BACKEND, 'utils', 'pdplSalt.js');
    expect(fs.existsSync(helperPath)).toBe(true);
    const src = fs.readFileSync(helperPath, 'utf8');
    // production branch must throw
    expect(src).toMatch(/NODE_ENV\s*===\s*['"]production['"]/);
    expect(src).toMatch(/throw new Error\(/);
    // test branch must be deterministic
    expect(src).toMatch(/NODE_ENV\s*===\s*['"]test['"]/);
  });

  test('helper produces stable salt across calls', () => {
    const { getPdplSalt } = require('../utils/pdplSalt');
    // Two calls with the same label must produce the same value —
    // critical because callers cache the salt in a module-load
    // constant; if the helper returned different values per call,
    // hashes from different code paths wouldn't compare equal.
    const a = getPdplSalt('foo');
    const b = getPdplSalt('foo');
    expect(a).toBe(b);
    expect(typeof a).toBe('string');
    expect(a.length).toBeGreaterThan(0);
  });

  test('helper returns the env secret verbatim when set (label irrelevant in this path)', () => {
    // jest.env.js sets JWT_SECRET. In that path the helper ignores
    // the label entirely — the env secret IS the salt. Label only
    // differentiates the dev/test fallback when JWT_SECRET is unset.
    const { getPdplSalt } = require('../utils/pdplSalt');
    if (process.env.JWT_SECRET) {
      expect(getPdplSalt('any-label')).toBe(process.env.JWT_SECRET);
    }
  });

  test('allow-list contract — securityHardening.js still only validates, never hashes', () => {
    const hardenPath = path.join(BACKEND, 'middleware', 'securityHardening.js');
    if (!fs.existsSync(hardenPath)) return; // file optional
    const src = fs.readFileSync(hardenPath, 'utf8');
    // jwtSecret variable exists for length-check only — no crypto.createHash with it.
    const hasCrypto = /createHash\([^)]*\)\.update\([^)]*jwtSecret/.test(src);
    expect(hasCrypto).toBe(false);
  });
});
