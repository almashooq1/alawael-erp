'use strict';

/**
 * bi-dashboard-branch-scope-wave661.test.js
 * ════════════════════════════════════════════════════════════════════
 * R4 Phase-B route-scoping for the executive bi-dashboard. It aggregates
 * many models; the branchId-bearing ones (Employee — headcount; Complaint
 * — W613) leaked all-branch stats to single-branch callers (the router has
 * requireBranchAccess, and the comment notes any authenticated user incl.
 * therapist/nurse can reach it). W661 scopes those two via branchFilter(req).
 *
 * Payment / Expense (finance, no branchId — org-level executive overview),
 * Session (models/Session.js, login sessions), MaintenanceRequest, Vehicle
 * are intentionally NOT scoped: org-level models with no branch dimension.
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'bi-dashboard.routes.js'),
  'utf8'
);

describe('W661 — bi-dashboard branch-scopes its branchId-bearing aggregates', () => {
  it('imports branchFilter + keeps requireBranchAccess', () => {
    expect(SRC).toMatch(/branchFilter/);
    expect(SRC).toMatch(/router\.use\(\s*requireBranchAccess\s*\)/);
  });

  it('every Employee.aggregate is branch-scoped', () => {
    const bodies = SRC.match(/Employee\.aggregate\s*\(\s*\[[^]*?\$match[^]*?\}/g) || [];
    expect(bodies.length).toBeGreaterThanOrEqual(2);
    expect(bodies.every(b => /branchFilter/.test(b))).toBe(true);
  });

  it('every Complaint.aggregate is branch-scoped', () => {
    const bodies = SRC.match(/Complaint\.aggregate\s*\(\s*\[[^]*?\$match[^]*?\}/g) || [];
    expect(bodies.length).toBeGreaterThanOrEqual(1);
    expect(bodies.every(b => /branchFilter/.test(b))).toBe(true);
  });
});
