'use strict';
/**
 * W1319 — AssistiveDevice → FHIR R4 Device mapper unit tests.
 *
 * Validates the pure projection in
 * `intelligence/fhir/assistive-device-to-fhir.lib.js` (Item 10,
 * GAPS_ASSESSMENT_2026-06-15). Includes a canonical round-trip assertion so the
 * fixture this test maps from is guaranteed to be a valid canonical
 * AssistiveDevice.
 */

const {
  assistiveDeviceToFhir,
  toFhirStatus,
  buildIdentifiers,
  buildType,
  buildCurrentLoanExtension,
  buildLoanExtension,
  buildMaintenanceExtension,
  buildExtensions,
  AVAILABILITY_STATUS,
  DEVICE_ASSET_TAG_SYSTEM,
  DEVICE_SERIAL_SYSTEM,
  DEVICE_CATEGORY_SYSTEM,
  DEVICE_AVAILABILITY_EXTENSION_URL,
  DEVICE_CONDITION_EXTENSION_URL,
  DEVICE_WARRANTY_EXTENSION_URL,
  DEVICE_ACQUISITION_COST_EXTENSION_URL,
  DEVICE_NEXT_MAINTENANCE_EXTENSION_URL,
  DEVICE_CURRENT_LOAN_EXTENSION_URL,
  DEVICE_RETIRED_AT_EXTENSION_URL,
  DEVICE_LOAN_EXTENSION_URL,
  DEVICE_MAINTENANCE_EXTENSION_URL,
} = require('../intelligence/fhir/assistive-device-to-fhir.lib');

const { canonical } = require('../intelligence/canonical');

const FULL = Object.freeze({
  _id: '64f0000000000000000000ff',
  assetTag: 'AD-2026-0042',
  serialNumber: 'SN-998877',
  name: 'Power wheelchair (tilt-in-space)',
  category: 'wheelchair',
  branchId: '64b2222222222222222222bb',
  acquisitionCost: 18500,
  warrantyExpiresAt: '2028-01-31T00:00:00.000Z',
  availability: 'loaned',
  currentCondition: 'good',
  currentLoaneeId: '64a1111111111111111111aa',
  currentLoanStartedAt: '2026-02-01T09:00:00.000Z',
  currentLoanExpectedReturnAt: '2026-05-01T09:00:00.000Z',
  nextMaintenanceDue: '2026-04-01T00:00:00.000Z',
  loans: [
    {
      beneficiaryId: '64a1111111111111111111aa',
      startedAt: '2026-02-01T09:00:00.000Z',
      expectedReturnAt: '2026-05-01T09:00:00.000Z',
      status: 'checked_out',
      conditionOnCheckout: 'good',
    },
    {
      beneficiaryId: '64a9999999999999999999ee',
      startedAt: '2025-09-01T09:00:00.000Z',
      returnedAt: '2025-12-01T09:00:00.000Z',
      status: 'returned',
      conditionOnCheckout: 'excellent',
      conditionOnReturn: 'good',
    },
  ],
  maintenance: [
    {
      kind: 'preventive',
      performedAt: '2025-12-15T10:00:00.000Z',
      cost: 250,
      nextDueAt: '2026-04-01T00:00:00.000Z',
    },
  ],
});

const MINIMAL = Object.freeze({
  assetTag: 'AD-0001',
  name: 'Pediatric manual wheelchair',
  category: 'wheelchair',
  availability: 'available',
});

describe('W1319 assistiveDeviceToFhir — canonical validity', () => {
  it('FULL fixture is a valid canonical AssistiveDevice', () => {
    const parsed = canonical.AssistiveDevice.safeParse(FULL);
    expect(parsed.success).toBe(true);
  });

  it('MINIMAL fixture is a valid canonical AssistiveDevice', () => {
    const parsed = canonical.AssistiveDevice.safeParse(MINIMAL);
    expect(parsed.success).toBe(true);
  });
});

describe('W1319 assistiveDeviceToFhir — resource shape', () => {
  it('emits a FHIR R4 Device', () => {
    const dev = assistiveDeviceToFhir(FULL);
    expect(dev.resourceType).toBe('Device');
  });

  it('carries the _id as resource id when present', () => {
    const dev = assistiveDeviceToFhir(FULL);
    expect(dev.id).toBe('64f0000000000000000000ff');
  });

  it('omits id when includeId is false', () => {
    const dev = assistiveDeviceToFhir(FULL, { includeId: false });
    expect(dev.id).toBeUndefined();
  });

  it('omits id when the device has no _id', () => {
    const dev = assistiveDeviceToFhir(MINIMAL);
    expect(dev.id).toBeUndefined();
  });

  it('sets deviceName to the human asset name', () => {
    const dev = assistiveDeviceToFhir(FULL);
    expect(dev.deviceName).toEqual([
      { name: 'Power wheelchair (tilt-in-space)', type: 'user-friendly-name' },
    ]);
  });

  it('returns a plain object', () => {
    const dev = assistiveDeviceToFhir(FULL);
    expect(Object.getPrototypeOf(dev)).toBe(Object.prototype);
  });

  it('does not mutate the input', () => {
    const before = JSON.stringify(FULL);
    assistiveDeviceToFhir(FULL);
    expect(JSON.stringify(FULL)).toBe(before);
  });
});

describe('W1319 toFhirStatus / availability mapping', () => {
  it('maps available/loaned/maintenance → active', () => {
    expect(toFhirStatus('available')).toBe('active');
    expect(toFhirStatus('loaned')).toBe('active');
    expect(toFhirStatus('maintenance')).toBe('active');
  });

  it('maps retired → inactive', () => {
    expect(toFhirStatus('retired')).toBe('inactive');
  });

  it('maps absent/unknown availability → unknown', () => {
    expect(toFhirStatus(undefined)).toBe('unknown');
    expect(toFhirStatus('something-else')).toBe('unknown');
  });

  it('AVAILABILITY_STATUS is frozen', () => {
    expect(Object.isFrozen(AVAILABILITY_STATUS)).toBe(true);
  });

  it('sets resource.status from availability', () => {
    expect(assistiveDeviceToFhir(FULL).status).toBe('active');
    expect(assistiveDeviceToFhir({ ...MINIMAL, availability: 'retired' }).status).toBe('inactive');
  });
});

describe('W1319 buildIdentifiers / buildType', () => {
  it('assetTag is the primary identifier', () => {
    const ids = buildIdentifiers(FULL);
    expect(ids[0]).toEqual({ system: DEVICE_ASSET_TAG_SYSTEM, value: 'AD-2026-0042' });
  });

  it('serialNumber is a secondary identifier when present', () => {
    const ids = buildIdentifiers(FULL);
    expect(ids).toContainEqual({ system: DEVICE_SERIAL_SYSTEM, value: 'SN-998877' });
  });

  it('only the assetTag identifier when no serialNumber', () => {
    const ids = buildIdentifiers(MINIMAL);
    expect(ids).toHaveLength(1);
    expect(ids[0].value).toBe('AD-0001');
  });

  it('serialNumber is also the native Device.serialNumber element', () => {
    expect(assistiveDeviceToFhir(FULL).serialNumber).toBe('SN-998877');
    expect(assistiveDeviceToFhir(MINIMAL).serialNumber).toBeUndefined();
  });

  it('type codes the canonical category', () => {
    const type = buildType(FULL);
    expect(type.coding[0]).toEqual({
      system: DEVICE_CATEGORY_SYSTEM,
      code: 'wheelchair',
    });
    expect(type.text).toBe('Power wheelchair (tilt-in-space)');
  });
});

describe('W1319 references (patient / owner)', () => {
  it('current loanee → Device.patient', () => {
    const dev = assistiveDeviceToFhir(FULL);
    expect(dev.patient).toEqual({ reference: 'Patient/64a1111111111111111111aa' });
  });

  it('no patient reference when not loaned', () => {
    expect(assistiveDeviceToFhir(MINIMAL).patient).toBeUndefined();
  });

  it('branch → Device.owner Organization', () => {
    const dev = assistiveDeviceToFhir(FULL);
    expect(dev.owner).toEqual({ reference: 'Organization/64b2222222222222222222bb' });
  });

  it('no owner when no branch', () => {
    expect(assistiveDeviceToFhir(MINIMAL).owner).toBeUndefined();
  });
});

describe('W1319 current-loan extension', () => {
  it('nests loanee + start + expected-return', () => {
    const ext = buildCurrentLoanExtension(FULL);
    expect(ext.url).toBe(DEVICE_CURRENT_LOAN_EXTENSION_URL);
    expect(ext.extension).toContainEqual({
      url: 'loanee',
      valueReference: { reference: 'Patient/64a1111111111111111111aa' },
    });
    expect(ext.extension).toContainEqual({
      url: 'startedAt',
      valueDateTime: '2026-02-01T09:00:00.000Z',
    });
    expect(ext.extension).toContainEqual({
      url: 'expectedReturnAt',
      valueDateTime: '2026-05-01T09:00:00.000Z',
    });
  });

  it('is undefined when there is no open loan', () => {
    expect(buildCurrentLoanExtension(MINIMAL)).toBeUndefined();
  });
});

describe('W1319 loan / maintenance history extensions', () => {
  it('emits one extension per loan entry', () => {
    const ext = buildExtensions(FULL).filter(e => e.url === DEVICE_LOAN_EXTENSION_URL);
    expect(ext).toHaveLength(2);
  });

  it('loan extension carries beneficiary + status + condition', () => {
    const ext = buildLoanExtension(FULL.loans[1]);
    expect(ext.url).toBe(DEVICE_LOAN_EXTENSION_URL);
    expect(ext.extension).toContainEqual({
      url: 'beneficiary',
      valueReference: { reference: 'Patient/64a9999999999999999999ee' },
    });
    expect(ext.extension).toContainEqual({ url: 'status', valueCode: 'returned' });
    expect(ext.extension).toContainEqual({
      url: 'conditionOnReturn',
      valueCode: 'good',
    });
  });

  it('loan extension undefined for a non-object', () => {
    expect(buildLoanExtension(null)).toBeUndefined();
  });

  it('emits one extension per maintenance entry', () => {
    const ext = buildExtensions(FULL).filter(e => e.url === DEVICE_MAINTENANCE_EXTENSION_URL);
    expect(ext).toHaveLength(1);
  });

  it('maintenance extension carries kind + cost + nextDueAt', () => {
    const ext = buildMaintenanceExtension(FULL.maintenance[0]);
    expect(ext.url).toBe(DEVICE_MAINTENANCE_EXTENSION_URL);
    expect(ext.extension).toContainEqual({ url: 'kind', valueCode: 'preventive' });
    expect(ext.extension).toContainEqual({ url: 'cost', valueDecimal: 250 });
    expect(ext.extension).toContainEqual({
      url: 'nextDueAt',
      valueDateTime: '2026-04-01T00:00:00.000Z',
    });
  });

  it('maintenance extension undefined for a non-object', () => {
    expect(buildMaintenanceExtension(undefined)).toBeUndefined();
  });
});

describe('W1319 scalar extensions (lossless carry)', () => {
  it('availability + condition + warranty + cost + next-maintenance present', () => {
    const ext = assistiveDeviceToFhir(FULL).extension;
    const urls = ext.map(e => e.url);
    expect(urls).toContain(DEVICE_AVAILABILITY_EXTENSION_URL);
    expect(urls).toContain(DEVICE_CONDITION_EXTENSION_URL);
    expect(urls).toContain(DEVICE_WARRANTY_EXTENSION_URL);
    expect(urls).toContain(DEVICE_ACQUISITION_COST_EXTENSION_URL);
    expect(urls).toContain(DEVICE_NEXT_MAINTENANCE_EXTENSION_URL);
  });

  it('acquisition cost is a decimal', () => {
    const ext = assistiveDeviceToFhir(FULL).extension.find(
      e => e.url === DEVICE_ACQUISITION_COST_EXTENSION_URL
    );
    expect(ext.valueDecimal).toBe(18500);
  });

  it('retired-at extension emitted only for a retired device', () => {
    const retired = { ...MINIMAL, availability: 'retired', retiredAt: '2026-03-01T00:00:00.000Z' };
    const ext = assistiveDeviceToFhir(retired).extension.find(
      e => e.url === DEVICE_RETIRED_AT_EXTENSION_URL
    );
    expect(ext.valueDateTime).toBe('2026-03-01T00:00:00.000Z');
  });

  it('minimal device carries only the availability extension', () => {
    const dev = assistiveDeviceToFhir(MINIMAL);
    expect(dev.extension).toHaveLength(1);
    expect(dev.extension[0].url).toBe(DEVICE_AVAILABILITY_EXTENSION_URL);
    expect(dev.extension[0].valueCode).toBe('available');
  });
});

describe('W1319 guards', () => {
  it('throws when device is missing', () => {
    expect(() => assistiveDeviceToFhir(null)).toThrow(/device object is required/);
  });

  it('throws when assetTag is missing', () => {
    expect(() => assistiveDeviceToFhir({ name: 'x', category: 'wheelchair' })).toThrow(
      /assetTag is required/
    );
  });

  it('throws when category is missing', () => {
    expect(() => assistiveDeviceToFhir({ assetTag: 'AD-1', name: 'x' })).toThrow(
      /category is required/
    );
  });
});
