/**
 * W1198 — static drift guard for the talent-grid route surface + mount.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTE = path.join(__dirname, '..', 'routes', 'hr', 'talent-grid.routes.js');
const REGISTRY = path.join(__dirname, '..', 'routes', 'registries', 'hr.registry.js');
const src = fs.readFileSync(ROUTE, 'utf8');
const reg = fs.readFileSync(REGISTRY, 'utf8');

describe('W1198 talent-grid routes — auth + branch isolation', () => {
  test('self-authenticates + requireBranchAccess', () => {
    expect(src).toMatch(/router\.use\(\s*authenticateToken\s*\)/);
    expect(src).toMatch(/router\.use\(\s*requireBranchAccess\s*\)/);
  });
  test('W269: effectiveBranchScope + enforceEmployeeBranch, never req.branchId', () => {
    expect(src).toMatch(/effectiveBranchScope\(req\)/);
    expect(src).toMatch(/enforceEmployeeBranch/);
    expect(src).not.toMatch(/req\.branchId/);
  });
  test('every route is role-gated', () => {
    const verbs = [...src.matchAll(/router\.(get|post)\(\s*'[^']+'\s*,\s*([A-Za-z_$][\w$]*)/g)];
    expect(verbs.length).toBe(5);
    for (const m of verbs) expect(m[2]).toBe('requireRole');
  });
  test('the identity+negative-label /risks route uses the stricter SENSITIVE_ROLES', () => {
    expect(src).toMatch(/SENSITIVE_ROLES\s*=/);
    expect(src).toMatch(/'\/risks',\s*requireRole\(SENSITIVE_ROLES\)/);
  });
  test('write goes through enforceEmployeeBranch before upsert', () => {
    expect(src).toMatch(/guardEmployee\(req,\s*res,\s*body\.employeeId\)/);
  });
});

describe('W1198 talent-grid routes — endpoints + mount', () => {
  test('exposes the 5 endpoints', () => {
    for (const [verb, p] of [
      ['post', '/reviews'],
      ['get', '/grid'],
      ['get', '/high-potentials'],
      ['get', '/risks'],
      ['get', '/employee/:employeeId'],
    ]) {
      expect(src).toMatch(new RegExp(`router\\.${verb}\\(\\s*'${p.replace(/[/:]/g, '\\$&')}'`));
    }
  });
  test('mounted in hr.registry at /api(/v1)?/hr/talent-grid', () => {
    expect(reg).toMatch(/talent-grid\.routes/);
    expect(reg).toMatch(/app\.use\(\s*'\/api\/hr\/talent-grid'/);
    expect(reg).toMatch(/app\.use\(\s*'\/api\/v1\/hr\/talent-grid'/);
  });
});
