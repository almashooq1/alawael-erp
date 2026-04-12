'use strict';

jest.mock('../../models/DddApiGateway', () => ({
  DDDApiKey: {},
  DDDApiUsage: {},
}));

const svc = require('../../services/dddApiGateway');

describe('dddApiGateway', () => {
  it('exports expected constants as arrays', () => {
    expect(Array.isArray(svc.API_VERSIONS)).toBe(true);
    expect(Array.isArray(svc.CURRENT_VERSION)).toBe(true);
    expect(Array.isArray(svc.VERSION_STRATEGIES)).toBe(true);
    expect(Array.isArray(svc.RESPONSE_TRANSFORMS)).toBe(true);
  });

  it('exports all expected functions', () => {
    const fns = [
      'generateApiKey',
      'hashApiKey',
      'validateApiKey',
      'revokeApiKey',
      'suspendApiKey',
      'reactivateApiKey',
      'resetQuota',
      'resolveVersion',
      'apiKeyMiddleware',
      'usageTrackingMiddleware',
      'getGatewayDashboard',
      'getUsageTrend',
    ];
    fns.forEach(fn => expect(typeof svc[fn]).toBe('function'));
  });

  /* TODO stubs */
  it('generateApiKey resolves', async () => {
    await expect(svc.generateApiKey()).resolves.toBeUndefined();
  });
  it('hashApiKey resolves', async () => {
    await expect(svc.hashApiKey()).resolves.toBeUndefined();
  });
  it('validateApiKey resolves', async () => {
    await expect(svc.validateApiKey()).resolves.toBeUndefined();
  });
  it('revokeApiKey resolves', async () => {
    await expect(svc.revokeApiKey()).resolves.toBeUndefined();
  });
  it('suspendApiKey resolves', async () => {
    await expect(svc.suspendApiKey()).resolves.toBeUndefined();
  });
  it('reactivateApiKey resolves', async () => {
    await expect(svc.reactivateApiKey()).resolves.toBeUndefined();
  });
  it('resetQuota resolves', async () => {
    await expect(svc.resetQuota()).resolves.toBeUndefined();
  });
  it('resolveVersion resolves', async () => {
    await expect(svc.resolveVersion()).resolves.toBeUndefined();
  });
  it('getUsageTrend resolves', async () => {
    await expect(svc.getUsageTrend()).resolves.toBeUndefined();
  });

  /* Middlewares */
  it('apiKeyMiddleware calls next()', () => {
    const next = jest.fn();
    svc.apiKeyMiddleware({}, {}, next);
    expect(next).toHaveBeenCalled();
  });

  it('usageTrackingMiddleware calls next()', () => {
    const next = jest.fn();
    svc.usageTrackingMiddleware({}, {}, next);
    expect(next).toHaveBeenCalled();
  });

  /* Dashboard */
  it('getGatewayDashboard returns health info', async () => {
    const r = await svc.getGatewayDashboard();
    expect(r.service).toBe('ApiGateway');
    expect(r.status).toBe('healthy');
    expect(r.timestamp).toBeInstanceOf(Date);
  });
});
