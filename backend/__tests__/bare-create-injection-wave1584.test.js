'use strict';

/**
 * W1584 — the bare-shape create/probe branch-injection on cbahi + seat-allocation
 * (the two files the W1583 slice skipped because they used `branchId: body.branchId,`
 * at multiple sites instead of the guarded ternary).
 *
 *  - cbahi POST attestation: filed an attestation with branchId straight from body → a
 *    restricted user could file (or probe existence of) a CBAHI attestation in any branch.
 *  - seat-allocation POST: allocated a seat / probed capacity / dup-checked using a
 *    body-supplied branchId → a restricted user could seat a beneficiary in any branch.
 *
 * Fix: resolve `const targetBranchId = effectiveBranchScope(req) || body.branchId` once
 * per handler (restricted caller forced to own branch) and use it for the dup-check,
 * capacity probe and create — no raw body.branchId reaches a write/scope key.
 */

const fs = require('fs');
const path = require('path');

const ROUTES = path.join(__dirname, '..', 'routes');
const FILES = ['cbahi.routes.js', 'seat-allocation.routes.js'];

function strip(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ''.padEnd(m.length - p1.length, ' '));
}

describe('W1584 bare-shape create/probe forces branch scope', () => {
  for (const file of FILES) {
    const src = strip(fs.readFileSync(path.join(ROUTES, file), 'utf8'));

    test(`${file}: resolves targetBranchId via effectiveBranchScope, no raw body.branchId scope key`, () => {
      expect(src).toMatch(/effectiveBranchScope/);
      expect(src).toMatch(/const targetBranchId = effectiveBranchScope\(req\) \|\| body\.branchId/);
      // no `branchId: body.branchId` (bare) or `branchId: req.body.branchId` may remain
      expect(src).not.toMatch(/branchId:\s*body\.branchId\s*[,)]/);
      expect(src).not.toMatch(/branchId:\s*req\.body\.branchId\s*[,)]/);
    });
  }
});
