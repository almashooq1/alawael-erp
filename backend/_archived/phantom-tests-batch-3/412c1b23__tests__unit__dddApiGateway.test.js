'use strict';

jest.mock('../../models/DddApiGateway', () => ({
  DDDApiKey: {},
  DDDApiUsage: {},
  API_VERSIONS: ['item1'],
  CURRENT_VERSION: ['item1'],
  VERSION_STRATEGIES: ['item1'],
  RESPONSE_TRANSFORMS: ['item1'],

}));

const svc = require('../../services/dddApiGateway');

describe('dddApiGateway service', () => {
  test('API_VERSIONS is an array', () => { expect(Array.isArray(svc.API_VERSIONS)).toBe(true); });
  test('CURRENT_VERSION is an array', () => { expect(Array.isArray(svc.CURRENT_VERSION)).toBe(true); });
  test('VERSION_STRATEGIES is an array', () => { expect(Array.isArray(svc.VERSION_STRATEGIES)).toBe(true); });
  test('RESPONSE_TRANSFORMS is an array', () => { expect(Array.isArray(svc.RESPONSE_TRANSFORMS)).toBe(true); });
  test('generateApiKey resolves', async () => { await expect(svc.generateApiKey()).resolves.not.toThrow(); });
  test('hashApiKey resolves', async () => { await expect(svc.hashApiKey()).resolves.not.toThrow(); });
  test('validateApiKey resolves', async () => { await expect(svc.validateApiKey()).resolves.not.toThrow(); });
  test('revokeApiKey resolves', async () => { await expect(svc.revokeApiKey()).resolves.not.toThrow(); });
  test('suspendApiKey resolves', async () => { await expect(svc.suspendApiKey()).resolves.not.toThrow(); });
  test('reactivateApiKey resolves', async () => { await expect(svc.reactivateApiKey()).resolves.not.toThrow(); });
  test('resetQuota resolves', async () => { await expect(svc.resetQuota()).resolves.not.toThrow(); });
  test('resolveVersion resolves', async () => { await expect(svc.resolveVersion()).resolves.not.toThrow(); });
  test('getUsageTrend resolves', async () => { await expect(svc.getUsageTrend()).resolves.not.toThrow(); });
  test('getGatewayDashboard returns health object', async () => {
    const d = await svc.getGatewayDashboard();
    expect(d).toHaveProperty('status', 'healthy');
    expect(d).toHaveProperty('timestamp');
  });
});
