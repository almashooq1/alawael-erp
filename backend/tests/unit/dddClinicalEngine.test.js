'use strict';

jest.mock('../../models/DddClinicalEngine', () => ({
  DDDClinicalInsight: {},
  CLINICAL_RULES: ['item1'],

}));

const svc = require('../../services/dddClinicalEngine');

describe('dddClinicalEngine service', () => {
  test('CLINICAL_RULES is an array', () => { expect(Array.isArray(svc.CLINICAL_RULES)).toBe(true); });
  test('gatherClinicalContext resolves', async () => { await expect(svc.gatherClinicalContext()).resolves.not.toThrow(); });
  test('evaluateBeneficiary resolves', async () => { await expect(svc.evaluateBeneficiary()).resolves.not.toThrow(); });
  test('evaluateBatch resolves', async () => { await expect(svc.evaluateBatch()).resolves.not.toThrow(); });
  test('getLatestInsight resolves', async () => { await expect(svc.getLatestInsight()).resolves.not.toThrow(); });
  test('getInsightHistory resolves', async () => { await expect(svc.getInsightHistory()).resolves.not.toThrow(); });
  test('getCriticalCases resolves', async () => { await expect(svc.getCriticalCases()).resolves.not.toThrow(); });
  test('listRules resolves', async () => { await expect(svc.listRules()).resolves.not.toThrow(); });
  test('computeDomainScores resolves', async () => { await expect(svc.computeDomainScores()).resolves.not.toThrow(); });
  test('computeClinicalStatus resolves', async () => { await expect(svc.computeClinicalStatus()).resolves.not.toThrow(); });
  test('generateNextBestActions resolves', async () => { await expect(svc.generateNextBestActions()).resolves.not.toThrow(); });
  test('detectTreatmentGaps resolves', async () => { await expect(svc.detectTreatmentGaps()).resolves.not.toThrow(); });
  test('getClinicalDashboard returns health object', async () => {
    const d = await svc.getClinicalDashboard();
    expect(d).toHaveProperty('status', 'healthy');
    expect(d).toHaveProperty('timestamp');
  });
});
