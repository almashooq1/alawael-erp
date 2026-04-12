'use strict';

jest.mock('../../models/DddAnalyticsDashboard', () => ({
  DDDWidget: {},
  DDDDashboardLayout: {},
  DDDAnalyticsSnapshot: {},
  WIDGET_TYPES: ['item1'],
  BUILTIN_WIDGETS: ['item1'],
  COHORT_DEFINITIONS: ['item1'],

}));

const svc = require('../../services/dddAnalyticsDashboard');

describe('dddAnalyticsDashboard service', () => {
  test('WIDGET_TYPES is an array', () => { expect(Array.isArray(svc.WIDGET_TYPES)).toBe(true); });
  test('BUILTIN_WIDGETS is an array', () => { expect(Array.isArray(svc.BUILTIN_WIDGETS)).toBe(true); });
  test('COHORT_DEFINITIONS is an array', () => { expect(Array.isArray(svc.COHORT_DEFINITIONS)).toBe(true); });
  test('upsertWidget resolves', async () => { await expect(svc.upsertWidget()).resolves.not.toThrow(); });
  test('executeWidget resolves', async () => { await expect(svc.executeWidget()).resolves.not.toThrow(); });
  test('saveDashboardLayout resolves', async () => { await expect(svc.saveDashboardLayout()).resolves.not.toThrow(); });
  test('loadDashboardLayout resolves', async () => { await expect(svc.loadDashboardLayout()).resolves.not.toThrow(); });
  test('recordSnapshot resolves', async () => { await expect(svc.recordSnapshot()).resolves.not.toThrow(); });
  test('getTrend resolves', async () => { await expect(svc.getTrend()).resolves.not.toThrow(); });
  test('runCohortAnalysis resolves', async () => { await expect(svc.runCohortAnalysis()).resolves.not.toThrow(); });
  test('seedWidgets resolves', async () => { await expect(svc.seedWidgets()).resolves.not.toThrow(); });
  test('getAnalyticsDashboard returns health object', async () => {
    const d = await svc.getAnalyticsDashboard();
    expect(d).toHaveProperty('status', 'healthy');
    expect(d).toHaveProperty('timestamp');
  });
});
