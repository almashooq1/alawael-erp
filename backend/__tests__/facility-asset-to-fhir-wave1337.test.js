'use strict';
/**
 * W1337 — FacilityAsset → FHIR R4 Device mapper tests.
 *
 * Pure unit tests (no DB). Validates the projection of a canonical
 * FacilityAsset onto a base FHIR R4 Device plus a canonical round-trip.
 */

const {
  facilityAssetToFhir,
  toFhirDateTime,
  toFhirStatus,
  buildIdentifiers,
  buildType,
  buildDeviceName,
  buildLocationExtension,
  buildExtensions,
  STATUS_MAP,
  ORG_FHIR_BASE,
  FA_CATEGORY_SYSTEM,
  FA_ASSET_TAG_SYSTEM,
  FA_SERIAL_SYSTEM,
  FA_STATUS_EXTENSION_URL,
  FA_CRITICALITY_EXTENSION_URL,
  FA_LOCATION_EXTENSION_URL,
  FA_INSTALLATION_EXTENSION_URL,
  FA_OUT_OF_SERVICE_EXTENSION_URL,
  FA_MAINTENANCE_SCHEDULE_EXTENSION_URL,
  FA_INSPECTION_EXTENSION_URL,
  FA_CERTIFICATE_EXTENSION_URL,
  FA_LINKED_INCIDENT_EXTENSION_URL,
  FA_RETIREMENT_EXTENSION_URL,
} = require('../intelligence/fhir/facility-asset-to-fhir.lib');
const { canonical } = require('../intelligence/canonical');

const FULL = Object.freeze({
  _id: '64a0000000000000000000ff',
  assetTag: 'FA-0001',
  name: 'Passenger Elevator A',
  category: 'elevator',
  branchId: '64a2222222222222222222bb',
  building: 'Main',
  floor: '1',
  room: 'Lobby',
  manufacturer: 'OTIS',
  modelNumber: 'GeN2-2026',
  serialNumber: 'SN-998877',
  installedAt: '2022-01-15T00:00:00.000Z',
  installationCost: 250000,
  warrantyExpiresAt: '2027-01-15T00:00:00.000Z',
  criticality: 'life_safety',
  status: 'in_service',
  inspectionIntervalDays: 365,
  maintenanceIntervalDays: 90,
  nextInspectionDue: '2027-01-15T00:00:00.000Z',
  nextMaintenanceDue: '2026-09-15T00:00:00.000Z',
  inspections: [
    {
      kind: 'regulatory_annual',
      performedAt: '2026-01-15T00:00:00.000Z',
      outcome: 'pass_with_observations',
      vendorName: 'Saudi Elevators Co',
      defectsFound: ['Worn door gasket'],
      correctiveActionsRequired: ['Replace gasket within 30d'],
      cost: 1800,
      nextDueAt: '2027-01-15T00:00:00.000Z',
    },
  ],
  certificates: [
    {
      name: 'Elevator Safety Certificate',
      number: 'CERT-EL-2026-01',
      issuingAuthority: 'Civil Defense',
      issuedAt: '2026-01-20T00:00:00.000Z',
      expiresAt: '2027-01-20T00:00:00.000Z',
      fileUrl: 'https://files.alawael.sa/certs/el-2026-01.pdf',
    },
  ],
  linkedIncidentId: '64a7777777777777777777aa',
});

const MINIMAL = Object.freeze({
  assetTag: 'FA-0002',
  name: 'Accessible Ramp B',
  category: 'ramp',
  branchId: '64a2222222222222222222bb',
  criticality: 'medium',
  status: 'in_service',
});

const RETIRED = Object.freeze({
  _id: '64a0000000000000000000cc',
  assetTag: 'FA-0003',
  name: 'Old Generator',
  category: 'generator',
  branchId: '64a2222222222222222222bb',
  criticality: 'high',
  status: 'retired',
  outOfServiceReason: 'Beyond economic repair',
  outOfServiceSince: '2026-05-01T00:00:00.000Z',
  retiredAt: '2026-05-10T00:00:00.000Z',
  retirementReason: 'Replaced by new unit',
});

describe('W1337 facilityAssetToFhir — canonical round-trip', () => {
  it('FULL fixture satisfies the canonical schema', () => {
    expect(canonical.FacilityAsset.safeParse(FULL).success).toBe(true);
  });

  it('MINIMAL fixture satisfies the canonical schema', () => {
    expect(canonical.FacilityAsset.safeParse(MINIMAL).success).toBe(true);
  });

  it('RETIRED fixture satisfies the canonical schema', () => {
    expect(canonical.FacilityAsset.safeParse(RETIRED).success).toBe(true);
  });
});

describe('W1337 facilityAssetToFhir — resource shape', () => {
  it('emits a FHIR R4 Device', () => {
    expect(facilityAssetToFhir(FULL).resourceType).toBe('Device');
  });

  it('sets id from _id when includeId (default)', () => {
    expect(facilityAssetToFhir(FULL).id).toBe('64a0000000000000000000ff');
  });

  it('omits id when includeId is false', () => {
    expect(facilityAssetToFhir(FULL, { includeId: false }).id).toBeUndefined();
  });

  it('omits id when _id is absent', () => {
    expect(facilityAssetToFhir(MINIMAL).id).toBeUndefined();
  });

  it('carries asset tag + serial as identifiers', () => {
    expect(facilityAssetToFhir(FULL).identifier).toEqual([
      { system: FA_ASSET_TAG_SYSTEM, value: 'FA-0001' },
      { system: FA_SERIAL_SYSTEM, value: 'SN-998877' },
    ]);
  });

  it('MINIMAL has only the asset-tag identifier', () => {
    expect(facilityAssetToFhir(MINIMAL).identifier).toEqual([
      { system: FA_ASSET_TAG_SYSTEM, value: 'FA-0002' },
    ]);
  });

  it('type carries the category coding + name text', () => {
    expect(facilityAssetToFhir(FULL).type).toEqual({
      coding: [{ system: FA_CATEGORY_SYSTEM, code: 'elevator' }],
      text: 'Passenger Elevator A',
    });
  });

  it('deviceName carries friendly + manufacturer + model names', () => {
    expect(facilityAssetToFhir(FULL).deviceName).toEqual([
      { name: 'Passenger Elevator A', type: 'user-friendly-name' },
      { name: 'OTIS', type: 'manufacturer-name' },
      { name: 'GeN2-2026', type: 'model-name' },
    ]);
  });

  it('owner references the branch Organization', () => {
    expect(facilityAssetToFhir(FULL).owner).toEqual({
      reference: 'Organization/64a2222222222222222222bb',
    });
  });

  it('passes through manufacturer/modelNumber/serialNumber when present', () => {
    const resource = facilityAssetToFhir(FULL);
    expect(resource.manufacturer).toBe('OTIS');
    expect(resource.modelNumber).toBe('GeN2-2026');
    expect(resource.serialNumber).toBe('SN-998877');
  });

  it('output is a plain object', () => {
    expect(Object.getPrototypeOf(facilityAssetToFhir(FULL))).toBe(Object.prototype);
  });

  it('does not mutate the input', () => {
    const input = JSON.parse(JSON.stringify(FULL));
    facilityAssetToFhir(input);
    expect(input).toEqual(FULL);
  });
});

describe('W1337 status mapping', () => {
  it('STATUS_MAP is frozen', () => {
    expect(Object.isFrozen(STATUS_MAP)).toBe(true);
  });

  it('maps lifecycle states onto the Device.status value-set', () => {
    expect(toFhirStatus('in_service')).toBe('active');
    expect(toFhirStatus('inspection_failed')).toBe('inactive');
    expect(toFhirStatus('maintenance')).toBe('inactive');
    expect(toFhirStatus('out_of_service')).toBe('inactive');
    expect(toFhirStatus('retired')).toBe('inactive');
  });

  it('absent → unknown; unmapped → unknown', () => {
    expect(toFhirStatus(undefined)).toBe('unknown');
    expect(toFhirStatus('weird')).toBe('unknown');
  });
});

describe('W1337 extensions', () => {
  it('always carries status + criticality value codes', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === FA_STATUS_EXTENSION_URL).valueCode).toBe('in_service');
    expect(ext.find(e => e.url === FA_CRITICALITY_EXTENSION_URL).valueCode).toBe('life_safety');
  });

  it('carries the nested location extension', () => {
    const ext = buildExtensions(FULL);
    const loc = ext.find(e => e.url === FA_LOCATION_EXTENSION_URL);
    expect(loc.extension).toEqual([
      { url: 'building', valueString: 'Main' },
      { url: 'floor', valueString: '1' },
      { url: 'room', valueString: 'Lobby' },
    ]);
  });

  it('carries the nested installation extension', () => {
    const ext = buildExtensions(FULL);
    const inst = ext.find(e => e.url === FA_INSTALLATION_EXTENSION_URL);
    expect(inst.extension).toContainEqual({
      url: 'installedAt',
      valueDateTime: '2022-01-15T00:00:00.000Z',
    });
    expect(inst.extension).toContainEqual({ url: 'installationCost', valueDecimal: 250000 });
    expect(inst.extension).toContainEqual({
      url: 'warrantyExpiresAt',
      valueDateTime: '2027-01-15T00:00:00.000Z',
    });
  });

  it('carries the maintenance-schedule extension', () => {
    const ext = buildExtensions(FULL);
    const sch = ext.find(e => e.url === FA_MAINTENANCE_SCHEDULE_EXTENSION_URL);
    expect(sch.extension).toContainEqual({ url: 'inspectionIntervalDays', valueInteger: 365 });
    expect(sch.extension).toContainEqual({ url: 'maintenanceIntervalDays', valueInteger: 90 });
    expect(sch.extension).toContainEqual({
      url: 'nextInspectionDue',
      valueDateTime: '2027-01-15T00:00:00.000Z',
    });
  });

  it('carries one inspection extension per inspection', () => {
    const ext = buildExtensions(FULL);
    const insp = ext.filter(e => e.url === FA_INSPECTION_EXTENSION_URL);
    expect(insp).toHaveLength(1);
    expect(insp[0].extension).toContainEqual({ url: 'kind', valueCode: 'regulatory_annual' });
    expect(insp[0].extension).toContainEqual({
      url: 'outcome',
      valueCode: 'pass_with_observations',
    });
    expect(insp[0].extension).toContainEqual({ url: 'defect', valueString: 'Worn door gasket' });
    expect(insp[0].extension).toContainEqual({
      url: 'correctiveAction',
      valueString: 'Replace gasket within 30d',
    });
    expect(insp[0].extension).toContainEqual({ url: 'cost', valueDecimal: 1800 });
  });

  it('carries one certificate extension per certificate', () => {
    const ext = buildExtensions(FULL);
    const cert = ext.filter(e => e.url === FA_CERTIFICATE_EXTENSION_URL);
    expect(cert).toHaveLength(1);
    expect(cert[0].extension).toContainEqual({ url: 'number', valueString: 'CERT-EL-2026-01' });
    expect(cert[0].extension).toContainEqual({
      url: 'issuingAuthority',
      valueString: 'Civil Defense',
    });
    expect(cert[0].extension).toContainEqual({
      url: 'fileUrl',
      valueUrl: 'https://files.alawael.sa/certs/el-2026-01.pdf',
    });
  });

  it('carries the linked-incident extension', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === FA_LINKED_INCIDENT_EXTENSION_URL)).toEqual({
      url: FA_LINKED_INCIDENT_EXTENSION_URL,
      valueString: '64a7777777777777777777aa',
    });
  });

  it('carries out-of-service + retirement extensions on the RETIRED fixture', () => {
    const ext = buildExtensions(RETIRED);
    const oos = ext.find(e => e.url === FA_OUT_OF_SERVICE_EXTENSION_URL);
    expect(oos.extension).toContainEqual({ url: 'reason', valueString: 'Beyond economic repair' });
    const ret = ext.find(e => e.url === FA_RETIREMENT_EXTENSION_URL);
    expect(ret.extension).toContainEqual({
      url: 'retiredAt',
      valueDateTime: '2026-05-10T00:00:00.000Z',
    });
    expect(ret.extension).toContainEqual({ url: 'reason', valueString: 'Replaced by new unit' });
  });

  it('MINIMAL carries only status + criticality extensions', () => {
    const resource = facilityAssetToFhir(MINIMAL);
    expect(resource.extension.map(e => e.url)).toEqual([
      FA_STATUS_EXTENSION_URL,
      FA_CRITICALITY_EXTENSION_URL,
    ]);
  });
});

describe('W1337 helpers + guards', () => {
  it('ORG_FHIR_BASE is the org base URL', () => {
    expect(ORG_FHIR_BASE).toBe('https://alawael.sa/fhir');
  });

  it('buildIdentifiers returns the asset-tag identifier', () => {
    expect(buildIdentifiers({ assetTag: 'X' })).toEqual([
      { system: FA_ASSET_TAG_SYSTEM, value: 'X' },
    ]);
  });

  it('buildType uses the category code', () => {
    expect(buildType({ category: 'ramp', name: 'R' }).coding[0].code).toBe('ramp');
  });

  it('buildDeviceName returns just the friendly name when no manufacturer/model', () => {
    expect(buildDeviceName({ name: 'R' })).toEqual([{ name: 'R', type: 'user-friendly-name' }]);
  });

  it('buildLocationExtension returns undefined when no location parts', () => {
    expect(buildLocationExtension({})).toBeUndefined();
  });

  it('toFhirDateTime returns full ISO; rejects bad input', () => {
    expect(toFhirDateTime('2026-01-15T00:00:00.000Z')).toBe('2026-01-15T00:00:00.000Z');
    expect(toFhirDateTime(undefined)).toBeUndefined();
    expect(toFhirDateTime('not-a-date')).toBeUndefined();
  });

  it('throws when asset is missing', () => {
    expect(() => facilityAssetToFhir()).toThrow(TypeError);
    expect(() => facilityAssetToFhir(null)).toThrow(/asset object is required/);
  });

  it('throws when assetTag is missing', () => {
    expect(() => facilityAssetToFhir({ branchId: 'b' })).toThrow(/assetTag is required/);
  });

  it('throws when branchId is missing', () => {
    expect(() => facilityAssetToFhir({ assetTag: 'X' })).toThrow(/branchId is required/);
  });
});
