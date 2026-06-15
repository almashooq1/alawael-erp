'use strict';
/**
 * W1346 — FHIR layer convenience orchestrator (map → validate → OperationOutcome).
 *
 * The layer now has every piece: per-entity mappers (W1309→W1342), a Bundle
 * assembler (W1343), a structural validator (W1344), and an OperationOutcome
 * serializer (W1345). A consumer that wants the full "canonical record → FHIR
 * resource I can ship, plus a pass/fail verdict I can return to the caller" flow
 * had to wire those four calls itself. This module is that one-call front door.
 *
 * Dependency-injection of the MAPPERS table (passed in by the barrel) keeps this
 * module free of a circular require on `index.js` — same pattern as the W1343
 * `buildFhirBundleFromEntities`. The validator + OperationOutcome libs are leaf
 * modules (they never require the barrel) so they're required directly.
 *
 * PURE: no DB, no IO, no mongoose, no randomness. Deterministic. Never mutates
 * input. Additive + non-breaking: standalone module.
 */

const { validateFhirResource, validateFhirBundle } = require('./fhir-validate.lib');
const { buildOperationOutcome } = require('./fhir-operation-outcome.lib');
const { buildFhirBundleFromEntities } = require('./fhir-bundle.lib');

/**
 * Map a single canonical record to its FHIR resource, validate it structurally,
 * and produce an OperationOutcome — in one call.
 *
 * @param {string} entityName Canonical entity name (a key of `mappers`).
 * @param {object} record The canonical record to project.
 * @param {object} opts
 * @param {Record<string, Function>} opts.mappers The MAPPERS table (injected by
 *   the barrel to avoid a circular require).
 * @param {object} [opts.mapperOpts] Forwarded to the mapper (e.g. {includeId}).
 * @param {object} [opts.validateOpts] Forwarded to validateFhirResource (e.g.
 *   {strictUnknown}).
 * @param {object} [opts.outcomeOpts] Forwarded to buildOperationOutcome.
 * @returns {{
 *   entityName: string,
 *   resourceType: (string|undefined),
 *   resource: object,
 *   validation: { valid: boolean, errors: string[], resourceType: (string|undefined) },
 *   operationOutcome: object
 * }}
 */
function toValidatedFhir(entityName, record, opts = {}) {
  const { mappers, mapperOpts, validateOpts, outcomeOpts } = opts;

  if (!mappers || typeof mappers !== 'object') {
    throw new TypeError('toValidatedFhir: opts.mappers (the MAPPERS table) is required');
  }
  const mapper = mappers[entityName];
  if (typeof mapper !== 'function') {
    throw new TypeError(`toValidatedFhir: no mapper registered for entity '${entityName}'`);
  }

  const resource = mapper(record, mapperOpts);
  const validation = validateFhirResource(resource, validateOpts || {});
  const operationOutcome = buildOperationOutcome(validation, outcomeOpts || {});

  return {
    entityName,
    resourceType: validation.resourceType,
    resource,
    validation,
    operationOutcome,
  };
}

/**
 * Map several canonical records into a FHIR Bundle, validate the whole Bundle
 * structurally, and produce an OperationOutcome — in one call.
 *
 * @param {Array<{ entityName: string, record: object }>} entries
 * @param {object} opts
 * @param {Record<string, Function>} opts.mappers The MAPPERS table (injected).
 * @param {object} [opts.bundleOpts] Forwarded to buildFhirBundleFromEntities
 *   (e.g. {type, id, timestamp}).
 * @param {object} [opts.validateOpts] Forwarded to validateFhirBundle.
 * @param {object} [opts.outcomeOpts] Forwarded to buildOperationOutcome.
 * @returns {{
 *   bundle: object,
 *   validation: { valid: boolean, errors: string[], entryCount: number },
 *   operationOutcome: object
 * }}
 */
function toValidatedFhirBundle(entries, opts = {}) {
  const { mappers, bundleOpts, validateOpts, outcomeOpts } = opts;

  if (!mappers || typeof mappers !== 'object') {
    throw new TypeError('toValidatedFhirBundle: opts.mappers (the MAPPERS table) is required');
  }

  const bundle = buildFhirBundleFromEntities(entries, mappers, bundleOpts || {});
  const validation = validateFhirBundle(bundle, validateOpts || {});
  const operationOutcome = buildOperationOutcome(validation, outcomeOpts || {});

  return { bundle, validation, operationOutcome };
}

module.exports = {
  toValidatedFhir,
  toValidatedFhirBundle,
};
