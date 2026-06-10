'use strict';

/**
 * golden-thread-caseload-route-wave1167.test.js — static guard for the live
 * caseload attention route (domains/goals/routes/golden-thread.routes.js).
 *
 * Exposes W1165 attentionForBeneficiaries as a branch-scoped HTTP endpoint so
 * the UI can render the §4.3 Smart Attention Queue. This guard locks: the route
 * is mounted in the goals domain index, is branch-scoped (W269 — uses
 * effectiveBranchScope, never req.branchId), is READ-ONLY, and delegates to the
 * already-behaviorally-tested service.
 *
 * Source-text analysis + a load check (no DB). Behavioral coverage of the
 * underlying logic lives in golden-thread-attention-behavioral-wave1165.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/golden-thread-caseload-route-wave1167.test.js
 */

const fs = require('fs');
const path = require('path');

const ROUTE_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'domains', 'goals', 'routes', 'golden-thread.routes.js'),
  'utf-8'
);
const INDEX_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'domains', 'goals', 'routes', 'index.routes.js'),
  'utf-8'
);

describe('golden-thread caseload route (W1167) — mount + shape', () => {
  test('the route loads without throwing (require resolves)', () => {
    expect(() => require('../domains/goals/routes/golden-thread.routes')).not.toThrow();
  });

  test('declares GET /golden-thread/caseload-attention', () => {
    expect(ROUTE_SRC).toMatch(/router\.get\(\s*['"]\/golden-thread\/caseload-attention['"]/);
  });

  test('is mounted in the goals domain index router', () => {
    expect(INDEX_SRC).toMatch(/require\(\s*['"]\.\/golden-thread\.routes['"]\s*\)/);
  });
});

describe('golden-thread caseload route (W1167) — W269 branch isolation', () => {
  test('scopes via effectiveBranchScope (pins restricted callers to their branch)', () => {
    expect(ROUTE_SRC).toMatch(/effectiveBranchScope\(\s*req\s*\)/);
  });

  test('never reads the always-undefined req.branchId (W269h class)', () => {
    expect(ROUTE_SRC).not.toMatch(/req\.branchId/);
  });

  test('a cross-branch role without a branch is rejected (no scan-all)', () => {
    expect(ROUTE_SRC).toMatch(/branchId required/);
    expect(ROUTE_SRC).toMatch(/status\(\s*400\s*\)/);
  });

  test('validates ?branchId is a real ObjectId before trusting it', () => {
    expect(ROUTE_SRC).toMatch(/isValidObjectId\(\s*req\.query\.branchId\s*\)/);
  });
});

describe('golden-thread caseload route (W1167) — read-only + delegation', () => {
  test('performs NO mutation', () => {
    expect(ROUTE_SRC).not.toMatch(
      /\.(save|create|updateOne|updateMany|deleteOne|deleteMany|insertMany|insertOne|findOneAndUpdate|bulkWrite)\(/
    );
  });

  test('delegates to the W1165 attentionForBeneficiaries service', () => {
    expect(ROUTE_SRC).toMatch(/attentionForBeneficiaries\(/);
  });

  test('caps the scan (no unbounded branch sweep)', () => {
    expect(ROUTE_SRC).toMatch(/\.limit\(/);
    expect(ROUTE_SRC).toMatch(/Math\.min\(/);
  });
});
