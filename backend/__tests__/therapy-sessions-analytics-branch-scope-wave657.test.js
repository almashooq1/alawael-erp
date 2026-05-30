'use strict';

/**
 * therapy-sessions-analytics-branch-scope-wave657.test.js
 * ════════════════════════════════════════════════════════════════════
 * R4 Phase-B route-scoping. routes/therapy-sessions-analytics.routes.js has
 * 10 ClinicalSession analytics handlers (overview/trends/therapist-performance/
 * room/attendance/billing/goals/cancellations/...). ClinicalSession already
 * carries branchId, but the router had NO auth and every aggregate matched an
 * unscoped `q`. W657 added authenticateToken + requireBranchAccess and made the
 * single shared baseQuery(req) helper inject branchFilter(req) — so every
 * handler's `q` (and thus every `$match: q` aggregate + countDocuments) is
 * branch-scoped at one point. branchFilter = {} for cross-branch/HQ analysts.
 *
 * This guard locks that single point: baseQuery must take req and spread
 * branchFilter, and the router must authenticate + requireBranchAccess.
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'therapy-sessions-analytics.routes.js'),
  'utf8'
);

describe('W657 — therapy-sessions-analytics is branch-scoped at baseQuery', () => {
  it('authenticates + populates branch scope at the router level', () => {
    expect(SRC).toMatch(/router\.use\(\s*authenticateToken\s*,\s*requireBranchAccess\s*\)/);
  });

  it('baseQuery takes req and injects branchFilter(req)', () => {
    expect(SRC).toMatch(/function baseQuery\(\s*req\s*,/);
    expect(SRC).toMatch(/function baseQuery\(req,[^]*?\.\.\.branchFilter\(req\)/);
  });

  it('every baseQuery call site passes req (no legacy baseQuery({...}) left)', () => {
    expect(SRC).not.toMatch(/baseQuery\(\s*\{/);
    expect((SRC.match(/baseQuery\(req,/g) || []).length).toBeGreaterThanOrEqual(9);
  });

  it('every ClinicalSession aggregate matches the scoped q (no inline unscoped $match)', () => {
    // all S.aggregate pipelines $match the shared q (which carries branchFilter)
    const aggs = SRC.match(/S\.aggregate\s*\(\s*\[\s*\{\s*\$match:\s*q\b/g) || [];
    const allAggs = SRC.match(/S\.aggregate\s*\(\s*\[/g) || [];
    // at least the analytics aggregates match q; none introduce a bare unscoped object
    expect(allAggs.length).toBeGreaterThanOrEqual(6);
    expect(aggs.length).toBeGreaterThanOrEqual(6);
  });
});
