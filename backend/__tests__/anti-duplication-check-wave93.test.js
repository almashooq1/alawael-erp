/**
 * anti-duplication-check-wave93.test.js — Wave 93 (G1 governance rule).
 *
 * Pins the contract of scripts/anti-duplication-check.js so a future
 * edit that accidentally weakens the detector (e.g., over-broad
 * allow-list, regex that doesn't match) is caught at PR review.
 *
 * Three guarantees:
 *   1. The detector returns CLEAN on the actual backend/ tree
 *      (the Wave-88-92 work doesn't regress).
 *   2. Each canonical PATTERN entry has the required shape + a
 *      non-empty allowedFiles list.
 *   3. Injecting a synthetic violation into a sandbox tree is caught
 *      by the detector — proving the regex + scanner actually fire.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const detector = require('../scripts/anti-duplication-check');
const { runCheck, PATTERNS, formatHuman } = detector;

describe('anti-duplication-check — registry shape (Wave 93)', () => {
  test('PATTERNS array is non-empty and frozen-ish', () => {
    expect(Array.isArray(PATTERNS)).toBe(true);
    expect(PATTERNS.length).toBeGreaterThanOrEqual(5);
  });

  test('every PATTERN entry has id + why + regex + allowedFiles', () => {
    for (const p of PATTERNS) {
      expect(typeof p.id).toBe('string');
      expect(p.id.length).toBeGreaterThan(0);
      expect(typeof p.why).toBe('string');
      expect(p.why.length).toBeGreaterThan(20); // a real explanation, not a stub
      expect(p.regex).toBeInstanceOf(RegExp);
      expect(Array.isArray(p.allowedFiles)).toBe(true);
      expect(p.allowedFiles.length).toBeGreaterThan(0);
    }
  });

  test('PATTERN ids are unique', () => {
    const ids = PATTERNS.map(p => p.id);
    const uniq = new Set(ids);
    expect(uniq.size).toBe(ids.length);
  });

  test('each allowed file path uses forward slashes (cross-platform)', () => {
    for (const p of PATTERNS) {
      for (const f of p.allowedFiles) {
        expect(f).not.toMatch(/\\/);
      }
    }
  });
});

describe('anti-duplication-check — real backend tree (Wave 93)', () => {
  test('runCheck returns clean on the current backend/ tree', () => {
    const result = runCheck();
    if (result.violations.length > 0) {
      // Print details so a regression PR sees exactly what broke

      console.error('UNEXPECTED VIOLATIONS:\n' + formatHuman(result));
    }
    expect(result.violations).toEqual([]);
    expect(result.scannedCount).toBeGreaterThan(100); // sanity — we ARE scanning something
  });
});

describe('anti-duplication-check — injected violation detection (Wave 93)', () => {
  let sandbox;
  let intelligenceDir;

  beforeEach(() => {
    sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'anti-dup-test-'));
    intelligenceDir = path.join(sandbox, 'intelligence');
    fs.mkdirSync(intelligenceDir, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(sandbox, { recursive: true, force: true });
    } catch {
      /* best-effort cleanup */
    }
  });

  test('detector catches a new file using SELF_ATTESTATION', () => {
    const file = path.join(intelligenceDir, 'rogue.service.js');
    fs.writeFileSync(file, "module.exports = { reason: 'SELF_ATTESTATION' };\n", 'utf8');
    const result = runCheck({ rootDir: sandbox });
    const v = result.violations.find(x => x.patternId === 'SELF_ATTESTATION');
    expect(v).toBeTruthy();
    expect(v.file).toBe('intelligence/rogue.service.js');
    expect(v.lineNumbers).toContain(1);
  });

  test('detector catches a new file using self_approval_forbidden snake_case', () => {
    const file = path.join(intelligenceDir, 'rogue2.service.js');
    fs.writeFileSync(file, "return { ok:false, reason: 'self_approval_forbidden' };\n", 'utf8');
    const result = runCheck({ rootDir: sandbox });
    const v = result.violations.find(x => x.patternId === 'self_approval_forbidden_snake');
    expect(v).toBeTruthy();
  });

  test('detector catches a new file declaring MFA_FRESHNESS_MIN', () => {
    const file = path.join(intelligenceDir, 'rogue3.service.js');
    fs.writeFileSync(file, 'const MFA_FRESHNESS_MIN = { 2: 20, 3: 10 };\n', 'utf8');
    const result = runCheck({ rootDir: sandbox });
    const v = result.violations.find(x => x.patternId === 'MFA_FRESHNESS_MIN');
    expect(v).toBeTruthy();
  });

  test('detector catches a new function computeHash declaration', () => {
    const file = path.join(intelligenceDir, 'rogue4.service.js');
    fs.writeFileSync(
      file,
      'function computeHash({ a, b }) { return a + b; }\nmodule.exports = { computeHash };\n',
      'utf8'
    );
    const result = runCheck({ rootDir: sandbox });
    const v = result.violations.find(x => x.patternId === 'new_hash_chain_compute');
    expect(v).toBeTruthy();
  });

  test('exit code logic: violations.length > 0 means non-zero exit', () => {
    const file = path.join(intelligenceDir, 'rogue5.service.js');
    fs.writeFileSync(file, "const x = 'SOD_SELF_APPROVAL';\n", 'utf8');
    const result = runCheck({ rootDir: sandbox });
    expect(result.violations.length).toBeGreaterThan(0);
    // The script itself does `process.exit(result.violations.length > 0 ? 1 : 0)`.
    // We assert the boolean condition that drives that exit.
    expect(result.violations.length > 0).toBe(true);
  });

  test('detector ignores files in skipped directories (_archived)', () => {
    const archiveDir = path.join(intelligenceDir, '_archived');
    fs.mkdirSync(archiveDir, { recursive: true });
    const file = path.join(archiveDir, 'old.service.js');
    fs.writeFileSync(file, "const x = 'SELF_ATTESTATION';\n", 'utf8');
    const result = runCheck({ rootDir: sandbox });
    expect(result.violations.find(v => v.file.includes('_archived'))).toBeUndefined();
  });

  test('detector returns empty violations when sandbox is clean', () => {
    const file = path.join(intelligenceDir, 'innocent.js');
    fs.writeFileSync(file, "module.exports = { hello: 'world' };\n", 'utf8');
    const result = runCheck({ rootDir: sandbox });
    expect(result.violations).toEqual([]);
  });
});

describe('anti-duplication-check — formatHuman output (Wave 93)', () => {
  test('clean result formats with ✅ banner', () => {
    const text = formatHuman({ violations: [], scannedCount: 100 });
    expect(text).toMatch(/✅ Clean/);
  });

  test('violations result lists patternId + file + lineNumbers + why', () => {
    const text = formatHuman({
      violations: [
        {
          patternId: 'TEST_PATTERN',
          why: 'Because reasons.',
          file: 'intelligence/foo.js',
          lineNumbers: [42, 88],
        },
      ],
      scannedCount: 1,
    });
    expect(text).toMatch(/❌ 1 violation/);
    expect(text).toMatch(/TEST_PATTERN/);
    expect(text).toMatch(/intelligence\/foo\.js/);
    expect(text).toMatch(/42, 88/);
    expect(text).toMatch(/Because reasons/);
  });
});
