/**
 * W1203 — static drift guard for the headcount-planning route surface + mount.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTE = path.join(__dirname, '..', 'routes', 'hr', 'headcount-planning.routes.js');
const REGISTRY = path.join(__dirname, '..', 'routes', 'registries', 'hr.registry.js');
const src = fs.readFileSync(ROUTE, 'utf8');
const reg = fs.readFileSync(REGISTRY, 'utf8');

describe('W1203 headcount-planning routes — auth + isolation', () => {
  test('self-authenticates + requireBranchAccess', () => {
    expect(src).toMatch(/router\.use\(\s*authenticateToken\s*\)/);
    expect(src).toMatch(/router\.use\(\s*requireBranchAccess\s*\)/);
  });
  test('W269: effectiveBranchScope, never req.branchId', () => {
    expect(src).toMatch(/effectiveBranchScope\(req\)/);
    expect(src).not.toMatch(/req\.branchId/);
  });
  test('every route is role-gated; plan creation uses WRITE_ROLES', () => {
    const verbs = [...src.matchAll(/router\.(get|post)\(\s*'[^']+'\s*,\s*([A-Za-z_$][\w$]*)/g)];
    expect(verbs.length).toBe(4);
    for (const m of verbs) expect(m[2]).toBe('requireRole');
    expect(src).toMatch(/'\/plans',\s*requireRole\(WRITE_ROLES\)/);
  });
});

describe('W1203 headcount-planning routes — endpoints + mount', () => {
  test('exposes the 4 endpoints', () => {
    for (const [verb, p] of [
      ['get', '/current'],
      ['post', '/preview'],
      ['post', '/plans'],
      ['get', '/plans'],
    ]) {
      expect(src).toMatch(new RegExp(`router\\.${verb}\\(\\s*'${p}'`));
    }
  });
  test('mounted in hr.registry at /api(/v1)?/hr/headcount-planning', () => {
    expect(reg).toMatch(/headcount-planning\.routes/);
    expect(reg).toMatch(/app\.use\(\s*'\/api\/hr\/headcount-planning'/);
    expect(reg).toMatch(/app\.use\(\s*'\/api\/v1\/hr\/headcount-planning'/);
  });
});
