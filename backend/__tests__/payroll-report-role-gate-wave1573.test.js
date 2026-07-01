'use strict';

/**
 * payroll-report-role-gate-wave1573.test.js — W1573 (static drift guard)
 *
 * P0 fix: payroll report/stats/compensation READ endpoints exposed every
 * employee's nationalId / iqamaNumber / bankAccount / salary to ANY
 * authenticated user (therapist, receptionist, parent-portal JWT) — they had
 * only `authenticateToken` + `requireBranchAccess` (which does NOT restrict by
 * role), while the file's own payroll-lifecycle routes correctly use
 * `requireRole('hr','admin','payroll')`.
 *
 * This guard asserts every salary/PII read route now carries a role gate.
 * Static (source-regex) only — no jest.unmock/DB — so it is NOT enumerated in
 * sprint-tests.txt and does not touch the sprint-tests.yml paths list.
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'payroll.routes.js'),
  'utf8'
);
const LINES = SRC.split('\n');

/**
 * Returns true if the route whose path literal is `routePath` has a
 * `requireRole(...)` middleware within its declaration (before the handler).
 */
function routeIsRoleGated(routePath) {
  for (let i = 0; i < LINES.length; i++) {
    if (!LINES[i].includes(`'${routePath}'`)) continue;
    // Must be an actual route declaration: `router.get(` on this line, or on the
    // previous line (multi-line signature). Skips the `endpoints:` doc array.
    const inlineGet = /router\.get\(/.test(LINES[i]);
    const prevGet = i > 0 && /router\.get\(\s*$/.test(LINES[i - 1]);
    if (!inlineGet && !prevGet) continue;
    const start = inlineGet ? i : i - 1;
    const window = LINES.slice(start, start + 8).join('\n');
    const handlerCut = window.split(/async \(req/)[0];
    return { found: true, gated: /requireRole\(/.test(handlerCut) };
  }
  return { found: false, gated: false };
}

describe('W1573 — payroll report/compensation reads are role-gated (P0 PII leak)', () => {
  const SALARY_PII_READS = [
    '/stats/:month/:year',
    '/reports/wps/:month/:year',
    '/reports/gosi/:month/:year',
    '/reports/bank-transfer/:month/:year',
    '/reports/department-comparison/:month/:year',
    '/reports/annual-summary/:year',
    '/reports/variance/:month/:year',
    '/reports/employee-cost/:employeeId/:year',
    '/reports/deductions/:month/:year',
    '/compensation/benefits-summary/:employeeId/:year',
    '/compensation/structures',
    '/compensation/incentives/pending',
  ];

  test.each(SALARY_PII_READS)('%s carries a requireRole gate', routePath => {
    const r = routeIsRoleGated(routePath);
    expect(r.found).toBe(true);
    expect(r.gated).toBe(true);
  });

  test('the file still uses requireRole (import + payroll-lifecycle pattern) — helper present', () => {
    expect(SRC).toMatch(/const \{ authenticateToken, requireRole \} = require\('\.\.\/middleware\/auth'\)/);
    expect(SRC).toMatch(/requireRole\('hr', 'admin', 'payroll'\)/);
  });

  test('no salary report route is left with only authenticateToken + requireBranchAccess before its handler', () => {
    // Every `/reports/...` GET must have requireRole before the handler.
    const reportPaths = [...SRC.matchAll(/'(\/reports\/[^']+)'/g)].map(m => m[1]);
    const ungated = reportPaths.filter(p => {
      const r = routeIsRoleGated(p);
      return r.found && !r.gated;
    });
    expect(ungated).toEqual([]);
  });
});
