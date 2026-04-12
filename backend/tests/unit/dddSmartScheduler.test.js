'use strict';

jest.mock('../../models/DddSmartScheduler', () => ({
  DDDWatchlist: {},
  DDDSchedulingRecommendation: {},


}));

const svc = require('../../services/dddSmartScheduler');

describe('dddSmartScheduler service', () => {
  test('predictNoShow resolves', async () => { await expect(svc.predictNoShow()).resolves.not.toThrow(); });
  test('suggestMitigationStrategy resolves', async () => { await expect(svc.suggestMitigationStrategy()).resolves.not.toThrow(); });
  test('recommendFrequency resolves', async () => { await expect(svc.recommendFrequency()).resolves.not.toThrow(); });
  test('analyzeWorkload resolves', async () => { await expect(svc.analyzeWorkload()).resolves.not.toThrow(); });
  test('detectConflicts resolves', async () => { await expect(svc.detectConflicts()).resolves.not.toThrow(); });
  test('generateRecommendations resolves', async () => { await expect(svc.generateRecommendations()).resolves.not.toThrow(); });
  test('getUtilizationDashboard returns health object', async () => {
    const d = await svc.getUtilizationDashboard();
    expect(d).toHaveProperty('status', 'healthy');
    expect(d).toHaveProperty('timestamp');
  });
});
