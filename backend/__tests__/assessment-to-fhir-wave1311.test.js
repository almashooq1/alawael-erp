'use strict';
/**
 * W1311 — Assessment → FHIR R4 Observation mapper self-test. Pure unit, no DB.
 */

const {
  assessmentToFhirObservation,
  toFhirStatus,
  toFhirDateTime,
  buildCode,
  buildExtensions,
  STATUS_MAP,
  ASSESSMENT_TYPE_SYSTEM,
  MAX_SCORE_EXTENSION_URL,
  MEASURE_EXTENSION_URL,
  EPISODE_EXTENSION_URL,
} = require('../intelligence/fhir/assessment-to-fhir.lib');
const { canonical } = require('../intelligence/canonical');

/** A fully-populated canonical Assessment fixture. */
const FULL_ASSESSMENT = {
  _id: '64d0000000000000000000aa',
  beneficiaryId: '64a1111111111111111111aa',
  episodeId: '64b2222222222222222222bb',
  measureId: '64c3333333333333333333cc',
  type: 'periodic',
  status: 'approved',
  conductedAt: '2026-03-15T10:30:00.000Z',
  conductedBy: '64e4444444444444444444dd',
  score: 42,
  maxScore: 60,
  scoreInterpretation: 'moderate impairment',
  notes: 'cooperative throughout',
  createdAt: '2026-03-15T10:00:00.000Z',
  updatedAt: '2026-03-16T10:00:00.000Z',
};

describe('W1311 Assessment → FHIR Observation — core projection', () => {
  const r = assessmentToFhirObservation(FULL_ASSESSMENT);

  it('sets resourceType Observation', () => {
    expect(r.resourceType).toBe('Observation');
  });

  it('carries the canonical _id as FHIR id', () => {
    expect(r.id).toBe('64d0000000000000000000aa');
  });

  it('omits id when includeId=false', () => {
    expect(assessmentToFhirObservation(FULL_ASSESSMENT, { includeId: false }).id).toBeUndefined();
  });

  it('references the beneficiary as the Patient subject', () => {
    expect(r.subject).toEqual({ reference: 'Patient/64a1111111111111111111aa' });
  });

  it('builds the mandatory code from the assessment type', () => {
    expect(r.code).toEqual({
      coding: [{ system: ASSESSMENT_TYPE_SYSTEM, code: 'periodic' }],
      text: 'periodic',
    });
  });

  it('maps conductedAt to effectiveDateTime (full ISO)', () => {
    expect(r.effectiveDateTime).toBe('2026-03-15T10:30:00.000Z');
  });

  it('references the assessor as a performer Practitioner', () => {
    expect(r.performer).toEqual([{ reference: 'Practitioner/64e4444444444444444444dd' }]);
  });

  it('maps score to valueQuantity', () => {
    expect(r.valueQuantity).toEqual({ value: 42 });
  });

  it('maps scoreInterpretation to interpretation text', () => {
    expect(r.interpretation).toEqual([{ text: 'moderate impairment' }]);
  });

  it('maps notes to note text', () => {
    expect(r.note).toEqual([{ text: 'cooperative throughout' }]);
  });
});

describe('W1311 Assessment → FHIR Observation — status value-set', () => {
  it.each([
    ['draft', 'registered'],
    ['in_progress', 'preliminary'],
    ['submitted', 'preliminary'],
    ['reviewed', 'preliminary'],
    ['approved', 'final'],
    ['cancelled', 'cancelled'],
  ])('maps canonical %s → FHIR %s', (canonicalStatus, fhirStatus) => {
    expect(toFhirStatus(canonicalStatus)).toBe(fhirStatus);
  });

  it('defaults absent status to final', () => {
    expect(toFhirStatus(undefined)).toBe('final');
  });

  it('maps an unknown status to entered-in-error', () => {
    expect(toFhirStatus('xyz')).toBe('entered-in-error');
  });

  it('STATUS_MAP covers every canonical AssessmentStatus value', () => {
    ['draft', 'in_progress', 'submitted', 'reviewed', 'approved', 'cancelled'].forEach(s =>
      expect(STATUS_MAP[s]).toBeDefined()
    );
  });
});

describe('W1311 Assessment → FHIR Observation — extensions', () => {
  const ext = buildExtensions(FULL_ASSESSMENT);

  it('carries maxScore as a decimal extension', () => {
    expect(ext).toContainEqual({ url: MAX_SCORE_EXTENSION_URL, valueDecimal: 60 });
  });

  it('carries the measure as a Questionnaire reference extension', () => {
    expect(ext).toContainEqual({
      url: MEASURE_EXTENSION_URL,
      valueReference: { reference: 'Questionnaire/64c3333333333333333333cc' },
    });
  });

  it('carries the episode as an EpisodeOfCare reference extension', () => {
    expect(ext).toContainEqual({
      url: EPISODE_EXTENSION_URL,
      valueReference: { reference: 'EpisodeOfCare/64b2222222222222222222bb' },
    });
  });

  it('omits extension array entirely on a minimal assessment', () => {
    const minimal = {
      beneficiaryId: '64a1111111111111111111aa',
      type: 'screening',
      conductedAt: '2026-03-15',
    };
    expect(assessmentToFhirObservation(minimal).extension).toBeUndefined();
  });

  it('coerces a Date instance to full ISO dateTime', () => {
    expect(toFhirDateTime(new Date('2026-03-15T10:30:00.000Z'))).toBe('2026-03-15T10:30:00.000Z');
  });

  it('returns undefined for an invalid date', () => {
    expect(toFhirDateTime('nope')).toBeUndefined();
  });

  it('buildCode reflects the type verbatim', () => {
    expect(buildCode({ type: 'diagnostic' }).text).toBe('diagnostic');
  });
});

describe('W1311 Assessment → FHIR Observation — guards', () => {
  it('throws when assessment is missing', () => {
    expect(() => assessmentToFhirObservation(undefined)).toThrow(TypeError);
  });

  it('throws when beneficiaryId is absent', () => {
    expect(() =>
      assessmentToFhirObservation({ type: 'initial', conductedAt: '2026-03-15' })
    ).toThrow(/beneficiaryId/);
  });

  it('throws when type is absent (code is mandatory)', () => {
    expect(() =>
      assessmentToFhirObservation({
        beneficiaryId: '64a1111111111111111111aa',
        conductedAt: '2026-03-15',
      })
    ).toThrow(/type/);
  });
});

describe('W1311 Assessment → FHIR Observation — canonical conformance', () => {
  it('the fixture validates against the canonical Assessment schema', () => {
    expect(canonical.Assessment.safeParse(FULL_ASSESSMENT).success).toBe(true);
  });

  it('a minimal valid assessment maps to a conformant Observation', () => {
    const minimal = {
      beneficiaryId: '64a1111111111111111111aa',
      type: 'initial',
      conductedAt: '2026-03-15',
    };
    expect(canonical.Assessment.safeParse(minimal).success).toBe(true);
    const r = assessmentToFhirObservation(minimal);
    expect(r.resourceType).toBe('Observation');
    expect(r.code.text).toBe('initial');
    expect(r.subject.reference).toBe('Patient/64a1111111111111111111aa');
  });
});
