'use strict';

jest.mock('../../models/DddAnalyticsDashboard', () => ({
  DDDWidget: {},
  DDDDashboardLayout: {},
  DDDAnalyticsSnapshot: {},
}));

const svc = require('../../services/dddAnalyticsDashboard');

describe('dddAnalyticsDashboard', () => {
  it('exports expected constants as arrays', () => {
    expect(Array.isArray(svc.WIDGET_TYPES)).toBe(true);
    expect(Array.isArray(svc.BUILTIN_WIDGETS)).toBe(true);
    expect(Array.isArray(svc.COHORT_DEFINITIONS)).toBe(true);
  });

  it('exports all expected functions', () => {
    const fns = [
      'upsertWidget',
      'executeWidget',
      'saveDashboardLayout',
      'loadDashboardLayout',
      'recordSnapshot',
      'getTrend',
      'runCohortAnalysis',
      'seedWidgets',
      'getAnalyticsDashboard',
    ];
    fns.forEach(fn => expect(typeof svc[fn]).toBe('function'));
  });

  /* TODO stubs */
  it('upsertWidget resolves', async () => {
    await expect(svc.upsertWidget()).resolves.toBeUndefined();
  });
  it('executeWidget resolves', async () => {
    await expect(svc.executeWidget()).resolves.toBeUndefined();
  });
  it('saveDashboardLayout resolves', async () => {
    await expect(svc.saveDashboardLayout()).resolves.toBeUndefined();
  });
  it('loadDashboardLayout resolves', async () => {
    await expect(svc.loadDashboardLayout()).resolves.toBeUndefined();
  });
  it('recordSnapshot resolves', async () => {
    await expect(svc.recordSnapshot()).resolves.toBeUndefined();
  });
  it('getTrend resolves', async () => {
    await expect(svc.getTrend()).resolves.toBeUndefined();
  });
  it('runCohortAnalysis resolves', async () => {
    await expect(svc.runCohortAnalysis()).resolves.toBeUndefined();
  });
  it('seedWidgets resolves', async () => {
    await expect(svc.seedWidgets()).resolves.toBeUndefined();
  });

  it('getAnalyticsDashboard returns health info', async () => {
    const r = await svc.getAnalyticsDashboard();
    expect(r.service).toBe('AnalyticsDashboard');
    expect(r.status).toBe('healthy');
    expect(r.timestamp).toBeInstanceOf(Date);
  });
});
