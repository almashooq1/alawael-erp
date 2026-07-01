/**
 * W1585 — POST /trips/:id/complete passenger drop-off correctness.
 *
 * Bug (deferred in #779): /complete notified EVERY passenger with a
 * beneficiary_id via `Promise.allSettled(recipients.map(notifyDropoff))`.
 * ParentNotificationService.notifyDropoff is NOT a pure notifier — it sets
 * passenger.status='dropped_off' + `trip.save()`. Two defects:
 *   1. Absent / cancelled / never-picked-up children were force-marked
 *      "dropped_off" (corrupts the attendance/delivery record).
 *   2. Concurrent calls each re-load the trip, mutate one passenger, and save
 *      the whole doc → lost-update race: only one passenger's change persisted.
 *
 * Fix: only passengers with status 'picked_up' are dropped off (matches the
 * codebase's picked_up→dropped_off lifecycle), run SEQUENTIALLY so the
 * per-passenger saves don't race, and report the true notified count.
 *
 * Static guard.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'transport-module.routes.js'),
  'utf8'
);

const START = SRC.indexOf("'/trips/:id/complete'");
const END = SRC.indexOf("'/trips/:id/cancel'", START);
const H = SRC.slice(START, END > -1 ? END : START + 1600);

describe('W1585 /trips/:id/complete drop-off correctness', () => {
  test('handler exists', () => {
    expect(START).toBeGreaterThan(-1);
  });

  test('only boarded (picked_up) passengers are dropped off', () => {
    expect(H).toMatch(/p\.status === 'picked_up'/);
    expect(H).toMatch(/p\.beneficiary_id && p\.status === 'picked_up'/);
  });

  test('drop-off notifications run sequentially, not via Promise.allSettled', () => {
    expect(H).not.toMatch(/Promise\.allSettled/);
    expect(H).toMatch(/for \(const p of recipients\)/);
    expect(H).toMatch(/await ParentNotificationService\.notifyDropoff\(/);
    // per-iteration try/catch so one bad notification can't fail the trip
    expect(H).toMatch(/try \{[\s\S]*notifyDropoff[\s\S]*\} catch/);
  });

  test('response reports the true notified count', () => {
    expect(H).toMatch(/notifications_sent: notified/);
  });
});
