/**
 * Student-transport safety guards for routes/transport-module.routes.js.
 * From the 2026-06-29 transport bug-hunt.
 *
 * P1 cross-branch IDOR — Trip is branch-scoped (`branch_id` required) but every
 *    `/trips/:id` read + start/complete/cancel/delete/pickup/dropoff mutation
 *    queried by `_id` alone → a branch-A user could control (and fire guardian
 *    notifications for) branch-B trips. Fixed with a snake-mapped branchScope().
 *    (The driver-portal endpoints keyed/guarded by driver_id are left as-is —
 *    driver-ownership is a stronger guard than branch.)
 * P2 pickup/dropoff recorded NOTHING + crashed — the handlers wrote phantom
 *    fields `pickup_status`/`actual_pickup_time` (real fields: `status` +
 *    `pickup_time_actual`, strict mode dropped them) and called the STATIC
 *    `notifyPickup`/`notifyDropoff` on an instance with the trip doc (→ undefined
 *    method / wrong args → TypeError; `/complete` rejected AFTER saving).
 *
 * Static source guards.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '../routes/transport-module.routes.js'),
  'utf8'
);

describe('transport #P1 — cross-branch trip isolation', () => {
  test('snake-mapped branchScope helper exists', () => {
    expect(SRC).toMatch(/function branchScope\(req\)/);
    expect(SRC).toMatch(/branch_id: f\.branchId/);
  });
  test('never reads req.branchId (W269h class)', () => {
    expect(SRC).not.toMatch(/req\.branchId\b/);
  });
  test('branchScope applied broadly across trip queries', () => {
    const count = (SRC.match(/branchScope\(req\)/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(13);
  });
  test('no bare Trip.findOne({ _id, deleted_at }) single-line without scope', () => {
    expect(SRC).not.toMatch(/Trip\.findOne\(\{ _id: req\.params\.id, deleted_at: null \}\);/);
  });
});

describe('transport #P2 — pickup/dropoff actually record + no crash', () => {
  test('uses the real passenger fields (status + *_time_actual), not phantom paths', () => {
    expect(SRC).not.toMatch(/passenger\.pickup_status/);
    expect(SRC).not.toMatch(/passenger\.dropoff_status/);
    expect(SRC).not.toMatch(/passenger\.actual_pickup_time/);
    expect(SRC).not.toMatch(/passenger\.actual_dropoff_time/);
    expect(SRC).toMatch(/passenger\.status = 'picked_up'/);
    expect(SRC).toMatch(/passenger\.pickup_time_actual = new Date\(\)/);
  });
  test('notify uses the STATIC method with a trip id (not an instance + doc)', () => {
    expect(SRC).toMatch(/ParentNotificationService\.notifyPickup\(trip\._id,/);
    expect(SRC).toMatch(/ParentNotificationService\.notifyDropoff\(trip\._id,/);
    expect(SRC).not.toMatch(/notificationService\.notifyDropoff\(trip\)/);
  });
});
