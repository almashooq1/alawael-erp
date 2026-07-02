'use strict';

/**
 * W1610 — write-IDOR: the WRITE counterpart of the findById-IDOR read fixes. A precise scan
 * (tenant-scoped model + `findByIdAndUpdate/findByIdAndDelete(req.params.id)` with no branch
 * guard) found that the earlier read fixes (#872 attendance/meals/daily-comm, #927 portfolio)
 * left the modify/delete-by-id paths UNSCOPED → a restricted caller could MODIFY or DELETE
 * another branch's record by id (higher severity than a read). notification-enhanced +
 * maintenance additionally lost their #927 read-scoping in a merge — re-applied here.
 *
 * Fix: findByIdAndUpdate/Delete(req.params.id) → findOneAndUpdate/Delete({ _id, ...branchFilter(req) })
 * on the tenant models (SessionAttendance / MealEvent / DailyCommunicationLog / Portfolio /
 * BroadcastMessage / Escalation / MaintenanceRequest); global models (NotificationTemplate) untouched.
 */

const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..', 'routes');
const read = (p) => fs.readFileSync(path.join(R, p), 'utf8');

const TENANT = /(SessionAttendance|MealEvent|DailyCommunicationLog|Portfolio|BroadcastMessage|Escalation|MaintenanceRequest)\.(findByIdAndUpdate|findByIdAndDelete)\(/;
const FILES = [
  'attendance-admin.routes.js', 'beneficiary-meals.routes.js', 'daily-communication.routes.js',
  'portfolio.routes.js', 'notification-enhanced.routes.js', 'maintenance.js',
];

describe('W1610 write-IDOR: tenant modify/delete-by-id is branch-scoped', () => {
  for (const f of FILES) {
    test(`${f}: no bare findByIdAndUpdate/Delete on a tenant model`, () => {
      const s = read(f);
      expect(s).toMatch(/branchFilter/);
      expect(s).not.toMatch(TENANT);
    });
  }

  test('notification-enhanced + maintenance single-record reads are re-scoped', () => {
    const n = read('notification-enhanced.routes.js');
    expect(n).not.toMatch(/BroadcastMessage\.findById\(\s*req\.params\.id\s*\)/);
    expect(n).not.toMatch(/Escalation\.findById\(\s*req\.params\.id\s*\)/);
    expect(read('maintenance.js')).not.toMatch(/MaintenanceRequest\.findById\(\s*req\.params\.id\s*\)/);
  });
});
