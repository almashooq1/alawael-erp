/**
 * test-files-have-describe.test.js — every test file in the sprint
 * suite has at least one describe() + at least one it() call.
 *
 * jest treats an empty test file (or one with only commented-out
 * tests) as "passing with 0 tests". Paired with --passWithNoTests in
 * the script, this means a developer can accidentally comment out
 * every assertion and the gate still looks green.
 *
 * This scan rejects that failure mode at PR time.
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

describe('test-file completeness', () => {
  const files = listSprintTestFiles();

  it('at least one sprint test file is listed (sanity)', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s contains at least one describe() + one it()', rel => {
    const abs = path.join(BACKEND, rel);
    const src = fs.readFileSync(abs, 'utf8');
    // Strip block comments + line comments to avoid counting commented
    // tests. Quick-and-cheap — not a full JS parse.
    const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(/\bdescribe\s*\(/.test(stripped)).toBe(true);
    // Allow it(), test(), it.each()(), test.each()() — .each is common
    // for table-driven assertions and should count as "has tests".
    expect(/\b(it|test)(\.each)?\s*\(/.test(stripped)).toBe(true);
  });
});
