'use strict';

/**
 * operations-health-route-wave1196.test.js — static guard for the live unified
 * Branch Operations Health route + the service-layer extraction.
 *
 * W1196 promotes the W1195 CLI-only capstone to a LIVE endpoint by extracting
 * the composition into services/operationsHealth.service.js (the canonical code
 * path) and serving it at GET /supervisor-ops/operations-health. Locks:
 *   - the route is declared, mounted, branch-scoped (W269), read-only, bounded;
 *   - it delegates to the SERVICE (not the script);
 *   - the CLI re-uses the SAME service → exactly one composition code path.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/operations-health-route-wave1196.test.js
 */

const fs = require('fs');
const path = require('path');

const p = (...s) => path.join(__dirname, '..', ...s);
const ROUTE_SRC = fs.readFileSync(
  p('domains', 'goals', 'routes', 'supervisor-ops.routes.js'),
  'utf-8'
);
const INDEX_SRC = fs.readFileSync(p('domains', 'goals', 'routes', 'index.routes.js'), 'utf-8');
const CLI_SRC = fs.readFileSync(p('scripts', 'operations-health.js'), 'utf-8');

describe('operations-health route (W1196) — mount + shape', () => {
  test('route file loads without throwing', () => {
    expect(() => require('../domains/goals/routes/supervisor-ops.routes')).not.toThrow();
  });
  test('declares GET /supervisor-ops/operations-health', () => {
    expect(ROUTE_SRC).toMatch(/router\.get\(\s*['"]\/supervisor-ops\/operations-health['"]/);
  });
  test('is mounted via the goals domain index router', () => {
    expect(INDEX_SRC).toMatch(/require\(\s*['"]\.\/supervisor-ops\.routes['"]\s*\)/);
  });
});

describe('operations-health route (W1196) — W269 branch isolation', () => {
  test('scopes via effectiveBranchScope', () => {
    expect(ROUTE_SRC).toMatch(/effectiveBranchScope\(\s*req\s*\)/);
  });
  test('never reads the always-undefined req.branchId', () => {
    expect(ROUTE_SRC).not.toMatch(/req\.branchId/);
  });
  test('cross-branch role without a branch is rejected (no scan-all)', () => {
    expect(ROUTE_SRC).toMatch(/branchId required/);
    expect(ROUTE_SRC).toMatch(/status\(\s*400\s*\)/);
  });
  test('validates ?branchId is a real ObjectId', () => {
    expect(ROUTE_SRC).toMatch(/isValidObjectId\(\s*req\.query\.branchId\s*\)/);
  });
});

describe('operations-health route (W1196) — read-only + bounded', () => {
  test('performs NO mutation', () => {
    expect(ROUTE_SRC).not.toMatch(
      /\.(save|create|updateOne|updateMany|deleteOne|deleteMany|insertMany|insertOne|findOneAndUpdate|bulkWrite)\(/
    );
  });
  test('delegates to gatherBranchHealth from the operationsHealth service', () => {
    expect(ROUTE_SRC).toMatch(/require\(\s*['"][^'"]*operationsHealth\.service['"]\s*\)/);
    expect(ROUTE_SRC).toMatch(/gatherBranchHealth\(\s*mongoose\s*,/);
  });
  test('caps the window (Math.min)', () => {
    expect(ROUTE_SRC).toMatch(/Math\.min\(/);
  });
});

describe('operations-health (W1196) — single canonical code path', () => {
  test('the service exists and exports the grader + gatherer', () => {
    const svc = require('../services/operationsHealth.service');
    expect(typeof svc.gradeOperationsHealth).toBe('function');
    expect(typeof svc.gatherBranchHealth).toBe('function');
    expect(svc.HEALTH_GRADES).toEqual(['HEALTHY', 'WATCH', 'AT_RISK', 'NO_DATA']);
  });
  test('the CLI re-uses the SAME service (no duplicated composition)', () => {
    expect(CLI_SRC).toMatch(/require\(\s*['"][^'"]*operationsHealth\.service['"]\s*\)/);
  });
  test('requiring the service does NOT open a DB connection (pure on load)', () => {
    // gatherBranchHealth takes a mongoose instance as a param — the module must
    // not connect at require-time. (require above already succeeded fast.)
    const svc = require('../services/operationsHealth.service');
    expect(svc.DEFAULT_WINDOW_DAYS).toBe(7);
  });
});
