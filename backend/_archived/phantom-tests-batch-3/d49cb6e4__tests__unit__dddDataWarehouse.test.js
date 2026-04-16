'use strict';

jest.mock('../../models/DddDataWarehouse', () => ({
  DDDETLPipeline: {},
  DDDMaterializedView: {},
  DDDOLAPCube: {},
}));

const svc = require('../../services/dddDataWarehouse');

describe('dddDataWarehouse service', () => {
  /* ── Constants ── */
  test('BUILTIN_PIPELINES is an array', () => {
    expect(Array.isArray(svc.BUILTIN_PIPELINES)).toBe(true);
  });
  test('BUILTIN_VIEWS is an array', () => {
    expect(Array.isArray(svc.BUILTIN_VIEWS)).toBe(true);
  });
  test('BUILTIN_CUBES is an array', () => {
    expect(Array.isArray(svc.BUILTIN_CUBES)).toBe(true);
  });

  /* ── TODO Functions ── */
  test('runETLPipeline resolves', async () => {
    await expect(svc.runETLPipeline()).resolves.toBeUndefined();
  });
  test('refreshMaterializedView resolves', async () => {
    await expect(svc.refreshMaterializedView()).resolves.toBeUndefined();
  });
  test('queryCube resolves', async () => {
    await expect(svc.queryCube()).resolves.toBeUndefined();
  });
  test('seedPipelines resolves', async () => {
    await expect(svc.seedPipelines()).resolves.toBeUndefined();
  });

  /* ── Dashboard ── */
  test('getDataWarehouseDashboard returns health object', async () => {
    const d = await svc.getDataWarehouseDashboard();
    expect(d).toHaveProperty('service', 'DataWarehouse');
    expect(d).toHaveProperty('status', 'healthy');
    expect(d).toHaveProperty('timestamp');
  });
});
