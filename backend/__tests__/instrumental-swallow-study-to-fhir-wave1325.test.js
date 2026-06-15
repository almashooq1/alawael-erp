'use strict';
/**
 * W1325 — InstrumentalSwallowStudy → FHIR R4 DiagnosticReport mapper tests.
 *
 * Pure unit tests (no DB). Validates the projection of a canonical
 * InstrumentalSwallowStudy onto a base FHIR R4 DiagnosticReport, plus a
 * canonical round-trip (every fixture must satisfy its own canonical schema so
 * the mapper is never tested against shapes the platform cannot produce).
 */

const {
  instrumentalSwallowStudyToFhir,
  toFhirDate,
  toFhirDateTime,
  toFhirStatus,
  buildCode,
  buildCategory,
  buildConsistencyResultExtension,
  buildExtensions,
  STATUS_MAP,
  ORG_FHIR_BASE,
  ISS_STUDY_TYPE_SYSTEM,
  ISS_CATEGORY_SYSTEM,
  ISS_IDDSI_SYSTEM,
  ISS_PHASE_SYSTEM,
  ISS_IMPAIRED_PHASE_EXTENSION_URL,
  ISS_PAS_EXTENSION_URL,
  ISS_ASPIRATION_DETECTED_EXTENSION_URL,
  ISS_SILENT_ASPIRATION_EXTENSION_URL,
  ISS_CONSISTENCY_RESULT_EXTENSION_URL,
  ISS_RECOMMENDED_DIET_LEVEL_EXTENSION_URL,
  ISS_NPO_RECOMMENDED_EXTENSION_URL,
  ISS_DYSPHAGIA_ASSESSMENT_EXTENSION_URL,
  ISS_DIET_PRESCRIPTION_EXTENSION_URL,
  ISS_BRANCH_EXTENSION_URL,
  ISS_CANCEL_REASON_EXTENSION_URL,
} = require('../intelligence/fhir/instrumental-swallow-study-to-fhir.lib');
const { canonical } = require('../intelligence/canonical');

const FULL = Object.freeze({
  _id: '64a0000000000000000000ff',
  beneficiaryId: '64a1111111111111111111aa',
  branchId: '64a222222222222222222222',
  dysphagiaAssessmentId: '64a333333333333333333333',
  dietPrescriptionId: '64a444444444444444444444',
  studyType: 'vfss',
  status: 'completed',
  performedDate: '2026-03-10T08:30:00.000Z',
  performedBy: '64a555555555555555555555',
  impairedPhases: ['pharyngeal', 'oesophageal'],
  penetrationAspirationScale: 6,
  aspirationDetected: true,
  silentAspiration: false,
  consistencyResults: [
    { iddsiLevel: '0', penetration: true, aspiration: true, safe: false },
    { iddsiLevel: '4', penetration: false, aspiration: false, safe: true },
  ],
  recommendedDietLevels: ['4', '5'],
  npoRecommended: false,
});

const MINIMAL = Object.freeze({
  beneficiaryId: '64a1111111111111111111aa',
  studyType: 'fees',
  status: 'ordered',
});

const CANCELLED = Object.freeze({
  _id: '64a0000000000000000000cc',
  beneficiaryId: '64a1111111111111111111aa',
  studyType: 'mbss',
  status: 'cancelled',
  cancelReason: 'Family declined the procedure',
});

describe('W1325 instrumentalSwallowStudyToFhir — canonical round-trip', () => {
  it('FULL fixture satisfies the canonical InstrumentalSwallowStudy schema', () => {
    const parsed = canonical.InstrumentalSwallowStudy.safeParse(FULL);
    expect(parsed.success).toBe(true);
  });

  it('MINIMAL fixture satisfies the canonical schema', () => {
    const parsed = canonical.InstrumentalSwallowStudy.safeParse(MINIMAL);
    expect(parsed.success).toBe(true);
  });

  it('CANCELLED fixture satisfies the canonical schema', () => {
    const parsed = canonical.InstrumentalSwallowStudy.safeParse(CANCELLED);
    expect(parsed.success).toBe(true);
  });
});

describe('W1325 instrumentalSwallowStudyToFhir — resource shape', () => {
  it('emits a FHIR R4 DiagnosticReport', () => {
    const r = instrumentalSwallowStudyToFhir(FULL);
    expect(r.resourceType).toBe('DiagnosticReport');
  });

  it('intent-free: DiagnosticReport carries no intent field', () => {
    const r = instrumentalSwallowStudyToFhir(FULL);
    expect(r.intent).toBeUndefined();
  });

  it('sets id from _id when includeId (default)', () => {
    const r = instrumentalSwallowStudyToFhir(FULL);
    expect(r.id).toBe('64a0000000000000000000ff');
  });

  it('omits id when includeId is false', () => {
    const r = instrumentalSwallowStudyToFhir(FULL, { includeId: false });
    expect(r.id).toBeUndefined();
  });

  it('omits id when _id is absent', () => {
    const r = instrumentalSwallowStudyToFhir(MINIMAL);
    expect(r.id).toBeUndefined();
  });

  it('subject references the beneficiary as a Patient', () => {
    const r = instrumentalSwallowStudyToFhir(FULL);
    expect(r.subject).toEqual({ reference: 'Patient/64a1111111111111111111aa' });
  });

  it('code carries the study type coding + text', () => {
    const r = instrumentalSwallowStudyToFhir(FULL);
    expect(r.code).toEqual({
      coding: [{ system: ISS_STUDY_TYPE_SYSTEM, code: 'vfss' }],
      text: 'vfss',
    });
  });

  it('category marks the report as a swallow study', () => {
    const r = instrumentalSwallowStudyToFhir(FULL);
    expect(r.category).toEqual([
      {
        coding: [{ system: ISS_CATEGORY_SYSTEM, code: 'swallow-study' }],
        text: 'Instrumental Swallow Study',
      },
    ]);
  });

  it('effectiveDateTime = performedDate (full ISO)', () => {
    const r = instrumentalSwallowStudyToFhir(FULL);
    expect(r.effectiveDateTime).toBe('2026-03-10T08:30:00.000Z');
  });

  it('performer references performedBy as a Practitioner', () => {
    const r = instrumentalSwallowStudyToFhir(FULL);
    expect(r.performer).toEqual([{ reference: 'Practitioner/64a555555555555555555555' }]);
  });

  it('omits performer when performedBy is absent', () => {
    const r = instrumentalSwallowStudyToFhir(MINIMAL);
    expect(r.performer).toBeUndefined();
  });

  it('omits effectiveDateTime when performedDate is absent', () => {
    const r = instrumentalSwallowStudyToFhir(MINIMAL);
    expect(r.effectiveDateTime).toBeUndefined();
  });

  it('output is a plain object', () => {
    const r = instrumentalSwallowStudyToFhir(FULL);
    expect(Object.getPrototypeOf(r)).toBe(Object.prototype);
  });

  it('does not mutate the input', () => {
    const input = JSON.parse(JSON.stringify(FULL));
    instrumentalSwallowStudyToFhir(input);
    expect(input).toEqual(FULL);
  });
});

describe('W1325 status mapping', () => {
  it('STATUS_MAP is frozen', () => {
    expect(Object.isFrozen(STATUS_MAP)).toBe(true);
  });

  it('ordered → registered', () => {
    expect(toFhirStatus('ordered')).toBe('registered');
  });

  it('scheduled → registered', () => {
    expect(toFhirStatus('scheduled')).toBe('registered');
  });

  it('completed → final', () => {
    expect(toFhirStatus('completed')).toBe('final');
  });

  it('cancelled → cancelled', () => {
    expect(toFhirStatus('cancelled')).toBe('cancelled');
  });

  it('unknown / absent status → unknown', () => {
    expect(toFhirStatus('weird')).toBe('unknown');
    expect(toFhirStatus(undefined)).toBe('unknown');
  });

  it('CANCELLED fixture maps to a cancelled report', () => {
    const r = instrumentalSwallowStudyToFhir(CANCELLED);
    expect(r.status).toBe('cancelled');
  });
});

describe('W1325 extensions', () => {
  it('emits one impaired-phase extension per phase', () => {
    const ext = buildExtensions(FULL);
    const phases = ext.filter(e => e.url === ISS_IMPAIRED_PHASE_EXTENSION_URL);
    expect(phases).toHaveLength(2);
    expect(phases[0]).toEqual({
      url: ISS_IMPAIRED_PHASE_EXTENSION_URL,
      valueCoding: { system: ISS_PHASE_SYSTEM, code: 'pharyngeal' },
    });
  });

  it('carries penetration-aspiration scale as valueInteger', () => {
    const ext = buildExtensions(FULL);
    const pas = ext.find(e => e.url === ISS_PAS_EXTENSION_URL);
    expect(pas).toEqual({ url: ISS_PAS_EXTENSION_URL, valueInteger: 6 });
  });

  it('carries aspiration-detected + silent-aspiration as booleans', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === ISS_ASPIRATION_DETECTED_EXTENSION_URL)).toEqual({
      url: ISS_ASPIRATION_DETECTED_EXTENSION_URL,
      valueBoolean: true,
    });
    expect(ext.find(e => e.url === ISS_SILENT_ASPIRATION_EXTENSION_URL)).toEqual({
      url: ISS_SILENT_ASPIRATION_EXTENSION_URL,
      valueBoolean: false,
    });
  });

  it('emits one nested consistency-result extension per result', () => {
    const ext = buildExtensions(FULL);
    const results = ext.filter(e => e.url === ISS_CONSISTENCY_RESULT_EXTENSION_URL);
    expect(results).toHaveLength(2);
  });

  it('nested consistency-result carries IDDSI level + flags', () => {
    const nested = buildConsistencyResultExtension({
      iddsiLevel: '0',
      penetration: true,
      aspiration: true,
      safe: false,
    });
    expect(nested.url).toBe(ISS_CONSISTENCY_RESULT_EXTENSION_URL);
    expect(nested.extension).toEqual([
      { url: 'iddsi-level', valueCoding: { system: ISS_IDDSI_SYSTEM, code: '0' } },
      { url: 'penetration', valueBoolean: true },
      { url: 'aspiration', valueBoolean: true },
      { url: 'safe', valueBoolean: false },
    ]);
  });

  it('nested consistency-result with only IDDSI level carries just that sub-ext', () => {
    const nested = buildConsistencyResultExtension({ iddsiLevel: '3' });
    expect(nested.extension).toEqual([
      { url: 'iddsi-level', valueCoding: { system: ISS_IDDSI_SYSTEM, code: '3' } },
    ]);
  });

  it('emits one recommended-diet-level extension per level', () => {
    const ext = buildExtensions(FULL);
    const levels = ext.filter(e => e.url === ISS_RECOMMENDED_DIET_LEVEL_EXTENSION_URL);
    expect(levels).toHaveLength(2);
    expect(levels[1]).toEqual({
      url: ISS_RECOMMENDED_DIET_LEVEL_EXTENSION_URL,
      valueCoding: { system: ISS_IDDSI_SYSTEM, code: '5' },
    });
  });

  it('carries npo-recommended as a boolean (false retained)', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === ISS_NPO_RECOMMENDED_EXTENSION_URL)).toEqual({
      url: ISS_NPO_RECOMMENDED_EXTENSION_URL,
      valueBoolean: false,
    });
  });

  it('carries the referring dysphagia assessment id as valueString', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === ISS_DYSPHAGIA_ASSESSMENT_EXTENSION_URL)).toEqual({
      url: ISS_DYSPHAGIA_ASSESSMENT_EXTENSION_URL,
      valueString: '64a333333333333333333333',
    });
  });

  it('references the linked diet prescription as a NutritionOrder', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === ISS_DIET_PRESCRIPTION_EXTENSION_URL)).toEqual({
      url: ISS_DIET_PRESCRIPTION_EXTENSION_URL,
      valueReference: { reference: 'NutritionOrder/64a444444444444444444444' },
    });
  });

  it('references the branch as an Organization', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === ISS_BRANCH_EXTENSION_URL)).toEqual({
      url: ISS_BRANCH_EXTENSION_URL,
      valueReference: { reference: 'Organization/64a222222222222222222222' },
    });
  });

  it('MINIMAL fixture produces no extensions', () => {
    const r = instrumentalSwallowStudyToFhir(MINIMAL);
    expect(r.extension).toBeUndefined();
  });

  it('CANCELLED fixture carries the cancel reason extension', () => {
    const ext = buildExtensions(CANCELLED);
    expect(ext).toEqual([
      { url: ISS_CANCEL_REASON_EXTENSION_URL, valueString: 'Family declined the procedure' },
    ]);
  });

  it('skips malformed consistency-result entries with no IDDSI level', () => {
    const ext = buildExtensions({
      ...MINIMAL,
      consistencyResults: [{ penetration: true }, { iddsiLevel: '2' }],
    });
    const results = ext.filter(e => e.url === ISS_CONSISTENCY_RESULT_EXTENSION_URL);
    expect(results).toHaveLength(1);
  });
});

describe('W1325 helpers + guards', () => {
  it('ORG_FHIR_BASE is the org base URL', () => {
    expect(ORG_FHIR_BASE).toBe('https://alawael.sa/fhir');
  });

  it('toFhirDateTime returns full ISO; toFhirDate returns YYYY-MM-DD', () => {
    expect(toFhirDateTime('2026-03-10T08:30:00.000Z')).toBe('2026-03-10T08:30:00.000Z');
    expect(toFhirDate('2026-03-10T08:30:00.000Z')).toBe('2026-03-10');
  });

  it('toFhirDateTime returns undefined for falsy / invalid input', () => {
    expect(toFhirDateTime(undefined)).toBeUndefined();
    expect(toFhirDateTime('not-a-date')).toBeUndefined();
  });

  it('buildCode + buildCategory shape the diagnostic concepts', () => {
    expect(buildCode({ studyType: 'fees' }).coding[0].code).toBe('fees');
    expect(buildCategory()[0].coding[0].code).toBe('swallow-study');
  });

  it('throws when study is missing', () => {
    expect(() => instrumentalSwallowStudyToFhir()).toThrow(TypeError);
    expect(() => instrumentalSwallowStudyToFhir(null)).toThrow(/study object is required/);
  });

  it('throws when beneficiaryId is missing', () => {
    expect(() => instrumentalSwallowStudyToFhir({ studyType: 'vfss' })).toThrow(
      /beneficiaryId is required/
    );
  });

  it('throws when studyType is missing', () => {
    expect(() =>
      instrumentalSwallowStudyToFhir({ beneficiaryId: '64a1111111111111111111aa' })
    ).toThrow(/studyType is required/);
  });
});
