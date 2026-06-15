'use strict';
/**
 * BeneficiaryDietPrescription → FHIR R4 NutritionOrder mapper.
 *
 * WHY (Item 10, GAPS_ASSESSMENT_2026-06-15): twelfth FHIR resource mapper. A
 * diet prescription is the canonical "one per-beneficiary clinical diet order"
 * (intelligence/canonical/schemas/beneficiary-diet-prescription.canonical.js,
 * Clinical Diet Orders module, W368 — IDDSI dysphagia texture/fluid levels +
 * NPO + enteral feeding + allergens). FHIR models a diet/feeding order as a
 * NutritionOrder resource, which is the exact base projection.
 *
 * SCOPE (additive, non-breaking): base FHIR R4 NutritionOrder only. Pure
 * function: no DB, no I/O, no mongoose. No KSA NPHIES profile binding is forced
 * (callers may post-process `meta.profile`).
 *
 * STANDARDS:
 *   - status maps the 4-state Rx lifecycle onto the FHIR NutritionOrder.status
 *     value-set (draft | active | on-hold | revoked | completed |
 *     entered-in-error | unknown): draft → draft, active → active, on_hold →
 *     on-hold, discontinued → revoked. The original status is also preserved
 *     losslessly in an extension.
 *   - intent = 'order' (FIXED) — a prescribed clinical diet is an order.
 *   - patient = the beneficiary (mandatory; NutritionOrder.patient is 1..1).
 *   - dateTime = the prescribedAt instant when present (NutritionOrder.dateTime
 *     records when the order was placed).
 *   - orderer = the prescribing clinician.
 *   - oralDiet carries the IDDSI food texture levels + drink fluid-consistency
 *     levels + texture restrictions + feeding instruction (skipped entirely
 *     when NPO is in force).
 *   - enteralFormula carries the enteral feeding regimen when active.
 *   - excludeFoodModifier carries allergens + dietary restrictions;
 *     foodPreferenceModifier carries food preferences.
 *   - NPO, caloric/protein/fluid targets, chewing ability, feeding-assistance
 *     level, prescriber discipline, review schedule, enteral fine-grained
 *     parameters, branch and the linked care-plan are all carried as namespaced
 *     extensions so nothing in the canonical record is lost.
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';
const IDDSI_FOOD_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/iddsi-food-level`;
const IDDSI_DRINK_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/iddsi-drink-level`;
const DIET_TEXTURE_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/diet-texture-restriction`;
const DIET_ALLERGEN_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/diet-allergen`;
const DIET_RESTRICTION_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/diet-restriction`;
const DIET_PREFERENCE_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/diet-preference`;
const DIET_STATUS_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/diet-status`;
const DIET_NPO_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/diet-npo`;
const DIET_CHEWING_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/diet-chewing-ability`;
const DIET_TARGET_CALORIES_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/diet-target-calories`;
const DIET_TARGET_PROTEIN_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/diet-target-protein`;
const DIET_FLUID_RESTRICTION_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/diet-fluid-restriction`;
const DIET_FEEDING_ASSIST_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/diet-feeding-assistance`;
const DIET_PRESCRIBER_DISCIPLINE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/diet-prescriber-discipline`;
const DIET_NEXT_REVIEW_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/diet-next-review-due`;
const DIET_DISCONTINUATION_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/diet-discontinuation-reason`;
const DIET_ENTERAL_DETAIL_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/diet-enteral-detail`;
const DIET_BRANCH_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/diet-branch`;
const DIET_CARE_PLAN_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/diet-linked-care-plan`;

/**
 * Canonical 4-state Rx lifecycle → FHIR NutritionOrder.status value-set
 * (draft | active | on-hold | revoked | completed | entered-in-error |
 * unknown). The original status is preserved losslessly in an extension.
 * @type {Record<string,string>}
 */
const RX_STATUS = Object.freeze({
  draft: 'draft',
  active: 'active',
  on_hold: 'on-hold',
  discontinued: 'revoked',
});

/**
 * Coerce a Date or loose date string into a FHIR `dateTime` (full ISO) so the
 * exact instant is preserved.
 * @param {Date|string|undefined} value
 * @returns {string|undefined}
 */
function toFhirDateTime(value) {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

/**
 * Map the canonical Rx status onto the FHIR NutritionOrder.status value-set.
 * @param {string|undefined} status
 * @returns {string}
 */
function toFhirStatus(status) {
  return RX_STATUS[status] || 'unknown';
}

/**
 * Build the NutritionOrder.oralDiet element from the IDDSI levels + texture
 * restrictions + feeding instruction. Returns undefined when NPO is in force or
 * there is nothing oral to describe.
 * @param {object} rx diet prescription
 * @returns {object|undefined}
 */
function buildOralDiet(rx) {
  if (rx.npo === true) return undefined;
  /** @type {Record<string, any>} */
  const oralDiet = {};

  if (Number.isInteger(rx.foodIddsiLevel)) {
    oralDiet.texture = [
      {
        modifier: {
          coding: [
            {
              system: IDDSI_FOOD_SYSTEM,
              code: String(rx.foodIddsiLevel),
            },
          ],
        },
      },
    ];
  }

  if (Number.isInteger(rx.drinkIddsiLevel)) {
    oralDiet.fluidConsistencyType = [
      {
        coding: [
          {
            system: IDDSI_DRINK_SYSTEM,
            code: String(rx.drinkIddsiLevel),
          },
        ],
      },
    ];
  }

  if (Array.isArray(rx.textureRestrictions) && rx.textureRestrictions.length) {
    oralDiet.type = rx.textureRestrictions.map(t => ({
      coding: [{ system: DIET_TEXTURE_SYSTEM, code: String(t) }],
      text: String(t),
    }));
  }

  const instruction = rx.positioningNotes;
  if (instruction) oralDiet.instruction = String(instruction);

  return Object.keys(oralDiet).length ? oralDiet : undefined;
}

/**
 * Build the NutritionOrder.enteralFormula element when enteral feeding is
 * active. The native FHIR slots carry product name + administration rate +
 * max volume; fine-grained route/delivery/flush/bolus parameters are carried in
 * a namespaced extension (see buildEnteralDetailExtension).
 * @param {object} rx diet prescription
 * @returns {object|undefined}
 */
function buildEnteralFormula(rx) {
  const ef = rx.enteralFeeding;
  if (!ef || typeof ef !== 'object' || ef.active !== true) return undefined;
  /** @type {Record<string, any>} */
  const formula = {};

  if (ef.formulaName) {
    formula.baseFormulaProductName = String(ef.formulaName);
  }

  /** @type {Record<string, any>} */
  const administration = {};
  if (typeof ef.ratePerHour === 'number') {
    administration.rateQuantity = {
      value: ef.ratePerHour,
      unit: 'mL/h',
      system: 'http://unitsofmeasure.org',
      code: 'mL/h',
    };
  }
  if (Object.keys(administration).length) {
    formula.administration = [administration];
  }

  const instructionParts = [];
  if (ef.route) instructionParts.push(`route=${ef.route}`);
  if (ef.deliveryMode) instructionParts.push(`delivery=${ef.deliveryMode}`);
  if (instructionParts.length) {
    formula.administrationInstruction = instructionParts.join('; ');
  }

  return Object.keys(formula).length ? formula : undefined;
}

/**
 * Build the NutritionOrder.excludeFoodModifier[] from allergens + dietary
 * restrictions (things the diet must avoid).
 * @param {object} rx diet prescription
 * @returns {Array<object>|undefined}
 */
function buildExcludeFoodModifier(rx) {
  const out = [];
  if (Array.isArray(rx.allergensToAvoid)) {
    for (const a of rx.allergensToAvoid) {
      out.push({
        coding: [{ system: DIET_ALLERGEN_SYSTEM, code: String(a) }],
        text: String(a),
      });
    }
  }
  if (Array.isArray(rx.dietaryRestrictions)) {
    for (const r of rx.dietaryRestrictions) {
      out.push({
        coding: [{ system: DIET_RESTRICTION_SYSTEM, code: String(r) }],
        text: String(r),
      });
    }
  }
  return out.length ? out : undefined;
}

/**
 * Build the NutritionOrder.foodPreferenceModifier[] from food preferences.
 * @param {object} rx diet prescription
 * @returns {Array<object>|undefined}
 */
function buildFoodPreferenceModifier(rx) {
  if (!Array.isArray(rx.foodPreferences) || !rx.foodPreferences.length) {
    return undefined;
  }
  return rx.foodPreferences.map(p => ({
    coding: [{ system: DIET_PREFERENCE_SYSTEM, code: String(p) }],
    text: String(p),
  }));
}

/**
 * Build a nested extension carrying the fine-grained enteral parameters that
 * have no native FHIR enteralFormula slot (delivery mode, flush + bolus
 * regimen). Returns undefined when enteral feeding is inactive/absent.
 * @param {object} rx diet prescription
 * @returns {object|undefined}
 */
function buildEnteralDetailExtension(rx) {
  const ef = rx.enteralFeeding;
  if (!ef || typeof ef !== 'object' || ef.active !== true) return undefined;
  const parts = [];
  if (ef.route) parts.push({ url: 'route', valueCode: ef.route });
  if (ef.deliveryMode) parts.push({ url: 'deliveryMode', valueCode: ef.deliveryMode });
  if (typeof ef.bolusVolumeMl === 'number') {
    parts.push({ url: 'bolusVolumeMl', valueDecimal: ef.bolusVolumeMl });
  }
  if (typeof ef.bolusFrequencyPerDay === 'number') {
    parts.push({ url: 'bolusFrequencyPerDay', valueDecimal: ef.bolusFrequencyPerDay });
  }
  if (typeof ef.flushVolumeMl === 'number') {
    parts.push({ url: 'flushVolumeMl', valueDecimal: ef.flushVolumeMl });
  }
  if (ef.flushFrequency) {
    parts.push({ url: 'flushFrequency', valueString: String(ef.flushFrequency) });
  }
  if (!parts.length) return undefined;
  return { url: DIET_ENTERAL_DETAIL_EXTENSION_URL, extension: parts };
}

/**
 * Build the namespaced extension[] (lossless carry of non-base fields).
 * @param {object} rx diet prescription
 * @returns {Array<object>}
 */
function buildExtensions(rx) {
  const ext = [];

  if (rx.status) {
    ext.push({ url: DIET_STATUS_EXTENSION_URL, valueCode: rx.status });
  }

  if (rx.npo === true || rx.npo === false) {
    const npoParts = [{ url: 'npo', valueBoolean: rx.npo }];
    if (rx.npoReason) npoParts.push({ url: 'reason', valueString: String(rx.npoReason) });
    const startedAt = toFhirDateTime(rx.npoStartedAt);
    if (startedAt) npoParts.push({ url: 'startedAt', valueDateTime: startedAt });
    const expectedEndAt = toFhirDateTime(rx.npoExpectedEndAt);
    if (expectedEndAt) npoParts.push({ url: 'expectedEndAt', valueDateTime: expectedEndAt });
    ext.push({ url: DIET_NPO_EXTENSION_URL, extension: npoParts });
  }

  if (rx.chewingAbility) {
    ext.push({ url: DIET_CHEWING_EXTENSION_URL, valueCode: rx.chewingAbility });
  }

  if (typeof rx.targetCaloriesPerDay === 'number') {
    ext.push({ url: DIET_TARGET_CALORIES_EXTENSION_URL, valueDecimal: rx.targetCaloriesPerDay });
  }
  if (typeof rx.targetProteinGramsPerDay === 'number') {
    ext.push({ url: DIET_TARGET_PROTEIN_EXTENSION_URL, valueDecimal: rx.targetProteinGramsPerDay });
  }
  if (typeof rx.fluidRestrictionMlPerDay === 'number') {
    ext.push({
      url: DIET_FLUID_RESTRICTION_EXTENSION_URL,
      valueDecimal: rx.fluidRestrictionMlPerDay,
    });
  }

  if (rx.feedingAssistanceLevel) {
    ext.push({ url: DIET_FEEDING_ASSIST_EXTENSION_URL, valueCode: rx.feedingAssistanceLevel });
  }

  if (rx.prescriberDiscipline) {
    ext.push({
      url: DIET_PRESCRIBER_DISCIPLINE_EXTENSION_URL,
      valueCode: rx.prescriberDiscipline,
    });
  }

  const nextReview = toFhirDateTime(rx.nextReviewDue);
  if (nextReview) {
    ext.push({ url: DIET_NEXT_REVIEW_EXTENSION_URL, valueDateTime: nextReview });
  }

  if (rx.discontinuationReason) {
    ext.push({
      url: DIET_DISCONTINUATION_EXTENSION_URL,
      valueString: String(rx.discontinuationReason),
    });
  }

  const enteralDetail = buildEnteralDetailExtension(rx);
  if (enteralDetail) ext.push(enteralDetail);

  if (rx.branchId) {
    ext.push({
      url: DIET_BRANCH_EXTENSION_URL,
      valueReference: { reference: `Organization/${String(rx.branchId)}` },
    });
  }

  if (rx.linkedCarePlanVersionId) {
    ext.push({
      url: DIET_CARE_PLAN_EXTENSION_URL,
      valueReference: { reference: `CarePlan/${String(rx.linkedCarePlanVersionId)}` },
    });
  }

  return ext;
}

/**
 * Project a canonical BeneficiaryDietPrescription onto a base FHIR R4
 * NutritionOrder resource.
 *
 * @param {object} rx canonical BeneficiaryDietPrescription (see canonical schema)
 * @param {{includeId?:boolean}} [opts]
 * @returns {object} FHIR R4 NutritionOrder
 * @throws {TypeError} when rx is missing or has no beneficiaryId (the mandatory
 *   NutritionOrder.patient subject)
 */
function beneficiaryDietPrescriptionToFhir(rx, opts = {}) {
  const { includeId = true } = opts;
  if (!rx || typeof rx !== 'object') {
    throw new TypeError('beneficiaryDietPrescriptionToFhir: rx object is required');
  }
  if (!rx.beneficiaryId) {
    throw new TypeError(
      'beneficiaryDietPrescriptionToFhir: rx.beneficiaryId is required (NutritionOrder.patient)'
    );
  }

  /** @type {Record<string, any>} */
  const resource = {
    resourceType: 'NutritionOrder',
    status: toFhirStatus(rx.status),
    intent: 'order',
    patient: { reference: `Patient/${String(rx.beneficiaryId)}` },
  };

  if (includeId && rx._id) {
    resource.id = String(rx._id);
  }

  const dateTime = toFhirDateTime(rx.prescribedAt);
  if (dateTime) resource.dateTime = dateTime;

  if (rx.prescribedBy) {
    resource.orderer = { reference: `Practitioner/${String(rx.prescribedBy)}` };
  }

  const oralDiet = buildOralDiet(rx);
  if (oralDiet) resource.oralDiet = oralDiet;

  const enteralFormula = buildEnteralFormula(rx);
  if (enteralFormula) resource.enteralFormula = enteralFormula;

  const excludeFood = buildExcludeFoodModifier(rx);
  if (excludeFood) resource.excludeFoodModifier = excludeFood;

  const foodPref = buildFoodPreferenceModifier(rx);
  if (foodPref) resource.foodPreferenceModifier = foodPref;

  const ext = buildExtensions(rx);
  if (ext.length) resource.extension = ext;

  return resource;
}

module.exports = {
  beneficiaryDietPrescriptionToFhir,
  // exported for unit testing
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
  DIET_TEXTURE_SYSTEM,
  DIET_ALLERGEN_SYSTEM,
  DIET_RESTRICTION_SYSTEM,
  DIET_PREFERENCE_SYSTEM,
  DIET_STATUS_EXTENSION_URL,
  DIET_NPO_EXTENSION_URL,
  DIET_CHEWING_EXTENSION_URL,
  DIET_TARGET_CALORIES_EXTENSION_URL,
  DIET_TARGET_PROTEIN_EXTENSION_URL,
  DIET_FLUID_RESTRICTION_EXTENSION_URL,
  DIET_FEEDING_ASSIST_EXTENSION_URL,
  DIET_PRESCRIBER_DISCIPLINE_EXTENSION_URL,
  DIET_NEXT_REVIEW_EXTENSION_URL,
  DIET_DISCONTINUATION_EXTENSION_URL,
  DIET_ENTERAL_DETAIL_EXTENSION_URL,
  DIET_BRANCH_EXTENSION_URL,
  DIET_CARE_PLAN_EXTENSION_URL,
};
