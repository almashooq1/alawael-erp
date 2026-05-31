'use strict';

/**
 * risk-appointment-branch-scope-wave663.test.js
 * ════════════════════════════════════════════════════════════════════
 * R4 Phase-B route-scoping — more branchId-bearing models found by verifying
 * (not assuming) the remaining shortlist:
 *   - Risk/EnterpriseRisk (models/EnterpriseRisk, branchId camelCase) —
 *     enterprise-risk /dashboard had 3 unscoped Risk aggregates + a topRisks
 *     find. Scoped via branchFilter(req).
 *   - Appointment (models/scheduling/Appointment, SNAKE_CASE `branch_id`
 *     required) — scheduling-module workload aggregate. Scoped via a snake-case
 *     translation of the branchFilter envelope (camelCase branchId → branch_id).
 *
 * The snake_case case is the trap: blindly spreading branchFilter (branchId)
 * onto a branch_id model would scope a nonexistent field → empty results.
 */

const fs = require('fs');
const path = require('path');

const RISK = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'enterprise-risk.routes.js'),
  'utf8'
);
const SCHED = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'scheduling-module.routes.js'),
  'utf8'
);

describe('W663 — Risk + Appointment aggregates are branch-scoped', () => {
  it('enterprise-risk imports branchFilter + scopes every Risk aggregate', () => {
    expect(RISK).toMatch(/branchFilter/);
    const bodies = RISK.match(/Risk\.aggregate\s*\(\s*\[[^]*?\$match[^]*?\}/g) || [];
    expect(bodies.length).toBeGreaterThanOrEqual(3);
    expect(bodies.every(b => /\$match:\s*\{\s*\.\.\._rs\s*\}/.test(b))).toBe(true);
    // topRisks find is scoped too
    expect(RISK).toMatch(/Risk\.find\(\{\s*\.\.\._rs/);
  });

  it('scheduling-module scopes Appointment via SNAKE-CASE branch_id (not camelCase)', () => {
    expect(SCHED).toMatch(/branchFilter/);
    // translates branchFilter.branchId → { branch_id: ... } (model is snake_case)
    expect(SCHED).toMatch(/branch_id:\s*_bf\.branchId/);
    // and the workload aggregate matches that scoped filter
    expect(SCHED).toMatch(/Appointment\.aggregate\s*\(\s*\[\s*\{\s*\$match:\s*filter/);
  });
});
