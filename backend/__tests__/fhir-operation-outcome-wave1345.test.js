'use strict';
/**
 * W1345 — FHIR R4 OperationOutcome serializer tests.
 *
 * Verifies `buildOperationOutcome` turns a W1344 validator result into a
 * conformant FHIR R4 OperationOutcome: error issues mirror `errors[]` with a
 * FHIRPath `expression` extracted where recognisable, the success path emits a
 * single information issue (issue is 1..*), the helpers behave, and the whole
 * thing is pure. Includes an end-to-end path: a real mapper output → validator
 * → OperationOutcome, and a deliberately-broken resource → error OperationOutcome.
 */

const {
  buildOperationOutcome,
  buildIssue,
  expressionFromDiagnostic,
  leadingResourcePath,
  isPresent,
  ISSUE_SEVERITIES,
  ISSUE_TYPE_CODES,
} = require('../intelligence/fhir/fhir-operation-outcome.lib');

const {
  validateFhirResource,
  validateFhirBundle,
} = require('../intelligence/fhir/fhir-validate.lib');

const { buildFhirBundle } = require('../intelligence/fhir/fhir-bundle.lib');
const { beneficiaryToFhirPatient } = require('../intelligence/fhir/beneficiary-to-fhir.lib');

describe('W1345 OperationOutcome — success path', () => {
  test('a clean result yields a single information issue (issue is 1..*)', () => {
    const oo = buildOperationOutcome({ valid: true, errors: [] });
    expect(oo.resourceType).toBe('OperationOutcome');
    expect(Array.isArray(oo.issue)).toBe(true);
    expect(oo.issue).toHaveLength(1);
    expect(oo.issue[0].severity).toBe('information');
    expect(oo.issue[0].code).toBe('informational');
    expect(oo.issue[0].diagnostics).toBe('All structural checks passed.');
    expect(oo.issue[0].expression).toBeUndefined();
  });

  test('a missing/empty errors array is treated as success', () => {
    expect(buildOperationOutcome({}).issue[0].severity).toBe('information');
    expect(buildOperationOutcome(null).issue[0].severity).toBe('information');
    expect(buildOperationOutcome(undefined).issue[0].severity).toBe('information');
    expect(buildOperationOutcome({ errors: 'nope' }).issue[0].severity).toBe('information');
  });

  test('successText is overridable', () => {
    const oo = buildOperationOutcome({ errors: [] }, { successText: 'كل الفحوص نجحت' });
    expect(oo.issue[0].diagnostics).toBe('كل الفحوص نجحت');
  });
});

describe('W1345 OperationOutcome — error path', () => {
  test('each validator error becomes one error issue', () => {
    const errors = [
      'EpisodeOfCare.status is required (1..1) but missing',
      'EpisodeOfCare.patient is required (1..1) but missing',
    ];
    const oo = buildOperationOutcome({ valid: false, errors });
    expect(oo.resourceType).toBe('OperationOutcome');
    expect(oo.issue).toHaveLength(2);
    oo.issue.forEach(issue => {
      expect(issue.severity).toBe('error');
      expect(issue.code).toBe('structure');
      expect(typeof issue.diagnostics).toBe('string');
    });
    expect(oo.issue[0].diagnostics).toBe(errors[0]);
  });

  test('severity + code are overridable', () => {
    const oo = buildOperationOutcome(
      { errors: ['X.y is required (1..1) but missing'] },
      { severity: 'fatal', code: 'required' }
    );
    expect(oo.issue[0].severity).toBe('fatal');
    expect(oo.issue[0].code).toBe('required');
  });

  test('a recognisable diagnostic gets a FHIRPath expression', () => {
    const oo = buildOperationOutcome({
      errors: ['CarePlan.subject is required (1..1) but missing'],
    });
    expect(oo.issue[0].expression).toEqual(['CarePlan.subject']);
  });

  test('a choice/shape diagnostic has no expression', () => {
    const oo = buildOperationOutcome({
      errors: [
        'DeviceRequest: exactly one of [codeCodeableConcept, codeReference] is required but none present',
      ],
    });
    expect(oo.issue[0].expression).toBeUndefined();
  });

  test('a bundle-entry diagnostic gets a Bundle FHIRPath expression', () => {
    const oo = buildOperationOutcome({
      errors: ['entry[3] (Coverage): Coverage.payor is required (1..*) but missing/empty'],
    });
    expect(oo.issue[0].expression).toEqual(['Bundle.entry[3].resource.Coverage.payor']);
  });
});

describe('W1345 expressionFromDiagnostic + leadingResourcePath helpers', () => {
  test('leadingResourcePath extracts a dotted path or undefined', () => {
    expect(leadingResourcePath('Patient.name is required')).toBe('Patient.name');
    expect(leadingResourcePath('Observation.code missing')).toBe('Observation.code');
    expect(leadingResourcePath('resource.resourceType is required')).toBeUndefined(); // lowercase head
    expect(leadingResourcePath('exactly one of [...]')).toBeUndefined();
    expect(leadingResourcePath(123)).toBeUndefined();
  });

  test('expressionFromDiagnostic handles plain + entry-prefixed + unmatched', () => {
    expect(expressionFromDiagnostic('Flag.subject is required (1..1) but missing')).toBe(
      'Flag.subject'
    );
    expect(
      expressionFromDiagnostic('entry[0] (Patient): Patient.gender is required (1..1) but missing')
    ).toBe('Bundle.entry[0].resource.Patient.gender');
    expect(expressionFromDiagnostic('bundle.type is required (1..1)')).toBeUndefined();
    expect(
      expressionFromDiagnostic('entry[2] (DeviceRequest): DeviceRequest: exactly one of [a, b]...')
    ).toBeUndefined();
    expect(expressionFromDiagnostic(null)).toBeUndefined();
  });
});

describe('W1345 buildIssue helper', () => {
  test('omits diagnostics + expression when absent', () => {
    const issue = buildIssue('warning', 'value');
    expect(issue).toEqual({ severity: 'warning', code: 'value' });
  });

  test('wraps expression in an array', () => {
    const issue = buildIssue('error', 'structure', 'd', 'Patient.name');
    expect(issue).toEqual({
      severity: 'error',
      code: 'structure',
      diagnostics: 'd',
      expression: ['Patient.name'],
    });
  });
});

describe('W1345 contract surface', () => {
  test('ISSUE_SEVERITIES is the frozen FHIR R4 value-set', () => {
    expect(ISSUE_SEVERITIES).toEqual(['fatal', 'error', 'warning', 'information']);
    expect(Object.isFrozen(ISSUE_SEVERITIES)).toBe(true);
  });

  test('ISSUE_TYPE_CODES is frozen and includes the defaults used', () => {
    expect(Object.isFrozen(ISSUE_TYPE_CODES)).toBe(true);
    expect(ISSUE_TYPE_CODES).toEqual(expect.arrayContaining(['structure', 'informational']));
  });

  test('default severity + code are members of their value-sets', () => {
    const oo = buildOperationOutcome({ errors: ['X.y missing'] });
    expect(ISSUE_SEVERITIES).toContain(oo.issue[0].severity);
    expect(ISSUE_TYPE_CODES).toContain(oo.issue[0].code);
  });

  test('isPresent helper', () => {
    expect(isPresent('')).toBe(false);
    expect(isPresent(null)).toBe(false);
    expect(isPresent(undefined)).toBe(false);
    expect(isPresent(0)).toBe(true);
    expect(isPresent('x')).toBe(true);
  });
});

describe('W1345 purity', () => {
  test('does not mutate the input result', () => {
    const result = { valid: false, errors: ['Patient.x missing'] };
    const snapshot = JSON.stringify(result);
    buildOperationOutcome(result);
    expect(JSON.stringify(result)).toBe(snapshot);
  });

  test('output is a plain object', () => {
    const oo = buildOperationOutcome({ errors: [] });
    expect(Object.getPrototypeOf(oo)).toBe(Object.prototype);
  });

  test('deterministic for identical input', () => {
    const r = { errors: ['CarePlan.intent is required (1..1) but missing'] };
    expect(buildOperationOutcome(r)).toEqual(buildOperationOutcome(r));
  });
});

describe('W1345 end-to-end: mapper → validator → OperationOutcome', () => {
  test('a valid Patient yields an information OperationOutcome', () => {
    const patient = beneficiaryToFhirPatient({
      beneficiaryId: 'B1',
      nationalId: '1234567890',
      firstName: 'Sara',
      lastName: 'Ali',
      status: 'active',
    });
    const oo = buildOperationOutcome(validateFhirResource(patient));
    expect(oo.issue).toHaveLength(1);
    expect(oo.issue[0].severity).toBe('information');
  });

  test('a deliberately-broken resource yields error issues with expressions', () => {
    const broken = { resourceType: 'EpisodeOfCare' }; // missing status + patient
    const result = validateFhirResource(broken);
    expect(result.valid).toBe(false);
    const oo = buildOperationOutcome(result);
    expect(oo.issue.length).toBe(result.errors.length);
    expect(oo.issue.every(i => i.severity === 'error')).toBe(true);
    expect(oo.issue.map(i => i.expression && i.expression[0])).toEqual(
      expect.arrayContaining(['EpisodeOfCare.status', 'EpisodeOfCare.patient'])
    );
  });

  test('a bundle validation result serializes with Bundle FHIRPaths', () => {
    const goodPatient = beneficiaryToFhirPatient({
      beneficiaryId: 'B1',
      nationalId: '1234567890',
      firstName: 'Sara',
      lastName: 'Ali',
      status: 'active',
    });
    const badEpisode = { resourceType: 'EpisodeOfCare' };
    const bundle = buildFhirBundle([goodPatient, badEpisode], { type: 'collection' });
    const result = validateFhirBundle(bundle);
    expect(result.valid).toBe(false);
    const oo = buildOperationOutcome(result);
    expect(oo.issue.every(i => i.severity === 'error')).toBe(true);
    const exprs = oo.issue.map(i => i.expression && i.expression[0]).filter(Boolean);
    expect(exprs.some(e => e.startsWith('Bundle.entry['))).toBe(true);
  });
});
