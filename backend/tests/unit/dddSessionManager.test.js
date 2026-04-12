'use strict';

jest.mock('../../models/DddSessionManager', () => ({
  DDDSession: {},
  SESSION_DEFAULTS: ['item1'],
  DEVICE_TYPES: ['item1'],

}));

const svc = require('../../services/dddSessionManager');

describe('dddSessionManager service', () => {
  test('SESSION_DEFAULTS is an array', () => { expect(Array.isArray(svc.SESSION_DEFAULTS)).toBe(true); });
  test('DEVICE_TYPES is an array', () => { expect(Array.isArray(svc.DEVICE_TYPES)).toBe(true); });
  test('generateDeviceFingerprint resolves', async () => { await expect(svc.generateDeviceFingerprint()).resolves.not.toThrow(); });
  test('parseUserAgent resolves', async () => { await expect(svc.parseUserAgent()).resolves.not.toThrow(); });
  test('touchSession resolves', async () => { await expect(svc.touchSession()).resolves.not.toThrow(); });
  test('terminateSession resolves', async () => { await expect(svc.terminateSession()).resolves.not.toThrow(); });
  test('terminateAllUserSessions resolves', async () => { await expect(svc.terminateAllUserSessions()).resolves.not.toThrow(); });
  test('getActiveSessions resolves', async () => { await expect(svc.getActiveSessions()).resolves.not.toThrow(); });
  test('enforceSessionLimits resolves', async () => { await expect(svc.enforceSessionLimits()).resolves.not.toThrow(); });
  test('cleanExpiredSessions resolves', async () => { await expect(svc.cleanExpiredSessions()).resolves.not.toThrow(); });
  test('getSessionDashboard returns health object', async () => {
    const d = await svc.getSessionDashboard();
    expect(d).toHaveProperty('status', 'healthy');
    expect(d).toHaveProperty('timestamp');
  });
});
