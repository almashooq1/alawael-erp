'use strict';

/**
 * W1601 — drilldown KPI analytics was authenticated (mount applies `authenticate`) but had
 * NO branch guard: any authed user could drill into another branch's KPI via ?branchId=
 * (the param flows into resolveOwner + the drill bundle). Best-fix chosen over a role gate:
 * branch-scope it — `requireBranchAccess` (rejects an explicit foreign ?branchId= + sets
 * req.branchScope) and actorFrom() forces the caller's scoped branch for restricted users
 * so an omitted branchId can't drill across all branches. Cross-branch roles keep full
 * drill-in (their effectiveBranchScope is null → the passed ?branchId= stands).
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'routes', 'drilldown.routes.js'), 'utf8');

describe('W1601 drilldown is branch-scoped', () => {
  test('imports requireBranchAccess + effectiveBranchScope', () => {
    expect(SRC).toMatch(/requireBranchAccess.*=.*branchScope\.middleware/s);
    expect(SRC).toMatch(/effectiveBranchScope.*=.*assertBranchMatch/s);
  });

  test('router applies requireBranchAccess middleware', () => {
    expect(SRC).toMatch(/router\.use\(\s*requireBranchAccess\s*\)/);
  });

  test('actorFrom forces the scoped branch for restricted callers', () => {
    // effectiveBranchScope(req) → if set, params.branchId is overridden with it
    expect(SRC).toMatch(/effectiveBranchScope\(req\)/);
    expect(SRC).toMatch(/params\.branchId\s*=\s*String\(scope\)/);
  });
});
