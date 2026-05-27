'use strict';

/**
 * scan-route-files-script.test.js — exit-code + filter contract for
 * scripts/scan-route-files.js (Cycle 11 gate 2).
 *
 * Why: gate 2 catches TDZ-class bugs by require()'ing every route file.
 * Its most-likely-to-silently-break piece is the IGNORED_ERROR_PATTERNS
 * filter — if a pattern is over-broad (e.g. `/.* /`), real TDZ errors
 * get filtered as "known class" and the gate goes silent. If a pattern
 * is removed, mongoose model-overwrite noise floods the output.
 *
 * This locks the filter behavior: only the 4 known false-positive
 * classes should be ignored. Anything else (especially TDZ patterns
 * like `Cannot access 'X' before initialization`) must NOT be ignored.
 */

const { spawnSync } = require('child_process');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'scan-route-files.js');
const { shouldIgnore, IGNORED_ERROR_PATTERNS } = require('../scripts/scan-route-files');

describe('scan-route-files — shouldIgnore (pure)', () => {
  it('IGNORES mongoose "Cannot overwrite X model once compiled"', () => {
    expect(shouldIgnore('Cannot overwrite `Beneficiary` model once compiled.')).toBe(true);
  });

  it('IGNORES OverwriteModelError class', () => {
    expect(shouldIgnore('OverwriteModelError: ...')).toBe(true);
  });

  it('IGNORES JWT_SECRET env-required', () => {
    expect(shouldIgnore('JWT_SECRET must be configured for production')).toBe(true);
  });

  it('IGNORES generic UPPER_SNAKE environment variable errors', () => {
    expect(shouldIgnore('TRANSPORT_TRACKING_SECRET environment variable is required')).toBe(true);
    expect(shouldIgnore('STRIPE_API_KEY environment variable not set')).toBe(true);
  });

  it('does NOT ignore TDZ-class errors (the W441 bug this gate catches)', () => {
    // These are the actual TDZ messages Node emits — gate must catch them.
    expect(shouldIgnore("Cannot access 'bodyScopedBeneficiaryGuard' before initialization")).toBe(false);
    expect(shouldIgnore('ReferenceError: Cannot access ... before initialization')).toBe(false);
  });

  it('does NOT ignore "MODE is not defined" (parallel-agent W414 class)', () => {
    // The CCTV W414 fix moment caught this pattern in pre-push.
    expect(shouldIgnore('MODE is not defined')).toBe(false);
  });

  it('does NOT ignore generic require failures', () => {
    expect(shouldIgnore("Cannot find module '../missing-dep'")).toBe(false);
    expect(shouldIgnore('SyntaxError: Unexpected token }')).toBe(false);
    expect(shouldIgnore('TypeError: Object(...) is not a function')).toBe(false);
  });
});

describe('scan-route-files — IGNORED_ERROR_PATTERNS structure', () => {
  it('contains exactly 4 patterns (the known false-positive classes)', () => {
    expect(IGNORED_ERROR_PATTERNS).toHaveLength(4);
  });

  it('every pattern is a RegExp instance', () => {
    for (const p of IGNORED_ERROR_PATTERNS) {
      expect(p).toBeInstanceOf(RegExp);
    }
  });

  it('no pattern is dangerously broad (.* alone, or /./)', () => {
    for (const p of IGNORED_ERROR_PATTERNS) {
      expect(p.source).not.toBe('.*');
      expect(p.source).not.toBe('.');
      expect(p.source.length).toBeGreaterThanOrEqual(5);
    }
  });
});

describe('scan-route-files — CLI exit-code contract', () => {
  it('exits 0 against the real backend/routes (all must load cleanly)', () => {
    const r = spawnSync('node', [SCRIPT], { encoding: 'utf8', timeout: 60000 });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/All load cleanly/);
  });

  it('--json mode prints valid JSON with scanned + ok + broken fields', () => {
    const r = spawnSync('node', [SCRIPT, '--json'], { encoding: 'utf8', timeout: 60000 });
    expect(r.status).toBe(0);
    // Route module requires emit warning lines to stdout (env fallbacks,
    // seeders, etc.) BEFORE the script's own JSON block. Extract the
    // last `{...}` JSON object from stdout.
    const match = r.stdout.match(/\{[\s\S]*"scanned"[\s\S]*\}\s*$/);
    expect(match).not.toBeNull();
    const parsed = JSON.parse(match[0]);
    expect(typeof parsed.scanned).toBe('number');
    expect(parsed.scanned).toBeGreaterThan(100);
    expect(parsed.ok).toBe(parsed.scanned);
    expect(parsed.broken).toEqual([]);
  });
});
