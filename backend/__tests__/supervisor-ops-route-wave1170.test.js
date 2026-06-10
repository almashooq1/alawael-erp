'use strict';

/**
 * supervisor-ops-route-wave1170.test.js — static guard for the live supervisor
 * documentation-backlog route (domains/goals/routes/supervisor-ops.routes.js).
 *
 * Exposes W1169 documentationBacklog as a branch-scoped HTTP endpoint for the
 * supervisor UI. Locks: mounted in the goals domain index, branch-scoped (W269 —
 * effectiveBranchScope, never req.branchId), READ-ONLY, delegates to the
 * behaviorally-tested service, window capped.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/supervisor-ops-route-wave1170.test.js
 */

const fs = require('fs');
const path = require('path');

const ROUTE_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'domains', 'goals', 'routes', 'supervisor-ops.routes.js'),
  'utf-8'
);
const INDEX_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'domains', 'goals', 'routes', 'index.routes.js'),
  'utf-8'
);

describe('supervisor-ops route (W1170) — mount + shape', () => {
  test('loads without throwing', () => {
    expect(() => require('../domains/goals/routes/supervisor-ops.routes')).not.toThrow();
  });
  test('declares GET /supervisor-ops/documentation-backlog', () => {
    expect(ROUTE_SRC).toMatch(/router\.get\(\s*['"]\/supervisor-ops\/documentation-backlog['"]/);
  });
  test('is mounted in the goals domain index router', () => {
    expect(INDEX_SRC).toMatch(/require\(\s*['"]\.\/supervisor-ops\.routes['"]\s*\)/);
  });
});

describe('supervisor-ops route (W1170) — W269 branch isolation', () => {
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

describe('supervisor-ops route (W1170) — read-only + bounded', () => {
  test('performs NO mutation', () => {
    expect(ROUTE_SRC).not.toMatch(
      /\.(save|create|updateOne|updateMany|deleteOne|deleteMany|insertMany|insertOne|findOneAndUpdate|bulkWrite)\(/
    );
  });
  test('delegates to the W1169 documentationBacklog service', () => {
    expect(ROUTE_SRC).toMatch(/documentationBacklog\(/);
  });
  test('caps the window (Math.min)', () => {
    expect(ROUTE_SRC).toMatch(/Math\.min\(/);
  });
});
