'use strict';
/**
 * W1348 — FHIR R4 CapabilityStatement generator.
 *
 * Every FHIR server publishes a CapabilityStatement at `GET /metadata` declaring
 * which resourceTypes and interactions it supports. This pure generator derives
 * that statement from the layer's frozen RESOURCE_TYPES table (the 33 canonical
 * mappers → 16 distinct FHIR resourceTypes) so the published capabilities can
 * never drift from what the mappers actually emit.
 *
 * It declares the layer's CURRENT honest capability: a `read`/`search-type`
 * surface for the resourceTypes it can PRODUCE, plus a `kind: 'capability'`
 * instance statement. It does NOT assert write interactions (the mappers project
 * canonical → FHIR; they don't ingest FHIR), and it does NOT bind NPHIES
 * profiles (that's a downstream product decision) — keeping the statement
 * truthful and additive.
 *
 * PURE: no DB, no IO, no mongoose, no randomness (the only time value comes from
 * an injected `date` opt, default a fixed sentinel). Deterministic for a given
 * input. Never mutates input. Additive + non-breaking: standalone leaf module
 * that takes the resourceType table as a parameter (no barrel require → no
 * circular dependency).
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';

/** Treat undefined/null/'' as absent. */
function isPresent(v) {
  return v !== undefined && v !== null && v !== '';
}

/**
 * Reduce a `{ canonicalName: resourceType }` map to the sorted unique list of
 * FHIR resourceTypes it can produce.
 * @param {Record<string,string>} resourceTypeMap
 * @returns {string[]}
 */
function distinctResourceTypes(resourceTypeMap) {
  if (!resourceTypeMap || typeof resourceTypeMap !== 'object') return [];
  const set = new Set();
  for (const rt of Object.values(resourceTypeMap)) {
    if (isPresent(rt) && typeof rt === 'string') set.add(rt);
  }
  return Array.from(set).sort();
}

/**
 * Build the `rest[0].resource[]` array: one entry per distinct producible
 * resourceType, each advertising the read + search-type interactions this
 * projection layer can honestly back.
 * @param {string[]} resourceTypes Sorted distinct FHIR resourceTypes.
 * @returns {Array<object>}
 */
function buildResourceComponents(resourceTypes) {
  return resourceTypes.map(type => ({
    type,
    interaction: [{ code: 'read' }, { code: 'search-type' }],
  }));
}

/**
 * Generate a FHIR R4 CapabilityStatement describing the resourceTypes this
 * mapper layer can produce.
 *
 * @param {Record<string,string>} resourceTypeMap The layer's RESOURCE_TYPES
 *   (canonical entity name → FHIR resourceType). Required.
 * @param {object} [opts]
 * @param {string} [opts.date='2026-06-15'] Statement date (injected for purity).
 * @param {string} [opts.publisher='Al-Awael Rehabilitation Platform']
 * @param {string} [opts.fhirVersion='4.0.1']
 * @param {string} [opts.status='active']
 * @param {string} [opts.url] Canonical URL (default `${ORG_FHIR_BASE}/metadata`).
 * @param {string} [opts.softwareName='alawael-fhir-mapper-layer']
 * @returns {object} A FHIR R4 CapabilityStatement resource.
 */
function buildCapabilityStatement(resourceTypeMap, opts = {}) {
  const {
    date = '2026-06-15',
    publisher = 'Al-Awael Rehabilitation Platform',
    fhirVersion = '4.0.1',
    status = 'active',
    url = `${ORG_FHIR_BASE}/metadata`,
    softwareName = 'alawael-fhir-mapper-layer',
  } = opts;

  const resourceTypes = distinctResourceTypes(resourceTypeMap);

  return {
    resourceType: 'CapabilityStatement',
    url,
    status,
    date,
    publisher,
    kind: 'capability',
    fhirVersion,
    format: ['json'],
    software: { name: softwareName },
    rest: [
      {
        mode: 'server',
        documentation:
          'Read/search surface for FHIR R4 resources projected from the platform canonical model.',
        resource: buildResourceComponents(resourceTypes),
      },
    ],
  };
}

module.exports = {
  buildCapabilityStatement,
  distinctResourceTypes,
  buildResourceComponents,
  isPresent,
  ORG_FHIR_BASE,
};
