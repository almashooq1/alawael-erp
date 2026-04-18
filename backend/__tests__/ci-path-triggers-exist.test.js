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
});
