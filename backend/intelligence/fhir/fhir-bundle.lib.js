'use strict';
/**
 * W1343 — FHIR R4 Bundle assembler.
 *
 * The per-entity mappers (W1309→W1342) each emit a single FHIR resource. Real
 * NPHIES / FHIR exchange ships resources *together* inside a Bundle — a
 * patient `$everything` export, a transaction batch, a clinical document, or a
 * search result set. This module is the capstone that envelopes already-mapped
 * resources into a valid FHIR R4 Bundle, plus a convenience that maps canonical
 * records straight to a Bundle via an injected mapper table.
 *
 * PURE: no DB, no IO, no mongoose, no randomness. Deterministic. Never mutates
 * input. Additive + non-breaking: standalone module.
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';

// FHIR R4 Bundle.type value-set (the subset this assembler supports).
const BUNDLE_TYPES = Object.freeze(['collection', 'searchset', 'document', 'transaction', 'batch']);

// Bundle types whose entries carry a Bundle.entry.request element.
const REQUEST_BEARING_TYPES = Object.freeze(new Set(['transaction', 'batch']));

/** Treat undefined/null/'' as absent. */
function isPresent(v) {
  return v !== undefined && v !== null && v !== '';
}

/** Map an ISO-ish input to a full FHIR instant; undefined for bad/absent input. */
function toFhirInstant(value) {
  if (!isPresent(value)) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

/**
 * Stable fullUrl for a bundled resource. When the resource carries an `id` the
 * canonical absolute URL is used (resolvable reference); otherwise a
 * deterministic index-scoped urn is used so the Bundle stays pure + replayable.
 */
function fullUrlFor(resource, index) {
  if (isPresent(resource.id)) {
    return `${ORG_FHIR_BASE}/${resource.resourceType}/${resource.id}`;
  }
  return `urn:alawael:bundle-entry:${index}`;
}

/**
 * Build a single Bundle.entry for a resource. For transaction/batch bundles the
 * entry also gets a `request` (PUT when the resource has an id → upsert by
 * identity, POST when it does not → create).
 */
function buildEntry(resource, index, bundleType) {
  const entry = {
    fullUrl: fullUrlFor(resource, index),
    resource,
  };
  if (REQUEST_BEARING_TYPES.has(bundleType)) {
    entry.request = isPresent(resource.id)
      ? { method: 'PUT', url: `${resource.resourceType}/${resource.id}` }
      : { method: 'POST', url: resource.resourceType };
  }
  return entry;
}

/**
 * Envelope an array of already-mapped FHIR resources into a FHIR R4 Bundle.
 * @param {object[]} resources FHIR resource objects (each must have resourceType)
 * @param {object} [opts]
 * @param {string} [opts.type='collection'] Bundle.type (see BUNDLE_TYPES)
 * @param {string} [opts.id] Bundle.id
 * @param {string|Date} [opts.timestamp] Bundle.timestamp (FHIR instant)
 * @param {boolean} [opts.includeTotal] add Bundle.total (valid for searchset)
 * @returns {object} plain FHIR Bundle resource
 */
function buildFhirBundle(resources, opts = {}) {
  if (!Array.isArray(resources)) {
    throw new TypeError('buildFhirBundle: resources must be an array');
  }
  const { type = 'collection', id, timestamp, includeTotal } = opts;
  if (!BUNDLE_TYPES.includes(type)) {
    throw new TypeError(`buildFhirBundle: unsupported Bundle.type "${type}"`);
  }

  resources.forEach((r, i) => {
    if (!r || typeof r !== 'object' || !isPresent(r.resourceType)) {
      throw new TypeError(
        `buildFhirBundle: resources[${i}] must be a FHIR resource with a resourceType`
      );
    }
  });

  const bundle = { resourceType: 'Bundle', type };

  if (isPresent(id)) bundle.id = String(id);

  const ts = toFhirInstant(timestamp);
  if (ts) bundle.timestamp = ts;

  // total is only meaningful on a searchset (count of matches).
  if (includeTotal && type === 'searchset') {
    bundle.total = resources.length;
  }

  bundle.entry = resources.map((resource, index) => buildEntry(resource, index, type));

  return bundle;
}

/**
 * Map an array of canonical records to FHIR resources via an injected mapper
 * table, then envelope them into a Bundle. The mapper table is injected (not
 * required here) to keep this module free of any circular dependency on the
 * barrel `index.js` that aggregates the individual mappers.
 *
 * @param {{entityName: string, record: object, opts?: object}[]} entries
 * @param {Record<string, Function>} mappers canonical-name → mapper fn (e.g. MAPPERS)
 * @param {object} [bundleOpts] forwarded to buildFhirBundle
 * @returns {object} plain FHIR Bundle resource
 */
function buildFhirBundleFromEntities(entries, mappers, bundleOpts = {}) {
  if (!Array.isArray(entries)) {
    throw new TypeError('buildFhirBundleFromEntities: entries must be an array');
  }
  if (!mappers || typeof mappers !== 'object') {
    throw new TypeError('buildFhirBundleFromEntities: mappers table is required');
  }

  const resources = entries.map((entry, i) => {
    if (!entry || typeof entry !== 'object' || !isPresent(entry.entityName)) {
      throw new TypeError(`buildFhirBundleFromEntities: entries[${i}] must have an entityName`);
    }
    const mapper = mappers[entry.entityName];
    if (typeof mapper !== 'function') {
      throw new TypeError(
        `buildFhirBundleFromEntities: no mapper registered for "${entry.entityName}"`
      );
    }
    return mapper(entry.record, entry.opts || {});
  });

  return buildFhirBundle(resources, bundleOpts);
}

module.exports = {
  buildFhirBundle,
  buildFhirBundleFromEntities,
  buildEntry,
  fullUrlFor,
  toFhirInstant,
  isPresent,
  BUNDLE_TYPES,
  REQUEST_BEARING_TYPES,
  ORG_FHIR_BASE,
};
