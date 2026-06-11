'use strict';

/**
 * productivity-anomalies-wave1215.test.js — unit tests for the READ-ONLY Tier-3
 * multivariate productivity anomaly scan (services/operationsAnomaly.service.js)
 * + a static guard for its route (GET /supervisor-ops/productivity-anomalies).
 *
 * Wires the previously-dormant isolation-forest engine. Pure logic — no DB.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/productivity-anomalies-wave1215.test.js
 */

const fs = require('fs');
const path = require('path');
const {
  detectProductivityAnomalies,
  productivityFeatureExtractor,
  PRODUCTIVITY_FEATURES,
  MIN_THERAPISTS,
} = require('../services/operationsAnomaly.service');

function normalTeam(n) {
  const byTherapist = {};
  for (let i = 0; i < n; i++) {
    byTherapist['t' + i] = {
      completed: 10 + (i % 3),
      deliveredMinutes: 450 + i * 5,
      documentedRate: 88 + (i % 5),
      noShow: 1,
    };
  }
  return byTherapist;
}

describe('operationsAnomaly — detectProductivityAnomalies (pure, Tier-3 IF)', () => {
  test('requiring the service does NOT open a DB connection + exposes the surface', () => {
    expect(typeof detectProductivityAnomalies).toBe('function');
    expect(PRODUCTIVITY_FEATURES).toContain('documentedRate');
    expect(MIN_THERAPISTS).toBe(8);
  });

  test('flags the multivariate outlier among a normal team', () => {
    const byTherapist = normalTeam(8);
    byTherapist['OUTLIER'] = {
      completed: 80,
      deliveredMinutes: 60,
      documentedRate: 0,
      noShow: 25,
    };
    const r = detectProductivityAnomalies({ byTherapist });
    expect(r.eligible).toBe(true);
    expect(r.scanned).toBe(9);
    expect(r.anomalies.some((a) => a.therapistId === 'OUTLIER')).toBe(true);
    const top = r.anomalies[0];
    expect(top.score).toBeGreaterThan(r.threshold);
    expect(top.features).toHaveProperty('documentedRate');
  });

  test('anomalies are sorted most-anomalous-first', () => {
    const byTherapist = normalTeam(10);
    byTherapist['BAD1'] = { completed: 90, deliveredMinutes: 30, documentedRate: 0, noShow: 30 };
    byTherapist['BAD2'] = { completed: 5, deliveredMinutes: 2000, documentedRate: 100, noShow: 0 };
    const r = detectProductivityAnomalies({ byTherapist });
    for (let i = 1; i < r.anomalies.length; i++) {
      expect(r.anomalies[i - 1].score).toBeGreaterThanOrEqual(r.anomalies[i].score);
    }
  });

  test('a uniform team produces no anomalies', () => {
    const byTherapist = {};
    for (let i = 0; i < 10; i++) {
      byTherapist['u' + i] = { completed: 12, deliveredMinutes: 480, documentedRate: 95, noShow: 1 };
    }
    const r = detectProductivityAnomalies({ byTherapist });
    expect(r.eligible).toBe(true);
    expect(r.anomalies).toEqual([]);
  });

  test('< 8 therapists → not eligible (a small team is not a population)', () => {
    const r = detectProductivityAnomalies({ byTherapist: { a: { completed: 5 }, b: { completed: 6 } } });
    expect(r.eligible).toBe(false);
    expect(r.reason).toMatch(/insufficient_therapists:2\/8/);
    expect(r.anomalies).toEqual([]);
  });

  test('deterministic — same input + seed yields the same flagged set', () => {
    const byTherapist = normalTeam(8);
    byTherapist['X'] = { completed: 70, deliveredMinutes: 50, documentedRate: 5, noShow: 20 };
    const a = detectProductivityAnomalies({ byTherapist, seed: 7 });
    const b = detectProductivityAnomalies({ byTherapist, seed: 7 });
    expect(a.anomalies.map((x) => x.therapistId)).toEqual(b.anomalies.map((x) => x.therapistId));
  });

  test('feature extractor: documentedRate defaults to 100 (no-sessions ≠ under-documenting)', () => {
    expect(productivityFeatureExtractor({ completed: 0 })).toEqual([0, 0, 100, 0]);
    expect(productivityFeatureExtractor({ completed: 5, deliveredMinutes: 200, documentedRate: 80, noShow: 2 })).toEqual([
      5, 200, 80, 2,
    ]);
  });
});

describe('productivity-anomalies route (W1215) — static guard', () => {
  const ROUTE_SRC = fs.readFileSync(
    path.join(__dirname, '..', 'domains', 'goals', 'routes', 'supervisor-ops.routes.js'),
    'utf-8'
  );

  test('declares GET /supervisor-ops/productivity-anomalies', () => {
    expect(ROUTE_SRC).toMatch(/router\.get\(\s*['"]\/supervisor-ops\/productivity-anomalies['"]/);
  });
  test('W269 branch scoping + ObjectId validation + 400 reject', () => {
    expect(ROUTE_SRC).toMatch(/effectiveBranchScope\(\s*req\s*\)/);
    expect(ROUTE_SRC).not.toMatch(/req\.branchId/);
    expect(ROUTE_SRC).toMatch(/branchId required/);
  });
  test('delegates to branchProductivity → detectProductivityAnomalies', () => {
    expect(ROUTE_SRC).toMatch(/branchProductivity\(/);
    expect(ROUTE_SRC).toMatch(/detectProductivityAnomalies\(/);
  });
  test('READ-ONLY — no mutation', () => {
    expect(ROUTE_SRC).not.toMatch(
      /\.(save|create|updateOne|updateMany|deleteOne|deleteMany|insertMany|findOneAndUpdate)\(/
    );
  });
});
