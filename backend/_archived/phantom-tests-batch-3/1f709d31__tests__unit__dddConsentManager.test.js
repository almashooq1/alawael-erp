'use strict';

jest.mock('../../models/DddConsentManager', () => ({
  DDDConsent: {},
  DDDDataSubjectRequest: {},
  DDDDataRetentionPolicy: {},
}));

const svc = require('../../services/dddConsentManager');

describe('dddConsentManager – constants', () => {
  test('CONSENT_PURPOSES is an array', () => {
    expect(Array.isArray(svc.CONSENT_PURPOSES)).toBe(true);
  });
  test('DEFAULT_RETENTION_POLICIES is an array', () => {
    expect(Array.isArray(svc.DEFAULT_RETENTION_POLICIES)).toBe(true);
  });
  test('DOMAIN_MODELS is an array', () => {
    expect(Array.isArray(svc.DOMAIN_MODELS)).toBe(true);
  });
});

describe('dddConsentManager – TODO stubs resolve', () => {
  test('grantConsent resolves', async () => {
    await expect(svc.grantConsent()).resolves.not.toThrow();
  });
  test('withdrawConsent resolves', async () => {
    await expect(svc.withdrawConsent()).resolves.not.toThrow();
  });
  test('getConsentStatus resolves', async () => {
    await expect(svc.getConsentStatus()).resolves.not.toThrow();
  });
  test('checkConsent resolves', async () => {
    await expect(svc.checkConsent()).resolves.not.toThrow();
  });
  test('processDSARAccess resolves', async () => {
    await expect(svc.processDSARAccess()).resolves.not.toThrow();
  });
  test('processDSARErasure resolves', async () => {
    await expect(svc.processDSARErasure()).resolves.not.toThrow();
  });
  test('getDSARList resolves', async () => {
    await expect(svc.getDSARList()).resolves.not.toThrow();
  });
  test('seedRetentionPolicies resolves', async () => {
    await expect(svc.seedRetentionPolicies()).resolves.not.toThrow();
  });
  test('getRetentionPolicies resolves', async () => {
    await expect(svc.getRetentionPolicies()).resolves.not.toThrow();
  });
  test('updateRetentionPolicy resolves', async () => {
    await expect(svc.updateRetentionPolicy()).resolves.not.toThrow();
  });
  test('anonymizeField resolves', async () => {
    await expect(svc.anonymizeField()).resolves.not.toThrow();
  });
  test('pseudonymize resolves', async () => {
    await expect(svc.pseudonymize()).resolves.not.toThrow();
  });
});

describe('dddConsentManager – dashboards', () => {
  test('getDSARDashboard returns health object', async () => {
    const r = await svc.getDSARDashboard();
    expect(r.service).toBe('ConsentManager');
    expect(r.status).toBe('healthy');
    expect(r.timestamp).toBeInstanceOf(Date);
  });
  test('getConsentDashboard returns health object', async () => {
    const r = await svc.getConsentDashboard();
    expect(r.service).toBe('ConsentManager');
    expect(r.status).toBe('healthy');
    expect(r.timestamp).toBeInstanceOf(Date);
  });
});
