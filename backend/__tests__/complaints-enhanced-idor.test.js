/**
 * Complaints-enhanced cross-branch IDOR guard (2026-06-29 hunt).
 *
 * The base complaints.routes.js is already branch-scoped (W866). The enhanced
 * file (ComplaintV2 / ComplaintCategory / ComplaintSlaConfig / CrmFeedback — all
 * with required branchId) mounted requireBranchAccess but never spread a branch
 * filter into ANY query, so a restricted branch-A user could read/edit/escalate/
 * rate/soft-delete any branch's complaint by id (PII) and list/stats/analytics
 * trusted an attacker-chosen ?branchId (or none → all branches).
 *
 * Fix: import branchFilter as branchScope; every :id op uses
 * findOne/findOneAndUpdate({ _id, deletedAt:null, ...branchScope(req) }); every
 * list/stats/analytics/feedback/category/sla filter is Object.assign'd with
 * branchScope(req); escalate snapshots fromStatus before mutating.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '../routes/complaints-enhanced.routes.js'),
  'utf8'
);

describe('complaints-enhanced — cross-branch isolation', () => {
  test('imports branchFilter (as branchScope)', () => {
    expect(SRC).toMatch(/branchFilter:\s*branchScope\s*\}\s*=\s*require\('\.\.\/middleware\/branchScope\.middleware'\)/);
  });

  test('no raw findById(req.params.id) / findByIdAndUpdate(req.params.id) remains', () => {
    expect(SRC).not.toMatch(/\.findById\(req\.params\.id/);
    expect(SRC).not.toMatch(/\.findByIdAndUpdate\(req\.params\.id/);
    expect(SRC).not.toMatch(/\.findByIdAndUpdate\(\s*\n\s*req\.params\.id,/);
  });

  test('every :id op is branch-scoped (13 sites)', () => {
    const count = (SRC.match(/_id: req\.params\.id, deletedAt: null, \.\.\.branchScope\(req\)/g) || [])
      .length;
    expect(count).toBe(13);
  });

  test('list/stats/analytics/category/sla filters use branchScope, not client ?branchId', () => {
    const objAssign = (SRC.match(/Object\.assign\(filter, branchScope\(req\)\)/g) || []).length;
    expect(objAssign).toBe(6);
    // no handler trusts a raw client branchId into the filter anymore
    expect(SRC).not.toMatch(/if \(branchId\) filter\.branchId = branchId/);
    expect(SRC).not.toMatch(/const filter = branchId \?/);
  });

  test('escalate snapshots the prior status before mutating (fromStatus audit)', () => {
    const i = SRC.indexOf("router.post('/:id/escalate'");
    const block = SRC.slice(i, i + 2200);
    expect(block).toMatch(/const oldStatus = complaint\.status;/);
    expect(block).toMatch(/fromStatus: oldStatus/);
    // the bug was reading complaint.status AFTER setting it to 'escalated'
    expect(block).not.toMatch(/fromStatus: complaint\.status/);
  });
});
