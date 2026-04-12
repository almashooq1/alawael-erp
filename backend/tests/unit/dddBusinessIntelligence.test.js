'use strict';

jest.mock('../../models/DddBusinessIntelligence', () => ({
  DDDScorecard: {},
  DDDBenchmark: {},
  BUILTIN_REPORTS: ['item1'],
  BUILTIN_SCORECARDS: ['item1'],
  REPORT_CATEGORIES: ['item1'],

}));

const svc = require('../../services/dddBusinessIntelligence');

describe('dddBusinessIntelligence service', () => {
  test('BUILTIN_REPORTS is an array', () => { expect(Array.isArray(svc.BUILTIN_REPORTS)).toBe(true); });
  test('BUILTIN_SCORECARDS is an array', () => { expect(Array.isArray(svc.BUILTIN_SCORECARDS)).toBe(true); });
  test('REPORT_CATEGORIES is an array', () => { expect(Array.isArray(svc.REPORT_CATEGORIES)).toBe(true); });
  test('executeReport resolves', async () => { await expect(svc.executeReport()).resolves.not.toThrow(); });
  test('calculateScorecard resolves', async () => { await expect(svc.calculateScorecard()).resolves.not.toThrow(); });
  test('executiveSummary resolves', async () => { await expect(svc.executiveSummary()).resolves.not.toThrow(); });
  test('upsertBenchmark resolves', async () => { await expect(svc.upsertBenchmark()).resolves.not.toThrow(); });
  test('getBenchmarks resolves', async () => { await expect(svc.getBenchmarks()).resolves.not.toThrow(); });
  test('seedReports resolves', async () => { await expect(svc.seedReports()).resolves.not.toThrow(); });
  test('getBIDashboard returns health object', async () => {
    const d = await svc.getBIDashboard();
    expect(d).toHaveProperty('status', 'healthy');
    expect(d).toHaveProperty('timestamp');
  });
});
