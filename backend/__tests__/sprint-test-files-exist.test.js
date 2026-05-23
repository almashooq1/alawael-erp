/**
 * sprint-test-files-exist.test.js — every test file referenced in
 * `test:sprint` and `test:ops-subsystems` scripts actually exists.
 *
 * Problem: both scripts use `--passWithNoTests`, which is a kindness
 * for incremental adoption but becomes a trap. If someone misspells a
 * file name (adapter-rate-limier.test.js) or moves a file out of the
 * directory, jest runs 0 tests for that entry and reports "passed".
 * The test gate silently weakens.
 *
 * This file locks in the invariant: every __tests__/X.test.js name
 * listed in the two scripts exists on disk, in that exact spelling.
 *
 * W278d (2026-05-23): test:sprint's source moved from package.json
 * inline string to backend/sprint-tests.txt (Windows cmdline limit
 * fix — see W278 commit). Test resolver below picks the right source
 * per script.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const BACKEND_DIR = path.join(REPO_ROOT, 'backend');

function scripts() {
  return require(path.join(BACKEND_DIR, 'package.json')).scripts || {};
}

function extractTestFiles(cmd) {
  // `jest __tests__/foo.test.js __tests__/bar.test.js --no-coverage ...`
  const matches = cmd.match(/__tests__\/[A-Za-z0-9._-]+\.test\.js/g) || [];
  return Array.from(new Set(matches));
}

function filesFor(scriptName) {
  if (scriptName === 'test:sprint') {
    // W278d — single source of truth lives in sprint-tests.txt
    const raw = fs.readFileSync(path.join(BACKEND_DIR, 'sprint-tests.txt'), 'utf8');
    const list = raw
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));
    return Array.from(new Set(list));
  }
  const s = scripts();
  return extractTestFiles(s[scriptName] || '');
}

function assertAllExist(scriptName) {
  const files = filesFor(scriptName);
  expect(files.length).toBeGreaterThan(0);
  const missing = files.filter(f => !fs.existsSync(path.join(BACKEND_DIR, f)));
  if (missing.length) {
    throw new Error(`${scriptName} references non-existent test files:\n  ${missing.join('\n  ')}`);
  }
}

describe('sprint test-script file existence', () => {
  it('test:sprint — every listed __tests__/*.test.js exists', () => {
    assertAllExist('test:sprint');
  });

  it('test:ops-subsystems — every listed __tests__/*.test.js exists', () => {
    assertAllExist('test:ops-subsystems');
  });

  it('test:ops-subsystems is a strict subset of test:sprint', () => {
    const sprint = new Set(filesFor('test:sprint'));
    const ops = filesFor('test:ops-subsystems');
    const extra = ops.filter(f => !sprint.has(f));
    expect(extra).toEqual([]);
  });

  it('test:drift — every listed __tests__/*.test.js exists', () => {
    assertAllExist('test:drift');
  });

  it('test:drift is a strict subset of test:sprint', () => {
    const sprint = new Set(filesFor('test:sprint'));
    const drift = filesFor('test:drift');
    const extra = drift.filter(f => !sprint.has(f));
    expect(extra).toEqual([]);
  });
});
