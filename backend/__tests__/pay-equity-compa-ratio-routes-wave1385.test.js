'use strict';

/**
 * W1385 — pay-equity compa-ratio route static drift guard.
 * Reads the route source and asserts the 4 new endpoints exist with the right
 * role gates + W269 branch scope + no `req.branchId` leak.
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'hr', 'pay-equity.routes.js'),
  'utf8'
);

describe('W1385 pay-equity compa-ratio routes — static drift guard', () => {
  test('declares the 4 new endpoints', () => {
    expect(SRC).toMatch(/router\.get\(\s*['"]\/compa-ratio['"]/);
    expect(SRC).toMatch(/router\.get\(\s*['"]\/below-band['"]/);
    expect(SRC).toMatch(/router\.get\(\s*['"]\/band-mappings['"]/);
    expect(SRC).toMatch(/router\.post\(\s*['"]\/band-mappings['"]/);
  });

  test('aggregate read uses READ_ROLES; identity-bearing below-band uses the stricter FLAGGED_ROLES', () => {
    expect(SRC).toMatch(/\/compa-ratio['"]\s*,\s*requireRole\(READ_ROLES\)/);
    expect(SRC).toMatch(/\/below-band['"]\s*,\s*requireRole\(FLAGGED_ROLES\)/);
  });

  test('config write (POST band-mappings) is gated to CONFIG_ROLES', () => {
    expect(SRC).toMatch(/CONFIG_ROLES\s*=\s*\[/);
    expect(SRC).toMatch(/\.post\(\s*['"]\/band-mappings['"]\s*,\s*requireRole\(CONFIG_ROLES\)/);
  });

  test('branch scope via effectiveBranchScope (W269); never reads req.branchId', () => {
    // both branch-scoped reads resolve the caller's own branch
    const compaBlock = SRC.slice(SRC.indexOf("'/compa-ratio'"), SRC.indexOf("'/band-mappings'"));
    expect(compaBlock).toMatch(/effectiveBranchScope\(req\)/);
    expect(SRC).not.toMatch(/req\.branchId/); // W269h class — the fallback that silently leaks all branches
  });

  test('self-authenticated (router.use(authenticateToken) + requireBranchAccess)', () => {
    expect(SRC).toMatch(/router\.use\(authenticateToken\)/);
    expect(SRC).toMatch(/router\.use\(requireBranchAccess\)/);
  });

  test('errors mapped: MODEL_UNAVAILABLE→503, VALIDATION→400', () => {
    expect(SRC).toMatch(/MODEL_UNAVAILABLE[\s\S]*?503/);
    expect(SRC).toMatch(/VALIDATION[\s\S]*?400/);
  });
});
