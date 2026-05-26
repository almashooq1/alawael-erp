'use strict';

/**
 * W434 — anti-regression guard for atomic leave-request processing.
 *
 * `services/attendanceManagement.service.js` processLeaveRequest had
 * the find-then-mutate-then-save state-flip race. Two concurrent
 * approve/reject decisions (two managers clicking simultaneously, UI
 * double-tap) would both pass the status==='pending' check, both
 * write a decision, second save wins. End-state status is race-
 * dependent. PLUS the attendance-marking loop below the save fires
 * once per call → double-marking attendance records as 'leave' under
 * concurrent approvals.
 *
 * W434 converts to atomic findOneAndUpdate with status:'pending' in
 * the filter. Only one caller wins; second sees the "already
 * processed" message path.
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'services', 'attendanceManagement.service.js');

describe('W434 processLeaveRequest atomic state-flip', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(FILE, 'utf8');
  });

  it('no longer uses findById-then-mutate-then-save in processLeaveRequest', () => {
    // Strip comment lines so doc-references don't trip us.
    const noComments = src.replace(/^\s*\/\/.*$/gm, '');
    const fn = noComments.match(/static async processLeaveRequest\([\s\S]*?\n {2}\}/);
    expect(fn).toBeTruthy();
    // The pre-W434 race: `leave.status = decision; ... await leave.save();`
    expect(fn[0]).not.toMatch(/leave\.status\s*=\s*decision/);
    expect(fn[0]).not.toMatch(/await\s+leave\.save\(\)\s*;/);
  });

  it("uses findOneAndUpdate with status:'pending' filter as the gate", () => {
    // The atomic state-flip: filter requires status==='pending'.
    expect(src).toMatch(/findOneAndUpdate\(\s*\{\s*_id:\s*leaveId\s*,\s*status:\s*['"]pending['"]/);
  });

  it('$set updates status with the decision + audit metadata', () => {
    expect(src).toMatch(/\$set:\s*\{[\s\S]{0,200}status:\s*decision/);
    expect(src).toMatch(/approvedBy:\s*managerId/);
    expect(src).toMatch(/processedAt:\s*now/);
  });

  it('W434 marker comment present (catches accidental revert)', () => {
    expect(src).toMatch(/W434/);
  });

  it('still returns original "not found" / "already processed" Arabic messages', () => {
    expect(src).toMatch(/طلب الإجازة غير موجود/);
    expect(src).toMatch(/الطلب تمت معالجته مسبقاً/);
  });

  it('still preserves the attendance-marking side-effect on decision==="approved"', () => {
    // Behavioural compat — the downstream loop must still run on approve.
    expect(src).toMatch(/if \(decision === ['"]approved['"]\)/);
  });
});
