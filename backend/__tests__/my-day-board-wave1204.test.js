'use strict';

/**
 * my-day-board-wave1204.test.js — static guard for the specialist "my day" board
 * route (domains/goals/routes/supervisor-ops.routes.js → GET /supervisor-ops/my-day).
 *
 * The other half of the operational cycle: the therapist's OWN daily In-Process /
 * Complete board (reuses the W1169 dailyBoardForTherapist). Caller-scoped to
 * req.user (no therapistId param → no cross-user IDOR), read-only.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/my-day-board-wave1204.test.js
 */

const fs = require('fs');
const path = require('path');

const ROUTE_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'domains', 'goals', 'routes', 'supervisor-ops.routes.js'),
  'utf-8'
);

describe('my-day board route (W1204) — mount + shape', () => {
  test('route file loads without throwing', () => {
    expect(() => require('../domains/goals/routes/supervisor-ops.routes')).not.toThrow();
  });
  test('declares GET /supervisor-ops/my-day', () => {
    expect(ROUTE_SRC).toMatch(/router\.get\(\s*['"]\/supervisor-ops\/my-day['"]/);
  });
  test('imports dailyBoardForTherapist + delegates to it', () => {
    expect(ROUTE_SRC).toMatch(/dailyBoardForTherapist/);
    expect(ROUTE_SRC).toMatch(/dailyBoardForTherapist\(\s*therapistId/);
  });
});

describe('my-day board route (W1204) — caller-scoped (no IDOR) + read-only', () => {
  test('scopes to the caller via req.user (NOT a therapistId path/query param)', () => {
    expect(ROUTE_SRC).toMatch(/req\.user\s*&&\s*\(req\.user\._id\s*\|\|\s*req\.user\.id\)/);
    // the my-day handler must NOT read a therapistId from params/query (would be IDOR)
    const myDayBlock = ROUTE_SRC.slice(ROUTE_SRC.indexOf("'/supervisor-ops/my-day'"));
    expect(myDayBlock).not.toMatch(/req\.params\.therapistId|req\.query\.therapistId/);
  });
  test('401 when unauthenticated', () => {
    expect(ROUTE_SRC).toMatch(/status\(\s*401\s*\)/);
  });
  test('validates the optional date param', () => {
    expect(ROUTE_SRC).toMatch(/Number\.isNaN\(\s*date\.getTime\(\)\s*\)/);
  });
  test('READ-ONLY — no mutation in the route file', () => {
    expect(ROUTE_SRC).not.toMatch(
      /\.(save|create|updateOne|updateMany|deleteOne|deleteMany|insertMany|findOneAndUpdate)\(/
    );
  });
  test('never reads the always-undefined req.branchId', () => {
    expect(ROUTE_SRC).not.toMatch(/req\.branchId/);
  });
});
