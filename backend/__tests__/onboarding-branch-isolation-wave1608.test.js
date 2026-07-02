'use strict';

/**
 * W1608 — onboarding-admin: OnboardingChecklist is per-branch, but the surface had only
 * authenticateToken. READ/WRITE_ROLES include branch-level roles (manager/hr/hr_manager ∉
 * CROSS_BRANCH_ROLES → restricted). The list/overview/by-status/task-completion/by-responsible/
 * trend endpoints ran `find({})` (all branches), and PATCH /:id + /:id/tasks/:idx loaded/updated
 * by id with no branch check → a branch caller saw + MODIFIED every branch's onboarding.
 *
 * Fix: router.use(requireBranchAccess); branchFilter(req) on every read/aggregate; buildFilter
 * takes the scoped branch (restricted → locked, cross-branch → {} + optional ?branchId=); the two
 * PATCH writes scope by branch (findByIdAndUpdate → findOneAndUpdate + branchFilter; findById →
 * findOne + branchFilter).
 */

const fs = require('fs');
const path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'routes', 'onboarding-admin.routes.js'), 'utf8');

describe('W1608 onboarding-admin is branch-scoped', () => {
  test('applies requireBranchAccess + imports branchFilter', () => {
    expect(SRC).toMatch(/router\.use\(\s*requireBranchAccess\s*\)/);
    expect(SRC).toMatch(/branchScope\.middleware/);
  });

  test('no unscoped find({}) and no bare write-by-id remain', () => {
    expect(SRC).not.toMatch(/OnboardingChecklist\.find\(\{\}\)/);
    expect(SRC).not.toMatch(/OnboardingChecklist\.findById\(\s*req\.params\.id\s*\)/);
    expect(SRC).not.toMatch(/OnboardingChecklist\.findByIdAndUpdate\(\s*req\.params\.id/);
    expect((SRC.match(/branchFilter\(req\)/g) || []).length).toBeGreaterThanOrEqual(8);
  });

  test('buildFilter locks to the scoped branch and the PATCH writes scope by branch', () => {
    expect(SRC).toMatch(/function buildFilter\(q, scopedBranchId\)/);
    expect(SRC).toMatch(/buildFilter\(req\.query, branchFilter\(req\)\.branchId\)/);
    expect(SRC).toMatch(/findOneAndUpdate\(\s*\{ _id: req\.params\.id, \.\.\.branchFilter\(req\) \}/);
  });
});
