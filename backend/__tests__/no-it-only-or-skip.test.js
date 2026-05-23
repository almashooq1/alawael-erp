/**
 * no-it-only-or-skip.test.js — no sprint test file ships with a
 * focus-or-skip leak:
 *   - `it.only` / `describe.only` / `test.only`
 *   - `it.skip` / `describe.skip` / `test.skip`
 *   - `xit` / `xdescribe` / `xtest` (skip aliases)
 *   - `fdescribe` / `fit` / `ftest` (Jasmine focus aliases — same
 *     semantics as `.only`, equally dangerous)
 *
 * `.only` / `f*` silently narrow the gate to one test per file —
 * every other test is skipped, and the suite still reports "green"
 * because jest doesn't count skipped tests as failures.
 *
 * `.skip` / `x*` silently remove a test from the gate indefinitely.
 *
 * Both classes are legitimate during dev iteration and should NEVER
 * reach main. This scan catches either leak.
 *
 * Deliberately NOT banned: `it.todo` / `test.todo` — those are
 * intentional placeholders that show up explicitly in jest output
 * and don't masquerade as passing tests.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const BACKEND = path.join(REPO_ROOT, 'backend');

function listSprintTestFiles() {
  // W278d (2026-05-23) — sprint enumeration moved from inline
  // package.json string to backend/sprint-tests.txt.
  const raw = fs.readFileSync(path.join(BACKEND, 'sprint-tests.txt'), 'utf8');
  return raw
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));
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

  // Jasmine focus aliases — equivalent to .only but easier to miss in
  // review because they don't include the literal word "only". Added
  // 2026-05-19 after the BOM/unmock/silent-failure thread surfaced
  // how easy it is for CI bypasses to live undetected.
  it.each(files)('%s has no fdescribe / fit / ftest (Jasmine focus aliases)', rel => {
    // The guard file itself naturally references these aliases inside
    // its `it.each` description string ("fit / ftest (Jasmine ...)") —
    // exempt it so the guard doesn't trip on its own source.
    if (rel === '__tests__/no-it-only-or-skip.test.js') return;
    const src = fs.readFileSync(path.join(BACKEND, rel), 'utf8');
    const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    // Anchor to start-of-line (with leading whitespace allowed) so we
    // only match the alias as an actual function call, not the word
    // appearing in a description string like "perfect linear fit".
    expect(stripped).not.toMatch(/^\s*(fdescribe|fit|ftest)\s*\(/m);
  });
});
