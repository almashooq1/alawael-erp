/**
 * no-it-only-or-skip.test.js — no sprint test file ships with
 * `it.only`, `it.skip`, `describe.only`, or `describe.skip`.
 *
 * `.only` silently narrows the gate to one test per file — every
 * other test is skipped, and the suite still reports "green" because
 * jest doesn't count skipped tests as failures.
 *
 * `.skip` silently removes a test from the gate indefinitely.
 *
 * Both are legitimate during dev iteration and should NEVER reach
 * main. This scan catches either leak.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const BACKEND = path.join(REPO_ROOT, 'backend');

function listSprintTestFiles() {
  const pkg = require(path.join(BACKEND, 'package.json'));
  const cmd = pkg.scripts['test:sprint'];
  return (cmd.match(/__tests__\/[A-Za-z0-9._-]+\.test\.js/g) || []).filter(
    (v, i, a) => a.indexOf(v) === i
  );
}

describe('no .only / .skip leaks in sprint tests', () => {
  const files = listSprintTestFiles();

  it.each(files)('%s has no it.only / describe.only', rel => {
    const src = fs.readFileSync(path.join(BACKEND, rel), 'utf8');
    // Strip comments first
    const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(stripped).not.toMatch(/\b(it|test|describe)\.only\s*\(/);
  });

  it.each(files)('%s has no it.skip / describe.skip', rel => {
    const src = fs.readFileSync(path.join(BACKEND, rel), 'utf8');
    const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    // Note: xit / xdescribe are also skip aliases
    expect(stripped).not.toMatch(/\b(it|test|describe)\.skip\s*\(/);
    expect(stripped).not.toMatch(/\bx(it|test|describe)\s*\(/);
  });
});
