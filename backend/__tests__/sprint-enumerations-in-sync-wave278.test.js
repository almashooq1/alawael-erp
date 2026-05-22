'use strict';

/**
 * sprint-enumerations-in-sync-wave278.test.js — Wave 278.
 *
 * Catches drift between TWO sprint-test enumerations that the
 * codebase now has:
 *
 *   (A) package.json scripts["test:sprint"]
 *       — historical inline enumeration; parsed by 4 existing meta-
 *         tests (sprint-test-files-exist, test-script-dedupe,
 *         wave-tests-in-sprint, ci-path-triggers-exist). Source of
 *         truth for those tests + Linux CI invocation.
 *
 *   (B) backend/sprint-tests.txt
 *       — one path per line; read by scripts/run-sprint.js which
 *         spawns jest via child_process (bypasses Windows' 8191-char
 *         cmdline limit that bit `npm run test:sprint` at 8889 chars
 *         during the W277 session, 2026-05-23).
 *
 * The two MUST stay in sync. Adding a new test:
 *   1. Append it to the test:sprint script in package.json (existing
 *      muscle memory).
 *   2. Append it to sprint-tests.txt (one line).
 *   3. This test fails noisily if you forget either.
 *
 * Long-term: move to a single source of truth (sprint-tests.txt only,
 * make test:sprint invoke the runner, update 4 meta-tests). Deferred
 * because it's a multi-file rewrite; this drift guard buys time.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const BACKEND_DIR = path.join(REPO_ROOT, 'backend');
const PKG_PATH = path.join(BACKEND_DIR, 'package.json');
const LIST_PATH = path.join(BACKEND_DIR, 'sprint-tests.txt');

function _extractFromScript(scriptValue) {
  const matches = scriptValue.match(/__tests__\/[A-Za-z0-9._-]+\.test\.js/g) || [];
  return Array.from(new Set(matches));
}

function _extractFromList() {
  const raw = fs.readFileSync(LIST_PATH, 'utf8');
  return raw
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));
}

describe('Wave 278 — sprint enumeration sync (package.json ↔ sprint-tests.txt)', () => {
  let fromScript;
  let fromList;

  beforeAll(() => {
    const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
    const sprintCmd = pkg.scripts && pkg.scripts['test:sprint'];
    if (!sprintCmd) throw new Error('package.json scripts["test:sprint"] missing');
    fromScript = new Set(_extractFromScript(sprintCmd));
    fromList = new Set(_extractFromList());
  });

  test('every test in test:sprint script is present in sprint-tests.txt', () => {
    const missingFromList = [...fromScript].filter(t => !fromList.has(t));
    if (missingFromList.length) {
      throw new Error(
        `Tests in package.json test:sprint but NOT in sprint-tests.txt:\n  ` +
          missingFromList.join('\n  ') +
          `\n\nAppend them to backend/sprint-tests.txt (one path per line).`
      );
    }
    expect(missingFromList).toEqual([]);
  });

  test('every test in sprint-tests.txt is present in test:sprint script', () => {
    const missingFromScript = [...fromList].filter(t => !fromScript.has(t));
    if (missingFromScript.length) {
      throw new Error(
        `Tests in sprint-tests.txt but NOT in package.json test:sprint:\n  ` +
          missingFromScript.join('\n  ') +
          `\n\nAppend them to the test:sprint script in package.json.`
      );
    }
    expect(missingFromScript).toEqual([]);
  });

  test('both enumerations have the same count', () => {
    expect(fromList.size).toBe(fromScript.size);
  });

  test('sprint-tests.txt enumeration is non-empty (sanity)', () => {
    expect(fromList.size).toBeGreaterThanOrEqual(50);
  });
});
