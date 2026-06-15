'use strict';
/**
 * W1338 — StaffHealthRecord → FHIR R4 Observation mapper tests.
 *
 * Pure unit tests (no DB). Validates the projection of a canonical
 * StaffHealthRecord onto a base FHIR R4 Observation plus a canonical round-trip.
 */

const {
  staffHealthRecordToFhir,
  toFhirDateTime,
  toFhirStatus,
  buildCategory,
  buildCode,
  buildValue,
  buildExtensions,
  isPresent,
  STATUS_MAP,
  ORG_FHIR_BASE,
  SHR_CATEGORY_SYSTEM,
  SHR_CATEGORY_CODE,
  SHR_RECORD_TYPE_SYSTEM,
  SHR_RESULT_SYSTEM,
  SHR_STATUS_EXTENSION_URL,
  SHR_RECORD_NUMBER_EXTENSION_URL,
  SHR_NEXT_DUE_EXTENSION_URL,
  SHR_FINDINGS_EXTENSION_URL,
  SHR_RESTRICTIONS_EXTENSION_URL,
  SHR_IMMUNIZATION_EXTENSION_URL,
  SHR_EXPOSURE_EXTENSION_URL,
  SHR_FITNESS_EXTENSION_URL,
  SHR_RESULT_EXTENSION_URL,
  SHR_CONFIDENTIAL_EXTENSION_URL,
  SHR_ASSESSED_BY_NAME_EXTENSION_URL,
  SHR_EMPLOYEE_NAME_EXTENSION_URL,
  SHR_NOTES_EXTENSION_URL,
  SHR_BRANCH_EXTENSION_URL,
} = require('../intelligence/fhir/staff-health-record-to-fhir.lib');
const { canonical } = require('../intelligence/canonical');

const IMMUNIZATION = Object.freeze({
  _id: '64a0000000000000000000ff',
  employeeId: '64a3333333333333333333cc',
  employeeName: 'Sara A.',
  branchId: '64a2222222222222222222bb',
  recordNumber: 'SHR-2026-001',
  recordType: 'immunization',
  status: 'completed',
  eventDate: '2026-01-10T00:00:00.000Z',
  nextDueDate: '2027-01-10T00:00:00.000Z',
  outcome: 'Dose administered',
  vaccineName: 'Hepatitis B',
  doseNumber: 2,
  administeredDate: '2026-01-10T09:00:00.000Z',
  lotNumber: 'LOT-HB-77',
  confidential: true,
  assessedByName: 'Dr. Noura',
  assessedBy: '64a4444444444444444444dd',
  notes: 'Series in progress',
});

const MINIMAL = Object.freeze({
  employeeId: '64a3333333333333333333cc',
  recordType: 'periodic_checkup',
  status: 'open',
  eventDate: '2026-03-01T00:00:00.000Z',
});

const EXPOSURE = Object.freeze({
  _id: '64a0000000000000000000ee',
  employeeId: '64a3333333333333333333cc',
  recordType: 'exposure_incident',
  status: 'follow_up_required',
  eventDate: '2026-02-15T00:00:00.000Z',
  exposureType: 'needlestick',
  sourcePatientKnown: true,
  bodyFluidType: 'blood',
  postExposureProphylaxis: 'PEP started within 1h',
  reportedWithin2h: true,
  result: 'negative',
  fitnessLevel: 'fit',
});

describe('W1338 staffHealthRecordToFhir — canonical round-trip', () => {
  it('IMMUNIZATION fixture satisfies the canonical schema', () => {
    expect(canonical.StaffHealthRecord.safeParse(IMMUNIZATION).success).toBe(true);
  });

  it('MINIMAL fixture satisfies the canonical schema', () => {
    expect(canonical.StaffHealthRecord.safeParse(MINIMAL).success).toBe(true);
  });

  it('EXPOSURE fixture satisfies the canonical schema', () => {
    expect(canonical.StaffHealthRecord.safeParse(EXPOSURE).success).toBe(true);
  });
});

describe('W1338 staffHealthRecordToFhir — resource shape', () => {
  it('emits a FHIR R4 Observation', () => {
    expect(staffHealthRecordToFhir(IMMUNIZATION).resourceType).toBe('Observation');
  });

  it('sets id from _id when includeId (default)', () => {
    expect(staffHealthRecordToFhir(IMMUNIZATION).id).toBe('64a0000000000000000000ff');
  });

  it('omits id when includeId is false', () => {
    expect(staffHealthRecordToFhir(IMMUNIZATION, { includeId: false }).id).toBeUndefined();
  });

  it('omits id when _id is absent', () => {
    expect(staffHealthRecordToFhir(MINIMAL).id).toBeUndefined();
  });

  it('category is the fixed occupational-health discriminator', () => {
    expect(staffHealthRecordToFhir(IMMUNIZATION).category).toEqual([
      {
        coding: [{ system: SHR_CATEGORY_SYSTEM, code: SHR_CATEGORY_CODE }],
        text: 'Occupational Health',
      },
    ]);
  });

  it('code carries the record type', () => {
    expect(staffHealthRecordToFhir(IMMUNIZATION).code).toEqual({
      coding: [{ system: SHR_RECORD_TYPE_SYSTEM, code: 'immunization' }],
      text: 'immunization',
    });
  });

  it('subject references the staff member as Patient', () => {
    expect(staffHealthRecordToFhir(IMMUNIZATION).subject).toEqual({
      reference: 'Patient/64a3333333333333333333cc',
    });
  });

  it('effectiveDateTime maps from eventDate', () => {
    expect(staffHealthRecordToFhir(IMMUNIZATION).effectiveDateTime).toBe(
      '2026-01-10T00:00:00.000Z'
    );
  });

  it('performer references the assessor as Practitioner', () => {
    expect(staffHealthRecordToFhir(IMMUNIZATION).performer).toEqual([
      { reference: 'Practitioner/64a4444444444444444444dd' },
    ]);
  });

  it('omits performer when assessedBy is absent', () => {
    expect(staffHealthRecordToFhir(MINIMAL).performer).toBeUndefined();
  });

  it('uses the result as a coded value when present', () => {
    expect(staffHealthRecordToFhir(EXPOSURE).valueCodeableConcept).toEqual({
      coding: [{ system: SHR_RESULT_SYSTEM, code: 'negative' }],
      text: 'negative',
    });
  });

  it('falls back to outcome valueString when no result', () => {
    const resource = staffHealthRecordToFhir(IMMUNIZATION);
    expect(resource.valueString).toBe('Dose administered');
    expect(resource.valueCodeableConcept).toBeUndefined();
  });

  it('has no value[x] when neither result nor outcome present', () => {
    const resource = staffHealthRecordToFhir(MINIMAL);
    expect(resource.valueString).toBeUndefined();
    expect(resource.valueCodeableConcept).toBeUndefined();
  });

  it('output is a plain object', () => {
    expect(Object.getPrototypeOf(staffHealthRecordToFhir(IMMUNIZATION))).toBe(Object.prototype);
  });

  it('does not mutate the input', () => {
    const input = JSON.parse(JSON.stringify(IMMUNIZATION));
    staffHealthRecordToFhir(input);
    expect(input).toEqual(IMMUNIZATION);
  });
});

describe('W1338 status mapping', () => {
  it('STATUS_MAP is frozen', () => {
    expect(Object.isFrozen(STATUS_MAP)).toBe(true);
  });

  it('maps lifecycle states onto the Observation.status value-set', () => {
    expect(toFhirStatus('open')).toBe('registered');
    expect(toFhirStatus('in_progress')).toBe('preliminary');
    expect(toFhirStatus('completed')).toBe('final');
    expect(toFhirStatus('cleared')).toBe('final');
    expect(toFhirStatus('restricted')).toBe('final');
    expect(toFhirStatus('follow_up_required')).toBe('preliminary');
    expect(toFhirStatus('closed')).toBe('final');
  });

  it('absent → unknown; unmapped → unknown', () => {
    expect(toFhirStatus(undefined)).toBe('unknown');
    expect(toFhirStatus('weird')).toBe('unknown');
  });
});

describe('W1338 extensions', () => {
  it('always carries the original status', () => {
    const ext = buildExtensions(IMMUNIZATION);
    expect(ext.find(e => e.url === SHR_STATUS_EXTENSION_URL).valueCode).toBe('completed');
  });

  it('carries record number + next due + notes', () => {
    const ext = buildExtensions(IMMUNIZATION);
    expect(ext.find(e => e.url === SHR_RECORD_NUMBER_EXTENSION_URL).valueString).toBe(
      'SHR-2026-001'
    );
    expect(ext.find(e => e.url === SHR_NEXT_DUE_EXTENSION_URL).valueDateTime).toBe(
      '2027-01-10T00:00:00.000Z'
    );
    expect(ext.find(e => e.url === SHR_NOTES_EXTENSION_URL).valueString).toBe('Series in progress');
  });

  it('carries the nested immunization extension', () => {
    const ext = buildExtensions(IMMUNIZATION);
    const im = ext.find(e => e.url === SHR_IMMUNIZATION_EXTENSION_URL);
    expect(im.extension).toContainEqual({ url: 'vaccineName', valueString: 'Hepatitis B' });
    expect(im.extension).toContainEqual({ url: 'doseNumber', valueInteger: 2 });
    expect(im.extension).toContainEqual({
      url: 'administeredDate',
      valueDateTime: '2026-01-10T09:00:00.000Z',
    });
    expect(im.extension).toContainEqual({ url: 'lotNumber', valueString: 'LOT-HB-77' });
  });

  it('carries confidential + assessor name + employee name + branch', () => {
    const ext = buildExtensions(IMMUNIZATION);
    expect(ext.find(e => e.url === SHR_CONFIDENTIAL_EXTENSION_URL).valueBoolean).toBe(true);
    expect(ext.find(e => e.url === SHR_ASSESSED_BY_NAME_EXTENSION_URL).valueString).toBe(
      'Dr. Noura'
    );
    expect(ext.find(e => e.url === SHR_EMPLOYEE_NAME_EXTENSION_URL).valueString).toBe('Sara A.');
    expect(ext.find(e => e.url === SHR_BRANCH_EXTENSION_URL)).toEqual({
      url: SHR_BRANCH_EXTENSION_URL,
      valueReference: { reference: 'Organization/64a2222222222222222222bb' },
    });
  });

  it('carries the nested exposure extension + fitness + result on the EXPOSURE fixture', () => {
    const ext = buildExtensions(EXPOSURE);
    const ex = ext.find(e => e.url === SHR_EXPOSURE_EXTENSION_URL);
    expect(ex.extension).toContainEqual({ url: 'exposureType', valueCode: 'needlestick' });
    expect(ex.extension).toContainEqual({ url: 'sourcePatientKnown', valueBoolean: true });
    expect(ex.extension).toContainEqual({ url: 'reportedWithin2h', valueBoolean: true });
    expect(ext.find(e => e.url === SHR_FITNESS_EXTENSION_URL).valueCode).toBe('fit');
    expect(ext.find(e => e.url === SHR_RESULT_EXTENSION_URL).valueCode).toBe('negative');
  });

  it('omits findings/restrictions extensions when absent', () => {
    const ext = buildExtensions(MINIMAL);
    expect(ext.find(e => e.url === SHR_FINDINGS_EXTENSION_URL)).toBeUndefined();
    expect(ext.find(e => e.url === SHR_RESTRICTIONS_EXTENSION_URL)).toBeUndefined();
  });

  it('MINIMAL carries only the status extension', () => {
    const resource = staffHealthRecordToFhir(MINIMAL);
    expect(resource.extension.map(e => e.url)).toEqual([SHR_STATUS_EXTENSION_URL]);
  });
});

describe('W1338 helpers + guards', () => {
  it('ORG_FHIR_BASE is the org base URL', () => {
    expect(ORG_FHIR_BASE).toBe('https://alawael.sa/fhir');
  });

  it('isPresent treats empty string as absent', () => {
    expect(isPresent('')).toBe(false);
    expect(isPresent(undefined)).toBe(false);
    expect(isPresent('x')).toBe(true);
  });

  it('buildCategory returns the fixed discriminator', () => {
    expect(buildCategory()[0].coding[0].code).toBe(SHR_CATEGORY_CODE);
  });

  it('buildCode uses the record type', () => {
    expect(buildCode({ recordType: 'tb_screening' }).coding[0].code).toBe('tb_screening');
  });

  it('buildValue returns empty object when no result/outcome', () => {
    expect(buildValue({})).toEqual({});
  });

  it('toFhirDateTime returns full ISO; rejects bad input', () => {
    expect(toFhirDateTime('2026-01-10T00:00:00.000Z')).toBe('2026-01-10T00:00:00.000Z');
    expect(toFhirDateTime(undefined)).toBeUndefined();
    expect(toFhirDateTime('not-a-date')).toBeUndefined();
  });

  it('throws when record is missing', () => {
    expect(() => staffHealthRecordToFhir()).toThrow(TypeError);
    expect(() => staffHealthRecordToFhir(null)).toThrow(/record object is required/);
  });

  it('throws when employeeId is missing', () => {
    expect(() => staffHealthRecordToFhir({ recordType: 'immunization' })).toThrow(
      /employeeId is required/
    );
  });
});
