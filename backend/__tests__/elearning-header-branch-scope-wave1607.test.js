/**
 * elearning-header-branch-scope-wave1607.test.js
 * ════════════════════════════════════════════════════════════════════
 * W1607 — close the client `x-branch-id` header-trust IDOR in the
 * e-learning surface.
 *
 * `routes/elearning-enhanced.routes.js` derived the branch scope for all 21 of
 * its handlers (read filters + create write-stamps) from
 *   getBranchId = req => req.user?.branchId || req.headers['x-branch-id']
 *
 * `req.user.branchId` is never on the JWT, so the client-controlled
 * `x-branch-id` header was the de-facto scope. `requireBranchAccess` rejects a
 * foreign `?branchId=` in the query/body but is BLIND to headers, so any
 * restricted user could read (or stamp) another branch's staff training records
 * (enrollments / CPD / compliance) by spoofing the header.
 *
 * Fix: getBranchId now derives the branch from `effectiveBranchScope(req)`
 * (server-side, ignores the header/query spoof) and only lets a cross-branch
 * role fall back to the header. Restricted callers never trust the header.
 *
 * Static route-shape assertions + a behavioral test of the effectiveBranchScope
 * primitive the helper relies on. Static-only file; NOT in sprint-tests.txt.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROUTE_FILE = path.join(__dirname, '..', 'routes', 'elearning-enhanced.routes.js');

describe('W1607 — e-learning header-trust branch scope', () => {
  const src = fs.readFileSync(ROUTE_FILE, 'utf8');

  it('no longer trusts req.user.branchId || x-branch-id as the scope', () => {
    // the old one-liner assignment form is gone (the pattern only survives in
    // the explanatory comment, not in executable code)
    expect(src).not.toMatch(
      /getBranchId = req => req\.user\?\.branchId\s*\|\|\s*req\.headers\['x-branch-id'\]/
    );
  });

  it('imports and uses effectiveBranchScope in getBranchId', () => {
    expect(src).toMatch(
      /effectiveBranchScope\s*\}\s*=\s*require\([^)]*assertBranchMatch/
    );
    expect(src).toMatch(/const getBranchId = req => \{[\s\S]*effectiveBranchScope\(req\)/);
  });

  it('only lets a NON-restricted (cross-branch) caller fall back to the header', () => {
    // the header may only be read when req.branchScope is not restricted
    expect(src).toMatch(
      /if \(req\.branchScope && !req\.branchScope\.restricted\)[\s\S]*req\.headers\['x-branch-id'\]/
    );
  });

  it('still requires authenticate + requireBranchAccess at the router level', () => {
    expect(src).toMatch(/router\.use\(authenticate\)/);
    expect(src).toMatch(/router\.use\(requireBranchAccess\)/);
  });
});

describe('W1607 — effectiveBranchScope behavioral (the primitive getBranchId relies on)', () => {
  const { effectiveBranchScope } = require('../middleware/assertBranchMatch');

  it('pins a restricted caller to their own branch, ignoring a spoofed query', () => {
    const req = {
      branchScope: { restricted: true, branchId: 'OWN_BRANCH' },
      query: { branchId: 'FOREIGN_BRANCH' },
      headers: { 'x-branch-id': 'FOREIGN_BRANCH' },
    };
    expect(effectiveBranchScope(req)).toBe('OWN_BRANCH');
  });

  it('returns null for a restricted caller with no resolved branch (fail closed)', () => {
    const req = { branchScope: { restricted: true, branchId: null }, query: {} };
    expect(effectiveBranchScope(req)).toBeNull();
  });

  it('lets a cross-branch caller target a branch via ?branchId=', () => {
    const req = {
      branchScope: { restricted: false, allBranches: true, branchId: null },
      query: { branchId: 'SOME_BRANCH' },
    };
    expect(effectiveBranchScope(req)).toBe('SOME_BRANCH');
  });

  it('never derives scope from the x-branch-id header itself', () => {
    // A restricted caller with only a header set resolves to their own branch,
    // not the header value.
    const req = {
      branchScope: { restricted: true, branchId: 'OWN_BRANCH' },
      query: {},
      headers: { 'x-branch-id': 'FOREIGN_BRANCH' },
    };
    expect(effectiveBranchScope(req)).toBe('OWN_BRANCH');
  });
});
