'use strict';

jest.mock('../../models/DddRiskStratification', () => ({
  DDDClinicalInsight: {},
  DDDWatchlist: {},
  RISK_WEIGHTS: ['item1'],
  TIER_THRESHOLDS: ['item1'],

}));

const svc = require('../../services/dddRiskStratification');

describe('dddRiskStratification service', () => {
  test('RISK_WEIGHTS is an array', () => { expect(Array.isArray(svc.RISK_WEIGHTS)).toBe(true); });
  test('TIER_THRESHOLDS is an array', () => { expect(Array.isArray(svc.TIER_THRESHOLDS)).toBe(true); });
  test('determineTier resolves', async () => { await expect(svc.determineTier()).resolves.not.toThrow(); });
  test('determineTrajectory resolves', async () => { await expect(svc.determineTrajectory()).resolves.not.toThrow(); });
  test('computeRiskFactors resolves', async () => { await expect(svc.computeRiskFactors()).resolves.not.toThrow(); });
  test('stratifyBeneficiary resolves', async () => { await expect(svc.stratifyBeneficiary()).resolves.not.toThrow(); });
  test('stratifyPopulation resolves', async () => { await expect(svc.stratifyPopulation()).resolves.not.toThrow(); });
  test('getCaseloadPriorities resolves', async () => { await expect(svc.getCaseloadPriorities()).resolves.not.toThrow(); });
  test('getWatchlist resolves', async () => { await expect(svc.getWatchlist()).resolves.not.toThrow(); });
  test('reviewWatchlistEntry resolves', async () => { await expect(svc.reviewWatchlistEntry()).resolves.not.toThrow(); });
  test('detectEarlyWarnings resolves', async () => { await expect(svc.detectEarlyWarnings()).resolves.not.toThrow(); });
  test('getRiskDashboard returns health object', async () => {
    const d = await svc.getRiskDashboard();
    expect(d).toHaveProperty('status', 'healthy');
    expect(d).toHaveProperty('timestamp');
  });
});
