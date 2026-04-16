'use strict';

jest.mock('../../models/DddOutcomeTracker', () => ({
  DDDOutcomeSnapshot: {},


}));

const svc = require('../../services/dddOutcomeTracker');

describe('dddOutcomeTracker service', () => {
  test('cohensD resolves', async () => { await expect(svc.cohensD()).resolves.not.toThrow(); });
  test('glassDelta resolves', async () => { await expect(svc.glassDelta()).resolves.not.toThrow(); });
  test('interpretEffectSize resolves', async () => { await expect(svc.interpretEffectSize()).resolves.not.toThrow(); });
  test('calculateGAS resolves', async () => { await expect(svc.calculateGAS()).resolves.not.toThrow(); });
  test('evaluateDischargeReadiness resolves', async () => { await expect(svc.evaluateDischargeReadiness()).resolves.not.toThrow(); });
  test('trackOutcome resolves', async () => { await expect(svc.trackOutcome()).resolves.not.toThrow(); });
  test('getLatestOutcome resolves', async () => { await expect(svc.getLatestOutcome()).resolves.not.toThrow(); });
  test('getOutcomeHistory resolves', async () => { await expect(svc.getOutcomeHistory()).resolves.not.toThrow(); });
  test('getInterventionComparison resolves', async () => { await expect(svc.getInterventionComparison()).resolves.not.toThrow(); });
  test('computeEffectSizes resolves', async () => { await expect(svc.computeEffectSizes()).resolves.not.toThrow(); });
  test('computeDomainOutcomes resolves', async () => { await expect(svc.computeDomainOutcomes()).resolves.not.toThrow(); });
  test('predictOutcome resolves', async () => { await expect(svc.predictOutcome()).resolves.not.toThrow(); });
  test('getOutcomeDashboard returns health object', async () => {
    const d = await svc.getOutcomeDashboard();
    expect(d).toHaveProperty('status', 'healthy');
    expect(d).toHaveProperty('timestamp');
  });
});
