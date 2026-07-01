/**
 * Security regression guard — risk-sweep cross-branch isolation.
 *
 * routes/risk-sweep.routes.js (W289) exposes RiskSnapshot clinical risk data over
 * HTTP. Its branch isolation was DEAD: the helper read `req.mfaActor.tier` (the
 * middleware sets `req.actor`, not `req.mfaActor` — always undefined since W289) and
 * `req.user.branchId` (never populated on this router — no requireBranchAccess → no
 * W930 enrich). Net effect (a LIVE cross-branch leak):
 *   - GET /snapshots          → actorBranchOrQuery fell through to a SPOOFABLE
 *                               `?branchId` (any tier-1 actor read any branch).
 *   - GET /beneficiary/:id/trend → NO branch filter at all; the post-hoc tier<2
 *                               check never fired (any tier-1 read any beneficiary).
 *
 * Fix (W269 canonical): mount requireBranchAccess, source the branch from
 * effectiveBranchScope(req), and branch-filter the /trend query. This guard locks
 * that so the dead-isolation pattern can't return. Static source read (no mongoose).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'risk-sweep.routes.js'),
  'utf8'
);
function stripComments(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ''.padEnd(m.length - p1.length, ' '));
}
const CODE = stripComments(SRC);

describe('risk-sweep cross-branch isolation (W269)', () => {
  test('no active req.mfaActor read (the field was never set; canonical is req.actor)', () => {
    expect(CODE).not.toMatch(/\breq\.mfaActor\b/);
  });

  test('router mounts requireBranchAccess (populates req.branchScope + W930 enrich + rejects foreign branchId)', () => {
    expect(CODE).toMatch(/router\.use\(\s*requireBranchAccess\s*\)/);
    expect(CODE).toMatch(/require\(['"]\.\.\/middleware\/branchScope\.middleware['"]\)/);
  });

  test('the branch source helper uses effectiveBranchScope, not a spoofable ?branchId fallthrough', () => {
    expect(CODE).toMatch(/function actorBranchOrQuery\(req\)\s*\{[\s\S]*?return effectiveBranchScope\(req\)/);
    // the old spoofable fallthrough must be gone
    expect(CODE).not.toMatch(/return own \|\| queried \|\| null/);
  });

  test('GET /beneficiary/:id/trend branch-filters its query (no more unscoped find)', () => {
    expect(CODE).toMatch(/RiskSnapshot\.find\(\{\s*beneficiaryId\s*,\s*\.\.\.branchFilter\(req\)/);
    expect(CODE).not.toMatch(/RiskSnapshot\.find\(\{\s*beneficiaryId\s*\}\)/);
  });

  test('no branch decision keys off the never-populated req.user.branchId', () => {
    // the post-hoc checks + helper must derive scope from effectiveBranchScope,
    // not req.user.branchId (which is undefined on this router).
    expect(CODE).not.toMatch(/req\.user\.branchId/);
  });
});
