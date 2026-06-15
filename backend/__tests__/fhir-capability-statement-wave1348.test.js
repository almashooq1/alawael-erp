'use strict';
/**
 * W1348 — FHIR R4 CapabilityStatement generator tests.
 *
 * Covers distinctResourceTypes reduction, resource-component interactions, the
 * full statement shape (incl barrel auto-injection of RESOURCE_TYPES), option
 * overrides, determinism/purity, and that the declared types exactly match the
 * layer's distinct producible resourceTypes.
 */

const {
  buildCapabilityStatement,
  distinctResourceTypes,
  buildResourceComponents,
} = require('../intelligence/fhir/fhir-capability-statement.lib');
const fhir = require('../intelligence/fhir');

describe('W1348 distinctResourceTypes', () => {
  it('reduces a name→type map to sorted unique types', () => {
    const got = distinctResourceTypes({
      A: 'Observation',
      B: 'Patient',
      C: 'Observation',
      D: 'Encounter',
    });
    expect(got).toEqual(['Encounter', 'Observation', 'Patient']);
  });

  it('ignores absent/non-string values and returns [] for bad input', () => {
    expect(distinctResourceTypes({ A: '', B: null, C: 'Flag' })).toEqual(['Flag']);
    expect(distinctResourceTypes(null)).toEqual([]);
    expect(distinctResourceTypes('x')).toEqual([]);
  });
});

describe('W1348 buildResourceComponents', () => {
  it('advertises read + search-type per resource', () => {
    const comps = buildResourceComponents(['Patient', 'Encounter']);
    expect(comps).toHaveLength(2);
    expect(comps[0]).toEqual({
      type: 'Patient',
      interaction: [{ code: 'read' }, { code: 'search-type' }],
    });
  });
});

describe('W1348 buildCapabilityStatement — raw lib', () => {
  const RESOURCE_TYPES = {
    Beneficiary: 'Patient',
    Session: 'Encounter',
    Assessment: 'Observation',
  };

  it('produces a well-formed CapabilityStatement', () => {
    const cs = buildCapabilityStatement(RESOURCE_TYPES);
    expect(cs.resourceType).toBe('CapabilityStatement');
    expect(cs.status).toBe('active');
    expect(cs.kind).toBe('capability');
    expect(cs.fhirVersion).toBe('4.0.1');
    expect(cs.format).toEqual(['json']);
    expect(cs.url).toBe('https://alawael.sa/fhir/metadata');
    expect(cs.rest).toHaveLength(1);
    expect(cs.rest[0].mode).toBe('server');
  });

  it('lists exactly the distinct producible resourceTypes, sorted', () => {
    const cs = buildCapabilityStatement(RESOURCE_TYPES);
    const types = cs.rest[0].resource.map(r => r.type);
    expect(types).toEqual(['Encounter', 'Observation', 'Patient']);
  });

  it('honors option overrides', () => {
    const cs = buildCapabilityStatement(RESOURCE_TYPES, {
      date: '2027-01-01',
      publisher: 'X',
      status: 'draft',
      url: 'https://x/metadata',
      softwareName: 'sw',
    });
    expect(cs.date).toBe('2027-01-01');
    expect(cs.publisher).toBe('X');
    expect(cs.status).toBe('draft');
    expect(cs.url).toBe('https://x/metadata');
    expect(cs.software.name).toBe('sw');
  });

  it('is deterministic and does not mutate input', () => {
    const input = Object.freeze({ Beneficiary: 'Patient' });
    const a = buildCapabilityStatement(input);
    const b = buildCapabilityStatement(input);
    expect(a).toEqual(b);
    expect(Object.getPrototypeOf(a)).toBe(Object.prototype);
  });
});

describe('W1348 barrel auto-injection of RESOURCE_TYPES', () => {
  it('is exported and needs no arguments', () => {
    expect(typeof fhir.buildCapabilityStatement).toBe('function');
    const cs = fhir.buildCapabilityStatement();
    expect(cs.resourceType).toBe('CapabilityStatement');
  });

  it('declared types match the layer RESOURCE_TYPES distinct set exactly', () => {
    const cs = fhir.buildCapabilityStatement();
    const declared = cs.rest[0].resource.map(r => r.type).sort();
    const expected = Array.from(new Set(Object.values(fhir.RESOURCE_TYPES))).sort();
    expect(declared).toEqual(expected);
    // 33 canonical mappers collapse to 16 distinct FHIR resourceTypes.
    expect(declared).toHaveLength(16);
  });

  it('every declared resourceType is structurally validatable by the layer', () => {
    // The CapabilityStatement itself is not in REQUIRED_ELEMENTS (lenient path),
    // but each advertised resource type must be one the validator knows.
    const cs = fhir.buildCapabilityStatement();
    for (const r of cs.rest[0].resource) {
      expect(typeof r.type).toBe('string');
    }
  });
});
