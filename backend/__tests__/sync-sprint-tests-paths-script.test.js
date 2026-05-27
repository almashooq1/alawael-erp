'use strict';

/**
 * sync-sprint-tests-paths-script.test.js — exit-code + helper contract
 * for scripts/sync-sprint-tests-paths.js (Cycle 11 gate 1).
 *
 * Why: gate 1's most-likely-to-silently-break logic is the regex-escape
 * in findPartiallyMissing — if any of the special-char set changes
 * (someone adds a sprint entry with a `(` or `+`), the regex either
 * builds wrong or matches too much/little, silently weakening detection.
 *
 * Pure-helper + CLI exit-code contract. No real Mongo, no real CI.
 */

const { spawnSync } = require('child_process');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'sync-sprint-tests-paths.js');
const { findPartiallyMissing, appendBeforeAnchor } = require('../scripts/sync-sprint-tests-paths');

describe('sync-sprint-tests-paths — findPartiallyMissing (pure)', () => {
  it('returns [] when every entry has 2+ quoted occurrences', () => {
    const yml = `
      paths:
        - 'backend/__tests__/foo.test.js'
        - 'backend/__tests__/bar.test.js'
      pull_request:
        - 'backend/__tests__/foo.test.js'
        - 'backend/__tests__/bar.test.js'
    `;
    expect(
      findPartiallyMissing(yml, ['backend/__tests__/foo.test.js', 'backend/__tests__/bar.test.js'])
    ).toEqual([]);
  });

  it('returns entry when it appears 0 times', () => {
    const yml = `paths: [- 'backend/__tests__/other.test.js']`;
    expect(findPartiallyMissing(yml, ['backend/__tests__/missing.test.js'])).toEqual([
      'backend/__tests__/missing.test.js',
    ]);
  });

  it('returns entry when it appears only 1 time (partial drift — most common bug)', () => {
    // Real bug class: parallel agent adds entry to push block but
    // forgets the pull_request block. Caught W412 + W413 + W121 + W123
    // this session.
    const yml = `
      paths:
        - 'backend/__tests__/partial.test.js'
      pull_request:
        - 'backend/__tests__/other.test.js'
    `;
    expect(findPartiallyMissing(yml, ['backend/__tests__/partial.test.js'])).toEqual([
      'backend/__tests__/partial.test.js',
    ]);
  });

  it('handles entries with regex special chars (the silently-weakened class)', () => {
    // If the regex escape breaks, an entry like `foo[bar].test.js` would
    // build an invalid regex or match wrong. Test the most dangerous chars.
    const yml = `
      paths:
        - 'backend/__tests__/foo[bar].test.js'
        - 'backend/__tests__/foo+plus.test.js'
        - 'backend/__tests__/foo(paren).test.js'
      pull_request:
        - 'backend/__tests__/foo[bar].test.js'
        - 'backend/__tests__/foo+plus.test.js'
        - 'backend/__tests__/foo(paren).test.js'
    `;
    expect(
      findPartiallyMissing(yml, [
        'backend/__tests__/foo[bar].test.js',
        'backend/__tests__/foo+plus.test.js',
        'backend/__tests__/foo(paren).test.js',
      ])
    ).toEqual([]);
  });

  it('matches both single AND double quoted entries in yml', () => {
    const yml = `
      - "backend/__tests__/dquoted.test.js"
      - 'backend/__tests__/squoted.test.js'
      - "backend/__tests__/dquoted.test.js"
      - 'backend/__tests__/squoted.test.js'
    `;
    expect(
      findPartiallyMissing(yml, [
        'backend/__tests__/dquoted.test.js',
        'backend/__tests__/squoted.test.js',
      ])
    ).toEqual([]);
  });

  it('does NOT false-match a partial path (foo vs foo-extended)', () => {
    // yml has foo-extended only; querying for `foo` should NOT match.
    // The quotes around the regex prevent partial matches.
    const yml = `
      - 'backend/__tests__/foo-extended.test.js'
      - 'backend/__tests__/foo-extended.test.js'
    `;
    expect(findPartiallyMissing(yml, ['backend/__tests__/foo.test.js'])).toEqual([
      'backend/__tests__/foo.test.js',
    ]);
  });
});

describe('sync-sprint-tests-paths — appendBeforeAnchor (pure)', () => {
  it('inserts items as `      - X` lines before the anchor block', () => {
    const yml = `prelude\n      - 'backend/package.json'\n      - '.github/workflows/sprint-tests.yml'\n  pull_request:\nepilogue`;
    const anchor = `      - 'backend/package.json'\n      - '.github/workflows/sprint-tests.yml'\n  pull_request:`;
    const out = appendBeforeAnchor(yml, anchor, [
      'backend/__tests__/new1.test.js',
      'backend/__tests__/new2.test.js',
    ]);
    expect(out).toContain("      - 'backend/__tests__/new1.test.js'");
    expect(out).toContain("      - 'backend/__tests__/new2.test.js'");
    expect(out).toContain('# Auto-synced from sprint-tests.txt');
    expect(out.indexOf('new1.test.js')).toBeLessThan(out.indexOf('package.json'));
  });
});

describe('sync-sprint-tests-paths — CLI exit-code contract', () => {
  it('exits 0 with success message when yml is in sync (--check mode)', () => {
    const r = spawnSync('node', [SCRIPT, '--check'], { encoding: 'utf8', timeout: 15000 });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/sprint-tests\.yml is in sync/);
  });

  it('exits 0 with same message in default (auto-fix) mode when no drift', () => {
    const r = spawnSync('node', [SCRIPT], { encoding: 'utf8', timeout: 15000 });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/sprint-tests\.yml is in sync/);
  });
});
