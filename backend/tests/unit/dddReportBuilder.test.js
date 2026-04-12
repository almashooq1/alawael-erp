'use strict';

jest.mock('../../models/DddReportBuilder', () => ({
  DDDReportDefinition: {},
  DDDReportHistory: {},
  BUILTIN_REPORTS: ['item1'],

}));

const svc = require('../../services/dddReportBuilder');

describe('dddReportBuilder service', () => {
  test('BUILTIN_REPORTS is an array', () => { expect(Array.isArray(svc.BUILTIN_REPORTS)).toBe(true); });
  test('executeReport resolves', async () => { await expect(svc.executeReport()).resolves.not.toThrow(); });
  test('executeBuiltinReport resolves', async () => { await expect(svc.executeBuiltinReport()).resolves.not.toThrow(); });
  test('seedBuiltinReports resolves', async () => { await expect(svc.seedBuiltinReports()).resolves.not.toThrow(); });
  test('getReportHistory resolves', async () => { await expect(svc.getReportHistory()).resolves.not.toThrow(); });
});
