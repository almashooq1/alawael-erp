/**
 * W1199 — static drift guard for the diversity route surface + mount.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTE = path.join(__dirname, '..', 'routes', 'hr', 'diversity.routes.js');
const REGISTRY = path.join(__dirname, '..', 'routes', 'registries', 'hr.registry.js');
const src = fs.readFileSync(ROUTE, 'utf8');
const reg = fs.readFileSync(REGISTRY, 'utf8');

describe('W1199 diversity routes — auth + branch isolation', () => {
  test('self-authenticates + requireBranchAccess', () => {
    expect(src).toMatch(/router\.use\(\s*authenticateToken\s*\)/);
    expect(src).toMatch(/router\.use\(\s*requireBranchAccess\s*\)/);
  });
  test('W269: effectiveBranchScope, never req.branchId', () => {
    expect(src).toMatch(/effectiveBranchScope\(req\)/);
    expect(src).not.toMatch(/req\.branchId/);
  });
  test('every route is role-gated', () => {
    const verbs = [...src.matchAll(/router\.(get|post)\(\s*'[^']+'\s*,\s*([A-Za-z_$][\w$]*)/g)];
    expect(verbs.length).toBe(4);
    for (const m of verbs) expect(m[2]).toBe('requireRole');
  });
});

describe('W1199 diversity routes — endpoints + mount', () => {
  test('exposes the 4 endpoints', () => {
    for (const [verb, p] of [
      ['get', '/analysis'],
      ['post', '/snapshot'],
      ['get', '/snapshots'],
      ['get', '/trends'],
    ]) {
      expect(src).toMatch(new RegExp(`router\\.${verb}\\(\\s*'${p}'`));
    }
  });
  test('mounted in hr.registry at /api(/v1)?/hr/diversity', () => {
    expect(reg).toMatch(/diversity\.routes/);
    expect(reg).toMatch(/app\.use\(\s*'\/api\/hr\/diversity'/);
    expect(reg).toMatch(/app\.use\(\s*'\/api\/v1\/hr\/diversity'/);
  });
});
