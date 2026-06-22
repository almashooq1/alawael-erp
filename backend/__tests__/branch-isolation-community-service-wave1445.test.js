'use strict';

/**
 * W1445 — Community Service (System 42) cross-branch isolation drift guard.
 *
 * BUG (pre-fix): community-service.routes.js was mounted via `safeMount` (no
 * middleware injection) and self-applied only `requireBranchAccess`, which blocks
 * an EXPLICIT foreign `?branchId=` but does NOT filter queries and does NOT protect
 * `/:id` lookups. Every list/stats handler built `filter = branchId ? {branchId} : {}`
 * from a user-supplied `req.query.branchId`/`x-branch-id`, so a restricted caller who
 * omitted it saw ALL branches; every `:id` handler did a bare `findById(req.params.id)`
 * → cross-branch IDOR (read/update/delete any branch's record, incl. consent-gated
 * CommunityReferral PII). The six models all carry `branchId: { ref:'Branch', required:true }`.
 *
 * FIX: import `branchFilter` and apply the W448 sibling pattern (volunteer.routes.js):
 * `{ ...branchFilter(req) }` on every query, `findOne/findOneAndUpdate({ _id, ...branchFilter(req) })`
 * on every id-keyed handler. This guard locks the pattern so it can't silently regress.
 */

const fs = require('fs');
const path = require('path');

const ROUTE_FILE = path.join(__dirname, '..', 'routes', 'community-service.routes.js');
const src = fs.readFileSync(ROUTE_FILE, 'utf8');

describe('W1445 community-service branch isolation drift guard', () => {
  test('imports branchFilter from branchScope.middleware', () => {
    expect(src).toMatch(
      /const\s*\{[^}]*\bbranchFilter\b[^}]*\}\s*=\s*require\(['"]\.\.\/middleware\/branchScope\.middleware['"]\)/
    );
  });

  test('never trusts a user-supplied branchId (no req.query.branchId / x-branch-id reads)', () => {
    expect(src).not.toMatch(/req\.query\.branchId/);
    expect(src).not.toMatch(/x-branch-id/);
  });

  test('no bare findById/findByIdAndUpdate on a path param (id lookups must be branch-scoped)', () => {
    expect(src).not.toMatch(/findById\(\s*req\.params/);
    expect(src).not.toMatch(/findByIdAndUpdate\(\s*req\.params/);
  });

  test('every req.params.id query is scoped with ...branchFilter(req)', () => {
    // Each id-keyed Mongoose call uses the `{ _id: req.params.id, ...branchFilter(req) }` shape.
    const scopedIdLookups = (
      src.match(/_id:\s*req\.params\.id,\s*\.\.\.branchFilter\(req\)/g) || []
    ).length;
    // 11 id-keyed handlers: programs(GET/PUT/DELETE), events(GET/PUT/DELETE),
    // partnerships(PUT/DELETE), resources(PUT), referrals(PATCH status).
    expect(scopedIdLookups).toBeGreaterThanOrEqual(10);
  });

  test('branchFilter(req) is applied broadly across list/stats handlers', () => {
    const applications = (src.match(/branchFilter\(req\)/g) || []).length;
    expect(applications).toBeGreaterThanOrEqual(15);
  });

  test('still mounts authenticate + requireBranchAccess + role gate', () => {
    expect(src).toMatch(/router\.use\(authenticate\)/);
    expect(src).toMatch(/router\.use\(requireBranchAccess\)/);
    expect(src).toMatch(/router\.use\(authorize\(COMMUNITY_ROLES\)\)/);
  });
});
