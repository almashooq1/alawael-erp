'use strict';

jest.mock('../../models/DddInteroperabilityGateway', () => ({
  DDDIntegrationLog: {},
  FHIR_MAPPERS: ['item1'],
  SUPPORTED_RESOURCES: ['item1'],

}));

const svc = require('../../services/dddInteroperabilityGateway');

describe('dddInteroperabilityGateway service', () => {
  test('FHIR_MAPPERS is an array', () => { expect(Array.isArray(svc.FHIR_MAPPERS)).toBe(true); });
  test('SUPPORTED_RESOURCES is an array', () => { expect(Array.isArray(svc.SUPPORTED_RESOURCES)).toBe(true); });
  test('getCapabilityStatement resolves', async () => { await expect(svc.getCapabilityStatement()).resolves.not.toThrow(); });
  test('fhirRead resolves', async () => { await expect(svc.fhirRead()).resolves.not.toThrow(); });
  test('fhirSearch resolves', async () => { await expect(svc.fhirSearch()).resolves.not.toThrow(); });
  test('fhirCreate resolves', async () => { await expect(svc.fhirCreate()).resolves.not.toThrow(); });
  test('bulkExport resolves', async () => { await expect(svc.bulkExport()).resolves.not.toThrow(); });
  test('getIntegrationDashboard returns health object', async () => {
    const d = await svc.getIntegrationDashboard();
    expect(d).toHaveProperty('status', 'healthy');
    expect(d).toHaveProperty('timestamp');
  });
});
