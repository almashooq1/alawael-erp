'use strict';

/**
 * hr-pii-read-role-gates-wave1574.test.js — W1574 (static drift guard)
 *
 * P0-class fix (sibling of W1573): unguarded HR PII read endpoints exposed
 * sensitive data to ANY authenticated user (only authenticateToken +
 * requireBranchAccess, which does NOT restrict by role):
 *   - gratuity.routes.js: end-of-service settlement amounts + bank details
 *   - hr-insurance.routes.js: employee health-insurance PII (national IDs,
 *     policy/member numbers, dependents, claims)
 * Both files already role-gate their OTHER routes with authorizeRole(...);
 * these reads simply omitted it. Models have no branch field → role-gate is the
 * immediate fix (branch isolation = migration follow-up).
 *
 * Static (source-regex) only — no jest.unmock/DB — so it is NOT enumerated in
 * sprint-tests.txt and does not touch the sprint-tests.yml paths list.
 */

const fs = require('fs');
const path = require('path');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', 'routes', file), 'utf8');
}

function routeIsRoleGated(src, routePath) {
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes(`'${routePath}'`)) continue;
    const inlineGet = /router\.get\(/.test(lines[i]);
    const prevGet = i > 0 && /router\.get\(\s*$/.test(lines[i - 1]);
    if (!inlineGet && !prevGet) continue;
    const start = inlineGet ? i : i - 1;
    const handlerCut = lines.slice(start, start + 8).join('\n').split(/async \(req/)[0];
    return { found: true, gated: /authorizeRole\(|authorize\(|requireRole\(/.test(handlerCut) };
  }
  return { found: false, gated: false };
}

describe('W1574 — gratuity settlement/IBAN reads are role-gated', () => {
  const src = read('gratuity.routes.js');
  const READS = ['/:gratuityId', '/employee/:employeeId', '/:gratuityId/audit-trail'];
  test.each(READS)('gratuity GET %s carries a role gate', p => {
    const r = routeIsRoleGated(src, p);
    expect(r.found).toBe(true);
    expect(r.gated).toBe(true);
  });
  test('file uses authorizeRole (helper present)', () => {
    expect(src).toMatch(/authorizeRole\(\['hr', 'finance', 'admin'\]\)/);
  });
});

describe('W1574 — hr-insurance PII reads are role-gated', () => {
  const src = read('hr-insurance.routes.js');
  const READS = ['/', '/:id', '/:id/claims', '/employee/:employeeId'];
  test.each(READS)('hr-insurance GET %s carries a role gate', p => {
    const r = routeIsRoleGated(src, p);
    expect(r.found).toBe(true);
    expect(r.gated).toBe(true);
  });
  test('file uses authorizeRole (helper present)', () => {
    expect(src).toMatch(/authorizeRole\(\['Admin', 'HR', 'admin', 'hr_manager'\]\)/);
  });
});
