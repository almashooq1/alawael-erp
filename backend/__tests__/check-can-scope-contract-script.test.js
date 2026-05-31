'use strict';

/**
 * check-can-scope-contract-script.test.js — self-test for the D1 guard
 * (scripts/check-can-scope-contract.js): the can()-must-pair-a-scope-helper
 * contract. Covers the pure diff, the require-detection regexes, the real-tree
 * scan, and the CLI exit. No DB, no boot.
 */

const { execFileSync } = require('child_process');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'check-can-scope-contract.js');
const {
  scan,
  diff,
  BASELINE,
  IMPORTS_CAN_RE,
  IMPORTS_SCOPE_RE,
} = require('../scripts/check-can-scope-contract');

describe('can-scope-contract — diff() ratchet logic', () => {
  const base = new Set(['routes/exempt.routes.js']);
  it('ok when unscoped === baseline', () => {
    expect(diff(['routes/exempt.routes.js'], base).ok).toBe(true);
  });
  it('flags a NEW unscoped consumer', () => {
    const r = diff(['routes/exempt.routes.js', 'routes/new.routes.js'], base);
    expect(r.ok).toBe(false);
    expect(r.novel).toEqual(['routes/new.routes.js']);
  });
  it('flags a STALE baseline entry (now scoped/removed)', () => {
    const r = diff([], base);
    expect(r.ok).toBe(false);
    expect(r.stale).toEqual(['routes/exempt.routes.js']);
  });
});

describe('can-scope-contract — require-detection regexes', () => {
  it('detects an authorization/can import (deep path)', () => {
    expect(IMPORTS_CAN_RE.test("const {can} = require('../../authorization/can');")).toBe(true);
  });
  it('detects a sibling ./can import', () => {
    expect(IMPORTS_CAN_RE.test("const {can} = require('./can');")).toBe(true);
  });
  it('does NOT treat permissions.registry as the can resolver', () => {
    expect(IMPORTS_CAN_RE.test("const reg = require('./permissions.registry');")).toBe(false);
  });
  it('detects the branchScope helper import', () => {
    expect(
      IMPORTS_SCOPE_RE.test(
        "const {branchFilter} = require('../middleware/branchScope.middleware');"
      )
    ).toBe(true);
  });
  it('detects the assertBranchMatch helper import', () => {
    expect(
      IMPORTS_SCOPE_RE.test(
        "const {effectiveBranchScope} = require('../middleware/assertBranchMatch');"
      )
    ).toBe(true);
  });
});

describe('can-scope-contract — real-tree scan + CLI', () => {
  it('scan() returns consumer/unscoped arrays; no unscoped consumer outside baseline', () => {
    const { consumers, unscoped } = scan();
    expect(Array.isArray(consumers)).toBe(true);
    const novel = unscoped.filter(x => !BASELINE.has(x));
    expect(novel).toEqual([]); // can() is dormant or every consumer is scoped
  });
  it('CLI exits 0 with the intact message', () => {
    const out = execFileSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
    expect(out).toMatch(/scope contract intact/);
  });
});
