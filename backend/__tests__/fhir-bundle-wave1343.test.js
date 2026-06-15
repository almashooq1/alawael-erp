'use strict';
/**
 * W1343 — FHIR R4 Bundle assembler tests.
 *
 * Covers: collection/searchset/document/transaction/batch shapes, entry +
 * fullUrl + request construction, the inject-mappers convenience, throw guards,
 * purity (no mutation, plain object), and helper units. Also a true end-to-end:
 * real canonical records mapped via the live MAPPERS table into a Bundle.
 */

const {
  buildFhirBundle,
  buildFhirBundleFromEntities,
  buildEntry,
  fullUrlFor,
  toFhirInstant,
  isPresent,
  BUNDLE_TYPES,
  REQUEST_BEARING_TYPES,
  ORG_FHIR_BASE,
} = require('../intelligence/fhir/fhir-bundle.lib');
const fhir = require('../intelligence/fhir');

const PATIENT = { resourceType: 'Patient', id: 'p1', active: true };
const ENCOUNTER = { resourceType: 'Encounter', id: 'e1', status: 'finished' };
const NO_ID = { resourceType: 'Observation', status: 'final' };

describe('W1343 buildFhirBundle — collection (default)', () => {
  test('wraps resources into a collection Bundle', () => {
    const b = buildFhirBundle([PATIENT, ENCOUNTER]);
    expect(b.resourceType).toBe('Bundle');
    expect(b.type).toBe('collection');
    expect(b.entry).toHaveLength(2);
    expect(b.entry[0].resource).toBe(PATIENT);
    expect(b.entry[1].resource).toBe(ENCOUNTER);
  });

  test('fullUrl uses canonical absolute URL when id present', () => {
    const b = buildFhirBundle([PATIENT]);
    expect(b.entry[0].fullUrl).toBe(`${ORG_FHIR_BASE}/Patient/p1`);
  });

  test('fullUrl uses deterministic urn when id absent', () => {
    const b = buildFhirBundle([NO_ID]);
    expect(b.entry[0].fullUrl).toBe('urn:alawael:bundle-entry:0');
  });

  test('collection entries carry no request element', () => {
    const b = buildFhirBundle([PATIENT]);
    expect(b.entry[0].request).toBeUndefined();
  });

  test('empty resources yields an empty entry array', () => {
    const b = buildFhirBundle([]);
    expect(b.entry).toEqual([]);
  });

  test('id + timestamp are projected', () => {
    const b = buildFhirBundle([PATIENT], {
      id: 'bundle-7',
      timestamp: '2026-06-15T10:00:00.000Z',
    });
    expect(b.id).toBe('bundle-7');
    expect(b.timestamp).toBe('2026-06-15T10:00:00.000Z');
  });
});

describe('W1343 buildFhirBundle — searchset', () => {
  test('includeTotal adds Bundle.total on searchset', () => {
    const b = buildFhirBundle([PATIENT, ENCOUNTER], { type: 'searchset', includeTotal: true });
    expect(b.type).toBe('searchset');
    expect(b.total).toBe(2);
  });

  test('includeTotal is ignored for non-searchset types', () => {
    const b = buildFhirBundle([PATIENT], { type: 'collection', includeTotal: true });
    expect(b.total).toBeUndefined();
  });
});

describe('W1343 buildFhirBundle — transaction / batch', () => {
  test('transaction entry with id → PUT upsert', () => {
    const b = buildFhirBundle([PATIENT], { type: 'transaction' });
    expect(b.type).toBe('transaction');
    expect(b.entry[0].request).toEqual({ method: 'PUT', url: 'Patient/p1' });
  });

  test('transaction entry without id → POST create', () => {
    const b = buildFhirBundle([NO_ID], { type: 'transaction' });
    expect(b.entry[0].request).toEqual({ method: 'POST', url: 'Observation' });
  });

  test('batch behaves like transaction for request construction', () => {
    const b = buildFhirBundle([ENCOUNTER], { type: 'batch' });
    expect(b.entry[0].request).toEqual({ method: 'PUT', url: 'Encounter/e1' });
  });
});

describe('W1343 buildFhirBundle — throw guards + purity', () => {
  test('throws when resources is not an array', () => {
    expect(() => buildFhirBundle('nope')).toThrow(/must be an array/);
  });

  test('throws on unsupported Bundle.type', () => {
    expect(() => buildFhirBundle([PATIENT], { type: 'weird' })).toThrow(/unsupported Bundle.type/);
  });

  test('throws when an entry lacks resourceType', () => {
    expect(() => buildFhirBundle([{ id: 'x' }])).toThrow(/resourceType/);
  });

  test('does not mutate the resource objects', () => {
    const input = { resourceType: 'Patient', id: 'p1' };
    const snap = JSON.parse(JSON.stringify(input));
    buildFhirBundle([input]);
    expect(input).toEqual(snap);
  });

  test('returns a plain object', () => {
    const b = buildFhirBundle([PATIENT]);
    expect(Object.getPrototypeOf(b)).toBe(Object.prototype);
  });
});

describe('W1343 buildFhirBundleFromEntities — inject mappers', () => {
  const fakeMappers = {
    Foo: rec => ({ resourceType: 'Patient', id: rec.id }),
    Bar: (rec, opts) => ({ resourceType: 'Encounter', id: opts.includeId ? rec.id : undefined }),
  };

  test('maps each entity then envelopes into a Bundle', () => {
    const b = buildFhirBundleFromEntities(
      [
        { entityName: 'Foo', record: { id: 'p1' } },
        { entityName: 'Bar', record: { id: 'e1' }, opts: { includeId: true } },
      ],
      fakeMappers,
      { type: 'transaction' }
    );
    expect(b.entry).toHaveLength(2);
    expect(b.entry[0].resource.resourceType).toBe('Patient');
    expect(b.entry[1].request).toEqual({ method: 'PUT', url: 'Encounter/e1' });
  });

  test('throws on missing entityName', () => {
    expect(() => buildFhirBundleFromEntities([{ record: {} }], fakeMappers)).toThrow(/entityName/);
  });

  test('throws when no mapper registered', () => {
    expect(() =>
      buildFhirBundleFromEntities([{ entityName: 'Zzz', record: {} }], fakeMappers)
    ).toThrow(/no mapper registered/);
  });

  test('throws when entries is not an array', () => {
    expect(() => buildFhirBundleFromEntities('nope', fakeMappers)).toThrow(/must be an array/);
  });

  test('throws when mappers table missing', () => {
    expect(() => buildFhirBundleFromEntities([], null)).toThrow(/mappers table is required/);
  });
});

describe('W1343 buildFhirBundleFromEntities — live MAPPERS end-to-end', () => {
  test('real canonical records map into a valid transaction Bundle', () => {
    const bundle = buildFhirBundleFromEntities(
      [
        {
          entityName: 'Beneficiary',
          record: {
            _id: '64a1111111111111111111aa',
            beneficiaryId: '64a1111111111111111111aa',
            nationalId: '1234567890',
            firstName: 'Sara',
            lastName: 'Ali',
            status: 'active',
          },
        },
        {
          entityName: 'SeatAllocation',
          record: {
            _id: '64ab00000000000000000001',
            beneficiaryId: '64a1111111111111111111aa',
            branchId: '64a2222222222222222222bb',
            effectiveFrom: '2026-01-01T00:00:00.000Z',
            status: 'active',
          },
        },
      ],
      fhir.MAPPERS,
      { type: 'transaction', id: 'export-1' }
    );
    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.id).toBe('export-1');
    expect(bundle.entry).toHaveLength(2);
    expect(bundle.entry[0].resource.resourceType).toBe('Patient');
    expect(bundle.entry[0].request).toEqual({
      method: 'PUT',
      url: 'Patient/64a1111111111111111111aa',
    });
    expect(bundle.entry[1].resource.resourceType).toBe('Appointment');
  });

  test('barrel re-exports the bundle helpers', () => {
    expect(typeof fhir.buildFhirBundle).toBe('function');
    expect(typeof fhir.buildFhirBundleFromEntities).toBe('function');
  });
});

describe('W1343 helpers', () => {
  test('BUNDLE_TYPES is the supported value-set', () => {
    expect(BUNDLE_TYPES).toContain('collection');
    expect(BUNDLE_TYPES).toContain('transaction');
    expect(BUNDLE_TYPES).not.toContain('history');
  });

  test('REQUEST_BEARING_TYPES are transaction + batch only', () => {
    expect(REQUEST_BEARING_TYPES.has('transaction')).toBe(true);
    expect(REQUEST_BEARING_TYPES.has('batch')).toBe(true);
    expect(REQUEST_BEARING_TYPES.has('collection')).toBe(false);
  });

  test('fullUrlFor falls back to index urn without id', () => {
    expect(fullUrlFor({ resourceType: 'Observation' }, 3)).toBe('urn:alawael:bundle-entry:3');
  });

  test('buildEntry adds request only for request-bearing types', () => {
    expect(buildEntry(PATIENT, 0, 'collection').request).toBeUndefined();
    expect(buildEntry(PATIENT, 0, 'batch').request).toEqual({ method: 'PUT', url: 'Patient/p1' });
  });

  test('toFhirInstant handles bad/absent input', () => {
    expect(toFhirInstant('')).toBeUndefined();
    expect(toFhirInstant('not-a-date')).toBeUndefined();
    expect(toFhirInstant('2026-06-15T10:00:00.000Z')).toBe('2026-06-15T10:00:00.000Z');
  });

  test('isPresent treats empty string as absent', () => {
    expect(isPresent('')).toBe(false);
    expect(isPresent(0)).toBe(true);
    expect(isPresent(null)).toBe(false);
  });
});
