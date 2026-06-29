/**
 * Waitlist / BeneficiaryService phantom-query + data-loss guards (2026-06-29).
 *
 * BeneficiaryService queried `branch:` on the Beneficiary model, whose branch
 * field is `branchId` (no `branch` alias/virtual) → strict-mode-irrelevant but the
 * query matched ZERO docs, so:
 *   - checkBranchCapacity: activeCount always 0 → capacity gate NEVER fired
 *     (branches enrolled past maxCapacity)
 *   - checkDuplicateRegistration: in-branch + elsewhere checks matched nothing
 *     (duplicate national-id registration not blocked)
 *   - getQuickStats: branch-filtered counts always 0
 *
 * waitlist enroll wrote a top-level `enrollmentDate` to Beneficiary, but that
 * field only exists inside the enrolledPrograms subdoc → silently dropped.
 *
 * WaitlistEntry transition methods did `this.notes = note`, overwriting the
 * applicant's notes on every contact/schedule/approve carrying a note.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SVC = fs.readFileSync(path.join(__dirname, '../services/BeneficiaryService.js'), 'utf8');
const WL_ROUTE = fs.readFileSync(path.join(__dirname, '../routes/waitlist.routes.js'), 'utf8');
const WL_MODEL = fs.readFileSync(path.join(__dirname, '../models/WaitlistEntry.js'), 'utf8');
const BEN_MODEL = fs.readFileSync(path.join(__dirname, '../models/Beneficiary.js'), 'utf8');

describe('BeneficiaryService — branch queries use the real branchId field', () => {
  test('no Beneficiary query uses the phantom `branch:` key', () => {
    // the model field is branchId; `branch:` matched nothing
    expect(SVC).not.toMatch(/\bbranch:\s*branchId/);
    expect(SVC).not.toMatch(/\bbranch:\s*\{\s*\$ne/);
    expect(SVC).not.toMatch(/\{\s*branch:\s*branchId\s*\}/);
  });
  test('capacity check counts active beneficiaries by branchId', () => {
    const i = SVC.indexOf('checkBranchCapacity');
    const fn = SVC.slice(i, i + 900);
    expect(fn).toMatch(/countDocuments\(\{[\s\S]*?branchId,/);
  });
  test('duplicate-registration + stats use branchId (populate/select too)', () => {
    expect(SVC).toMatch(/populate\('branchId'/);
    expect(SVC).toMatch(/select\('fileNumber branchId'\)/);
    expect(SVC).toMatch(/branchId\s*\?\s*\{\s*branchId\s*\}\s*:/);
  });
  test('Beneficiary model really has branchId and not a top-level branch field', () => {
    expect(BEN_MODEL).toMatch(/branchId:\s*\{\s*type:\s*mongoose\.Schema\.Types\.ObjectId/);
  });
});

describe('waitlist enroll — no phantom top-level enrollmentDate', () => {
  test('auto-created Beneficiary uses joinDate, not the subdoc-only enrollmentDate', () => {
    const i = WL_ROUTE.indexOf('Beneficiary.create');
    const block = WL_ROUTE.slice(i, i + 1100);
    expect(block).toMatch(/joinDate:\s*new Date\(\)/);
    expect(block).not.toMatch(/enrollmentDate:\s*new Date\(\)/);
  });
});

describe('WaitlistEntry — transition notes append, not overwrite', () => {
  test('markContacted/scheduleAssessment/approve append the note', () => {
    expect(WL_MODEL).not.toMatch(/this\.notes\s*=\s*note;/);
    const appends = (WL_MODEL.match(/this\.notes\s*=\s*\[this\.notes, note\]\.filter\(Boolean\)\.join/g) || [])
      .length;
    expect(appends).toBe(3);
  });
});
