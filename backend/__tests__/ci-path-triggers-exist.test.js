/**
 * ci-path-triggers-exist.test.js — sprint-tests.yml `paths:` triggers
 * all point at real files or directories on disk.
 *
 * If someone removes a test file but forgets to prune the trigger list,
 * GitHub Actions still watches a ghost path. If someone renames a
 * source file but forgets the trigger, the CI gate silently stops
 * watching that surface.
 *
 * Only LITERAL paths are checked (not globs) — the file is small enough
 * that a walk of every entry is trivially fast.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

describe('sprint-tests.yml paths: triggers exist', () => {
  const yml = fs.readFileSync(path.join(REPO_ROOT, '.github/workflows/sprint-tests.yml'), 'utf8');

  // Match `      - 'some/path'` lines. Strip the hyphen, quotes.
  const pathLines = yml
    .split('\n')
    .filter(line => /^\s+-\s+'[^']+'$/.test(line))
    .map(line => line.match(/'([^']+)'/)[1]);

  // Keep only entries that look like repo paths (reject version strings,
  // branch names, and glob patterns we can't cheaply check).
  const concretePaths = pathLines.filter(
    p => p.includes('/') && !p.includes('*') && !p.startsWith('.github/workflows/sprint-tests.yml')
  );
  // Explicitly include the self-reference since it's legitimately literal
  if (pathLines.includes('.github/workflows/sprint-tests.yml')) {
    concretePaths.push('.github/workflows/sprint-tests.yml');
  }

  it('extracted at least 10 concrete path entries (sanity)', () => {
    expect(concretePaths.length).toBeGreaterThanOrEqual(10);
  });

  it('every literal path points at a file or directory that exists', () => {
    const missing = concretePaths.filter(p => !fs.existsSync(path.join(REPO_ROOT, p)));
    if (missing.length) {
      throw new Error(
        'sprint-tests.yml references paths that do not exist:\n  ' + missing.join('\n  ')
      );
    }
  });

  it('push and pull_request paths are identical (no asymmetry)', () => {
    // GitHub Actions runs different events through different `paths:`
    // filters. If push has fewer entries than pull_request, a direct
    // push to main can land code that PRs would have CI-gated. This
    // had drifted before — push was a strict subset of pull_request,
    // so test files added during the CPE work didn't trigger sprint
    // CI on direct merges.
    function extractPathsForEvent(eventName) {
      // Match the `eventName:` block and capture lines until the next
      // top-level `<word>:` (push:, pull_request:, workflow_dispatch:).
      const re = new RegExp(
        `\\n  ${eventName}:[\\s\\S]*?\\n    paths:[\\s\\S]*?(?=\\n  [a-z_]+:|\\nenv:|$)`
      );
      const block = yml.match(re);
      if (!block) return [];
      return block[0]
        .split('\n')
        .filter(line => /^ {6}-\s+'[^']+'$/.test(line))
        .map(line => line.match(/'([^']+)'/)[1]);
    }

    const pushPaths = new Set(extractPathsForEvent('push'));
    const prPaths = new Set(extractPathsForEvent('pull_request'));

    const inPushNotPr = [...pushPaths].filter(p => !prPaths.has(p));
    const inPrNotPush = [...prPaths].filter(p => !pushPaths.has(p));

    if (inPushNotPr.length || inPrNotPush.length) {
      throw new Error(
        'sprint-tests.yml push/pull_request paths are out of sync:\n' +
          (inPushNotPr.length ? '  Only in push:\n    ' + inPushNotPr.join('\n    ') + '\n' : '') +
          (inPrNotPush.length ? '  Only in pull_request:\n    ' + inPrNotPush.join('\n    ') : '')
      );
    }
    // Sanity: not both empty.
    expect(pushPaths.size).toBeGreaterThan(10);
  });

  it('every test:sprint test file appears in the paths trigger', () => {
    // Prevents the drift class I just cleaned up: 18 drift tests were
    // in the script but not in paths:, so editing a drift rule didn't
    // trigger the gate that would validate it.
    const pkg = require(path.join(REPO_ROOT, 'backend/package.json'));
    const sprintCmd = pkg.scripts['test:sprint'] || '';
    const sprintTests = sprintCmd.match(/__tests__\/[A-Za-z0-9._-]+\.test\.js/g) || [];
    const pathsBlock = yml.match(
      /\n {2}push:[\s\S]*?\n {4}paths:[\s\S]*?(?=\n {2}[a-z_]+:|\nenv:|$)/
    );
    const pathsContent = pathsBlock ? pathsBlock[0] : '';
    const missing = Array.from(new Set(sprintTests)).filter(
      t => !pathsContent.includes(`backend/${t}`)
    );
    if (missing.length) {
      throw new Error(
        'test:sprint references files missing from sprint-tests.yml paths:\n  ' +
          missing.join('\n  ')
      );
    }
  });
});
