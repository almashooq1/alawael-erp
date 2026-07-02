'use strict';
/**
 * W1615 — biometric-attendance write-IDOR. OvertimeRequest + AttendancePolicy are per-branch
 * (branchId required) and the router applies requireBranchAccess, but PUT /overtime/:id/approve
 * and PUT /policies/:id updated by id with no branch scope → a branch caller could approve
 * another branch's overtime or edit another branch's attendance policy by id. Scoped to
 * findOneAndUpdate({ _id, ...branchFilter(req) }).
 */
const fs = require('fs');
const path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'routes', 'biometric-attendance.routes.js'), 'utf8');
describe('W1615 biometric-attendance write-IDOR scoped', () => {
  test('router applies requireBranchAccess', () => {
    expect(SRC).toMatch(/router\.use\(\s*requireBranchAccess\s*\)/);
  });
  test('no bare OvertimeRequest/AttendancePolicy findByIdAndUpdate', () => {
    expect(SRC).not.toMatch(/OvertimeRequest\.findByIdAndUpdate\(/);
    expect(SRC).not.toMatch(/AttendancePolicyModel\.findByIdAndUpdate\(/);
    expect((SRC.match(/findOneAndUpdate\(\s*\{ _id: req\.params\.id, \.\.\.branchFilter\(req\) \}/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});
