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
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function scripts() {
  return require(path.join(REPO_ROOT, 'backend/package.json')).scripts || {};
}

function extractTestFiles(cmd) {
  // `jest __tests__/foo.test.js __tests__/bar.test.js --no-coverage ...`
  const matches = cmd.match(/__tests__\/[A-Za-z0-9._-]+\.test\.js/g) || [];
  return Array.from(new Set(matches));
}

function assertAllExist(scriptName) {
  const s = scripts();
  expect(s[scriptName]).toBeDefined();
  const files = extractTestFiles(s[scriptName]);
  expect(files.length).toBeGreaterThan(0);
  const backendDir = path.join(REPO_ROOT, 'backend');
  const missing = files.filter(f => !fs.existsSync(path.join(backendDir, f)));
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
    const s = scripts();
    const sprint = new Set(extractTestFiles(s['test:sprint']));
    const ops = extractTestFiles(s['test:ops-subsystems']);
    const extra = ops.filter(f => !sprint.has(f));
    expect(extra).toEqual([]);
  });

  it('test:drift — every listed __tests__/*.test.js exists', () => {
    assertAllExist('test:drift');
  });

  it('test:drift is a strict subset of test:sprint', () => {
    const s = scripts();
    const sprint = new Set(extractTestFiles(s['test:sprint']));
    const drift = extractTestFiles(s['test:drift']);
    const extra = drift.filter(f => !sprint.has(f));
    expect(extra).toEqual([]);
  });
});
