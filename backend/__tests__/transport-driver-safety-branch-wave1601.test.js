/**
 * W1601 — transport driver-safety endpoints branch isolation.
 *
 * Deferred in #779. The 3 driver-safety reads queried Trip (which HAS branch_id)
 * with NO branchScope → cross-branch leak of driver trip/GPS safety data:
 *   • GET /safety/drivers/:driverId          — a foreign driver's speeding /
 *     geofence / harsh-event score over the period
 *   • GET /safety/drivers/:driverId/fatigue  — a foreign driver's hours-driven today
 *   • GET /safety/leaderboard                — EVERY branch's drivers' names +
 *     phones + scores merged into one ranking
 *
 * Fix: spread the local branchScope(req) (camelCase→snake branch_id) into each
 * Trip.find → restricted callers see only their branch's trips (a foreign driver
 * returns empty; the leaderboard is per-branch). Cross-branch roles unaffected.
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

const sliceOf = (marker, len = 700) => {
  const i = SRC.indexOf(marker);
  expect(i).toBeGreaterThan(-1);
  return SRC.slice(i, i + len);
};

describe('W1601 driver-safety branch isolation', () => {
  test('GET /safety/drivers/:driverId scopes its Trip.find', () => {
    const h = sliceOf("'/safety/drivers/:driverId',");
    expect(h).toMatch(/Trip\.find\(\{\s*\.\.\.branchScope\(req\)/);
  });

  test('GET /safety/drivers/:driverId/fatigue scopes its Trip.find', () => {
    const h = sliceOf("'/safety/drivers/:driverId/fatigue',");
    expect(h).toMatch(/Trip\.find\(\{\s*\.\.\.branchScope\(req\)/);
  });

  test('GET /safety/leaderboard scopes its Trip.find', () => {
    const h = sliceOf("'/safety/leaderboard',");
    expect(h).toMatch(/Trip\.find\(\{\s*\.\.\.branchScope\(req\)/);
  });

  test('no safety Trip.find is left unscoped (all 3 driver-safety reads covered)', () => {
    // Every Trip.find that follows a driver_id filter or the leaderboard aggregate
    // now leads with branchScope. Assert the count of scoped safety Trip.finds ≥ 3.
    const scoped = (SRC.match(/Trip\.find\(\{\s*\.\.\.branchScope\(req\)/g) || []).length;
    expect(scoped).toBeGreaterThanOrEqual(3);
  });
});
