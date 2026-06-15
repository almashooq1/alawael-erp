'use strict';
/**
 * W1344 — FHIR R4 structural validator unit tests.
 *
 * Exercises validateFhirResource (per-resourceType required-element cardinality,
 * choice elements, 1..* arrays, lenient/strict unknown types) + validateFhirBundle
 * (Bundle-level fields + per-entry validation with traceable error prefixes) +
 * the helper units. Pure: requires the lib + barrel only.
 */

const {
  validateFhirResource,
  validateFhirBundle,
  elementSatisfied,
  isPresent,
  REQUIRED_ELEMENTS,
  KNOWN_RESOURCE_TYPES,
} = require('../intelligence/fhir/fhir-validate.lib');
const fhir = require('../intelligence/fhir');

describe('W1344 validateFhirResource — valid resources', () => {
  test('Patient (no required elements) is valid with only resourceType', () => {
    const r = validateFhirResource({ resourceType: 'Patient' });
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.resourceType).toBe('Patient');
  });

  test('Observation with status + code is valid', () => {
    const r = validateFhirResource({
      resourceType: 'Observation',
      status: 'final',
      code: { text: 'CARS-2' },
    });
    expect(r.valid).toBe(true);
  });

  test('CarePlan with status + intent + subject is valid', () => {
    const r = validateFhirResource({
      resourceType: 'CarePlan',
      status: 'active',
      intent: 'plan',
      subject: { reference: 'Patient/1' },
    });
    expect(r.valid).toBe(true);
  });

  test('Appointment with status + non-empty participant (1..*) is valid', () => {
    const r = validateFhirResource({
      resourceType: 'Appointment',
      status: 'booked',
      participant: [{ actor: { reference: 'Patient/1' } }],
    });
    expect(r.valid).toBe(true);
  });

  test('Coverage with status + beneficiary + payor (1..*) is valid', () => {
    const r = validateFhirResource({
      resourceType: 'Coverage',
      status: 'active',
      beneficiary: { reference: 'Patient/1' },
      payor: [{ reference: 'RelatedPerson/9' }],
    });
    expect(r.valid).toBe(true);
  });

  test('DeviceRequest choice element satisfied by codeCodeableConcept', () => {
    const r = validateFhirResource({
      resourceType: 'DeviceRequest',
      intent: 'order',
      codeCodeableConcept: { text: 'AFO' },
      subject: { reference: 'Patient/1' },
    });
    expect(r.valid).toBe(true);
  });

  test('DeviceRequest choice element satisfied by codeReference', () => {
    const r = validateFhirResource({
      resourceType: 'DeviceRequest',
      intent: 'order',
      codeReference: { reference: 'Device/7' },
      subject: { reference: 'Patient/1' },
    });
    expect(r.valid).toBe(true);
  });
});

describe('W1344 validateFhirResource — invalid resources', () => {
  test('missing resourceType fails', () => {
    const r = validateFhirResource({ status: 'final' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/resourceType is required/);
  });

  test('non-object input fails', () => {
    expect(validateFhirResource(null).valid).toBe(false);
    expect(validateFhirResource([]).valid).toBe(false);
    expect(validateFhirResource('x').valid).toBe(false);
  });

  test('Observation missing code fails with a precise message', () => {
    const r = validateFhirResource({ resourceType: 'Observation', status: 'final' });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('Observation.code is required (1..1) but missing');
  });

  test('CarePlan missing two required elements reports both', () => {
    const r = validateFhirResource({ resourceType: 'CarePlan', status: 'active' });
    expect(r.valid).toBe(false);
    expect(r.errors).toHaveLength(2); // intent + subject
  });

  test('Appointment with empty participant array fails (1..*)', () => {
    const r = validateFhirResource({
      resourceType: 'Appointment',
      status: 'booked',
      participant: [],
    });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/participant is required \(1\.\.\*\)/);
  });

  test('DeviceRequest with neither code variant fails the choice', () => {
    const r = validateFhirResource({
      resourceType: 'DeviceRequest',
      intent: 'order',
      subject: { reference: 'Patient/1' },
    });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/exactly one of \[codeCodeableConcept, codeReference\]/);
  });

  test('empty CodeableConcept object does not satisfy a required element', () => {
    const r = validateFhirResource({ resourceType: 'Observation', status: 'final', code: {} });
    expect(r.valid).toBe(false);
  });
});

describe('W1344 validateFhirResource — unknown resourceType', () => {
  test('lenient by default: unknown type valid with only resourceType', () => {
    const r = validateFhirResource({ resourceType: 'Medication' });
    expect(r.valid).toBe(true);
    expect(r.resourceType).toBe('Medication');
  });

  test('strictUnknown flags an unrecognised resourceType', () => {
    const r = validateFhirResource({ resourceType: 'Medication' }, { strictUnknown: true });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/unknown resourceType 'Medication'/);
  });
});

describe('W1344 validateFhirResource — purity', () => {
  test('does not mutate input', () => {
    const input = { resourceType: 'Observation', status: 'final', code: { text: 'x' } };
    const snap = JSON.stringify(input);
    validateFhirResource(input);
    expect(JSON.stringify(input)).toBe(snap);
  });

  test('result is a plain object', () => {
    const r = validateFhirResource({ resourceType: 'Patient' });
    expect(Object.getPrototypeOf(r)).toBe(Object.prototype);
  });
});

describe('W1344 validateFhirBundle', () => {
  const validBundle = {
    resourceType: 'Bundle',
    type: 'collection',
    entry: [
      { resource: { resourceType: 'Patient', id: 'p1' } },
      { resource: { resourceType: 'Observation', status: 'final', code: { text: 'x' } } },
    ],
  };

  test('a well-formed Bundle of valid resources passes', () => {
    const r = validateFhirBundle(validBundle);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.entryCount).toBe(2);
  });

  test('wrong resourceType + missing type are reported', () => {
    const r = validateFhirBundle({ resourceType: 'Patient', entry: [] });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => /must be 'Bundle'/.test(e))).toBe(true);
    expect(r.errors.some(e => /type is required/.test(e))).toBe(true);
  });

  test('non-array entry fails fast', () => {
    const r = validateFhirBundle({ resourceType: 'Bundle', type: 'collection', entry: {} });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('bundle.entry must be an array');
  });

  test('invalid entry resource is reported with index + resourceType prefix', () => {
    const r = validateFhirBundle({
      resourceType: 'Bundle',
      type: 'collection',
      entry: [{ resource: { resourceType: 'Observation', status: 'final' } }],
    });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/^entry\[0\] \(Observation\): Observation\.code is required/);
  });

  test('entry without a resource is reported', () => {
    const r = validateFhirBundle({
      resourceType: 'Bundle',
      type: 'collection',
      entry: [{ fullUrl: 'x' }],
    });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/entry\[0\]\.resource is required/);
  });

  test('non-object bundle fails', () => {
    expect(validateFhirBundle(null).valid).toBe(false);
    expect(validateFhirBundle([]).valid).toBe(false);
  });
});

describe('W1344 end-to-end — real mapper outputs through the assembler + validator', () => {
  test('a transaction Bundle of real mapper outputs is structurally valid', () => {
    const resources = [
      fhir.MAPPERS.Beneficiary({
        beneficiaryId: '64a1111111111111111111aa',
        nationalId: '1234567890',
        firstName: 'Sara',
        lastName: 'Ali',
        status: 'active',
      }),
      fhir.MAPPERS.SeatAllocation({
        beneficiaryId: '64a1111111111111111111aa',
        branchId: '64a2222222222222222222bb',
        effectiveFrom: '2026-01-01T00:00:00.000Z',
        status: 'active',
      }),
    ];
    const bundle = fhir.buildFhirBundle(resources, { type: 'transaction' });
    const r = fhir.validateFhirBundle(bundle);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  test('barrel re-exports the validator helpers', () => {
    expect(typeof fhir.validateFhirResource).toBe('function');
    expect(typeof fhir.validateFhirBundle).toBe('function');
  });
});

describe('W1344 contract surface', () => {
  test('REQUIRED_ELEMENTS + KNOWN_RESOURCE_TYPES are frozen and aligned', () => {
    expect(Object.isFrozen(REQUIRED_ELEMENTS)).toBe(true);
    expect(Object.isFrozen(KNOWN_RESOURCE_TYPES)).toBe(true);
    expect([...KNOWN_RESOURCE_TYPES].sort()).toEqual(Object.keys(REQUIRED_ELEMENTS).sort());
  });

  test('every resourceType the layer emits has a required-element contract', () => {
    const emitted = new Set(Object.values(fhir.RESOURCE_TYPES));
    emitted.forEach(rt => {
      expect(KNOWN_RESOURCE_TYPES).toContain(rt);
    });
  });

  test('helpers behave', () => {
    expect(isPresent('')).toBe(false);
    expect(isPresent(0)).toBe(true);
    expect(elementSatisfied([])).toBe(false);
    expect(elementSatisfied([1])).toBe(true);
    expect(elementSatisfied({})).toBe(false);
    expect(elementSatisfied({ a: 1 })).toBe(true);
    expect(elementSatisfied('x')).toBe(true);
  });
});
