'use strict';

jest.mock('../../models/DddSecurityAuditor', () => ({
  DDDSecurityEvent: {},
  DDDSecurityPolicy: {},
  BUILTIN_POLICIES: ['item1'],
  THREAT_PATTERNS: ['item1'],

}));

const svc = require('../../services/dddSecurityAuditor');

describe('dddSecurityAuditor service', () => {
  test('BUILTIN_POLICIES is an array', () => { expect(Array.isArray(svc.BUILTIN_POLICIES)).toBe(true); });
  test('THREAT_PATTERNS is an array', () => { expect(Array.isArray(svc.THREAT_PATTERNS)).toBe(true); });
  test('detectThreats resolves', async () => { await expect(svc.detectThreats()).resolves.not.toThrow(); });
  test('logSecurityEvent resolves', async () => { await expect(svc.logSecurityEvent()).resolves.not.toThrow(); });
  test('checkBruteForce resolves', async () => { await expect(svc.checkBruteForce()).resolves.not.toThrow(); });
  test('getIPReputation resolves', async () => { await expect(svc.getIPReputation()).resolves.not.toThrow(); });
  test('resolveSecurityEvent resolves', async () => { await expect(svc.resolveSecurityEvent()).resolves.not.toThrow(); });
  test('getSecurityDashboard returns health object', async () => {
    const d = await svc.getSecurityDashboard();
    expect(d).toHaveProperty('status', 'healthy');
    expect(d).toHaveProperty('timestamp');
  });
});
