/**
 * wave-tests-in-sprint.test.js — drift guard.
 *
 * Fires when a `__tests__/*-waveNN.test.js` file lands but isn't added
 * to the `test:sprint` npm script. Direct response to the 2026-05-19
 * discovery that 11 such files had been silently excluded from CI for
 * an unknown stretch — they all failed with "X is not a constructor"
 * because they lacked `jest.unmock('mongoose')`, but no one knew because
 * `test:sprint` runs a curated list and doesn't scan __tests__/*.
 *
 * Without this guard, any new wave-NN test added without updating the
 * sprint enumeration repeats the same silent-failure class. With it,
 * the sprint stays comprehensive as the wave catalog grows.
 *
 * To allow-list a wave file that intentionally should NOT be in sprint
 * (e.g. very slow, requires external infra), add it to ALLOWLIST below
 * with a one-line reason.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BACKEND = path.resolve(__dirname, '..');
const TESTS_DIR = path.join(BACKEND, '__tests__');

// Wave files explicitly excluded from test:sprint enumeration. Empty
// today — every wave-NN file under __tests__/ must be in sprint.
const ALLOWLIST = new Set([]);

function listSprintTestFiles() {
  // W278d (2026-05-23) — single source of truth moved from inline
  // package.json string to backend/sprint-tests.txt. Read here.
  const raw = fs.readFileSync(path.join(BACKEND, 'sprint-tests.txt'), 'utf8');
  return new Set(
    raw
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'))
  );
}

// Files that match the wave-NN naming convention but don't need to be
// in sprint (e.g. they're auto-passing schema sanity tests that work
// with the global mongoose mock and don't add CI signal). Empty today.
const ALLOWLIST_NO_UNMOCK = new Set([]);

function discoverWaveFilesWithUnmock() {
  // Critical signal: a wave file that calls jest.unmock('mongoose')
  // needs the REAL Mongoose runtime, and must therefore be in sprint
  // so CI verifies it on every PR. Files WITHOUT unmock pass under
  // the global mock and don't carry the same silent-failure risk.
  return fs
    .readdirSync(TESTS_DIR)
    .filter(f => /-wave\d+.*\.test\.js$/.test(f))
    .filter(name => {
      const src = fs.readFileSync(path.join(TESTS_DIR, name), 'utf8');
      // Strip comments so unmock inside JSDoc doesn't false-match.
      const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      return /jest\.unmock\s*\(\s*['"]mongoose['"]\s*\)/.test(stripped);
    })
    .sort();
}

describe('every __tests__/*-waveNN.test.js file that unmocks mongoose is in test:sprint', () => {
  const sprintFiles = listSprintTestFiles();
  const waveFiles = discoverWaveFilesWithUnmock();

  it('discovers at least 1 wave file with jest.unmock(mongoose) (sanity)', () => {
    expect(waveFiles.length).toBeGreaterThan(0);
  });

  it.each(waveFiles)('%s is enumerated in scripts.test:sprint (or allow-listed)', name => {
    if (ALLOWLIST.has(name) || ALLOWLIST_NO_UNMOCK.has(name)) return;
    const sprintKey = `__tests__/${name}`;
    if (!sprintFiles.has(sprintKey)) {
      throw new Error(
        `__tests__/${name} calls jest.unmock('mongoose') (needs real Mongoose) but is\n` +
          `not enumerated in backend/sprint-tests.txt. Without sprint inclusion, CI never\n` +
          `runs it — repeating the 2026-05-19 silent-failure pattern (415 tests dark for\n` +
          `an unknown stretch). Fix: append the path to backend/sprint-tests.txt.`
      );
    }
    expect(sprintFiles.has(sprintKey)).toBe(true);
  });
});
