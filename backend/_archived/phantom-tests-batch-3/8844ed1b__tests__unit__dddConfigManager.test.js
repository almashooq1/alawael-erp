'use strict';

jest.mock('../../models/DddConfigManager', () => ({
  DDDConfig: {},
  DDDConfigVersion: {},
}));

const svc = require('../../services/dddConfigManager');

describe('dddConfigManager – constants', () => {
  test('DEFAULT_CONFIGS is an array', () => {
    expect(Array.isArray(svc.DEFAULT_CONFIGS)).toBe(true);
  });
});

describe('dddConfigManager – TODO stubs resolve', () => {
  test('seedDefaults resolves', async () => {
    await expect(svc.seedDefaults()).resolves.not.toThrow();
  });
  test('setConfig resolves', async () => {
    await expect(svc.setConfig()).resolves.not.toThrow();
  });
  test('getConfig resolves', async () => {
    await expect(svc.getConfig()).resolves.not.toThrow();
  });
  test('getConfigFull resolves', async () => {
    await expect(svc.getConfigFull()).resolves.not.toThrow();
  });
  test('listConfigs resolves', async () => {
    await expect(svc.listConfigs()).resolves.not.toThrow();
  });
  test('getConfigVersions resolves', async () => {
    await expect(svc.getConfigVersions()).resolves.not.toThrow();
  });
  test('rollbackConfig resolves', async () => {
    await expect(svc.rollbackConfig()).resolves.not.toThrow();
  });
  test('deleteConfig resolves', async () => {
    await expect(svc.deleteConfig()).resolves.not.toThrow();
  });
  test('exportConfigs resolves', async () => {
    await expect(svc.exportConfigs()).resolves.not.toThrow();
  });
  test('importConfigs resolves', async () => {
    await expect(svc.importConfigs()).resolves.not.toThrow();
  });
  test('encrypt resolves', async () => {
    await expect(svc.encrypt()).resolves.not.toThrow();
  });
  test('decrypt resolves', async () => {
    await expect(svc.decrypt()).resolves.not.toThrow();
  });
});

describe('dddConfigManager – getConfigDashboard', () => {
  test('returns health object', async () => {
    const r = await svc.getConfigDashboard();
    expect(r.service).toBe('ConfigManager');
    expect(r.status).toBe('healthy');
    expect(r.timestamp).toBeInstanceOf(Date);
  });
});
