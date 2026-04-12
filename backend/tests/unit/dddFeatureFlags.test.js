'use strict';

jest.mock('../../models/DddFeatureFlags', () => ({
  DDDFeatureFlag: {},
  DDDFlagAudit: {},
  DEFAULT_FLAGS: ['item1'],

}));

const svc = require('../../services/dddFeatureFlags');

describe('dddFeatureFlags service', () => {
  test('DEFAULT_FLAGS is an array', () => { expect(Array.isArray(svc.DEFAULT_FLAGS)).toBe(true); });
  test('seedDefaultFlags resolves', async () => { await expect(svc.seedDefaultFlags()).resolves.not.toThrow(); });
  test('updateFlag resolves', async () => { await expect(svc.updateFlag()).resolves.not.toThrow(); });
  test('deleteFlag resolves', async () => { await expect(svc.deleteFlag()).resolves.not.toThrow(); });
  test('getFlag resolves', async () => { await expect(svc.getFlag()).resolves.not.toThrow(); });
  test('listFlags resolves', async () => { await expect(svc.listFlags()).resolves.not.toThrow(); });
  test('evaluateFlag resolves', async () => { await expect(svc.evaluateFlag()).resolves.not.toThrow(); });
  test('isEnabled resolves', async () => { await expect(svc.isEnabled()).resolves.not.toThrow(); });
  test('hashPercentage resolves', async () => { await expect(svc.hashPercentage()).resolves.not.toThrow(); });
  test('getFlagDashboard returns health object', async () => {
    const d = await svc.getFlagDashboard();
    expect(d).toHaveProperty('status', 'healthy');
    expect(d).toHaveProperty('timestamp');
  });
});
