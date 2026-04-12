'use strict';

jest.mock('../../models/DddComplianceDashboard', () => ({
  DDDComplianceAssessment: {},
  DDDCompliancePolicy: {},
}));

const svc = require('../../services/dddComplianceDashboard');

describe('dddComplianceDashboard – constants', () => {
  test('COMPLIANCE_RULES is an array', () => {
    expect(Array.isArray(svc.COMPLIANCE_RULES)).toBe(true);
  });
});

describe('dddComplianceDashboard – TODO stubs resolve', () => {
  test('assessBeneficiaryCompliance resolves', async () => {
    await expect(svc.assessBeneficiaryCompliance()).resolves.not.toThrow();
  });
  test('assessBranchCompliance resolves', async () => {
    await expect(svc.assessBranchCompliance()).resolves.not.toThrow();
  });
  test('getComplianceHistory resolves', async () => {
    await expect(svc.getComplianceHistory()).resolves.not.toThrow();
  });
  test('getLatestCompliance resolves', async () => {
    await expect(svc.getLatestCompliance()).resolves.not.toThrow();
  });
  test('listComplianceRules resolves', async () => {
    await expect(svc.listComplianceRules()).resolves.not.toThrow();
  });
  test('computeGrade resolves', async () => {
    await expect(svc.computeGrade()).resolves.not.toThrow();
  });
  test('computeComplianceLevel resolves', async () => {
    await expect(svc.computeComplianceLevel()).resolves.not.toThrow();
  });
});

describe('dddComplianceDashboard – getComplianceDashboard', () => {
  test('returns health object', async () => {
    const r = await svc.getComplianceDashboard();
    expect(r.service).toBe('ComplianceDashboard');
    expect(r.status).toBe('healthy');
    expect(r.timestamp).toBeInstanceOf(Date);
  });
});
