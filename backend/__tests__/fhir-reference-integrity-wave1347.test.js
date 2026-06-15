'use strict';
/**
 * W1347 — FHIR R4 reference-integrity checker tests.
 *
 * Covers parseReference shape classification, recursive collectReferences,
 * per-resource malformed-reference detection, and Bundle-level internal vs
 * external (dangling) classification. Plus a live end-to-end check that a real
 * MAPPERS-built Bundle's references are all well-formed, and purity.
 */

const {
  parseReference,
  collectReferences,
  checkResourceReferences,
  checkBundleReferences,
} = require('../intelligence/fhir/fhir-reference-integrity.lib');
const fhir = require('../intelligence/fhir');

describe('W1347 parseReference — shape classification', () => {
  it('classifies a relative ResourceType/id reference', () => {
    const p = parseReference('Patient/64a1111111111111111111aa');
    expect(p.kind).toBe('relative');
    expect(p.resourceType).toBe('Patient');
    expect(p.id).toBe('64a1111111111111111111aa');
  });

  it('classifies an absolute URL reference', () => {
    const p = parseReference('https://alawael.sa/fhir/Organization/branch-1');
    expect(p.kind).toBe('absolute');
    expect(p.resourceType).toBe('Organization');
    expect(p.id).toBe('branch-1');
  });

  it('classifies a urn reference', () => {
    expect(parseReference('urn:uuid:abcd').kind).toBe('urn');
    expect(parseReference('urn:alawael:bundle-entry:3').kind).toBe('urn');
  });

  it('classifies a contained reference', () => {
    const p = parseReference('#local-obs');
    expect(p.kind).toBe('contained');
    expect(p.id).toBe('local-obs');
  });

  it('flags malformed references (lowercase type, empty, non-string, no id)', () => {
    expect(parseReference('patient/123').kind).toBe('malformed');
    expect(parseReference('').kind).toBe('malformed');
    expect(parseReference(undefined).kind).toBe('malformed');
    expect(parseReference({ reference: 'Patient/1' }).kind).toBe('malformed');
    expect(parseReference('Patient').kind).toBe('malformed');
  });
});

describe('W1347 collectReferences — recursive walk', () => {
  it('finds references at any depth and records a dotted path', () => {
    const resource = {
      resourceType: 'CarePlan',
      subject: { reference: 'Patient/p1' },
      careTeam: [{ reference: 'Practitioner/t1' }, { reference: 'Practitioner/t2' }],
      extension: [{ url: 'x', valueReference: { reference: 'EpisodeOfCare/e1' } }],
    };
    const refs = collectReferences(resource);
    const byPath = Object.fromEntries(refs.map(r => [r.path, r.reference]));
    expect(refs).toHaveLength(4);
    expect(byPath['CarePlan.subject.reference']).toBe('Patient/p1');
    expect(byPath['CarePlan.careTeam[0].reference']).toBe('Practitioner/t1');
    expect(byPath['CarePlan.careTeam[1].reference']).toBe('Practitioner/t2');
    expect(byPath['CarePlan.extension[0].valueReference.reference']).toBe('EpisodeOfCare/e1');
  });

  it('returns empty for a resource with no references', () => {
    expect(collectReferences({ resourceType: 'Patient', id: 'p1' })).toEqual([]);
  });
});

describe('W1347 checkResourceReferences', () => {
  it('passes a resource with only well-formed references', () => {
    const r = checkResourceReferences({
      resourceType: 'Encounter',
      subject: { reference: 'Patient/p1' },
      episodeOfCare: [{ reference: 'EpisodeOfCare/e1' }],
    });
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.references).toHaveLength(2);
  });

  it('reports a malformed reference with its path', () => {
    const r = checkResourceReferences({
      resourceType: 'Encounter',
      subject: { reference: 'patient/p1' }, // lowercase type → malformed
    });
    expect(r.valid).toBe(false);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain('Encounter.subject.reference');
    expect(r.errors[0]).toContain('malformed');
  });

  it('rejects non-object input as data, not throw', () => {
    expect(checkResourceReferences(null).valid).toBe(false);
    expect(checkResourceReferences('x').valid).toBe(false);
    expect(checkResourceReferences([]).valid).toBe(false);
  });
});

describe('W1347 checkBundleReferences — internal vs external', () => {
  const bundle = {
    resourceType: 'Bundle',
    type: 'collection',
    entry: [
      {
        fullUrl: 'https://alawael.sa/fhir/Patient/p1',
        resource: { resourceType: 'Patient', id: 'p1' },
      },
      {
        fullUrl: 'https://alawael.sa/fhir/Encounter/e1',
        resource: {
          resourceType: 'Encounter',
          id: 'e1',
          subject: { reference: 'Patient/p1' }, // internal (bundled)
          participant: [{ individual: { reference: 'Practitioner/t1' } }], // external
        },
      },
    ],
  };

  it('classifies bundled vs dangling references', () => {
    const r = checkBundleReferences(bundle);
    expect(r.valid).toBe(true);
    expect(r.referenceCount).toBe(2);
    expect(r.internalCount).toBe(1);
    expect(r.externalCount).toBe(1);
    expect(r.dangling).toHaveLength(1);
    expect(r.dangling[0].reference).toBe('Practitioner/t1');
    expect(r.dangling[0].path).toContain('entry[1] (Encounter)');
  });

  it('surfaces a malformed reference inside an entry as an error', () => {
    const bad = {
      resourceType: 'Bundle',
      type: 'collection',
      entry: [{ resource: { resourceType: 'Flag', subject: { reference: 'Org 5' } } }],
    };
    const r = checkBundleReferences(bad);
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('entry[0] (Flag)');
    expect(r.errors[0]).toContain('malformed');
  });

  it('treats urn/contained references as internal-by-design', () => {
    const b = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: [
        {
          fullUrl: 'urn:alawael:bundle-entry:0',
          resource: {
            resourceType: 'Observation',
            subject: { reference: 'urn:alawael:bundle-entry:1' },
            hasMember: [{ reference: '#contained-x' }],
          },
        },
      ],
    };
    const r = checkBundleReferences(b);
    expect(r.valid).toBe(true);
    expect(r.internalCount).toBe(2);
    expect(r.externalCount).toBe(0);
  });

  it('rejects a non-Bundle / missing-entry input as data, not throw', () => {
    expect(checkBundleReferences(null).valid).toBe(false);
    expect(checkBundleReferences({ resourceType: 'Bundle', type: 'collection' }).valid).toBe(false);
  });
});

describe('W1347 live MAPPERS bundle + purity', () => {
  const BENEFICIARY = {
    beneficiaryId: '64a1111111111111111111aa',
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

  it('every reference in a real MAPPERS-built Bundle is well-formed', () => {
    const bundle = fhir.buildFhirBundleFromEntities(
      [
        { entityName: 'Beneficiary', record: BENEFICIARY },
        { entityName: 'Sponsorship', record: SPONSORSHIP },
      ],
      fhir.MAPPERS
    );
    const r = checkBundleReferences(bundle);
    expect(r.errors).toEqual([]);
    expect(r.valid).toBe(true);
    // Sponsorship → Coverage carries beneficiary + payor references.
    expect(r.referenceCount).toBeGreaterThan(0);
  });

  it('is exported from the barrel', () => {
    expect(typeof fhir.checkResourceReferences).toBe('function');
    expect(typeof fhir.checkBundleReferences).toBe('function');
  });

  it('does not mutate its input', () => {
    const resource = Object.freeze({
      resourceType: 'CarePlan',
      subject: Object.freeze({ reference: 'Patient/p1' }),
    });
    expect(() => checkResourceReferences(resource)).not.toThrow();
  });
});
