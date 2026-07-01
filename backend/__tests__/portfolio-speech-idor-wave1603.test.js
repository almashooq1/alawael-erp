'use strict';

/**
 * W1603 — cross-branch PHI IDOR surfaced by a precise findById-IDOR scan (tenant-scoped
 * model + no ownership check), on two non-parallel-domain surfaces:
 *  - portfolio: GET /:id (findById), /by-beneficiary/:id, /milestones/:id all read Portfolio
 *    (beneficiaryId + branchId) with only a visibility filter → a restricted staff user read
 *    any branch's beneficiary portfolio by id. Added requireBranchAccess + branchFilter(req)
 *    to all three reads (findById → findOne + branch scope).
 *  - speech GET /recordings/:id + list + create used `req.user?.branchId` for branch isolation,
 *    which is unset unless the W930 enrich flag is on → the check silently no-ops. Switched to
 *    the canonical effectiveBranchScope(req) (with requireBranchAccess to set req.branchScope).
 */

const fs = require('fs');
const path = require('path');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', 'routes', p), 'utf8');

describe('W1603 portfolio + speech branch-scoped reads', () => {
  test('portfolio applies requireBranchAccess + scopes all 3 Portfolio reads with branchFilter', () => {
    const s = read('portfolio.routes.js');
    expect(s).toMatch(/router\.use\(\s*requireBranchAccess\s*\)/);
    expect(s).toMatch(/branchScope\.middleware/);
    // GET /:id must not use bare findById(req.params.id)
    expect(s).not.toMatch(/Portfolio\.findById\(\s*req\.params\.id\s*\)/);
    // all three reads spread branchFilter(req)
    expect((s.match(/branchFilter\(req\)/g) || []).length).toBeGreaterThanOrEqual(3);
  });

  test('speech uses effectiveBranchScope (not the fragile req.user.branchId) for isolation', () => {
    const s = read('speech.routes.js');
    expect(s).toMatch(/router\.use\(\s*requireBranchAccess\s*\)/);
    // the read-check + list-filter use effectiveBranchScope
    expect(s).toMatch(/const userBranch = effectiveBranchScope\(req\)/);
    expect(s).toMatch(/const _scope = effectiveBranchScope\(req\)/);
    // no branch-CHECK still keyed off a bare req.user.branchId compare
    expect(s).not.toMatch(/const userBranch = req\.user\?\.branchId/);
  });

  test('notification-enhanced scopes broadcast/escalation reads by branch', () => {
    const s = read('notification-enhanced.routes.js');
    expect(s).toMatch(/branchFilter/);
    expect(s).not.toMatch(/BroadcastMessage\.findById\(\s*req\.params\.id\s*\)/);
    expect(s).not.toMatch(/Escalation\.findById\(\s*req\.params\.id\s*\)/);
  });

  test('maintenance scopes the request read by branch', () => {
    const s = read('maintenance.js');
    expect(s).toMatch(/branchFilter/);
    expect(s).not.toMatch(/MaintenanceRequest\.findById\(\s*req\.params\.id\s*\)/);
  });
});
