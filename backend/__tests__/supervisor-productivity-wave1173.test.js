'use strict';

/**
 * supervisor-productivity-wave1173.test.js — pure + source guard for the
 * per-therapist productivity layer (supervisorOps.summarizeProductivityByTherapist
 * / branchProductivity) + its endpoint.
 *
 * Answers the supervisor's "completed today / therapy minutes this week"
 * questions on the CANONICAL ClinicalSession (NOT the legacy-TherapySession
 * therapistUtilizationService). Paired with the behavioral counterpart
 * `supervisor-productivity-behavioral-wave1173.test.js`.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/supervisor-productivity-wave1173.test.js
 */

const fs = require('fs');
const path = require('path');
const { summarizeProductivityByTherapist } = require('../services/supervisorOps.service');

const ROUTE_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'domains', 'goals', 'routes', 'supervisor-ops.routes.js'),
  'utf-8'
);

describe('supervisorOps (W1173) — summarizeProductivityByTherapist (pure)', () => {
  test('exported without opening a DB connection', () => {
    expect(typeof summarizeProductivityByTherapist).toBe('function');
  });

  test('groups by therapist; counts completed, documented, no-show; sums delivered minutes', () => {
    const tA = 'therapistA';
    const tB = 'therapistB';
    const by = summarizeProductivityByTherapist([
      { therapistId: tA, status: 'completed', soapNotes: 'x', actualDurationMinutes: 45 }, // documented
      { therapistId: tA, status: 'completed', actualDurationMinutes: 30 }, // awaiting
      { therapistId: tA, status: 'no_show' },
      { therapistId: tB, status: 'completed', soapNotes: 'y', actualDurationMinutes: 60 }, // documented
      { therapistId: tB, status: 'scheduled' },
    ]);
    expect(by[tA].completed).toBe(2);
    expect(by[tA].documented).toBe(1);
    expect(by[tA].awaitingDocumentation).toBe(1);
    expect(by[tA].noShow).toBe(1);
    expect(by[tA].deliveredMinutes).toBe(75);
    expect(by[tA].documentedRate).toBe(50);
    expect(by[tB].completed).toBe(1);
    expect(by[tB].deliveredMinutes).toBe(60);
    expect(by[tB].documentedRate).toBe(100);
  });

  test('completedToday counts only sessions on/after todayStart', () => {
    const todayStart = new Date('2026-06-10T00:00:00Z');
    const by = summarizeProductivityByTherapist(
      [
        {
          therapistId: 't',
          status: 'completed',
          soapNotes: 'x',
          scheduledDate: new Date('2026-06-10T09:00:00Z'),
        },
        {
          therapistId: 't',
          status: 'completed',
          soapNotes: 'x',
          scheduledDate: new Date('2026-06-08T09:00:00Z'),
        },
      ],
      { todayStart }
    );
    expect(by.t.completed).toBe(2);
    expect(by.t.completedToday).toBe(1);
  });

  test('sessions without a therapistId are skipped; empty input is safe', () => {
    expect(summarizeProductivityByTherapist([{ status: 'completed' }])).toEqual({});
    expect(summarizeProductivityByTherapist([])).toEqual({});
    expect(summarizeProductivityByTherapist()).toEqual({});
  });
});

describe('supervisorOps (W1173) — productivity endpoint shape + branch scoping', () => {
  test('declares GET /supervisor-ops/productivity', () => {
    expect(ROUTE_SRC).toMatch(/router\.get\(\s*['"]\/supervisor-ops\/productivity['"]/);
  });
  test('delegates to branchProductivity', () => {
    expect(ROUTE_SRC).toMatch(/branchProductivity\(/);
  });
  test('branch-scoped (effectiveBranchScope), never req.branchId, cross-branch 400', () => {
    expect(ROUTE_SRC).toMatch(/effectiveBranchScope\(\s*req\s*\)/);
    expect(ROUTE_SRC).not.toMatch(/req\.branchId/);
    expect(ROUTE_SRC).toMatch(/branchId required/);
  });
  test('read-only (no mutation in the route)', () => {
    expect(ROUTE_SRC).not.toMatch(
      /\.(save|create|updateOne|updateMany|deleteOne|deleteMany|insertMany|insertOne|findOneAndUpdate|bulkWrite)\(/
    );
  });
});
