/**
 * W508 — close cross-branch IDOR on crm-enhanced.routes.js (12 sites
 * across CrmLead / CrmPartner / CrmCampaign / CrmSegment / CrmSurvey).
 *
 * Pre-W508 the file relied on `router.use(requireBranchAccess)` at
 * mount-time, but requireBranchAccess only rejects requests that
 * EXPLICITLY name a foreign branchId in query/body — it does NOT
 * filter document queries scoped to URL `:id` params.
 *
 * So every per-id read/write looked like:
 *
 *   const lead = await CrmLead.findById(req.params.id);            // line 213
 *   const lead = await CrmLead.findByIdAndUpdate(req.params.id, ...);
 *
 * An authenticated caller in branch A could enumerate CRM IDs and:
 *
 *   - READ leads (PHI-adjacent: name, phone, email, intake details)
 *     from branch B (GET /leads/:id).
 *   - MUTATE branch B leads via PUT /leads/:id (Object.assign with
 *     attacker-controlled body — even though stripUpdateMeta blocks
 *     _id/role/etc, the lead itself becomes attacker-mutated and a
 *     subsequent stat re-aggregation would mis-report branch B).
 *   - SOFT-DELETE branch B leads (DELETE /leads/:id sets deletedAt).
 *   - APPEND ACTIVITIES to branch B leads (POST /:id/activity →
 *     activity log pollution).
 *   - ENROLL branch B leads (POST /:id/enroll → status='enrolled').
 *
 * Same class applies to Partner (3 sites) + Campaign (4 sites) +
 * Segment (3 sites) + Survey (3 sites incl. public-respond) = 12
 * cross-branch IDOR sites total.
 *
 * Fix: import `branchFilter` from middleware/branchScope.middleware
 * and apply at every per-id site:
 *
 *   - Model.findById(req.params.id)
 *   + Model.findOne({ _id: req.params.id, ...branchFilter(req) })
 *
 *   - Model.findByIdAndUpdate(req.params.id, update, opts)
 *   + Model.findOneAndUpdate({ _id: req.params.id, ...branchFilter(req) }, update, opts)
 *
 * branchFilter returns `{ branchId: <caller's branch> }` for tenant-
 * restricted callers, and `{}` for cross-branch-allowed roles (admin,
 * super_admin) — preserving admin-tooling access while blocking
 * tenant-bounded callers. Same pattern as W269.
 *
 * Drift guard: this test scans crm-enhanced.routes.js and asserts:
 *   - NO `findById(req.params.id)` (any form) remains.
 *   - NO `findByIdAndUpdate(req.params.id, ...)` remains.
 *   - branchFilter is imported AND invoked ≥17 times.
 *   - module still loads.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTE_FILE = path.join(__dirname, '..', 'routes', 'crm-enhanced.routes.js');
const src = fs.readFileSync(ROUTE_FILE, 'utf8');

describe('W508 — crm-enhanced.routes.js cross-branch IDOR closed', () => {
  test('NO bare Model.findById(req.params.id) remains (12 sites closed)', () => {
    // Strip comments so the doc-block examples don't false-positive.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map(l => l.replace(/\/\/.*$/, ''))
      .join('\n');
    expect(code).not.toMatch(/\.findById\(\s*req\.params\.id\s*\)/);
  });

  test('NO bare Model.findByIdAndUpdate(req.params.id, ...) remains', () => {
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map(l => l.replace(/\/\/.*$/, ''))
      .join('\n');
    expect(code).not.toMatch(/\.findByIdAndUpdate\(\s*req\.params\.id\s*,/);
  });

  test('branchFilter is imported and invoked at least 17 times', () => {
    expect(src).toMatch(/branchFilter[^a-zA-Z]/);
    expect(src).toMatch(/require\(['"][^'"]*branchScope\.middleware['"]\)/);
    const invocations = (src.match(/branchFilter\(req\)/g) || []).length;
    expect(invocations).toBeGreaterThanOrEqual(17);
  });

  test('W508 doc comment present', () => {
    expect(src).toMatch(/W508/);
  });

  test('module loads without throwing', () => {
    expect(() => require('../routes/crm-enhanced.routes')).not.toThrow();
  });
});
