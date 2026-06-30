'use strict';

/**
 * W1560 — the core domain mount must populate req.branchScope (REVIEW).
 *
 * The live /api/v1/core registry mount applies `authenticate` ONLY (no
 * requireBranchAccess), so req.branchScope was NEVER set → every branch-isolation
 * guard on the central beneficiary-PHI surface (branchScopedBeneficiaryParam,
 * bodyScopedBeneficiaryGuard, effectiveBranchScope in handlers) silently no-op'd →
 * cross-tenant PHI read/write leak (same #769-class as the merge doctrine warns).
 * core.routes.js now self-wires requireBranchAccess so the guards actually fire.
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'domains', 'core', 'routes', 'core.routes.js'),
  'utf8'
);
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('W1560 core mount populates branchScope', () => {
  test('requireBranchAccess is required + applied', () => {
    expect(CODE).toMatch(/require\(['"][^'"]*branchScope\.middleware['"]\)/);
    expect(CODE).toMatch(/router\.use\(requireBranchAccess\)/);
  });

  test('requireBranchAccess runs BEFORE the beneficiary param/body guards', () => {
    const ra = CODE.indexOf('router.use(requireBranchAccess)');
    expect(ra).toBeGreaterThan(-1);
    expect(ra).toBeLessThan(CODE.indexOf("router.param('beneficiaryId'"));
    expect(ra).toBeLessThan(CODE.indexOf('router.use(bodyScopedBeneficiaryGuard)'));
  });
});
