'use strict';
/**
 * W1341 — CbahiAttestation → FHIR R4 Observation mapper tests.
 *
 * Covers: canonical round-trip on 3 fixtures, resource shape, status mapping,
 * category/code/value/component, evidence + nested extensions, throw guards,
 * purity (no mutation, plain object), and helper units.
 */

const { canonical } = require('../intelligence/canonical');
const {
  cbahiAttestationToFhir,
  toFhirStatus,
  toFhirDateTime,
  buildCategory,
  buildComponents,
  buildEvidenceExtension,
  isPresent,
  STATUS_MAP,
  CBAHI_CATEGORY_SYSTEM,
  CBAHI_CATEGORY_CODE,
  CBAHI_STANDARD_SYSTEM,
  CBAHI_ATTESTATION_STATUS_SYSTEM,
  CBAHI_STATUS_EXTENSION_URL,
  CBAHI_STANDARD_EXTENSION_URL,
  CBAHI_EVIDENCE_EXTENSION_URL,
  CBAHI_GAP_NOTES_EXTENSION_URL,
  CBAHI_NA_JUSTIFICATION_EXTENSION_URL,
  CBAHI_LINKED_CAPA_EXTENSION_URL,
  CBAHI_ASSESSED_BY_ROLE_EXTENSION_URL,
  CBAHI_NEXT_REASSESSMENT_EXTENSION_URL,
  CBAHI_BRANCH_EXTENSION_URL,
} = require('../intelligence/fhir/cbahi-attestation-to-fhir.lib');

const FULL = {
  _id: '64aa00000000000000000001',
  branchId: '64a2222222222222222222bb',
  standardKey: 'IPC.1',
  standardChapter: 'Infection Prevention & Control',
  standardCode: 'IPC-001',
  status: 'met',
  score: 92,
  evidence: [
    {
      type: 'policy',
      summary: 'Hand hygiene policy approved',
      artifactId: 'DOC-77',
      artifactKind: 'pdf',
      capturedAt: '2026-02-01T09:00:00.000Z',
      capturedBy: '64a3333333333333333333cc',
    },
  ],
  gapNotes: 'Minor signage gap on floor 2',
  linkedCapaItemId: '64a4444444444444444444dd',
  assessedBy: '64a5555555555555555555ee',
  assessedByRole: 'compliance_officer',
  assessedAt: '2026-02-05T10:00:00.000Z',
  nextReassessmentDue: '2027-02-05T00:00:00.000Z',
};

const MINIMAL = {
  branchId: '64a2222222222222222222bb',
  standardKey: 'PE.3',
  status: 'draft',
};

const NOT_APPLICABLE = {
  _id: '64aa00000000000000000002',
  branchId: '64a2222222222222222222bb',
  standardKey: 'OB.2',
  status: 'not_applicable',
  naJustification: 'Service not provided at this branch',
  assessedAt: '2026-03-01T08:00:00.000Z',
};

describe('W1341 cbahiAttestationToFhir — canonical round-trip', () => {
  for (const [label, fixture] of [
    ['FULL', FULL],
    ['MINIMAL', MINIMAL],
    ['NOT_APPLICABLE', NOT_APPLICABLE],
  ]) {
    test(`${label} fixture satisfies canonical CbahiAttestation`, () => {
      const parsed = canonical.CbahiAttestation.safeParse(fixture);
      expect(parsed.success).toBe(true);
    });
  }
});

describe('W1341 cbahiAttestationToFhir — resource shape', () => {
  test('FULL maps to Observation with core fields', () => {
    const r = cbahiAttestationToFhir(FULL);
    expect(r.resourceType).toBe('Observation');
    expect(r.id).toBe('64aa00000000000000000001');
    expect(r.status).toBe('final');
    expect(r.subject).toEqual({ reference: 'Location/64a2222222222222222222bb' });
    expect(r.effectiveDateTime).toBe('2026-02-05T10:00:00.000Z');
    expect(r.performer).toEqual([{ reference: 'Practitioner/64a5555555555555555555ee' }]);
  });

  test('category is the fixed CBAHI discriminator', () => {
    const r = cbahiAttestationToFhir(FULL);
    expect(r.category).toEqual([
      {
        coding: [{ system: CBAHI_CATEGORY_SYSTEM, code: CBAHI_CATEGORY_CODE }],
        text: 'CBAHI Accreditation',
      },
    ]);
  });

  test('code uses standardCode when present, key as text', () => {
    const r = cbahiAttestationToFhir(FULL);
    expect(r.code.coding[0]).toEqual({ system: CBAHI_STANDARD_SYSTEM, code: 'IPC-001' });
    expect(r.code.text).toBe('IPC.1');
  });

  test('code falls back to standardKey when no standardCode', () => {
    const r = cbahiAttestationToFhir(MINIMAL);
    expect(r.code.coding[0].code).toBe('PE.3');
  });

  test('value is the met/not-met determination', () => {
    const r = cbahiAttestationToFhir(FULL);
    expect(r.valueCodeableConcept).toEqual({
      coding: [{ system: CBAHI_ATTESTATION_STATUS_SYSTEM, code: 'met' }],
      text: 'met',
    });
  });

  test('component carries the percentage score', () => {
    const r = cbahiAttestationToFhir(FULL);
    expect(r.component).toHaveLength(1);
    expect(r.component[0].valueQuantity).toEqual({
      value: 92,
      unit: '%',
      system: 'http://unitsofmeasure.org',
      code: '%',
    });
  });

  test('MINIMAL omits id/component/performer/effectiveDateTime', () => {
    const r = cbahiAttestationToFhir(MINIMAL);
    expect(r.id).toBeUndefined();
    expect(r.component).toBeUndefined();
    expect(r.performer).toBeUndefined();
    expect(r.effectiveDateTime).toBeUndefined();
    expect(r.status).toBe('preliminary');
  });

  test('includeId=false drops id', () => {
    const r = cbahiAttestationToFhir(FULL, { includeId: false });
    expect(r.id).toBeUndefined();
  });
});

describe('W1341 cbahiAttestationToFhir — extensions', () => {
  test('status extension always preserves the original status', () => {
    const r = cbahiAttestationToFhir(FULL);
    const ext = r.extension.find(e => e.url === CBAHI_STATUS_EXTENSION_URL);
    expect(ext).toEqual({ url: CBAHI_STATUS_EXTENSION_URL, valueCode: 'met' });
  });

  test('standard extension nests key/chapter/code', () => {
    const r = cbahiAttestationToFhir(FULL);
    const ext = r.extension.find(e => e.url === CBAHI_STANDARD_EXTENSION_URL);
    expect(ext.extension).toEqual([
      { url: 'key', valueString: 'IPC.1' },
      { url: 'chapter', valueString: 'Infection Prevention & Control' },
      { url: 'code', valueString: 'IPC-001' },
    ]);
  });

  test('evidence extension nests the entry', () => {
    const r = cbahiAttestationToFhir(FULL);
    const ext = r.extension.find(e => e.url === CBAHI_EVIDENCE_EXTENSION_URL);
    expect(ext.extension).toEqual([
      { url: 'type', valueCode: 'policy' },
      { url: 'summary', valueString: 'Hand hygiene policy approved' },
      { url: 'artifactId', valueString: 'DOC-77' },
      { url: 'artifactKind', valueString: 'pdf' },
      { url: 'capturedAt', valueDateTime: '2026-02-01T09:00:00.000Z' },
      { url: 'capturedBy', valueReference: { reference: 'Practitioner/64a3333333333333333333cc' } },
    ]);
  });

  test('gapNotes + linkedCapa + assessedByRole + nextReassessment extensions present', () => {
    const r = cbahiAttestationToFhir(FULL);
    expect(r.extension.find(e => e.url === CBAHI_GAP_NOTES_EXTENSION_URL)).toEqual({
      url: CBAHI_GAP_NOTES_EXTENSION_URL,
      valueString: 'Minor signage gap on floor 2',
    });
    expect(r.extension.find(e => e.url === CBAHI_LINKED_CAPA_EXTENSION_URL)).toEqual({
      url: CBAHI_LINKED_CAPA_EXTENSION_URL,
      valueString: '64a4444444444444444444dd',
    });
    expect(r.extension.find(e => e.url === CBAHI_ASSESSED_BY_ROLE_EXTENSION_URL)).toEqual({
      url: CBAHI_ASSESSED_BY_ROLE_EXTENSION_URL,
      valueString: 'compliance_officer',
    });
    expect(r.extension.find(e => e.url === CBAHI_NEXT_REASSESSMENT_EXTENSION_URL)).toEqual({
      url: CBAHI_NEXT_REASSESSMENT_EXTENSION_URL,
      valueDateTime: '2027-02-05T00:00:00.000Z',
    });
  });

  test('branch extension always present as Organization reference', () => {
    const r = cbahiAttestationToFhir(MINIMAL);
    expect(r.extension.find(e => e.url === CBAHI_BRANCH_EXTENSION_URL)).toEqual({
      url: CBAHI_BRANCH_EXTENSION_URL,
      valueReference: { reference: 'Organization/64a2222222222222222222bb' },
    });
  });

  test('naJustification extension present for not_applicable', () => {
    const r = cbahiAttestationToFhir(NOT_APPLICABLE);
    expect(r.extension.find(e => e.url === CBAHI_NA_JUSTIFICATION_EXTENSION_URL)).toEqual({
      url: CBAHI_NA_JUSTIFICATION_EXTENSION_URL,
      valueString: 'Service not provided at this branch',
    });
    expect(r.status).toBe('final');
  });

  test('MINIMAL has no evidence/gap/capa extensions', () => {
    const r = cbahiAttestationToFhir(MINIMAL);
    expect(r.extension.find(e => e.url === CBAHI_EVIDENCE_EXTENSION_URL)).toBeUndefined();
    expect(r.extension.find(e => e.url === CBAHI_GAP_NOTES_EXTENSION_URL)).toBeUndefined();
  });
});

describe('W1341 cbahiAttestationToFhir — throw guards + purity', () => {
  test('throws when record is missing', () => {
    expect(() => cbahiAttestationToFhir(null)).toThrow(TypeError);
  });

  test('throws when branchId is missing', () => {
    expect(() => cbahiAttestationToFhir({ standardKey: 'X', status: 'met' })).toThrow(/branchId/);
  });

  test('throws when standardKey is missing', () => {
    expect(() => cbahiAttestationToFhir({ branchId: 'b1', status: 'met' })).toThrow(/standardKey/);
  });

  test('does not mutate input', () => {
    const input = JSON.parse(JSON.stringify(FULL));
    cbahiAttestationToFhir(input);
    expect(input).toEqual(FULL);
  });

  test('returns a plain object', () => {
    const r = cbahiAttestationToFhir(FULL);
    expect(Object.getPrototypeOf(r)).toBe(Object.prototype);
  });
});

describe('W1341 helpers', () => {
  test('STATUS_MAP projects onto Observation value-set', () => {
    expect(STATUS_MAP.draft).toBe('preliminary');
    expect(STATUS_MAP.met).toBe('final');
    expect(STATUS_MAP.not_applicable).toBe('final');
  });

  test('toFhirStatus defaults to unknown', () => {
    expect(toFhirStatus(undefined)).toBe('unknown');
    expect(toFhirStatus('weird')).toBe('unknown');
    expect(toFhirStatus('partially_met')).toBe('final');
  });

  test('toFhirDateTime handles bad/absent input', () => {
    expect(toFhirDateTime('')).toBeUndefined();
    expect(toFhirDateTime('not-a-date')).toBeUndefined();
    expect(toFhirDateTime('2026-02-05T10:00:00.000Z')).toBe('2026-02-05T10:00:00.000Z');
  });

  test('isPresent treats empty string as absent', () => {
    expect(isPresent('')).toBe(false);
    expect(isPresent(0)).toBe(true);
    expect(isPresent(null)).toBe(false);
  });

  test('buildCategory is frozen-shape discriminator', () => {
    expect(buildCategory()[0].coding[0].code).toBe(CBAHI_CATEGORY_CODE);
  });

  test('buildComponents returns undefined without a numeric score', () => {
    expect(buildComponents({ score: undefined })).toBeUndefined();
    expect(buildComponents({ score: 0 })[0].valueQuantity.value).toBe(0);
  });

  test('buildEvidenceExtension returns null for empty entry', () => {
    expect(buildEvidenceExtension({})).toBeNull();
  });
});
