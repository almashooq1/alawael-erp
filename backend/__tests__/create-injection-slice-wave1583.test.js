'use strict';

/**
 * W1583 — branch-injection on CREATE for the slice-2/3 clinical routes (#862/#864 fixed
 * their READ override; their POST handlers still set branchId from the client body):
 *     branchId: body.branchId && isValid ? body.branchId : null
 * A branch-restricted user could create a record (pain/hearing/dysphagia/physiotherapy/
 * seating/swallow/prosthetic/orientation/driving/falls/pressure-injury/infection/
 * medication-reconciliation/DTT/adjunct/arts/restraint/caregiver-support/day-rehab-bus)
 * in ANY foreign branch. Fixed to:
 *     branchId: effectiveBranchScope(req) || (validated body.branchId)
 * restricted creator forced to own branch; cross-branch admin can still target one.
 */

const fs = require('fs');
const path = require('path');

const ROUTES = path.join(__dirname, '..', 'routes');
const FILES = [
  'pain-assessment', 'hearing-screening', 'dysphagia-assessment', 'physiotherapy-assessment',
  'orientation-mobility', 'seating-postural-assessment', 'instrumental-swallow', 'prosthetic-orthotic',
  'driving-rehab', 'falls-risk-assessment', 'pressure-injury', 'infection-surveillance',
  'medication-reconciliation', 'dtt-session', 'adjunct-therapy', 'arts-therapy',
  'restraint-seclusion', 'caregiver-support-program', 'day-rehab-bus-routes',
].map((n) => n + '.routes.js');

function strip(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ''.padEnd(m.length - p1.length, ' '));
}

describe('W1583 slice-2/3 create forces branch scope (no branch-injection)', () => {
  for (const file of FILES) {
    const src = strip(fs.readFileSync(path.join(ROUTES, file), 'utf8'));

    test(`${file}: create uses effectiveBranchScope, not raw body.branchId`, () => {
      expect(src).toMatch(/effectiveBranchScope/);
      expect(src).toMatch(/branchId:\s*effectiveBranchScope\(req\)\s*\|\|/);
      // the unscoped injection form must be gone
      expect(src).not.toMatch(/branchId:\s*body\.branchId\s*&&\s*mongoose\.isValidObjectId\(body\.branchId\)\s*\?\s*body\.branchId\s*:\s*null/);
      expect(src).not.toMatch(/branchId:\s*body\.branchId\s*,/);
      expect(src).not.toMatch(/branchId:\s*req\.body\.branchId\s*[,)]/);
    });
  }
});
