/**
 * test-script-dedupe.test.js — the jest file lists in test:sprint and
 * test:ops-subsystems have no duplicate entries.
 *
 * Duplicates are harmless for jest (same file runs once) but signal
 * that someone edited the script carelessly. Unnoticed duplicates
 * grow over many edits and obscure the real file count — if a
 * duplicate slips past me during a merge, the test list looks bigger
 * than it is.
 *
 * Also asserts neither script has trailing whitespace that could
 * cause shell-word-splitting surprises in CI.
 *
 * W278d (2026-05-23): test:sprint's source of truth moved from an
 * inline package.json string to backend/sprint-tests.txt (one path
 * per line) because the inline list hit Windows 8191-char cmdline
 * limit at 8889 chars. This test now reads from whichever source
 * each script uses. test:ops-subsystems still uses inline (small
 * enough, no Windows issue).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BACKEND = path.join(__dirname, '..');

describe('test script lists are clean', () => {
  const pkg = require(path.join(BACKEND, 'package.json'));

  function filesFor(scriptName) {
    if (scriptName === 'test:sprint') {
      // W278d — read from sprint-tests.txt (single source of truth)
      const raw = fs.readFileSync(path.join(BACKEND, 'sprint-tests.txt'), 'utf8');
      return raw
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'));
    }
    // Other scripts still use inline enumeration
    const cmd = pkg.scripts[scriptName];
    return cmd.match(/__tests__\/[A-Za-z0-9._-]+\.test\.js/g) || [];
  }

  it.each(['test:sprint', 'test:ops-subsystems'])('%s has no duplicate test files', scriptName => {
    const files = filesFor(scriptName);
    const seen = new Map();
    const dupes = [];
    for (const f of files) {
      seen.set(f, (seen.get(f) || 0) + 1);
    }
    for (const [name, count] of seen) {
      if (count > 1) dupes.push(`${name} (x${count})`);
    }
    if (dupes.length) {
      throw new Error(`${scriptName} has duplicate files:\n  ${dupes.join('\n  ')}`);
    }
  });

  // Trailing-whitespace check only applies to inline-enumerated scripts.
  // sprint-tests.txt is line-oriented so the check doesn't translate.
  it('test:ops-subsystems has no trailing whitespace or double spaces', () => {
    const cmd = pkg.scripts['test:ops-subsystems'];
    expect(cmd).not.toMatch(/\s\s/);
    expect(cmd).not.toMatch(/\s$/);
  });
});
