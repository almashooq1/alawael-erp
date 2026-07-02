'use strict';
/**
 * W1621 — query field-name drift, batch 2 (continuation of W1620 #980). Each verified against the
 * model's real paths via isolated schema inspection.
 *
 * - hrSystem attendance was COMPLETELY BROKEN: check-in wrote `checkIn` (schema field is `checkInTime`
 *   → dropped in strict mode, record saved with no timestamp); check-out filtered
 *   `{ checkIn: {$gte}, checkOut: null }` on non-existent fields → never matched → could not check out.
 *   Renamed to checkInTime/checkOutTime so the flow matches the HRAttendance schema.
 * - ai-analytics queried Appointment on `appointment_date` (schema field is `date`) → the
 *   appointments-this-week / next-month analytics matched nothing.
 * - work-shifts filtered Employee.findOne on `deletedAt: null` (schema is `deleted_at`) → the
 *   soft-delete guard was a no-op (matched all, incl. soft-deleted employees). WorkShift keeps its
 *   own valid `deletedAt`.
 */
const fs = require('fs');
const path = require('path');
const R = (f) => fs.readFileSync(path.join(__dirname, '..', 'routes', f), 'utf8');

describe('W1621 query field-drift batch 2', () => {
  test('hrSystem attendance uses checkInTime/checkOutTime (schema fields), not checkIn/checkOut', () => {
    const s = R('hrSystem.routes.js');
    // no DB-field checkIn/checkOut in Attendance create/find/sort (local `checkInTime` var is fine)
    expect(s).not.toMatch(/checkIn:\s*new Date/);
    expect(s).not.toMatch(/checkIn:\s*\{\s*\$gte/);
    expect(s).not.toMatch(/checkOut:\s*null/);
    expect(s).not.toMatch(/checkOut:\s*new Date/);
    expect(s).not.toMatch(/sort:\s*\{\s*checkIn:/);
    expect(s).toMatch(/checkInTime:\s*new Date/);
    expect(s).toMatch(/checkInTime:\s*\{\s*\$gte/);
    expect(s).toMatch(/checkOutTime:\s*new Date/);
  });

  test('ai-analytics queries Appointment on date, not appointment_date', () => {
    const s = R('ai-analytics.routes.js');
    expect(s).not.toMatch(/appointment_date/);
    expect(s).toMatch(/date:\s*\{\s*\$gte/);
  });

  test('work-shifts filters Employee by deleted_at; WorkShift keeps deletedAt', () => {
    const s = R('work-shifts.routes.js');
    expect(s).not.toMatch(/Employee\.findOne\([^)]*deletedAt/s);
    expect(s).toMatch(/Employee\.findOne\([^)]*deleted_at/s);
    expect(s).toMatch(/WorkShift\.findOne\([^)]*deletedAt/s);
  });
});
