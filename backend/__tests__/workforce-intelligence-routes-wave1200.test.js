/**
 * W1200 — static drift guard for the workforce-intelligence capstone route + mount.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTE = path.join(__dirname, '..', 'routes', 'hr', 'workforce-intelligence.routes.js');
const REGISTRY = path.join(__dirname, '..', 'routes', 'registries', 'hr.registry.js');
const src = fs.readFileSync(ROUTE, 'utf8');
const reg = fs.readFileSync(REGISTRY, 'utf8');

describe('W1200 workforce-intelligence route — auth + isolation + mount', () => {
  test('self-authenticates + requireBranchAccess', () => {
    expect(src).toMatch(/router\.use\(\s*authenticateToken\s*\)/);
    expect(src).toMatch(/router\.use\(\s*requireBranchAccess\s*\)/);
  });
  test('W269: effectiveBranchScope, never req.branchId', () => {
    expect(src).toMatch(/effectiveBranchScope\(req\)/);
    expect(src).not.toMatch(/req\.branchId/);
  });
  test('the /summary read is role-gated to leadership', () => {
    expect(src).toMatch(/router\.get\(\s*'\/summary'\s*,\s*requireRole\(READ_ROLES\)/);
    // pay-equity signals present → CFO/finance in the role set
    expect(src).toMatch(/'cfo'/);
  });
  test('mounted in hr.registry at /api(/v1)?/hr/workforce-intelligence', () => {
    expect(reg).toMatch(/workforce-intelligence\.routes/);
    expect(reg).toMatch(/app\.use\(\s*'\/api\/hr\/workforce-intelligence'/);
    expect(reg).toMatch(/app\.use\(\s*'\/api\/v1\/hr\/workforce-intelligence'/);
  });
});
