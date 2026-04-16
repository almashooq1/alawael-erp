'use strict';

jest.mock('../../models/DddErrorTracker', () => ({
  DDDErrorLog: {},
  ERROR_CATEGORIES: ['item1'],
  CATEGORY_RULES: ['item1'],

}));

const svc = require('../../services/dddErrorTracker');

describe('dddErrorTracker service', () => {
  test('ERROR_CATEGORIES is an array', () => { expect(Array.isArray(svc.ERROR_CATEGORIES)).toBe(true); });
  test('CATEGORY_RULES is an array', () => { expect(Array.isArray(svc.CATEGORY_RULES)).toBe(true); });
  test('classifyError resolves', async () => { await expect(svc.classifyError()).resolves.not.toThrow(); });
  test('classifySeverity resolves', async () => { await expect(svc.classifySeverity()).resolves.not.toThrow(); });
  test('generateFingerprint resolves', async () => { await expect(svc.generateFingerprint()).resolves.not.toThrow(); });
  test('trackError resolves', async () => { await expect(svc.trackError()).resolves.not.toThrow(); });
  test('acknowledgeError resolves', async () => { await expect(svc.acknowledgeError()).resolves.not.toThrow(); });
  test('resolveError resolves', async () => { await expect(svc.resolveError()).resolves.not.toThrow(); });
  test('ignoreError resolves', async () => { await expect(svc.ignoreError()).resolves.not.toThrow(); });
  test('getErrorTrend resolves', async () => { await expect(svc.getErrorTrend()).resolves.not.toThrow(); });
  test('getErrorDashboard returns health object', async () => {
    const d = await svc.getErrorDashboard();
    expect(d).toHaveProperty('status', 'healthy');
    expect(d).toHaveProperty('timestamp');
  });
});
