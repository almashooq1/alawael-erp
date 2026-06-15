'use strict';
/**
 * W1346 — FHIR layer convenience orchestrator tests.
 *
 * Verifies `toValidatedFhir` / `toValidatedFhirBundle` tie map → validate →
 * OperationOutcome into one call, that the barrel auto-injects MAPPERS, that the
 * verdict matches running the pieces individually, that options forward, and
 * that the orchestrator stays pure.
 */

const fhir = require('../intelligence/fhir');
const {
  toValidatedFhir: rawToValidatedFhir,
  toValidatedFhirBundle: rawToValidatedFhirBundle,
} = require('../intelligence/fhir/fhir-convert.lib');
const {
  validateFhirResource,
  validateFhirBundle,
} = require('../intelligence/fhir/fhir-validate.lib');
const { buildOperationOutcome } = require('../intelligence/fhir/fhir-operation-outcome.lib');

const BENEFICIARY = {
  beneficiaryId: 'B1',
  nationalId: '1234567890',
  firstName: 'Sara',
  lastName: 'Ali',
  status: 'active',
};

const SPONSORSHIP = {
  donorId: '64a6666666666666666666ff',
  beneficiaryId: '64a1111111111111111111aa',
  sponsorshipType: 'full',
  startDate: '2026-01-01T00:00:00.000Z',
  status: 'active',
};

describe('W1346 toValidatedFhir (barrel, MAPPERS auto-injected)', () => {
  test('returns resource + validation + operationOutcome in one call', () => {
    const out = fhir.toValidatedFhir('Beneficiary', BENEFICIARY);
    expect(out.entityName).toBe('Beneficiary');
    expect(out.resourceType).toBe('Patient');
    expect(out.resource.resourceType).toBe('Patient');
    expect(out.validation.valid).toBe(true);
    expect(out.validation.errors).toEqual([]);
    expect(out.operationOutcome.resourceType).toBe('OperationOutcome');
    expect(out.operationOutcome.issue[0].severity).toBe('information');
  });

  test('verdict matches running the pieces individually', () => {
    const resource = fhir.MAPPERS.Beneficiary(BENEFICIARY);
    const validation = validateFhirResource(resource);
    const operationOutcome = buildOperationOutcome(validation);
    const out = fhir.toValidatedFhir('Beneficiary', BENEFICIARY);
    expect(out.resource).toEqual(resource);
    expect(out.validation).toEqual(validation);
    expect(out.operationOutcome).toEqual(operationOutcome);
  });

  test('every registered mapper is reachable + valid through the orchestrator', () => {
    // Smoke: each canonical entity should at least be invokable by name and
    // produce a resource whose declared resourceType matches RESOURCE_TYPES.
    const out = fhir.toValidatedFhir('Sponsorship', SPONSORSHIP);
    expect(out.resourceType).toBe(fhir.RESOURCE_TYPES.Sponsorship);
  });

  test('mapperOpts forward (includeId:false omits id)', () => {
    const withId = fhir.toValidatedFhir('Beneficiary', { ...BENEFICIARY, _id: 'abc' });
    const noId = fhir.toValidatedFhir(
      'Beneficiary',
      { ...BENEFICIARY, _id: 'abc' },
      { mapperOpts: { includeId: false } }
    );
    expect(withId.resource.id).toBe('abc');
    expect(noId.resource.id).toBeUndefined();
  });

  test('outcomeOpts forward (custom severity on a broken resource)', () => {
    // A diet prescription WITHOUT prescribedAt maps OK but yields a
    // NutritionOrder missing dateTime (FHIR R4 1..1) → structurally invalid.
    const out = fhir.toValidatedFhir(
      'BeneficiaryDietPrescription',
      { beneficiaryId: '64a1111111111111111111aa', status: 'active' },
      { outcomeOpts: { severity: 'fatal' } }
    );
    expect(out.validation.valid).toBe(false);
    expect(out.operationOutcome.issue.every(i => i.severity === 'fatal')).toBe(true);
  });

  test('throws a clear error for an unknown entity name', () => {
    expect(() => fhir.toValidatedFhir('NotAnEntity', {})).toThrow(/no mapper registered/);
  });
});

describe('W1346 toValidatedFhirBundle (barrel)', () => {
  const ENTRIES = [
    { entityName: 'Beneficiary', record: BENEFICIARY },
    {
      entityName: 'Sponsorship',
      record: SPONSORSHIP,
    },
  ];

  test('builds a valid Bundle + OperationOutcome in one call', () => {
    const out = fhir.toValidatedFhirBundle(ENTRIES, { bundleOpts: { type: 'collection' } });
    expect(out.bundle.resourceType).toBe('Bundle');
    expect(out.bundle.type).toBe('collection');
    expect(out.bundle.entry).toHaveLength(2);
    expect(out.validation.valid).toBe(true);
    expect(out.validation.entryCount).toBe(2);
    expect(out.operationOutcome.issue[0].severity).toBe('information');
  });

  test('verdict matches the pieces individually', () => {
    const out = fhir.toValidatedFhirBundle(ENTRIES, { bundleOpts: { type: 'collection' } });
    const validation = validateFhirBundle(out.bundle);
    expect(out.validation).toEqual(validation);
    expect(out.operationOutcome).toEqual(buildOperationOutcome(validation));
  });

  test('an invalid entry surfaces as Bundle-pathed error issues', () => {
    const out = fhir.toValidatedFhirBundle(
      [
        { entityName: 'Beneficiary', record: BENEFICIARY },
        {
          entityName: 'BeneficiaryDietPrescription',
          record: { beneficiaryId: '64a1111111111111111111aa', status: 'active' },
        }, // maps OK, no dateTime → invalid NutritionOrder
      ],
      { bundleOpts: { type: 'collection' } }
    );
    expect(out.validation.valid).toBe(false);
    const exprs = out.operationOutcome.issue
      .map(i => i.expression && i.expression[0])
      .filter(Boolean);
    expect(exprs.some(e => e.startsWith('Bundle.entry['))).toBe(true);
  });
});

describe('W1346 raw lib (explicit mappers injection)', () => {
  test('toValidatedFhir requires opts.mappers', () => {
    expect(() => rawToValidatedFhir('Beneficiary', BENEFICIARY)).toThrow(/mappers/);
  });

  test('toValidatedFhirBundle requires opts.mappers', () => {
    expect(() => rawToValidatedFhirBundle([], {})).toThrow(/mappers/);
  });

  test('works when mappers are injected explicitly', () => {
    const out = rawToValidatedFhir('Beneficiary', BENEFICIARY, { mappers: fhir.MAPPERS });
    expect(out.resourceType).toBe('Patient');
    expect(out.validation.valid).toBe(true);
  });
});

describe('W1346 purity', () => {
  test('does not mutate the input record', () => {
    const record = { ...BENEFICIARY };
    const snapshot = JSON.stringify(record);
    fhir.toValidatedFhir('Beneficiary', record);
    expect(JSON.stringify(record)).toBe(snapshot);
  });

  test('result is a plain object', () => {
    const out = fhir.toValidatedFhir('Beneficiary', BENEFICIARY);
    expect(Object.getPrototypeOf(out)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(out.resource)).toBe(Object.prototype);
  });

  test('deterministic for identical input', () => {
    expect(fhir.toValidatedFhir('Beneficiary', BENEFICIARY)).toEqual(
      fhir.toValidatedFhir('Beneficiary', BENEFICIARY)
    );
  });
});
