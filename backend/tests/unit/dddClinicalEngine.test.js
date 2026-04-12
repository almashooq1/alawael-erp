'use strict';

jest.mock('../../models/DddClinicalEngine', () => ({
  DDDClinicalInsight: {},
}));

const svc = require('../../services/dddClinicalEngine');

describe('dddClinicalEngine', () => {
  it('exports CLINICAL_RULES as array', () => {
    expect(Array.isArray(svc.CLINICAL_RULES)).toBe(true);
  });

  it('exports all expected functions', () => {
    const fns = [
      'gatherClinicalContext',
      'evaluateBeneficiary',
      'evaluateBatch',
      'getLatestInsight',
      'getInsightHistory',
      'getClinicalDashboard',
      'getCriticalCases',
      'listRules',
      'computeDomainScores',
      'computeClinicalStatus',
      'generateNextBestActions',
      'detectTreatmentGaps',
    ];
    fns.forEach(fn => expect(typeof svc[fn]).toBe('function'));
  });

  /* TODO stubs */
  it('gatherClinicalContext resolves', async () => {
    await expect(svc.gatherClinicalContext()).resolves.toBeUndefined();
  });
  it('evaluateBeneficiary resolves', async () => {
    await expect(svc.evaluateBeneficiary()).resolves.toBeUndefined();
  });
  it('evaluateBatch resolves', async () => {
    await expect(svc.evaluateBatch()).resolves.toBeUndefined();
  });
  it('getLatestInsight resolves', async () => {
    await expect(svc.getLatestInsight()).resolves.toBeUndefined();
  });
  it('getInsightHistory resolves', async () => {
    await expect(svc.getInsightHistory()).resolves.toBeUndefined();
  });
  it('getCriticalCases resolves', async () => {
    await expect(svc.getCriticalCases()).resolves.toBeUndefined();
  });
  it('listRules resolves', async () => {
    await expect(svc.listRules()).resolves.toBeUndefined();
  });
  it('computeDomainScores resolves', async () => {
    await expect(svc.computeDomainScores()).resolves.toBeUndefined();
  });
  it('computeClinicalStatus resolves', async () => {
    await expect(svc.computeClinicalStatus()).resolves.toBeUndefined();
  });
  it('generateNextBestActions resolves', async () => {
    await expect(svc.generateNextBestActions()).resolves.toBeUndefined();
  });
  it('detectTreatmentGaps resolves', async () => {
    await expect(svc.detectTreatmentGaps()).resolves.toBeUndefined();
  });

  it('getClinicalDashboard returns health info', async () => {
    const r = await svc.getClinicalDashboard();
    expect(r.service).toBe('ClinicalEngine');
    expect(r.status).toBe('healthy');
    expect(r.timestamp).toBeInstanceOf(Date);
  });
});
