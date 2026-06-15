'use strict';
/**
 * W1314 — Measure → FHIR R4 Questionnaire mapper self-test. Pure unit, no DB.
 */

const {
  measureToFhirQuestionnaire,
  toFhirStatus,
  buildIdentifiers,
  buildCode,
  buildExtensions,
  MEASURE_CODE_SYSTEM,
  MEASURE_CODE_CODING_SYSTEM,
  MEASURE_NAME_AR_EXTENSION_URL,
  MEASURE_CATEGORY_EXTENSION_URL,
  MEASURE_SCORING_EXTENSION_URL,
  MEASURE_SCORE_RANGE_EXTENSION_URL,
  MEASURE_AGE_RANGE_EXTENSION_URL,
  MEASURE_CUTOFF_EXTENSION_URL,
} = require('../intelligence/fhir/measure-to-fhir.lib');
const { canonical } = require('../intelligence/canonical');

/** A fully-populated canonical Measure fixture (M-CHAT-R/F style). */
const FULL_MEASURE = {
  _id: '6500000000000000000000bb',
  code: 'M-CHAT-R/F',
  name: 'Modified Checklist for Autism in Toddlers, Revised with Follow-Up',
  name_ar: 'قائمة التحقق المعدّلة للتوحد لدى الأطفال',
  category: 'screening',
  scoringMethod: 'sum',
  minScore: 0,
  maxScore: 20,
  cutoffs: [
    { label: 'Low risk', label_ar: 'خطر منخفض', minScore: 0, maxScore: 2 },
    { label: 'Medium risk', label_ar: 'خطر متوسط', minScore: 3, maxScore: 7 },
    { label: 'High risk', label_ar: 'خطر مرتفع', minScore: 8, maxScore: 20 },
  ],
  applicableAgeMinMonths: 16,
  applicableAgeMaxMonths: 30,
  isActive: true,
  createdAt: '2026-01-01T08:00:00.000Z',
  updatedAt: '2026-01-02T08:00:00.000Z',
};

describe('W1314 Measure → FHIR Questionnaire — core projection', () => {
  const r = measureToFhirQuestionnaire(FULL_MEASURE);

  it('sets resourceType Questionnaire', () => {
    expect(r.resourceType).toBe('Questionnaire');
  });

  it('carries the canonical _id as FHIR id', () => {
    expect(r.id).toBe('6500000000000000000000bb');
  });

  it('omits id when includeId=false', () => {
    expect(measureToFhirQuestionnaire(FULL_MEASURE, { includeId: false }).id).toBeUndefined();
  });

  it('maps name to title', () => {
    expect(r.title).toBe('Modified Checklist for Autism in Toddlers, Revised with Follow-Up');
  });

  it('emits the stable code as a top-level coding', () => {
    expect(r.code).toEqual([
      {
        system: MEASURE_CODE_CODING_SYSTEM,
        code: 'M-CHAT-R/F',
        display: FULL_MEASURE.name,
      },
    ]);
  });

  it('emits the stable code as an identifier', () => {
    expect(r.identifier).toEqual([{ system: MEASURE_CODE_SYSTEM, value: 'M-CHAT-R/F' }]);
  });
});

describe('W1314 Measure → FHIR Questionnaire — status value-set', () => {
  it.each([
    [true, 'active'],
    [false, 'retired'],
    [undefined, 'draft'],
  ])('maps isActive=%s → status %s', (flag, expected) => {
    expect(toFhirStatus(flag)).toBe(expected);
  });

  it('a published measure yields an active Questionnaire', () => {
    expect(measureToFhirQuestionnaire(FULL_MEASURE).status).toBe('active');
  });

  it('a retired measure yields a retired Questionnaire', () => {
    expect(measureToFhirQuestionnaire({ ...FULL_MEASURE, isActive: false }).status).toBe('retired');
  });
});

describe('W1314 Measure → FHIR Questionnaire — identifier/code helpers', () => {
  it('buildIdentifiers returns [] when code missing', () => {
    expect(buildIdentifiers({})).toEqual([]);
  });

  it('buildCode returns undefined when code missing', () => {
    expect(buildCode({})).toBeUndefined();
  });

  it('buildCode omits display when name missing', () => {
    expect(buildCode({ code: 'X' })).toEqual([{ system: MEASURE_CODE_CODING_SYSTEM, code: 'X' }]);
  });
});

describe('W1314 Measure → FHIR Questionnaire — extensions', () => {
  const ext = buildExtensions(FULL_MEASURE);

  it('carries the Arabic name as a string extension', () => {
    expect(ext).toContainEqual({
      url: MEASURE_NAME_AR_EXTENSION_URL,
      valueString: 'قائمة التحقق المعدّلة للتوحد لدى الأطفال',
    });
  });

  it('carries the category as a code extension', () => {
    expect(ext).toContainEqual({
      url: MEASURE_CATEGORY_EXTENSION_URL,
      valueCode: 'screening',
    });
  });

  it('carries the scoring method as a code extension', () => {
    expect(ext).toContainEqual({
      url: MEASURE_SCORING_EXTENSION_URL,
      valueCode: 'sum',
    });
  });

  it('carries the score range as a nested extension', () => {
    expect(ext).toContainEqual({
      url: MEASURE_SCORE_RANGE_EXTENSION_URL,
      extension: [
        { url: 'min', valueDecimal: 0 },
        { url: 'max', valueDecimal: 20 },
      ],
    });
  });

  it('carries the applicable-age window as a nested extension', () => {
    expect(ext).toContainEqual({
      url: MEASURE_AGE_RANGE_EXTENSION_URL,
      extension: [
        { url: 'min', valueInteger: 16 },
        { url: 'max', valueInteger: 30 },
      ],
    });
  });

  it('emits one cutoff extension per interpretation band', () => {
    const cutoffExts = ext.filter(e => e.url === MEASURE_CUTOFF_EXTENSION_URL);
    expect(cutoffExts).toHaveLength(3);
    expect(cutoffExts[0].extension).toEqual([
      { url: 'label', valueString: 'Low risk' },
      { url: 'label_ar', valueString: 'خطر منخفض' },
      { url: 'min', valueDecimal: 0 },
      { url: 'max', valueDecimal: 2 },
    ]);
  });

  it('omits the score-range extension when no bounds present', () => {
    const ext2 = buildExtensions({ code: 'X', category: 'outcome' });
    expect(ext2.find(e => e.url === MEASURE_SCORE_RANGE_EXTENSION_URL)).toBeUndefined();
  });

  it('skips malformed cutoff entries', () => {
    const ext2 = buildExtensions({
      code: 'X',
      cutoffs: [null, {}, { label: 'ok', minScore: 1 }],
    });
    const cutoffExts = ext2.filter(e => e.url === MEASURE_CUTOFF_EXTENSION_URL);
    expect(cutoffExts).toHaveLength(1);
    expect(cutoffExts[0].extension).toEqual([
      { url: 'label', valueString: 'ok' },
      { url: 'min', valueDecimal: 1 },
    ]);
  });

  it('omits the extension array entirely on a minimal measure', () => {
    const r = measureToFhirQuestionnaire({ code: 'BARE' });
    expect(r.extension).toBeUndefined();
  });
});

describe('W1314 Measure → FHIR Questionnaire — guards', () => {
  it('throws when measure is missing', () => {
    expect(() => measureToFhirQuestionnaire(undefined)).toThrow(TypeError);
  });

  it('throws when code is absent', () => {
    expect(() => measureToFhirQuestionnaire({ name: 'No code', category: 'screening' })).toThrow(
      /code/
    );
  });
});

describe('W1314 Measure → FHIR Questionnaire — canonical conformance', () => {
  it('the fixture validates against the canonical Measure schema', () => {
    expect(canonical.Measure.safeParse(FULL_MEASURE).success).toBe(true);
  });

  it('a minimal valid measure maps to a conformant Questionnaire', () => {
    const minimal = { code: 'CARS-2', name: 'CARS-2', category: 'diagnostic' };
    expect(canonical.Measure.safeParse(minimal).success).toBe(true);
    const r = measureToFhirQuestionnaire(minimal);
    expect(r.resourceType).toBe('Questionnaire');
    expect(r.status).toBe('draft');
    expect(r.title).toBe('CARS-2');
    expect(r.code[0].code).toBe('CARS-2');
  });
});
