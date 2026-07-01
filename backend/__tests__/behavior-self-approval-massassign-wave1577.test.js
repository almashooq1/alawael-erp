'use strict';

/**
 * W1577 — behavior.routes self-approval + mass-assignment.
 *
 * The route is branch-isolated (router.param recordId/planId/beneficiaryId ownership
 * hooks + effectiveBranchScope on lists/dashboard), but the validate() validators only
 * enum-check status — they don't whitelist — so raw ...req.body reached BehaviorPlan.create
 * and findByIdAndUpdate. A caller could SELF-APPROVE a behavior-intervention plan
 * (status:'active' + approvedBy/approvedAt, bypassing the /plans/:planId/approve endpoint —
 * a clinical authorization bypass), tamper version/isDeleted/createdBy, or forge a reviewed
 * behavior record. Now create/update go through stripPlanFields (which also blocks
 * self-activation to 'active') and records through stripFields(RECORD_SERVER_FIELDS).
 */

const fs = require('fs');
const path = require('path');
const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'domains', 'behavior', 'routes', 'behavior.routes.js'),
  'utf8'
);
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('W1577 behavior self-approval + mass-assignment', () => {
  test('plan create + update strip server fields (no raw body reaches the model)', () => {
    expect(CODE).toMatch(/\.\.\.stripPlanFields\(req\.body\)/);
    expect(CODE).toMatch(/updatePlan\(req\.params\.planId, stripPlanFields\(req\.body\)\)/);
    expect(CODE).not.toMatch(/updatePlan\(req\.params\.planId, req\.body\)/);
  });

  test('self-activation to active is blocked (approval-only path)', () => {
    expect(CODE).toMatch(/if \(clean\.status === 'active'\) delete clean\.status/);
  });

  test('plan protected set covers approval + lifecycle + audit fields', () => {
    for (const f of ['approvedBy', 'approvedAt', 'createdBy', 'isDeleted', 'version', 'branchId']) {
      expect(CODE).toMatch(new RegExp("'" + f + "'"));
    }
  });

  test('record create strips server-set review/status fields', () => {
    expect(CODE).toMatch(/stripFields\(req\.body, RECORD_SERVER_FIELDS\)/);
    expect(CODE).toMatch(/'reviewedBy'/);
    expect(CODE).toMatch(/'reviewedAt'/);
  });
});
