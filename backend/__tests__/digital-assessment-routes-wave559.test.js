'use strict';

/**
 * digital-assessment-routes-wave559.test.js — W559 static drift guard.
 *
 * Source-text assertions on routes/digital-assessment.routes.js (no DB).
 * Pairs with the behavioral test (W557). Locks the security envelope so a
 * future edit can't silently drop auth, branch isolation, or an endpoint:
 *   • authenticateToken + requireBranchAccess + bodyScopedBeneficiaryGuard
 *   • 6 endpoints present
 *   • requireRole on every endpoint; WRITE_ROLES on preview + administer
 *   • enforceBeneficiaryBranch on the beneficiary-keyed endpoints
 *   • mounted via dualMountAuth (NOT plain dualMount) in features.registry
 */

const fs = require('fs');
const path = require('path');

const ROUTE = path.join(__dirname, '..', 'routes', 'digital-assessment.routes.js');
const REGISTRY = path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js');
const src = fs.readFileSync(ROUTE, 'utf8');
const registrySrc = fs.readFileSync(REGISTRY, 'utf8');

describe('W559 — auth + branch isolation envelope', () => {
  test('mounts the three guard middlewares', () => {
    expect(src).toMatch(/router\.use\(authenticateToken\)/);
    expect(src).toMatch(/router\.use\(requireBranchAccess\)/);
    expect(src).toMatch(/router\.use\(bodyScopedBeneficiaryGuard\)/);
  });

  test('imports the W269 branch-isolation helpers', () => {
    expect(src).toMatch(/enforceBeneficiaryBranch/);
    expect(src).toMatch(/require\('\.\.\/middleware\/assertBranchMatch'\)/);
  });

  test('never reads req.branchId (W269h class)', () => {
    expect(src).not.toMatch(/req\.branchId/);
  });

  test('validates ObjectIds on path/body ids', () => {
    expect(src).toMatch(/mongoose\.isValidObjectId/);
  });
});

describe('W559 — endpoint surface', () => {
  const endpoints = [
    ['get', '/administrable'],
    ['get', '/item-bank/:code'],
    ['post', '/preview'],
    ['post', '/administer'],
    ['get', '/history/:beneficiaryId/:code'],
    ['get', '/report/:applicationId'],
  ];
  for (const [method, pathStr] of endpoints) {
    test(`${method.toUpperCase()} ${pathStr} present`, () => {
      const re = new RegExp(`router\\.${method}\\(\\s*'${pathStr.replace(/[/:]/g, '\\$&')}'`);
      expect(src).toMatch(re);
    });
  }

  test('every endpoint is role-gated', () => {
    const routeCalls = src.match(/router\.(get|post)\(/g) || [];
    const requireRoleCalls = src.match(/requireRole\(/g) || [];
    expect(requireRoleCalls.length).toBeGreaterThanOrEqual(routeCalls.length);
  });

  test('administer + history + report enforce beneficiary branch', () => {
    // 3 beneficiary-keyed endpoints → at least 3 enforce calls.
    const calls = src.match(/enforceBeneficiaryBranch\(/g) || [];
    expect(calls.length).toBeGreaterThanOrEqual(3);
  });

  test('preview + administer use WRITE_ROLES', () => {
    expect(src).toMatch(/'\/preview',\s*\n?\s*requireRole\(WRITE_ROLES\)/);
    expect(src).toMatch(/'\/administer',\s*\n?\s*requireRole\(WRITE_ROLES\)/);
  });
});

describe('W559 — registry mount', () => {
  test('mounted via dualMountAuth, not plain dualMount', () => {
    expect(registrySrc).toMatch(
      /dualMountAuth\(app,\s*'digital-assessment',\s*digitalAssessmentRoutes,\s*authenticate\)/
    );
    expect(registrySrc).toMatch(/safeRequire\('\.\.\/routes\/digital-assessment\.routes'\)/);
  });
});
