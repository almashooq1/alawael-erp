'use strict';

jest.mock('../../models/DddDataQualityMonitor', () => ({
  DDDDataQualityReport: {},
}));

const svc = require('../../services/dddDataQualityMonitor');

describe('dddDataQualityMonitor – constants', () => {
  test('MODEL_QUALITY_DEFS is an array', () => {
    expect(Array.isArray(svc.MODEL_QUALITY_DEFS)).toBe(true);
  });
});

describe('dddDataQualityMonitor – TODO stubs resolve', () => {
  test('checkCompleteness resolves', async () => {
    await expect(svc.checkCompleteness()).resolves.not.toThrow();
  });
  test('checkReferentialIntegrity resolves', async () => {
    await expect(svc.checkReferentialIntegrity()).resolves.not.toThrow();
  });
  test('checkFreshness resolves', async () => {
    await expect(svc.checkFreshness()).resolves.not.toThrow();
  });
  test('checkDuplicates resolves', async () => {
    await expect(svc.checkDuplicates()).resolves.not.toThrow();
  });
  test('assessModelQuality resolves', async () => {
    await expect(svc.assessModelQuality()).resolves.not.toThrow();
  });
  test('assessGlobalQuality resolves', async () => {
    await expect(svc.assessGlobalQuality()).resolves.not.toThrow();
  });
  test('getQualityTrend resolves', async () => {
    await expect(svc.getQualityTrend()).resolves.not.toThrow();
  });
});
