/**
 * W1193 — static drift guard for the pay-equity route surface + its mount.
 * Salary data is sensitive: this locks self-auth, branch isolation (W269), role
 * gating, and the endpoint set so a refactor can't silently widen exposure.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTE = path.join(__dirname, '..', 'routes', 'hr', 'pay-equity.routes.js');
const REGISTRY = path.join(__dirname, '..', 'routes', 'registries', 'hr.registry.js');
const src = fs.readFileSync(ROUTE, 'utf8');
const reg = fs.readFileSync(REGISTRY, 'utf8');

describe('W1193 pay-equity routes — auth + branch isolation', () => {
  test('router self-authenticates (authenticateToken) + requireBranchAccess', () => {
    expect(src).toMatch(/router\.use\(\s*authenticateToken\s*\)/);
    expect(src).toMatch(/router\.use\(\s*requireBranchAccess\s*\)/);
  });

  test('uses effectiveBranchScope (W269) and NEVER reads req.branchId', () => {
    expect(src).toMatch(/effectiveBranchScope\(req\)/);
    expect(src).not.toMatch(/req\.branchId/); // W269h class — always undefined
  });

  test('every route is role-gated (requireRole on each verb)', () => {
    const verbs = [...src.matchAll(/router\.(get|post)\(\s*'[^']+'\s*,\s*([A-Za-z_$][\w$]*)/g)];
    expect(verbs.length).toBe(9); // analysis, flagged, snapshot, snapshots, trends, compa-ratio, below-band, band-mappings (get+post)
    for (const m of verbs) {
      expect(m[2]).toBe('requireRole');
    }
  });

  test('the identity-bearing /flagged route uses the stricter FLAGGED_ROLES', () => {
    expect(src).toMatch(/FLAGGED_ROLES\s*=/);
    expect(src).toMatch(/'\/flagged',\s*requireRole\(FLAGGED_ROLES\)/);
  });
});

describe('W1193 pay-equity routes — endpoint set + mount', () => {
  test('exposes the documented endpoints', () => {
    for (const [verb, p] of [
      ['get', '/analysis'],
      ['get', '/flagged'],
      ['post', '/snapshot'],
      ['get', '/snapshots'],
      ['get', '/trends'],
      ['get', '/compa-ratio'],
      ['get', '/below-band'],
      ['get', '/band-mappings'],
      ['post', '/band-mappings'],
    ]) {
      expect(src).toMatch(new RegExp(`router\\.${verb}\\(\\s*'${p}'`));
    }
  });

  test('mounted in hr.registry at /api(/v1)?/hr/pay-equity', () => {
    expect(reg).toMatch(/pay-equity\.routes/);
    expect(reg).toMatch(/app\.use\(\s*'\/api\/hr\/pay-equity'/);
    expect(reg).toMatch(/app\.use\(\s*'\/api\/v1\/hr\/pay-equity'/);
  });

  test('aggregate /analysis strips individual identities (flagged removed from summary)', () => {
    // the summary surface must not leak the flagged[] identities — only a count
    expect(src).toMatch(/const\s*\{\s*flagged,\s*\.\.\.summary\s*\}\s*=\s*a/);
    expect(src).toMatch(/flaggedCount:\s*flagged\.length/);
  });
});
