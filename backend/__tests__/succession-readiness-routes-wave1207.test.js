/**
 * W1207 — static drift guard for the succession-readiness route surface + mount.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTE = path.join(__dirname, '..', 'routes', 'hr', 'succession-readiness.routes.js');
const REGISTRY = path.join(__dirname, '..', 'routes', 'registries', 'hr.registry.js');
const src = fs.readFileSync(ROUTE, 'utf8');
const reg = fs.readFileSync(REGISTRY, 'utf8');

describe('W1207 succession-readiness routes — auth + isolation', () => {
  test('self-authenticates + requireBranchAccess', () => {
    expect(src).toMatch(/router\.use\(\s*authenticateToken\s*\)/);
    expect(src).toMatch(/router\.use\(\s*requireBranchAccess\s*\)/);
  });
  test('W269: effectiveBranchScope + enforceEmployeeBranch, never req.branchId', () => {
    expect(src).toMatch(/effectiveBranchScope\(req\)/);
    expect(src).toMatch(/enforceEmployeeBranch/);
    expect(src).not.toMatch(/req\.branchId/);
  });
  test('every route is role-gated; per-employee read goes through guardEmployee', () => {
    const verbs = [...src.matchAll(/router\.(get|post)\(\s*'[^']+'\s*,\s*([A-Za-z_$][\w$]*)/g)];
    expect(verbs.length).toBe(2);
    for (const m of verbs) expect(m[2]).toBe('requireRole');
    expect(src).toMatch(/guardEmployee\(req,\s*res,\s*req\.params\.employeeId\)/);
  });
});

describe('W1207 succession-readiness routes — endpoints + mount', () => {
  test('exposes the 2 endpoints', () => {
    expect(src).toMatch(/router\.get\(\s*'\/employee\/:employeeId'/);
    expect(src).toMatch(/router\.get\(\s*'\/candidates'/);
  });
  test('mounted in hr.registry at /api(/v1)?/hr/succession-readiness', () => {
    expect(reg).toMatch(/succession-readiness\.routes/);
    expect(reg).toMatch(/app\.use\(\s*'\/api\/hr\/succession-readiness'/);
    expect(reg).toMatch(/app\.use\(\s*'\/api\/v1\/hr\/succession-readiness'/);
  });
});
