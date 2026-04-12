'use strict';

jest.mock('../../models/DddBusinessIntelligence', () => ({
  DDDBIReport: {},
  DDDScorecard: {},
  DDDBenchmark: {},
}));

const svc = require('../../services/dddBusinessIntelligence');

describe('dddBusinessIntelligence', () => {
  it('exports expected constants as arrays', () => {
    expect(Array.isArray(svc.BUILTIN_REPORTS)).toBe(true);
    expect(Array.isArray(svc.BUILTIN_SCORECARDS)).toBe(true);
    expect(Array.isArray(svc.REPORT_CATEGORIES)).toBe(true);
  });

  it('exports all expected functions', () => {
    const fns = [
      'executeReport',
      'calculateScorecard',
      'executiveSummary',
      'upsertBenchmark',
      'getBenchmarks',
      'seedReports',
      'getBIDashboard',
    ];
    fns.forEach(fn => expect(typeof svc[fn]).toBe('function'));
  });

  /* TODO stubs */
  it('executeReport resolves', async () => {
    await expect(svc.executeReport()).resolves.toBeUndefined();
  });
  it('calculateScorecard resolves', async () => {
    await expect(svc.calculateScorecard()).resolves.toBeUndefined();
  });
  it('executiveSummary resolves', async () => {
    await expect(svc.executiveSummary()).resolves.toBeUndefined();
  });
  it('upsertBenchmark resolves', async () => {
    await expect(svc.upsertBenchmark()).resolves.toBeUndefined();
  });
  it('getBenchmarks resolves', async () => {
    await expect(svc.getBenchmarks()).resolves.toBeUndefined();
  });
  it('seedReports resolves', async () => {
    await expect(svc.seedReports()).resolves.toBeUndefined();
  });

  it('getBIDashboard returns health info', async () => {
    const r = await svc.getBIDashboard();
    expect(r.service).toBe('BusinessIntelligence');
    expect(r.status).toBe('healthy');
    expect(r.timestamp).toBeInstanceOf(Date);
  });
});
