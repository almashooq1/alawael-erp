/**
 * no-brittle-count-assertions.test.js — drift guard.
 *
 * The auto-generator that produced `__tests__/services-*.test.js` once
 * emitted assertions like:
 *
 *   const matches = source.match(/async\s+/g) || [];
 *   expect(matches.length).toBe(17);
 *
 * Every time someone added a new async helper to the service, that
 * exact-match assertion broke even though the code was perfectly fine.
 * One such assertion silently kept the entire frontend suite out of CI
 * gating until 2026-05-02 (see project_frontend_full_gate_2026-05-02.md).
 *
 * The whole batch (63 files) was migrated to `toBeGreaterThanOrEqual`
 * in the same commit. This guard test fails any PR that re-introduces
 * the brittle form, so a future code-generator + a sleepy review can't
 * undo the gate widening.
 *
 * Allowed: `expect(matches.length).toBeGreaterThanOrEqual(N)`
 *          `expect(matches.length).toBeGreaterThan(N)`
 *          `expect(matches.length).toBeLessThan(N)` (for capacity caps)
 * Banned:  `expect(matches.length).toBe(N)`
 */

'use strict';

const fs = require('fs');
const path = require('path');

const TESTS_ROOT = path.resolve(__dirname, '..');
const BANNED = /expect\s*\(\s*matches\s*\.\s*length\s*\)\s*\.\s*toBe\s*\(\s*\d+\s*\)/;

function walkTestFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'drift') continue; // skip ourselves
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTestFiles(full, acc);
    else if (entry.isFile() && entry.name.endsWith('.test.js')) acc.push(full);
  }
  return acc;
}

describe('drift / no-brittle-count-assertions', () => {
  test('no test asserts an exact count via expect(matches.length).toBe(N)', () => {
    const offenders = [];
    for (const file of walkTestFiles(TESTS_ROOT)) {
      const text = fs.readFileSync(file, 'utf8');
      if (BANNED.test(text)) {
        offenders.push(path.relative(TESTS_ROOT, file));
      }
    }

    if (offenders.length > 0) {
      const message =
        'Brittle count assertions detected.\n\n' +
        'These tests use `expect(matches.length).toBe(N)` against a regex\n' +
        'count of imports / async functions / etc. They break every time\n' +
        'someone adds a helper, even though the code is fine. Replace with\n' +
        '`toBeGreaterThanOrEqual(N)` so deletes still get caught.\n\n' +
        'Offending files:\n' +
        offenders.map(f => `  • ${f}`).join('\n');
      throw new Error(message);
    }

    expect(offenders).toHaveLength(0);
  });
});
