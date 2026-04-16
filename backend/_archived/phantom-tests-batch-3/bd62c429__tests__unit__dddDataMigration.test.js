'use strict';

jest.mock('../../models/DddDataMigration', () => ({
  DDDMigration: {},
  DDDMigrationLock: {},
}));

const svc = require('../../services/dddDataMigration');

describe('dddDataMigration – constants', () => {
  test('BUILTIN_MIGRATIONS is an array', () => {
    expect(Array.isArray(svc.BUILTIN_MIGRATIONS)).toBe(true);
  });
});

describe('dddDataMigration – TODO stubs resolve', () => {
  test('acquireLock resolves', async () => {
    await expect(svc.acquireLock()).resolves.not.toThrow();
  });
  test('releaseLock resolves', async () => {
    await expect(svc.releaseLock()).resolves.not.toThrow();
  });
  test('runMigration resolves', async () => {
    await expect(svc.runMigration()).resolves.not.toThrow();
  });
  test('rollbackMigration resolves', async () => {
    await expect(svc.rollbackMigration()).resolves.not.toThrow();
  });
  test('runAllPending resolves', async () => {
    await expect(svc.runAllPending()).resolves.not.toThrow();
  });
});

describe('dddDataMigration – getMigrationDashboard', () => {
  test('returns health object', async () => {
    const r = await svc.getMigrationDashboard();
    expect(r.service).toBe('DataMigration');
    expect(r.status).toBe('healthy');
    expect(r.timestamp).toBeInstanceOf(Date);
  });
});
