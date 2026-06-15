'use strict';
/**
 * W1323 — CommunicationAidProfile → FHIR R4 Observation mapper.
 *
 * Asserts the canonical AAC profile projects onto a valid base Observation:
 * lifecycle→status value-set, FIXED communication-aid-profile code discriminator,
 * vocabularyLevel as the headline valueCodeableConcept, the aided tool inventory
 * + active modalities + trained partners carried losslessly as extensions, and
 * that FULL and MINIMAL canonical fixtures round-trip through the canonical Zod
 * schema.
 */

const { canonical } = require('../intelligence/canonical');
const {
  communicationAidProfileToFhir,
  toFhirDate,
  toFhirDateTime,
  toFhirStatus,
  buildCode,
  buildValue,
  buildComponents,
  buildToolExtension,
  buildExtensions,
  STATUS_MAP,
  ORG_FHIR_BASE,
  AAC_CODE_SYSTEM,
  AAC_CODE,
  AAC_VOCAB_SYSTEM,
  AAC_MODALITY_SYSTEM,
  AAC_LIFECYCLE_EXTENSION_URL,
  AAC_MODALITY_EXTENSION_URL,
  AAC_TOOL_EXTENSION_URL,
  AAC_TRAINED_PARTNER_EXTENSION_URL,
  AAC_HOME_USE_EXTENSION_URL,
  AAC_DISCIPLINE_EXTENSION_URL,
  AAC_REASSESSMENT_EXTENSION_URL,
  AAC_BRANCH_EXTENSION_URL,
  AAC_CARE_PLAN_EXTENSION_URL,
} = require('../intelligence/fhir/communication-aid-profile-to-fhir.lib');

const FULL = Object.freeze({
  _id: '64f0000000000000000000ff',
  beneficiaryId: '64a1111111111111111111aa',
  branchId: '64b2222222222222222222bb',
  carePlanVersionId: '64d4444444444444444444dd',
  primaryModality: 'high_tech_aided',
  activeModalities: ['high_tech_aided', 'low_tech_aided'],
  activeTools: [
    {
      name: 'Proloquo2Go',
      tier: 'high_tech_aided',
      modalityKey: 'aac_app',
      symbolSet: 'SymbolStix',
      introducedAt: '2026-01-15T08:00:00.000Z',
      independenceLevel: 'verbal_prompt',
      isActive: true,
    },
    {
      name: 'PECS book',
      tier: 'low_tech_aided',
      modalityKey: 'pecs',
      introducedAt: '2025-11-01T08:00:00.000Z',
    },
  ],
  vocabularyLevel: 'multi_word',
  estimatedActiveVocabularyCount: 120,
  trainedPartners: ['mother', 'classroom aide'],
  usedAtHome: true,
  assessedBy: '64c3333333333333333333cc',
  assessedByDiscipline: 'speech_language_pathologist',
  assessedAt: '2026-02-01T09:00:00.000Z',
  nextReassessmentDue: '2026-08-01T09:00:00.000Z',
  lifecycleStatus: 'active',
});

const MINIMAL = Object.freeze({
  beneficiaryId: '64a1111111111111111111aa',
  vocabularyLevel: 'single_word',
  lifecycleStatus: 'active',
});

const RETIRED = Object.freeze({
  beneficiaryId: '64a1111111111111111111aa',
  vocabularyLevel: 'pre_symbolic',
  lifecycleStatus: 'retired',
});

describe('W1323 CommunicationAidProfile → FHIR Observation — canonical round-trip', () => {
  it('FULL fixture passes the canonical schema', () => {
    expect(canonical.CommunicationAidProfile.safeParse(FULL).success).toBe(true);
  });
  it('MINIMAL fixture passes the canonical schema', () => {
    expect(canonical.CommunicationAidProfile.safeParse(MINIMAL).success).toBe(true);
  });
  it('RETIRED fixture passes the canonical schema', () => {
    expect(canonical.CommunicationAidProfile.safeParse(RETIRED).success).toBe(true);
  });
});

describe('W1323 resource shape', () => {
  const r = communicationAidProfileToFhir(FULL);

  it('is an Observation', () => {
    expect(r.resourceType).toBe('Observation');
  });
  it('carries the _id as id', () => {
    expect(r.id).toBe('64f0000000000000000000ff');
  });
  it('subject references the beneficiary', () => {
    expect(r.subject).toEqual({ reference: 'Patient/64a1111111111111111111aa' });
  });
  it('performer references the assessor', () => {
    expect(r.performer).toEqual([{ reference: 'Practitioner/64c3333333333333333333cc' }]);
  });
  it('effectiveDateTime is assessedAt (full ISO)', () => {
    expect(r.effectiveDateTime).toBe('2026-02-01T09:00:00.000Z');
  });
  it('output is a plain object', () => {
    expect(Object.getPrototypeOf(r)).toBe(Object.prototype);
  });
  it('does not mutate the input', () => {
    const copy = JSON.parse(JSON.stringify(FULL));
    communicationAidProfileToFhir(FULL);
    expect(FULL).toEqual(copy);
  });
});

describe('W1323 code discriminator', () => {
  const cc = buildCode(FULL);

  it('is the FIXED communication-aid-profile coding', () => {
    expect(cc.coding[0]).toEqual({ system: AAC_CODE_SYSTEM, code: AAC_CODE });
  });
  it('AAC_CODE is communication-aid-profile', () => {
    expect(AAC_CODE).toBe('communication-aid-profile');
  });
  it('carries the primary modality as code text', () => {
    expect(cc.text).toBe('high_tech_aided');
  });
  it('omits text when no primary modality', () => {
    expect(buildCode(MINIMAL).text).toBeUndefined();
  });
});

describe('W1323 headline value', () => {
  it('valueCodeableConcept is the vocabulary level', () => {
    const r = communicationAidProfileToFhir(FULL);
    expect(r.valueCodeableConcept).toEqual({
      coding: [{ system: AAC_VOCAB_SYSTEM, code: 'multi_word' }],
      text: 'multi_word',
    });
  });
  it('buildValue is undefined without a vocabulary level', () => {
    expect(buildValue({})).toBeUndefined();
  });
});

describe('W1323 status mapping', () => {
  it('maps the 4-state profile lifecycle onto Observation status', () => {
    expect(toFhirStatus('draft')).toBe('registered');
    expect(toFhirStatus('active')).toBe('final');
    expect(toFhirStatus('paused')).toBe('preliminary');
    expect(toFhirStatus('retired')).toBe('cancelled');
  });
  it('unknown / absent lifecycle collapses to unknown', () => {
    expect(toFhirStatus('archived')).toBe('unknown');
    expect(toFhirStatus(undefined)).toBe('unknown');
  });
  it('STATUS_MAP is frozen', () => {
    expect(Object.isFrozen(STATUS_MAP)).toBe(true);
  });
});

describe('W1323 components', () => {
  const comps = buildComponents(FULL);

  it('emits a primary-modality + active-vocabulary-count component', () => {
    expect(comps).toHaveLength(2);
  });
  it('primary-modality component carries the modality coding', () => {
    expect(comps[0].valueCodeableConcept.coding[0]).toEqual({
      system: AAC_MODALITY_SYSTEM,
      code: 'high_tech_aided',
    });
  });
  it('active-vocabulary-count is a UCUM word quantity', () => {
    expect(comps[1].valueQuantity).toEqual({
      value: 120,
      unit: 'words',
      system: 'http://unitsofmeasure.org',
      code: '{words}',
    });
  });
  it('emits a zero count component (Number.isInteger, not truthiness)', () => {
    const comps0 = buildComponents({ estimatedActiveVocabularyCount: 0 });
    expect(comps0).toHaveLength(1);
    expect(comps0[0].valueQuantity.value).toBe(0);
  });
  it('is undefined when there are no components', () => {
    expect(buildComponents(MINIMAL)).toBeUndefined();
  });
});

describe('W1323 tool extension', () => {
  const te = buildToolExtension(FULL.activeTools[0]);

  it('is a nested extension on the namespaced URL', () => {
    expect(te.url).toBe(AAC_TOOL_EXTENSION_URL);
    expect(Array.isArray(te.extension)).toBe(true);
  });
  it('carries name + tier + modalityKey + symbolSet + independenceLevel + introducedAt + isActive', () => {
    const byUrl = Object.fromEntries(te.extension.map(e => [e.url, e]));
    expect(byUrl.name.valueString).toBe('Proloquo2Go');
    expect(byUrl.tier.valueCode).toBe('high_tech_aided');
    expect(byUrl.modalityKey.valueString).toBe('aac_app');
    expect(byUrl.symbolSet.valueString).toBe('SymbolStix');
    expect(byUrl.independenceLevel.valueCode).toBe('verbal_prompt');
    expect(byUrl.introducedAt.valueDate).toBe('2026-01-15');
    expect(byUrl.isActive.valueBoolean).toBe(true);
  });
  it('omits optional parts for a sparse tool', () => {
    const sparse = buildToolExtension(FULL.activeTools[1]);
    const byUrl = Object.fromEntries(sparse.extension.map(e => [e.url, e]));
    expect(byUrl.name.valueString).toBe('PECS book');
    expect(byUrl.symbolSet).toBeUndefined();
    expect(byUrl.independenceLevel).toBeUndefined();
    expect(byUrl.isActive).toBeUndefined();
  });
  it('is undefined for a nameless / malformed tool', () => {
    expect(buildToolExtension(null)).toBeUndefined();
    expect(buildToolExtension({ tier: 'unaided' })).toBeUndefined();
  });
});

describe('W1323 extensions', () => {
  const ext = buildExtensions(FULL);
  const all = url => ext.filter(e => e.url === url);
  const one = url => ext.find(e => e.url === url);

  it('carries the raw lifecycle status', () => {
    expect(one(AAC_LIFECYCLE_EXTENSION_URL).valueCode).toBe('active');
  });
  it('carries one extension per active modality', () => {
    expect(all(AAC_MODALITY_EXTENSION_URL).map(e => e.valueCode)).toEqual([
      'high_tech_aided',
      'low_tech_aided',
    ]);
  });
  it('carries one nested extension per active tool', () => {
    expect(all(AAC_TOOL_EXTENSION_URL)).toHaveLength(2);
  });
  it('carries one extension per trained partner', () => {
    expect(all(AAC_TRAINED_PARTNER_EXTENSION_URL).map(e => e.valueString)).toEqual([
      'mother',
      'classroom aide',
    ]);
  });
  it('carries the home-use flag', () => {
    expect(one(AAC_HOME_USE_EXTENSION_URL).valueBoolean).toBe(true);
  });
  it('carries the assessor discipline', () => {
    expect(one(AAC_DISCIPLINE_EXTENSION_URL).valueCode).toBe('speech_language_pathologist');
  });
  it('carries the next reassessment date', () => {
    expect(one(AAC_REASSESSMENT_EXTENSION_URL).valueDate).toBe('2026-08-01');
  });
  it('carries the branch as an Organization reference', () => {
    expect(one(AAC_BRANCH_EXTENSION_URL).valueReference).toEqual({
      reference: 'Organization/64b2222222222222222222bb',
    });
  });
  it('carries the linked care plan as a CarePlan reference', () => {
    expect(one(AAC_CARE_PLAN_EXTENSION_URL).valueReference).toEqual({
      reference: 'CarePlan/64d4444444444444444444dd',
    });
  });
});

describe('W1323 minimal resource', () => {
  const r = communicationAidProfileToFhir(MINIMAL);

  it('emits the mandatory base elements', () => {
    expect(r.resourceType).toBe('Observation');
    expect(r.status).toBe('final');
    expect(r.code.coding[0].code).toBe('communication-aid-profile');
    expect(r.subject).toEqual({ reference: 'Patient/64a1111111111111111111aa' });
    expect(r.valueCodeableConcept.text).toBe('single_word');
  });
  it('omits effectiveDateTime / performer / component', () => {
    expect(r.effectiveDateTime).toBeUndefined();
    expect(r.performer).toBeUndefined();
    expect(r.component).toBeUndefined();
  });
  it('carries only the lifecycle extension', () => {
    expect(r.extension).toHaveLength(1);
    expect(r.extension[0].url).toBe(AAC_LIFECYCLE_EXTENSION_URL);
    expect(r.extension[0].valueCode).toBe('active');
  });
});

describe('W1323 retired profile', () => {
  it('maps status to cancelled', () => {
    expect(communicationAidProfileToFhir(RETIRED).status).toBe('cancelled');
  });
});

describe('W1323 guards', () => {
  it('throws when profile is missing', () => {
    expect(() => communicationAidProfileToFhir(null)).toThrow(TypeError);
  });
  it('throws when beneficiaryId is missing', () => {
    expect(() =>
      communicationAidProfileToFhir({ vocabularyLevel: 'single_word', lifecycleStatus: 'active' })
    ).toThrow(/beneficiaryId/);
  });
  it('throws when vocabularyLevel is missing', () => {
    expect(() =>
      communicationAidProfileToFhir({
        beneficiaryId: '64a1111111111111111111aa',
        lifecycleStatus: 'active',
      })
    ).toThrow(/vocabularyLevel/);
  });
});

describe('W1323 helpers', () => {
  it('toFhirDate yields YYYY-MM-DD; toFhirDateTime yields full ISO', () => {
    expect(toFhirDate('2026-02-01T09:00:00.000Z')).toBe('2026-02-01');
    expect(toFhirDateTime('2026-02-01T09:00:00.000Z')).toBe('2026-02-01T09:00:00.000Z');
  });
  it('both reject garbage / absent input', () => {
    expect(toFhirDate('nope')).toBeUndefined();
    expect(toFhirDateTime(undefined)).toBeUndefined();
  });
  it('ORG_FHIR_BASE is the org canonical base', () => {
    expect(ORG_FHIR_BASE).toBe('https://alawael.sa/fhir');
  });
});
