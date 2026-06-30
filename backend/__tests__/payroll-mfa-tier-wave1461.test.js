'use strict';

/**
 * W1461 — payroll financial mutations require step-up MFA (ADR-019 doctrine).
 *
 * CLAUDE.md: "Don't bypass loadMfaActor middleware on routes that touch ... payroll
 * override." The standalone routes/payroll.routes.js carried authenticateToken +
 * requireRole but NO MFA tier, and the W273b drift guard did not scan it (blind spot).
 * This guard locks attachMfaActor + requireMfaTier(2) onto the financial-mutation routes.
 *
 * NOTE: this backend gate is one half of a cross-repo slice. It is paired with the
 * web-admin step-up wiring (MfaChallengeDialog on the payroll pages) so the
 * MFA_TIER_REQUIRED 403 prompts a step-up instead of blocking payroll. Ship + verify
 * E2E on staging before production.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'payroll.routes.js'), 'utf8');

const FINANCIAL_ROUTES = [
  '/:payrollId/approve',
  '/:payrollId/process',
  '/:payrollId/transfer',
  '/:payrollId/confirm-payment',
  '/process-monthly',
];

describe('W1461 payroll financial routes are MFA-tier gated', () => {
  test('imports attachMfaActor + requireMfaTier', () => {
    expect(src).toMatch(/\{\s*attachMfaActor,\s*requireMfaTier\s*\}\s*=\s*require\(['"]\.\.\/middleware\/requireMfaTier['"]\)/);
  });

  test.each(FINANCIAL_ROUTES)('%s carries attachMfaActor + requireMfaTier(2)', route => {
    const idx = src.indexOf("'" + route + "'");
    expect(idx).toBeGreaterThan(-1);
    const block = src.slice(idx, idx + 400); // the route's middleware chain
    expect(block).toMatch(/attachMfaActor/);
    expect(block).toMatch(/requireMfaTier\(2\)/);
  });

  test('attachMfaActor is wired before requireMfaTier on each route (actor populated first)', () => {
    FINANCIAL_ROUTES.forEach(route => {
      const idx = src.indexOf("'" + route + "'");
      const block = src.slice(idx, idx + 400);
      expect(block.indexOf('attachMfaActor')).toBeLessThan(block.indexOf('requireMfaTier(2)'));
    });
  });
});
