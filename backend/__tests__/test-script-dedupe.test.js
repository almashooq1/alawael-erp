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
 */

'use strict';

const path = require('path');

describe('test script lists are clean', () => {
  const pkg = require(path.join(__dirname, '..', 'package.json'));

  function filesFor(scriptName) {
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

  it.each(['test:sprint', 'test:ops-subsystems'])(
    '%s has no trailing whitespace or double spaces',
    scriptName => {
      const cmd = pkg.scripts[scriptName];
      expect(cmd).not.toMatch(/\s\s/);
      expect(cmd).not.toMatch(/\s$/);
    }
  );
});
