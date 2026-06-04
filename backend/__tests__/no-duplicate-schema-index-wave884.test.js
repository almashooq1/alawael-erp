'use strict';

/**
 * no-duplicate-schema-index-wave884.test.js — W884.
 *
 * Drift guard CLI contract for Mongoose duplicate schema.index() warnings.
 * Spawns check-duplicate-schema-index.js in a fresh Node process (avoids the
 * jest.setup.js mongoose mock which prevents real schema compilation).
 *
 * Baseline MUST stay empty (ratchet-down). Incident: 2026-06-04 cleared 25 dupes.
 */

const { execFileSync } = require('child_process');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'check-duplicate-schema-index.js');

/** @type {Set<string>} "ModelName :: [[k,dir],...]" */
const KNOWN_DUPLICATE_INDEXES = new Set([
  // Cleared 2026-06-04 — 25 entries removed after index cleanup session.
]);

function runChecker() {
  const raw = execFileSync(process.execPath, [SCRIPT, '--json'], {
    encoding: 'utf8',
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, NODE_ENV: 'test' },
  });
  return JSON.parse(raw);
}

describe('W884 no-duplicate-schema-index drift guard', () => {
  test('check-duplicate-schema-index.js exits 0 (no duplicates)', () => {
    expect(() => {
      execFileSync(process.execPath, [SCRIPT], {
        encoding: 'utf8',
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, NODE_ENV: 'test' },
      });
    }).not.toThrow();
  });

  test('no NEW duplicates beyond baseline', () => {
    const { duplicates } = runChecker();
    const keys = duplicates.map(d => `${d.model} :: ${d.index}`);
    const novel = keys.filter(k => !KNOWN_DUPLICATE_INDEXES.has(k));
    expect(novel).toEqual([]);
  });

  test('no STALE baseline entries', () => {
    const { duplicates } = runChecker();
    const current = new Set(duplicates.map(d => `${d.model} :: ${d.index}`));
    const stale = [...KNOWN_DUPLICATE_INDEXES].filter(k => !current.has(k));
    expect(stale).toEqual([]);
  });
});
