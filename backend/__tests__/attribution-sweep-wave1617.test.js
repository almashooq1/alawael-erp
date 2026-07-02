'use strict';
/**
 * W1617 — codebase-wide sweep of the approval/signature/verification ATTRIBUTION mass-assignment class
 * (continuation of W1614 #963 + W1616 #969). Every `Model.create({ ...req.body })` / `new Model(...)`
 * into a model that declares an attribution field (approvedBy/signedBy/verifiedBy/reviewedBy/…) is
 * wrapped in `stripApprovalAttribution` so a caller cannot forge "approved/signed/verified by X" on create.
 *
 * Notable: volunteer `POST /register` is a PUBLIC endpoint — a self-registering volunteer could
 * otherwise forge `verifiedBy` (self-verification). work-shifts is a second OvertimeRequest producer.
 */
const fs = require('fs');
const path = require('path');
const R = (f) => fs.readFileSync(path.join(__dirname, '..', 'routes', f), 'utf8');

// [file, create marker, expected wrapped body expression]
const CASES = [
  ['cdss.routes.js', 'ClinicalRule.create', 'stripApprovalAttribution(stripUpdateMeta(req.body))'],
  ['contract-management.routes.js', 'ContractParty.create', 'stripApprovalAttribution(req.body)'],
  ['contract-management.routes.js', 'ContractAmendment.create', 'stripApprovalAttribution(req.body)'],
  ['elearning-enhanced.routes.js', 'const record = await CpdRecord.create', 'stripApprovalAttribution(req.body)'],
  ['hrAdvanced.routes.js', 'SuccessionPlan.create', 'stripApprovalAttribution(req.body)'],
  ['recruitment.routes.js', 'JobOffer.create', 'stripApprovalAttribution(req.body)'],
  ['successionPlanning.routes.js', 'new SuccessionPlan', 'stripApprovalAttribution(req.body)'],
  ['trips.js', 'Trip.create', 'stripApprovalAttribution(req.body)'],
  ['work-shifts.routes.js', 'OvertimeRequest.create', 'stripApprovalAttribution(req.body)'],
];

describe('W1617 attribution-sweep — create sites strip attribution', () => {
  test.each(CASES)('%s — %s wraps body in %s', (file, marker, expr) => {
    const src = R(file);
    expect(src).toMatch(/stripApprovalAttribution/);
    const i = src.indexOf(marker);
    expect(i).toBeGreaterThan(-1);
    const region = src.slice(i, i + 160);
    expect(region).toContain('...' + expr);
    // the specific create no longer spreads a bare req.body
    expect(region).not.toMatch(/\.\.\.\s*req\.body\b/);
  });

  test('volunteer — both Volunteer.create sites (incl. public /register) strip attribution', () => {
    const src = R('volunteer.routes.js');
    const matches = src.match(/Volunteer\.create\(\{\s*\.\.\.\s*stripApprovalAttribution\(req\.body\)/g) || [];
    expect(matches.length).toBe(2);
    expect(src).not.toMatch(/Volunteer\.create\(\{\s*\.\.\.\s*req\.body\b/);
  });
});
