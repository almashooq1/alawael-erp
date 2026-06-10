'use strict';

/**
 * supervisor-overdue-reports-wave1174.test.js — pure + source guard for the
 * supervisor "overdue reports" view (supervisorOps.summarizeOverdueReports +
 * the /supervisor-ops/overdue-reports endpoint).
 *
 * Answers "which beneficiaries have an overdue periodic report?" by REUSING the
 * W222 reassessment lifecycle (listByPhase) — phase OVERDUE/ESCALATED/BREACHED.
 * The shaping is pure + unit-tested; the route is a thin branch-scoped wrapper.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/supervisor-overdue-reports-wave1174.test.js
 */

const fs = require('fs');
const path = require('path');
const {
  summarizeOverdueReports,
  OVERDUE_REPORT_PHASES,
} = require('../services/supervisorOps.service');

const ROUTE_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'domains', 'goals', 'routes', 'supervisor-ops.routes.js'),
  'utf-8'
);

describe('supervisorOps (W1174) — summarizeOverdueReports (pure)', () => {
  test('exported; overdue phases are OVERDUE/ESCALATED/BREACHED', () => {
    expect(typeof summarizeOverdueReports).toBe('function');
    expect(OVERDUE_REPORT_PHASES).toEqual(['OVERDUE', 'ESCALATED', 'BREACHED']);
  });

  test('keeps ONLY overdue-spectrum phases; ignores SCHEDULED/DUE_SOON/DUE_NOW', () => {
    const r = summarizeOverdueReports([
      { _id: '1', beneficiaryId: 'b1', dueAt: '2026-06-01', phase: 'OVERDUE' },
      { _id: '2', beneficiaryId: 'b2', dueAt: '2026-05-20', phase: 'BREACHED' },
      { _id: '3', beneficiaryId: 'b3', dueAt: '2026-05-28', phase: 'ESCALATED' },
      { _id: '4', beneficiaryId: 'b4', dueAt: '2026-06-15', phase: 'DUE_SOON' }, // excluded
      { _id: '5', beneficiaryId: 'b5', dueAt: '2026-07-01', phase: 'SCHEDULED' }, // excluded
    ]);
    expect(r.total).toBe(3);
    expect(r.counts).toEqual({ OVERDUE: 1, ESCALATED: 1, BREACHED: 1 });
  });

  test('sorts most-overdue first (earliest dueAt first)', () => {
    const r = summarizeOverdueReports([
      { _id: 'a', dueAt: '2026-06-01', phase: 'OVERDUE' },
      { _id: 'b', dueAt: '2026-05-15', phase: 'BREACHED' },
      { _id: 'c', dueAt: '2026-05-28', phase: 'ESCALATED' },
    ]);
    expect(r.tasks.map(t => t.taskId)).toEqual(['b', 'c', 'a']);
  });

  test('carries beneficiaryId + measure + dueAt + phase per task', () => {
    const r = summarizeOverdueReports([
      {
        _id: 't1',
        beneficiaryId: 'b1',
        measureId: 'm1',
        measureCode: 'GMFM',
        dueAt: '2026-06-01',
        phase: 'OVERDUE',
      },
    ]);
    expect(r.tasks[0]).toMatchObject({
      taskId: 't1',
      beneficiaryId: 'b1',
      measureCode: 'GMFM',
      phase: 'OVERDUE',
    });
  });

  test('empty / undefined input is safe', () => {
    expect(summarizeOverdueReports([]).total).toBe(0);
    expect(summarizeOverdueReports().counts).toEqual({ OVERDUE: 0, ESCALATED: 0, BREACHED: 0 });
  });
});

describe('supervisorOps (W1174) — overdue-reports endpoint shape + scoping', () => {
  test('declares GET /supervisor-ops/overdue-reports', () => {
    expect(ROUTE_SRC).toMatch(/router\.get\(\s*['"]\/supervisor-ops\/overdue-reports['"]/);
  });
  test('reuses the W222 reassessment lifecycle (listByPhase) — does not reimplement', () => {
    expect(ROUTE_SRC).toMatch(/reassessmentLifecycleService\.listByPhase\(/);
    expect(ROUTE_SRC).toMatch(/summarizeOverdueReports\(/);
  });
  test('branch-scoped (effectiveBranchScope), never req.branchId, cross-branch 400, read-only', () => {
    expect(ROUTE_SRC).toMatch(/effectiveBranchScope\(\s*req\s*\)/);
    expect(ROUTE_SRC).not.toMatch(/req\.branchId/);
    expect(ROUTE_SRC).toMatch(/branchId required/);
    expect(ROUTE_SRC).not.toMatch(
      /\.(save|create|updateOne|updateMany|deleteOne|deleteMany|insertMany|insertOne|findOneAndUpdate|bulkWrite)\(/
    );
  });
});
