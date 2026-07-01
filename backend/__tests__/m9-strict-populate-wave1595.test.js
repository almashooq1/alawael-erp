'use strict';

/**
 * W1595 — Mongoose 9 strictPopulate (default true): `.populate('X')` where X is not a
 * schema path THROWS at exec = 500. Isolated per-model verification (only that model
 * registers → its real schema) found genuine crashes and fixed each:
 *
 *  FIX-PATH (corrected the path — RESTORES the populated data):
 *    Beneficiary.populate('branch')        -> 'branchId'            (ref Branch)
 *    LeaveBalance.populate('employee')      -> 'employeeId'          (ref Employee)
 *    Vehicle.populate('driver')             -> 'assignedDriver'      (ref Driver)
 *    WaitlistEntry.populate('therapist_id') -> 'requested_therapist_id' (ref Employee)
 *  DEAD-REMOVE (model has NO such ref → drop the throwing populate, restoring a 200):
 *    Driver.userId/manager, ChartOfAccount.parent_account_id, JournalEntry.approved_by,
 *    Session.specialistId, WaitlistEntry.referred_by, VehicleMaintenance.performed_by/
 *    approved_by, Employee.currentShiftId.
 *
 * FALSE-DEAD left untouched: Schedule.createdBy/confirmedBy (×11) ARE valid refs — the
 * scanner's "dead" verdict was contamination from multi-model registration; verified valid
 * in isolation, so NOT removed. (domains/ nested-path populates couldn't be isolated-resolved
 * → left conservatively.)
 */

const fs = require('fs');
const path = require('path');

const R = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(R, p), 'utf8');

describe('W1595 M9 strictPopulate crash fixes', () => {
  test('FIX-PATH files use the corrected (valid-ref) populate paths', () => {
    expect(read('routes/beneficiary-transfers.routes.js')).toMatch(/populate\('branchId'/);
    expect(read('routes/guardians.routes.js')).toMatch(/populate\('branchId'/);
    expect(read('routes/missing-models.routes.js')).toMatch(/populate\('employeeId'/);
    expect(read('services/websocket.service.js')).toMatch(/populate\('assignedDriver'/);
    expect(read('routes/scheduling-module.routes.js')).toMatch(/populate\('requested_therapist_id'/);
  });

  test('FIX-PATH: the exact old non-schema populate calls are gone', () => {
    expect(read('routes/beneficiary-transfers.routes.js')).not.toContain("populate('branch', 'code')");
    expect(read('routes/guardians.routes.js')).not.toContain("populate('branch', 'nameAr code')");
    expect(read('routes/missing-models.routes.js')).not.toContain("populate('employee', 'nameAr employeeNumber')");
    expect(read('services/websocket.service.js')).not.toContain("populate('driver', 'name email')");
    expect(read('routes/scheduling-module.routes.js')).not.toContain("populate('therapist_id', 'name specialization')");
  });

  test('DEAD populates (no matching ref) are removed', () => {
    expect(read('controllers/driver.controller.js')).not.toMatch(/populate\('userId'|populate\('manager'/);
    expect(read('services/driverManagement.service.js')).not.toMatch(/populate\('userId'/);
    expect(read('routes/finance-module.routes.js')).not.toMatch(/populate\('parent_account_id'|populate\('approved_by'/);
    expect(read('routes/parentPortal.routes.js')).not.toMatch(/populate\('specialistId'/);
    expect(read('routes/scheduling-module.routes.js')).not.toMatch(/populate\('referred_by'/);
    expect(read('routes/transport-module.routes.js')).not.toMatch(/populate\('performed_by'|populate\('approved_by'/);
    expect(read('routes/work-shifts.routes.js')).not.toMatch(/populate\('currentShiftId'/);
  });

  test('FALSE-DEAD Schedule.createdBy/confirmedBy left intact (valid refs)', () => {
    const s = read('services/scheduleManagementService.js');
    expect(s).toMatch(/populate\('createdBy'/);
    expect(s).toMatch(/populate\('confirmedBy'/);
  });
});
