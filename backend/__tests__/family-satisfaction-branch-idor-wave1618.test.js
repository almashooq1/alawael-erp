/**
 * W1618 — family-satisfaction responses cross-branch PII leak.
 *
 * FamilySatisfactionService reads SurveyResponse (beneficiary name + nationalId)
 * with an OPTIONAL caller-supplied `branch` filter, and getResponseById did a bare
 * findOne({_id}). The route passed req.query straight through, so a restricted
 * user could omit/spoof `branch` and read another branch's responses. The model's
 * tenancy field is `branch` (NOT branchId) → requireBranchAccess is blind to it
 * (it only validates a `branchId`), so nothing gated these reads.
 *
 * Fix: the route forces the caller's branch via effectiveBranchScope(req)
 * (null for cross-branch roles) on getResponses / getResponseById / calculateNPS /
 * generateAnalyticsReport / getDashboard; getResponseById scopes its findOne by branch.
 *
 * Static guard.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROUTE = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'familySatisfaction.routes.js'),
  'utf8'
);
const SVC = fs.readFileSync(
  path.join(__dirname, '..', 'services', 'familySatisfaction.service.js'),
  'utf8'
);

describe('W1618 family-satisfaction response branch isolation', () => {
  test('route imports effectiveBranchScope', () => {
    expect(ROUTE).toMatch(/effectiveBranchScope.*require\(.*assertBranchMatch/);
  });

  test('response reads no longer pass raw req.query.branch unguarded', () => {
    // list/NPS force the caller branch
    expect(ROUTE).toMatch(/getResponses\(\{\s*\.\.\.req\.query,\s*branch: effectiveBranchScope\(req\)/s);
    expect(ROUTE).toMatch(/calculateNPS\(\{\s*\.\.\.req\.query,\s*branch: effectiveBranchScope\(req\)/s);
    // getResponseById passes the caller scope
    expect(ROUTE).toMatch(/getResponseById\(\s*req\.params\.id,\s*effectiveBranchScope\(req\)/s);
    // dashboard + analytics force the caller branch
    expect(ROUTE).toMatch(/getDashboard\(\s*effectiveBranchScope\(req\)/s);
    expect(ROUTE).toMatch(/effectiveBranchScope\(req\) \|\| branch/);
    // the old bare passthrough is gone
    expect(ROUTE).not.toMatch(/getResponseById\(req\.params\.id\)\s*;/);
    expect(ROUTE).not.toMatch(/getDashboard\(req\.query\.branch\)/);
  });

  test('service getResponseById scopes its findOne by branch', () => {
    expect(SVC).toMatch(/getResponseById\(id, branch\)/);
    expect(SVC).toMatch(/findOne\(\{ _id: id, isDeleted: false, \.\.\.\(branch && \{ branch \}\) \}\)/);
  });
});
