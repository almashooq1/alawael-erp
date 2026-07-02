'use strict';

/**
 * W1607 — ZATCA e-invoicing credentials are per-branch (ZatcaCredential.branchId), but
 * zatca-credentials-admin had only authenticateToken — no branch guard. READ_ROLES
 * (admin/superadmin/manager/finance/accountant) and WRITE_ROLES include branch-level roles
 * (manager/finance/accountant are NOT in CROSS_BRANCH_ROLES → restricted), so a branch
 * caller could read / rotate / delete / redact ANOTHER branch's e-invoicing credentials
 * (8 findById + list + create) by id. Highly sensitive (CSIDs / private keys).
 *
 * Fix: router.use(requireBranchAccess) + branchFilter(req) on the list and every id lookup
 * (findById → findOne with branch scope), and effectiveBranchScope forces the create's
 * branchId so a restricted caller can't provision credentials for a foreign branch.
 * Cross-branch roles (CROSS_BRANCH_ROLES) are unaffected (branchFilter → {}).
 */

const fs = require('fs');
const path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'routes', 'zatca-credentials-admin.routes.js'), 'utf8');

describe('W1607 zatca-credentials-admin is branch-scoped', () => {
  test('applies requireBranchAccess + imports branchFilter/effectiveBranchScope', () => {
    expect(SRC).toMatch(/router\.use\(\s*requireBranchAccess\s*\)/);
    expect(SRC).toMatch(/branchScope\.middleware/);
    expect(SRC).toMatch(/effectiveBranchScope/);
  });

  test('no bare ZatcaCredential.findById(req.params.id) remains', () => {
    expect(SRC).not.toMatch(/ZatcaCredential\.findById\(\s*req\.params\.id\s*\)/);
    // every id lookup goes through findOne with branchFilter
    expect((SRC.match(/branchFilter\(req\)/g) || []).length).toBeGreaterThanOrEqual(8);
  });

  test('list is branch-scoped and the create forces the scoped branch', () => {
    expect(SRC).toMatch(/const filter = \{ \.\.\.branchFilter\(req\) \}/);
    expect(SRC).toMatch(/if \(scope\) body\.branchId = String\(scope\)/);
  });
});
