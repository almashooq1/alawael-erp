'use strict';
/**
 * W1321 — BeneficiaryDietPrescription → FHIR R4 NutritionOrder mapper.
 *
 * Asserts the canonical projection is structurally a valid base NutritionOrder,
 * losslessly carries the IDDSI / NPO / enteral / allergen detail, and that both
 * FULL and MINIMAL canonical fixtures round-trip through the canonical Zod
 * schema (so the test inputs cannot silently drift from the real model).
 */

const { canonical } = require('../intelligence/canonical');
const {
  beneficiaryDietPrescriptionToFhir,
  toFhirDateTime,
  toFhirStatus,
  buildOralDiet,
  buildEnteralFormula,
  buildExcludeFoodModifier,
  buildFoodPreferenceModifier,
  buildEnteralDetailExtension,
  buildExtensions,
  RX_STATUS,
  ORG_FHIR_BASE,
  IDDSI_FOOD_SYSTEM,
  IDDSI_DRINK_SYSTEM,
  DIET_STATUS_EXTENSION_URL,
  DIET_NPO_EXTENSION_URL,
  DIET_ENTERAL_DETAIL_EXTENSION_URL,
  DIET_BRANCH_EXTENSION_URL,
  DIET_CARE_PLAN_EXTENSION_URL,
} = require('../intelligence/fhir/beneficiary-diet-prescription-to-fhir.lib');

const FULL = Object.freeze({
  _id: '64f0000000000000000000ff',
  beneficiaryId: '64a1111111111111111111aa',
  branchId: '64b2222222222222222222bb',
  foodIddsiLevel: 5,
  drinkIddsiLevel: 2,
  textureRestrictions: ['no_hard_chunks', 'no_dry_crumbly'],
  chewingAbility: 'limited',
  npo: false,
  allergensToAvoid: ['gluten', 'nuts'],
  dietaryRestrictions: ['halal_only'],
  foodPreferences: ['rice', 'yogurt'],
  targetCaloriesPerDay: 1400,
  targetProteinGramsPerDay: 45,
  fluidRestrictionMlPerDay: 1200,
  enteralFeeding: {
    active: true,
    route: 'gt',
    deliveryMode: 'continuous',
    formulaName: 'PediaSure 1.5',
    ratePerHour: 60,
    flushVolumeMl: 30,
    flushFrequency: 'q4h',
  },
  feedingAssistanceLevel: 'partial_assist',
  positioningNotes: 'Upright 90deg, chin tuck during feeding',
  prescribedBy: '64c3333333333333333333cc',
  prescriberDiscipline: 'speech_language_pathologist',
  prescribedAt: '2026-02-01T08:00:00.000Z',
  nextReviewDue: '2026-05-01T08:00:00.000Z',
  status: 'active',
  linkedCarePlanVersionId: '64d4444444444444444444dd',
});

const MINIMAL = Object.freeze({
  beneficiaryId: '64a1111111111111111111aa',
  status: 'draft',
});

const NPO = Object.freeze({
  beneficiaryId: '64a1111111111111111111aa',
  status: 'on_hold',
  npo: true,
  npoReason: 'Pre-operative fasting',
  npoStartedAt: '2026-02-10T22:00:00.000Z',
  npoExpectedEndAt: '2026-02-11T12:00:00.000Z',
  foodIddsiLevel: 6,
});

describe('W1321 BeneficiaryDietPrescription → FHIR NutritionOrder — canonical round-trip', () => {
  it('FULL fixture passes the canonical schema', () => {
    expect(canonical.BeneficiaryDietPrescription.safeParse(FULL).success).toBe(true);
  });
  it('MINIMAL fixture passes the canonical schema', () => {
    expect(canonical.BeneficiaryDietPrescription.safeParse(MINIMAL).success).toBe(true);
  });
  it('NPO fixture passes the canonical schema', () => {
    expect(canonical.BeneficiaryDietPrescription.safeParse(NPO).success).toBe(true);
  });
});

describe('W1321 resource shape', () => {
  const r = beneficiaryDietPrescriptionToFhir(FULL);

  it('is a NutritionOrder', () => {
    expect(r.resourceType).toBe('NutritionOrder');
  });
  it('carries the _id as id', () => {
    expect(r.id).toBe('64f0000000000000000000ff');
  });
  it('intent is the fixed order', () => {
    expect(r.intent).toBe('order');
  });
  it('patient references the beneficiary', () => {
    expect(r.patient).toEqual({ reference: 'Patient/64a1111111111111111111aa' });
  });
  it('dateTime is the prescribedAt instant', () => {
    expect(r.dateTime).toBe('2026-02-01T08:00:00.000Z');
  });
  it('orderer references the prescriber', () => {
    expect(r.orderer).toEqual({ reference: 'Practitioner/64c3333333333333333333cc' });
  });
  it('output is a plain object', () => {
    expect(Object.getPrototypeOf(r)).toBe(Object.prototype);
  });
  it('does not mutate the input', () => {
    const copy = JSON.parse(JSON.stringify(FULL));
    beneficiaryDietPrescriptionToFhir(FULL);
    expect(FULL).toEqual(copy);
  });
});

describe('W1321 status mapping', () => {
  it('maps the 4-state Rx lifecycle', () => {
    expect(toFhirStatus('draft')).toBe('draft');
    expect(toFhirStatus('active')).toBe('active');
    expect(toFhirStatus('on_hold')).toBe('on-hold');
    expect(toFhirStatus('discontinued')).toBe('revoked');
  });
  it('unknown status collapses to unknown', () => {
    expect(toFhirStatus('frozen')).toBe('unknown');
    expect(toFhirStatus(undefined)).toBe('unknown');
  });
  it('RX_STATUS is frozen', () => {
    expect(Object.isFrozen(RX_STATUS)).toBe(true);
  });
});

describe('W1321 oralDiet', () => {
  const oral = buildOralDiet(FULL);

  it('carries the IDDSI food level as a texture modifier', () => {
    expect(oral.texture[0].modifier.coding[0]).toEqual({
      system: IDDSI_FOOD_SYSTEM,
      code: '5',
    });
  });
  it('carries the IDDSI drink level as a fluidConsistencyType', () => {
    expect(oral.fluidConsistencyType[0].coding[0]).toEqual({
      system: IDDSI_DRINK_SYSTEM,
      code: '2',
    });
  });
  it('carries texture restrictions as type[]', () => {
    expect(oral.type).toHaveLength(2);
    expect(oral.type[0].text).toBe('no_hard_chunks');
  });
  it('carries positioning notes as instruction', () => {
    expect(oral.instruction).toBe('Upright 90deg, chin tuck during feeding');
  });
  it('IDDSI level 0 is emitted (not dropped as falsy)', () => {
    const oral0 = buildOralDiet({ beneficiaryId: 'x', status: 'active', foodIddsiLevel: 0 });
    expect(oral0.texture[0].modifier.coding[0].code).toBe('0');
  });
  it('is omitted entirely when NPO is in force', () => {
    expect(buildOralDiet(NPO)).toBeUndefined();
  });
  it('is omitted when there is nothing oral to describe', () => {
    expect(buildOralDiet(MINIMAL)).toBeUndefined();
  });
});

describe('W1321 enteralFormula', () => {
  const ef = buildEnteralFormula(FULL);

  it('carries the product name', () => {
    expect(ef.baseFormulaProductName).toBe('PediaSure 1.5');
  });
  it('carries the administration rate as a UCUM quantity', () => {
    expect(ef.administration[0].rateQuantity).toEqual({
      value: 60,
      unit: 'mL/h',
      system: 'http://unitsofmeasure.org',
      code: 'mL/h',
    });
  });
  it('carries route + delivery in the administrationInstruction', () => {
    expect(ef.administrationInstruction).toBe('route=gt; delivery=continuous');
  });
  it('is undefined when enteral feeding is inactive', () => {
    expect(buildEnteralFormula({ enteralFeeding: { active: false } })).toBeUndefined();
    expect(buildEnteralFormula(MINIMAL)).toBeUndefined();
  });
});

describe('W1321 food modifiers', () => {
  it('excludeFoodModifier carries allergens + dietary restrictions', () => {
    const ex = buildExcludeFoodModifier(FULL);
    expect(ex).toHaveLength(3);
    expect(ex.map(c => c.text)).toEqual(['gluten', 'nuts', 'halal_only']);
  });
  it('foodPreferenceModifier carries preferences', () => {
    const pref = buildFoodPreferenceModifier(FULL);
    expect(pref).toHaveLength(2);
    expect(pref[1].text).toBe('yogurt');
  });
  it('both are undefined when absent', () => {
    expect(buildExcludeFoodModifier(MINIMAL)).toBeUndefined();
    expect(buildFoodPreferenceModifier(MINIMAL)).toBeUndefined();
  });
});

describe('W1321 enteral-detail extension', () => {
  const detail = buildEnteralDetailExtension(FULL);

  it('is a nested extension on the namespaced URL', () => {
    expect(detail.url).toBe(DIET_ENTERAL_DETAIL_EXTENSION_URL);
    expect(Array.isArray(detail.extension)).toBe(true);
  });
  it('carries route + delivery + flush parameters', () => {
    const byUrl = Object.fromEntries(detail.extension.map(e => [e.url, e]));
    expect(byUrl.route.valueCode).toBe('gt');
    expect(byUrl.deliveryMode.valueCode).toBe('continuous');
    expect(byUrl.flushVolumeMl.valueDecimal).toBe(30);
    expect(byUrl.flushFrequency.valueString).toBe('q4h');
  });
  it('is undefined when enteral feeding is inactive', () => {
    expect(buildEnteralDetailExtension(MINIMAL)).toBeUndefined();
  });
});

describe('W1321 extensions', () => {
  const ext = buildExtensions(FULL);
  const byUrl = url => ext.find(e => e.url === url);

  it('carries the lossless original status', () => {
    expect(byUrl(DIET_STATUS_EXTENSION_URL).valueCode).toBe('active');
  });
  it('carries caloric / protein / fluid targets', () => {
    const cal = ext.find(e => e.url.endsWith('diet-target-calories'));
    const protein = ext.find(e => e.url.endsWith('diet-target-protein'));
    const fluid = ext.find(e => e.url.endsWith('diet-fluid-restriction'));
    expect(cal.valueDecimal).toBe(1400);
    expect(protein.valueDecimal).toBe(45);
    expect(fluid.valueDecimal).toBe(1200);
  });
  it('carries chewing / feeding-assistance / prescriber-discipline codes', () => {
    expect(ext.find(e => e.url.endsWith('diet-chewing-ability')).valueCode).toBe('limited');
    expect(ext.find(e => e.url.endsWith('diet-feeding-assistance')).valueCode).toBe(
      'partial_assist'
    );
    expect(ext.find(e => e.url.endsWith('diet-prescriber-discipline')).valueCode).toBe(
      'speech_language_pathologist'
    );
  });
  it('carries the next-review-due instant', () => {
    expect(ext.find(e => e.url.endsWith('diet-next-review-due')).valueDateTime).toBe(
      '2026-05-01T08:00:00.000Z'
    );
  });
  it('carries the branch as an Organization reference', () => {
    expect(byUrl(DIET_BRANCH_EXTENSION_URL).valueReference).toEqual({
      reference: 'Organization/64b2222222222222222222bb',
    });
  });
  it('carries the linked care plan as a CarePlan reference', () => {
    expect(byUrl(DIET_CARE_PLAN_EXTENSION_URL).valueReference).toEqual({
      reference: 'CarePlan/64d4444444444444444444dd',
    });
  });
});

describe('W1321 NPO handling', () => {
  const r = beneficiaryDietPrescriptionToFhir(NPO);

  it('has no oralDiet when NPO', () => {
    expect(r.oralDiet).toBeUndefined();
  });
  it('carries the NPO extension nested block', () => {
    const npoExt = r.extension.find(e => e.url === DIET_NPO_EXTENSION_URL);
    const byUrl = Object.fromEntries(npoExt.extension.map(e => [e.url, e]));
    expect(byUrl.npo.valueBoolean).toBe(true);
    expect(byUrl.reason.valueString).toBe('Pre-operative fasting');
    expect(byUrl.startedAt.valueDateTime).toBe('2026-02-10T22:00:00.000Z');
    expect(byUrl.expectedEndAt.valueDateTime).toBe('2026-02-11T12:00:00.000Z');
  });
});

describe('W1321 minimal resource', () => {
  const r = beneficiaryDietPrescriptionToFhir(MINIMAL);

  it('emits the mandatory base elements', () => {
    expect(r.resourceType).toBe('NutritionOrder');
    expect(r.status).toBe('draft');
    expect(r.intent).toBe('order');
    expect(r.patient).toEqual({ reference: 'Patient/64a1111111111111111111aa' });
  });
  it('omits dateTime / orderer / oralDiet / enteralFormula', () => {
    expect(r.dateTime).toBeUndefined();
    expect(r.orderer).toBeUndefined();
    expect(r.oralDiet).toBeUndefined();
    expect(r.enteralFormula).toBeUndefined();
  });
  it('carries only the status extension', () => {
    expect(r.extension).toHaveLength(1);
    expect(r.extension[0].url).toBe(DIET_STATUS_EXTENSION_URL);
    expect(r.extension[0].valueCode).toBe('draft');
  });
});

describe('W1321 guards', () => {
  it('throws when rx is missing', () => {
    expect(() => beneficiaryDietPrescriptionToFhir(null)).toThrow(TypeError);
  });
  it('throws when beneficiaryId is missing', () => {
    expect(() => beneficiaryDietPrescriptionToFhir({ status: 'active' })).toThrow(/beneficiaryId/);
  });
});

describe('W1321 helpers', () => {
  it('toFhirDateTime normalizes loose dates and rejects garbage', () => {
    expect(toFhirDateTime('2026-02-01')).toBe('2026-02-01T00:00:00.000Z');
    expect(toFhirDateTime('not-a-date')).toBeUndefined();
    expect(toFhirDateTime(undefined)).toBeUndefined();
  });
  it('ORG_FHIR_BASE is the org canonical base', () => {
    expect(ORG_FHIR_BASE).toBe('https://alawael.sa/fhir');
  });
});
