'use strict';

jest.mock('../../models/DddTenantManager', () => ({
  DDDBranch: {},
  DDDTenantAccess: {},
  TENANT_SCOPED_MODELS: ['item1'],

}));

const svc = require('../../services/dddTenantManager');

describe('dddTenantManager service', () => {
  test('TENANT_SCOPED_MODELS is an array', () => { expect(Array.isArray(svc.TENANT_SCOPED_MODELS)).toBe(true); });
  test('updateBranch resolves', async () => { await expect(svc.updateBranch()).resolves.not.toThrow(); });
  test('getBranch resolves', async () => { await expect(svc.getBranch()).resolves.not.toThrow(); });
  test('listBranches resolves', async () => { await expect(svc.listBranches()).resolves.not.toThrow(); });
  test('getBranchHierarchy resolves', async () => { await expect(svc.getBranchHierarchy()).resolves.not.toThrow(); });
  test('grantAccess resolves', async () => { await expect(svc.grantAccess()).resolves.not.toThrow(); });
  test('revokeAccess resolves', async () => { await expect(svc.revokeAccess()).resolves.not.toThrow(); });
  test('getUserBranches resolves', async () => { await expect(svc.getUserBranches()).resolves.not.toThrow(); });
  test('checkBranchAccess resolves', async () => { await expect(svc.checkBranchAccess()).resolves.not.toThrow(); });
  test('buildTenantQuery resolves', async () => { await expect(svc.buildTenantQuery()).resolves.not.toThrow(); });
  test('getBranchStats resolves', async () => { await expect(svc.getBranchStats()).resolves.not.toThrow(); });
  test('getTenantDashboard returns health object', async () => {
    const d = await svc.getTenantDashboard();
    expect(d).toHaveProperty('status', 'healthy');
    expect(d).toHaveProperty('timestamp');
  });
});
