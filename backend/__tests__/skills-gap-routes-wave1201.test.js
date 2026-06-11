/**
 * W1201 — static drift guard for the skills-gap route surface + mount.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTE = path.join(__dirname, '..', 'routes', 'hr', 'skills-gap.routes.js');
const REGISTRY = path.join(__dirname, '..', 'routes', 'registries', 'hr.registry.js');
const src = fs.readFileSync(ROUTE, 'utf8');
const reg = fs.readFileSync(REGISTRY, 'utf8');

describe('W1201 skills-gap routes — auth + branch isolation', () => {
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
  test('role-baseline config is restricted to CONFIG_ROLES', () => {
    expect(src).toMatch(/CONFIG_ROLES\s*=/);
    expect(src).toMatch(/'\/requirements',\s*requireRole\(CONFIG_ROLES\)/);
  });
  test('employee-keyed calls go through enforceEmployeeBranch (guardEmployee)', () => {
    expect(src).toMatch(/guardEmployee\(req,\s*res,\s*b\.employeeId\)/);
    expect(src).toMatch(/guardEmployee\(req,\s*res,\s*req\.params\.employeeId\)/);
  });
});

describe('W1201 skills-gap routes — endpoints + mount', () => {
  test('exposes the 5 endpoints', () => {
    for (const [verb, p] of [
      ['post', '/assessments'],
      ['post', '/requirements'],
      ['get', '/employee/:employeeId/gaps'],
      ['get', '/org-gaps'],
      ['get', '/training-needs'],
    ]) {
      expect(src).toMatch(new RegExp(`router\\.${verb}\\(\\s*'${p.replace(/[/:]/g, '\\$&')}'`));
    }
  });
  test('mounted in hr.registry at /api(/v1)?/hr/skills-gap', () => {
    expect(reg).toMatch(/skills-gap\.routes/);
    expect(reg).toMatch(/app\.use\(\s*'\/api\/hr\/skills-gap'/);
    expect(reg).toMatch(/app\.use\(\s*'\/api\/v1\/hr\/skills-gap'/);
  });
});
