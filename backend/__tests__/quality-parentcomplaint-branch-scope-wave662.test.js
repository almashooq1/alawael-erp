'use strict';

/**
 * quality-parentcomplaint-branch-scope-wave662.test.js
 * ════════════════════════════════════════════════════════════════════
 * R4 Phase-B route-scoping. Verification of the remaining shortlist models
 * (don't assume "org-scoped") found two that ALREADY carry branchId and were
 * leaking all-branch stats:
 *   - QualityAudit (domains/quality, branchId) — quality.js /dashboard
 *     open-findings aggregate ($unwind findings) was unscoped.
 *   - ParentComplaint (models/ParentPortal, branchId) — parent-portal-enhanced
 *     /admin/complaints status aggregate was unscoped.
 * W662 scopes both via branchFilter(req) (both routers have requireBranchAccess).
 * RiskAssessment (organizationId) verified genuinely org-level → left.
 */

const fs = require('fs');
const path = require('path');

const QUALITY = fs.readFileSync(path.join(__dirname, '..', 'routes', 'quality.js'), 'utf8');
const PARENT = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'parent-portal-enhanced.routes.js'),
  'utf8'
);

describe('W662 — QualityAudit + ParentComplaint aggregates are branch-scoped', () => {
  it('quality.js scopes BOTH QualityAudit aggregates (openFindings inline + trend via matchFilter)', () => {
    expect(QUALITY).toMatch(/branchFilter/);
    // openFindings: inline branch $match before $unwind
    expect(QUALITY).toMatch(
      /QualityAudit\.aggregate\s*\(\s*\[[^]*?\$match:\s*\{\s*\.\.\.branchFilter\(req\)\s*\}[^]*?\$unwind/
    );
    // trend: the shared matchFilter is built with branchFilter
    expect(QUALITY).toMatch(/const matchFilter = \{\s*\.\.\.branchFilter\(req\)/);
  });

  it('parent-portal-enhanced imports branchFilter + scopes ParentComplaint', () => {
    expect(PARENT).toMatch(/branchFilter/);
    const bodies = PARENT.match(/ParentComplaint\.aggregate\s*\(\s*\[[^]*?\$match[^]*?\}/g) || [];
    expect(bodies.length).toBeGreaterThanOrEqual(1);
    expect(bodies.every(b => /branchFilter/.test(b))).toBe(true);
  });
});
