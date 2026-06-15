'use strict';
/**
 * W1344 — FHIR R4 structural validator (required-element cardinality).
 *
 * The per-entity mappers (W1309→W1342) each emit a single FHIR resource and the
 * W1343 Bundle assembler envelopes them. Before a Bundle ships to NPHIES / any
 * FHIR endpoint it should pass a *structural* check: every resource carries the
 * elements FHIR R4 marks as 1..1 / 1..* for its resourceType. This module is
 * that gate — a pure, dependency-free validator that returns a result object
 * (it never throws on an invalid resource; invalidity is data, not an error).
 *
 * Scope: cardinality of REQUIRED elements only (the mandatory backbone of each
 * resource). It deliberately does NOT validate value-set bindings, data types,
 * or business rules — those are downstream concerns. Lenient on unknown
 * resourceTypes (only `resourceType` itself is required) so future layer
 * additions never spuriously fail.
 *
 * PURE: no DB, no IO, no mongoose, no randomness. Deterministic. Never mutates
 * input. Additive + non-breaking: standalone module.
 */

/** Treat undefined/null/'' as absent. */
function isPresent(v) {
  return v !== undefined && v !== null && v !== '';
}

/**
 * An element satisfies its 1..1 / 1..* cardinality when it is present AND
 * non-empty: a non-empty array (1..*), a non-empty object (a populated
 * CodeableConcept / Reference), or any present scalar.
 */
function elementSatisfied(value) {
  if (!isPresent(value)) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

/**
 * Required elements per FHIR R4 resourceType (1..1 unless noted). A bare string
 * is a single required path; `{ oneOf: [...] }` is a choice element (e.g. a
 * code[x] where exactly one of the typed variants must be present); `{ path,
 * array: true }` documents a 1..* element (the same elementSatisfied check
 * covers it, but the flag keeps the contract explicit + self-documenting).
 *
 * Only the 16 resourceTypes this layer actually emits are enumerated.
 * @type {Record<string, Array<string | {oneOf: string[]} | {path: string, array: boolean}>>}
 */
const REQUIRED_ELEMENTS = Object.freeze({
  Patient: [], // FHIR R4: all elements optional.
  EpisodeOfCare: ['status', 'patient'],
  Observation: ['status', 'code'],
  Encounter: ['status', 'class'],
  CarePlan: ['status', 'intent', 'subject'],
  Questionnaire: ['status'],
  RiskAssessment: ['status', 'subject'],
  Device: [], // FHIR R4: all elements optional.
  Flag: ['status', 'code', 'subject'],
  NutritionOrder: ['status', 'intent', 'patient', 'dateTime'],
  DeviceRequest: ['intent', { oneOf: ['codeCodeableConcept', 'codeReference'] }, 'subject'],
  DiagnosticReport: ['status', 'code'],
  Procedure: ['status', 'subject'],
  Appointment: ['status', { path: 'participant', array: true }],
  Coverage: ['status', 'beneficiary', { path: 'payor', array: true }],
  SupplyDelivery: [], // FHIR R4: all elements optional.
});

/** resourceTypes this validator has an explicit required-element contract for. */
const KNOWN_RESOURCE_TYPES = Object.freeze(Object.keys(REQUIRED_ELEMENTS));

/**
 * Validate a single FHIR resource's required-element cardinality.
 *
 * @param {object} resource A mapper output (or any FHIR resource).
 * @param {object} [opts]
 * @param {boolean} [opts.strictUnknown=false] When true, an unrecognised
 *   resourceType is an error; default is lenient (only `resourceType` required).
 * @returns {{ valid: boolean, errors: string[], resourceType: (string|undefined) }}
 */
function validateFhirResource(resource, opts = {}) {
  const { strictUnknown = false } = opts;
  const errors = [];

  if (!resource || typeof resource !== 'object' || Array.isArray(resource)) {
    return {
      valid: false,
      errors: ['resource must be a non-null object'],
      resourceType: undefined,
    };
  }

  const rt = resource.resourceType;
  if (!isPresent(rt) || typeof rt !== 'string') {
    return { valid: false, errors: ['resource.resourceType is required'], resourceType: undefined };
  }

  const specs = REQUIRED_ELEMENTS[rt];
  if (!specs) {
    if (strictUnknown) {
      errors.push(`unknown resourceType '${rt}' (no required-element contract)`);
    }
    return { valid: errors.length === 0, errors, resourceType: rt };
  }

  for (const spec of specs) {
    if (typeof spec === 'string') {
      if (!elementSatisfied(resource[spec])) {
        errors.push(`${rt}.${spec} is required (1..1) but missing`);
      }
    } else if (spec && Array.isArray(spec.oneOf)) {
      const satisfied = spec.oneOf.some(p => elementSatisfied(resource[p]));
      if (!satisfied) {
        errors.push(
          `${rt}: exactly one of [${spec.oneOf.join(', ')}] is required but none present`
        );
      }
    } else if (spec && spec.path) {
      if (!elementSatisfied(resource[spec.path])) {
        const card = spec.array ? '1..*' : '1..1';
        errors.push(`${rt}.${spec.path} is required (${card}) but missing/empty`);
      }
    }
  }

  return { valid: errors.length === 0, errors, resourceType: rt };
}

/**
 * Validate a FHIR R4 Bundle: Bundle-level required fields plus a structural
 * validation of every contained resource. Errors are prefixed with the entry
 * index + resourceType for traceability.
 *
 * @param {object} bundle A buildFhirBundle output (or any Bundle).
 * @param {object} [opts] Passed through to validateFhirResource per entry.
 * @returns {{ valid: boolean, errors: string[], entryCount: number }}
 */
function validateFhirBundle(bundle, opts = {}) {
  const errors = [];

  if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) {
    return { valid: false, errors: ['bundle must be a non-null object'], entryCount: 0 };
  }
  if (bundle.resourceType !== 'Bundle') {
    errors.push("bundle.resourceType must be 'Bundle'");
  }
  if (!isPresent(bundle.type)) {
    errors.push('bundle.type is required (1..1)');
  }
  if (!Array.isArray(bundle.entry)) {
    errors.push('bundle.entry must be an array');
    return { valid: false, errors, entryCount: 0 };
  }

  bundle.entry.forEach((entry, i) => {
    if (!entry || typeof entry !== 'object') {
      errors.push(`entry[${i}] must be an object`);
      return;
    }
    if (!isPresent(entry.resource)) {
      errors.push(`entry[${i}].resource is required`);
      return;
    }
    const res = validateFhirResource(entry.resource, opts);
    if (!res.valid) {
      const label = res.resourceType || '?';
      res.errors.forEach(e => errors.push(`entry[${i}] (${label}): ${e}`));
    }
  });

  return { valid: errors.length === 0, errors, entryCount: bundle.entry.length };
}

module.exports = {
  validateFhirResource,
  validateFhirBundle,
  elementSatisfied,
  isPresent,
  REQUIRED_ELEMENTS,
  KNOWN_RESOURCE_TYPES,
};
