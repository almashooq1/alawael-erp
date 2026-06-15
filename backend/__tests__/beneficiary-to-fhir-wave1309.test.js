'use strict';
/**
 * W1309 — FHIR R4 Patient mapper foundation (Item 10 conformance seed).
 *
 * Pure unit tests for intelligence/fhir/beneficiary-to-fhir.lib.js. No DB,
 * no mongoose. Asserts canonical Beneficiary → FHIR R4 Patient projection
 * is structurally conformant (resourceType, identifier systems, name,
 * administrative-gender, birthDate format, active/deceased lifecycle,
 * disability extension) and that the canonical contract round-trips.
 */

const {
  beneficiaryToFhirPatient,
  toFhirDate,
  isActiveStatus,
  buildIdentifiers,
  NATIONAL_ID_SYSTEM,
  IQAMA_SYSTEM,
  MRN_TYPE_SYSTEM,
  DISABILITY_EXTENSION_URL,
} = require('../intelligence/fhir/beneficiary-to-fhir.lib');

const { canonical } = require('../intelligence/canonical');

/** @type {Record<string, any>} */
const FULL_BENEFICIARY = {
  _id: '507f1f77bcf86cd799439011',
  firstName: 'Sara',
  lastName: 'Alharbi',
  firstName_ar: 'سارة',
  lastName_ar: 'الحربي',
  nationalId: '1234567890',
  mrn: 'MRN-00042',
  dateOfBirth: '2015-03-09T00:00:00.000Z',
  gender: 'female',
  disability: { type: 'physical', severity: 'moderate', diagnosisDate: '2018-06-01' },
  status: 'active',
};

describe('beneficiaryToFhirPatient — core projection', () => {
  it('emits a FHIR R4 Patient resourceType', () => {
    const p = beneficiaryToFhirPatient(FULL_BENEFICIARY);
    expect(p.resourceType).toBe('Patient');
  });

  it('copies _id into Patient.id when includeId (default)', () => {
    const p = beneficiaryToFhirPatient(FULL_BENEFICIARY);
    expect(p.id).toBe('507f1f77bcf86cd799439011');
  });

  it('omits Patient.id when includeId=false', () => {
    const p = beneficiaryToFhirPatient(FULL_BENEFICIARY, { includeId: false });
    expect(p.id).toBeUndefined();
  });

  it('maps administrative-gender 1:1', () => {
    expect(beneficiaryToFhirPatient(FULL_BENEFICIARY).gender).toBe('female');
    expect(beneficiaryToFhirPatient({ ...FULL_BENEFICIARY, gender: 'male' }).gender).toBe('male');
  });

  it('formats birthDate as YYYY-MM-DD', () => {
    expect(beneficiaryToFhirPatient(FULL_BENEFICIARY).birthDate).toBe('2015-03-09');
  });
});

describe('identifier systems (NPHIES convention)', () => {
  it('uses the citizen national-id system for IDs starting with 1', () => {
    const ids = buildIdentifiers({ nationalId: '1234567890' });
    expect(ids[0].system).toBe(NATIONAL_ID_SYSTEM);
    expect(ids[0].use).toBe('official');
    expect(ids[0].value).toBe('1234567890');
  });

  it('uses the iqama system for IDs starting with 2', () => {
    const ids = buildIdentifiers({ nationalId: '2234567890' });
    expect(ids[0].system).toBe(IQAMA_SYSTEM);
  });

  it('carries MRN as a secondary identifier with HL7 MR type', () => {
    const ids = buildIdentifiers({ mrn: 'MRN-00042' });
    expect(ids[0].type.coding[0].system).toBe(MRN_TYPE_SYSTEM);
    expect(ids[0].type.coding[0].code).toBe('MR');
    expect(ids[0].value).toBe('MRN-00042');
  });

  it('emits both identifiers when both present', () => {
    const p = beneficiaryToFhirPatient(FULL_BENEFICIARY);
    expect(p.identifier).toHaveLength(2);
  });
});

describe('HumanName projection', () => {
  it('emits a usual name from canonical firstName/lastName', () => {
    const p = beneficiaryToFhirPatient(FULL_BENEFICIARY);
    const usual = p.name.find(n => n.use === 'usual');
    expect(usual.family).toBe('Alharbi');
    expect(usual.given).toEqual(['Sara']);
    expect(usual.text).toBe('Sara Alharbi');
  });

  it('emits an Arabic official name with a language extension', () => {
    const p = beneficiaryToFhirPatient(FULL_BENEFICIARY);
    const arabic = p.name.find(n => n.text === 'سارة الحربي');
    expect(arabic).toBeDefined();
    expect(arabic.extension[0].valueCode).toBe('ar');
  });
});

describe('lifecycle → active/deceased', () => {
  it.each([
    ['draft', true],
    ['waitlisted', true],
    ['active', true],
    ['on_hold', true],
    ['discharged', false],
    ['deceased', false],
    ['archived', false],
  ])('status %s → active=%s', (status, active) => {
    expect(isActiveStatus(status)).toBe(active);
    expect(beneficiaryToFhirPatient({ ...FULL_BENEFICIARY, status }).active).toBe(active);
  });

  it('sets deceasedBoolean only for status=deceased', () => {
    expect(
      beneficiaryToFhirPatient({ ...FULL_BENEFICIARY, status: 'deceased' }).deceasedBoolean
    ).toBe(true);
    expect(beneficiaryToFhirPatient(FULL_BENEFICIARY).deceasedBoolean).toBeUndefined();
  });

  it('treats absent status as an active record', () => {
    const { status, ...noStatus } = FULL_BENEFICIARY;
    expect(beneficiaryToFhirPatient(noStatus).active).toBe(true);
  });
});

describe('disability extension', () => {
  it('emits a namespaced disability extension when present', () => {
    const p = beneficiaryToFhirPatient(FULL_BENEFICIARY);
    const ext = p.extension.find(e => e.url === DISABILITY_EXTENSION_URL);
    expect(ext).toBeDefined();
    const sub = Object.fromEntries(ext.extension.map(s => [s.url, s.valueCode || s.valueDate]));
    expect(sub.type).toBe('physical');
    expect(sub.severity).toBe('moderate');
    expect(sub.diagnosisDate).toBe('2018-06-01');
  });

  it('omits the extension when no disability', () => {
    const { disability, ...noDis } = FULL_BENEFICIARY;
    expect(beneficiaryToFhirPatient(noDis).extension).toBeUndefined();
  });
});

describe('guards + edge cases', () => {
  it('throws when beneficiary is missing', () => {
    expect(() => beneficiaryToFhirPatient(null)).toThrow(/beneficiary object is required/);
  });

  it('throws when neither nationalId nor mrn is present', () => {
    expect(() => beneficiaryToFhirPatient({ firstName: 'X', lastName: 'Y' })).toThrow(
      /nationalId or mrn/
    );
  });

  it('toFhirDate returns undefined on invalid input', () => {
    expect(toFhirDate('not-a-date')).toBeUndefined();
    expect(toFhirDate(undefined)).toBeUndefined();
  });

  it('works with only an MRN (no nationalId)', () => {
    const p = beneficiaryToFhirPatient({ firstName: 'A', lastName: 'B', mrn: 'MRN-1' });
    expect(p.identifier).toHaveLength(1);
    expect(p.identifier[0].value).toBe('MRN-1');
  });
});

describe('canonical-contract conformance (round-trip)', () => {
  it('a canonical-valid beneficiary maps to a Patient without losing identity', () => {
    // Validate the fixture against the canonical schema first — guarantees
    // the mapper is exercised against contract-shaped input (drift guard).
    const parsed = canonical.Beneficiary.safeParse(FULL_BENEFICIARY);
    expect(parsed.success).toBe(true);

    const p = beneficiaryToFhirPatient(FULL_BENEFICIARY);
    // Identity must survive the projection.
    expect(p.identifier.some(i => i.value === FULL_BENEFICIARY.nationalId)).toBe(true);
    expect(p.identifier.some(i => i.value === FULL_BENEFICIARY.mrn)).toBe(true);
    expect(p.gender).toBe(FULL_BENEFICIARY.gender);
  });
});
