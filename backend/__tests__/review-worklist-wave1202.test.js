'use strict';

/**
 * review-worklist-wave1202.test.js — unit tests for the READ-ONLY branch
 * "plans needing review" worklist (#3): the pure W50 severity classifier +
 * the reviewWorklist degradation + a static guard for the route
 * (domains/goals/routes/supervisor-ops.routes.js → GET /supervisor-ops/review-worklist).
 *
 * Pure logic — no DB. Run: cd backend && npx jest --config=jest.config.js __tests__/review-worklist-wave1202.test.js
 */

const fs = require('fs');
const path = require('path');
const {
  classifyReviewSeverity,
  reviewWorklist,
  REVIEW_SEVERITIES,
} = require('../services/rehabPlanHealth.service');

describe('review-worklist — classifyReviewSeverity (pure, W50 SLA bands)', () => {
  test('not yet due (negative) → null', () => {
    expect(classifyReviewSeverity(-1)).toBeNull();
    expect(classifyReviewSeverity(-30)).toBeNull();
  });
  test('due today (0) → info', () => {
    expect(classifyReviewSeverity(0)).toBe('info');
  });
  test('1–13 days overdue → warning', () => {
    expect(classifyReviewSeverity(1)).toBe('warning');
    expect(classifyReviewSeverity(13)).toBe('warning');
  });
  test('14+ days overdue → critical', () => {
    expect(classifyReviewSeverity(14)).toBe('critical');
    expect(classifyReviewSeverity(90)).toBe('critical');
  });
  test('non-numeric → null', () => {
    expect(classifyReviewSeverity(undefined)).toBeNull();
    expect(classifyReviewSeverity(null)).toBeNull();
  });
  test('severity order is critical → warning → info', () => {
    expect(REVIEW_SEVERITIES).toEqual(['critical', 'warning', 'info']);
  });
});

describe('review-worklist — reviewWorklist (read-only, graceful)', () => {
  test('no branchId → empty worklist, zero counts (no scan-all)', async () => {
    const r = await reviewWorklist({});
    expect(r.total).toBe(0);
    expect(r.items).toEqual([]);
    expect(r.counts).toEqual({ critical: 0, warning: 0, info: 0 });
    expect(r.branchId).toBeNull();
  });
  test('CarePlanVersion model unregistered → degrades to empty (no throw)', async () => {
    // In this unit context the model is not registered → graceful empty.
    const r = await reviewWorklist({ branchId: '64b2f0000000000000000001' });
    expect(r.total).toBe(0);
    expect(Array.isArray(r.items)).toBe(true);
  });
});

describe('review-worklist route (W1202) — static guard', () => {
  const ROUTE_SRC = fs.readFileSync(
    path.join(__dirname, '..', 'domains', 'goals', 'routes', 'supervisor-ops.routes.js'),
    'utf-8'
  );

  test('declares GET /supervisor-ops/review-worklist', () => {
    expect(ROUTE_SRC).toMatch(/router\.get\(\s*['"]\/supervisor-ops\/review-worklist['"]/);
  });
  test('W269 branch scoping (effectiveBranchScope, no req.branchId, 400 reject, ObjectId)', () => {
    expect(ROUTE_SRC).toMatch(/effectiveBranchScope\(\s*req\s*\)/);
    expect(ROUTE_SRC).not.toMatch(/req\.branchId/);
    expect(ROUTE_SRC).toMatch(/branchId required/);
    expect(ROUTE_SRC).toMatch(/isValidObjectId\(\s*req\.query\.branchId\s*\)/);
  });
  test('delegates to reviewWorklist + caps the limit', () => {
    expect(ROUTE_SRC).toMatch(/reviewWorklist\(\s*\{\s*branchId/);
    expect(ROUTE_SRC).toMatch(/Math\.min\(/);
  });
  test('READ-ONLY — no mutation', () => {
    expect(ROUTE_SRC).not.toMatch(
      /\.(save|create|updateOne|updateMany|deleteOne|deleteMany|insertMany|findOneAndUpdate)\(/
    );
  });
});
