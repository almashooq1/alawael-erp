'use strict';

jest.mock('../../models/DddHealthMonitor', () => ({
  DDDHealthCheck: {},
  DOMAIN_MODEL_MAP: ['item1'],
  HEALTH_CHECK_DEFS: ['item1'],

}));

const svc = require('../../services/dddHealthMonitor');

describe('dddHealthMonitor service', () => {
  test('DOMAIN_MODEL_MAP is an array', () => { expect(Array.isArray(svc.DOMAIN_MODEL_MAP)).toBe(true); });
  test('HEALTH_CHECK_DEFS is an array', () => { expect(Array.isArray(svc.HEALTH_CHECK_DEFS)).toBe(true); });
  test('checkMongoDB resolves', async () => { await expect(svc.checkMongoDB()).resolves.not.toThrow(); });
  test('checkRedis resolves', async () => { await expect(svc.checkRedis()).resolves.not.toThrow(); });
  test('checkMemory resolves', async () => { await expect(svc.checkMemory()).resolves.not.toThrow(); });
  test('checkUptime resolves', async () => { await expect(svc.checkUptime()).resolves.not.toThrow(); });
  test('checkDomainHealth resolves', async () => { await expect(svc.checkDomainHealth()).resolves.not.toThrow(); });
  test('checkAllDomains resolves', async () => { await expect(svc.checkAllDomains()).resolves.not.toThrow(); });
  test('runFullHealthCheck resolves', async () => { await expect(svc.runFullHealthCheck()).resolves.not.toThrow(); });
  test('livenessCheck resolves', async () => { await expect(svc.livenessCheck()).resolves.not.toThrow(); });
  test('readinessCheck resolves', async () => { await expect(svc.readinessCheck()).resolves.not.toThrow(); });
  test('getHealthTrend resolves', async () => { await expect(svc.getHealthTrend()).resolves.not.toThrow(); });
  test('getHealthDashboard returns health object', async () => {
    const d = await svc.getHealthDashboard();
    expect(d).toHaveProperty('status', 'healthy');
    expect(d).toHaveProperty('timestamp');
  });
});
