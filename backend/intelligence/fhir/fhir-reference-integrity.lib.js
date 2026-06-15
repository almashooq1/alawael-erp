'use strict';
/**
 * W1347 — FHIR R4 reference-integrity checker.
 *
 * The W1344 structural validator answers "does each resource carry its required
 * elements?". This module answers the complementary cross-resource question:
 * "are every resource's `Reference.reference` strings well-formed, and (inside a
 * Bundle) do they resolve to a resource the Bundle actually carries?".
 *
 * Our mappers build references like `Patient/${beneficiaryId}` /
 * `Practitioner/${leadTherapistId}` / `Organization/${branchId}`. If a canonical
 * id were ever absent, an object, or otherwise malformed, the emitted reference
 * would be malformed — this is the pure safety net that surfaces it, plus a
 * dangling-vs-external classification so a Bundle producer can see which
 * references need a companion resource bundled alongside them.
 *
 * Reference SHAPE is validated syntactically (not against a closed resourceType
 * set): our mappers legitimately reference base FHIR types we never EMIT
 * (Practitioner, Organization, Location, Group, RelatedPerson, MedicationAdministration),
 * so enforcing the 16-emitted-types set would produce false positives. A
 * reference is well-formed when it is one of:
 *   - relative   `ResourceType/id`                 (ResourceType ∈ /^[A-Z][A-Za-z]+$/)
 *   - absolute   `http(s)://…/ResourceType/id`
 *   - urn        `urn:uuid:…` / `urn:…`            (Bundle-local placeholder)
 *   - contained  `#localId`
 * Anything else is a malformed reference (the only kind reported as an error).
 *
 * INVALIDITY IS DATA NOT AN ERROR: like the W1344 validator, this never throws
 * on a bad/dangling reference — it returns a result object.
 *
 * PURE: no DB, no IO, no mongoose, no randomness. Deterministic. Never mutates
 * input. Additive + non-breaking: standalone leaf module (does not require the
 * barrel).
 */

/** Treat undefined/null/'' as absent. */
function isPresent(v) {
  return v !== undefined && v !== null && v !== '';
}

const RELATIVE_REF_RE = /^([A-Z][A-Za-z]+)\/([^/\s]+)$/;
const ABSOLUTE_REF_RE = /^https?:\/\/\S+\/([A-Z][A-Za-z]+)\/([^/\s]+)$/;

/**
 * Classify a single reference string.
 *
 * @param {*} ref The value of a `reference` property.
 * @returns {{ kind: 'relative'|'absolute'|'urn'|'contained'|'malformed',
 *             resourceType?: string, id?: string, raw: * }}
 */
function parseReference(ref) {
  if (typeof ref !== 'string' || ref === '') {
    return { kind: 'malformed', raw: ref };
  }
  if (ref.startsWith('#')) {
    return { kind: 'contained', id: ref.slice(1), raw: ref };
  }
  if (ref.startsWith('urn:')) {
    return { kind: 'urn', raw: ref };
  }
  const abs = ABSOLUTE_REF_RE.exec(ref);
  if (abs) {
    return { kind: 'absolute', resourceType: abs[1], id: abs[2], raw: ref };
  }
  const rel = RELATIVE_REF_RE.exec(ref);
  if (rel) {
    return { kind: 'relative', resourceType: rel[1], id: rel[2], raw: ref };
  }
  return { kind: 'malformed', raw: ref };
}

/**
 * Recursively collect every `{ reference: <string> }` occurrence in a resource,
 * recording a dotted FHIRPath-ish location for traceability. A FHIR Reference
 * datatype is an object with a `reference` string property; we walk all plain
 * objects + arrays (never functions, dates, or other host objects) and emit one
 * record per `reference` property encountered.
 *
 * @param {*} node The resource (or any sub-node).
 * @param {string} [basePath] Accumulated path prefix (defaults to the resourceType).
 * @returns {Array<{ reference: *, path: string }>}
 */
function collectReferences(node, basePath) {
  const out = [];
  const root =
    basePath !== undefined
      ? basePath
      : node && typeof node === 'object' && typeof node.resourceType === 'string'
        ? node.resourceType
        : '';

  function walk(value, path) {
    if (Array.isArray(value)) {
      value.forEach((item, i) => walk(item, `${path}[${i}]`));
      return;
    }
    if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
      for (const key of Object.keys(value)) {
        const childPath = path ? `${path}.${key}` : key;
        if (key === 'reference') {
          out.push({ reference: value[key], path: childPath });
        }
        walk(value[key], childPath);
      }
    }
  }

  walk(node, root);
  return out;
}

/**
 * Check a single resource's references are well-formed.
 *
 * @param {object} resource A mapper output (or any FHIR resource).
 * @returns {{ valid: boolean, errors: string[],
 *             references: Array<{ reference: *, path: string,
 *                                 kind: string, resourceType?: string, id?: string }> }}
 */
function checkResourceReferences(resource) {
  const errors = [];
  if (!resource || typeof resource !== 'object' || Array.isArray(resource)) {
    return { valid: false, errors: ['resource must be a non-null object'], references: [] };
  }

  const references = collectReferences(resource).map(({ reference, path }) => {
    const parsed = parseReference(reference);
    if (parsed.kind === 'malformed') {
      errors.push(`${path}: malformed reference '${String(reference)}'`);
    }
    return { reference, path, ...parsed, raw: undefined };
  });

  return { valid: errors.length === 0, errors, references };
}

/**
 * Index the resources a Bundle carries so references can be resolved against it.
 * A reference `Type/id` resolves internally when either (a) a bundled resource
 * has that resourceType + id, or (b) a bundled entry.fullUrl ends in `Type/id`.
 *
 * @param {object} bundle
 * @returns {{ byTypeId: Set<string>, byFullUrl: Set<string> }}
 */
function indexBundle(bundle) {
  const byTypeId = new Set();
  const byFullUrl = new Set();
  if (!bundle || !Array.isArray(bundle.entry)) return { byTypeId, byFullUrl };
  for (const entry of bundle.entry) {
    if (!entry || typeof entry !== 'object') continue;
    if (isPresent(entry.fullUrl)) byFullUrl.add(entry.fullUrl);
    const res = entry.resource;
    if (res && typeof res === 'object' && isPresent(res.resourceType) && isPresent(res.id)) {
      byTypeId.add(`${res.resourceType}/${res.id}`);
    }
  }
  return { byTypeId, byFullUrl };
}

/**
 * Check reference integrity across a whole Bundle: every reference is
 * well-formed, and each well-formed reference is classified internal (resolves
 * to a bundled resource) vs external (well-formed but not carried by the
 * Bundle — legitimate, e.g. a `Practitioner/x` not bundled). Only malformed
 * references are errors; dangling externals are reported (not failed) so the
 * caller can decide whether companion resources are needed.
 *
 * @param {object} bundle A buildFhirBundle output (or any Bundle).
 * @returns {{ valid: boolean, errors: string[], referenceCount: number,
 *             internalCount: number, externalCount: number,
 *             dangling: Array<{ reference: string, path: string }> }}
 */
function checkBundleReferences(bundle) {
  const errors = [];
  if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) {
    return {
      valid: false,
      errors: ['bundle must be a non-null object'],
      referenceCount: 0,
      internalCount: 0,
      externalCount: 0,
      dangling: [],
    };
  }
  if (!Array.isArray(bundle.entry)) {
    return {
      valid: false,
      errors: ['bundle.entry must be an array'],
      referenceCount: 0,
      internalCount: 0,
      externalCount: 0,
      dangling: [],
    };
  }

  const { byTypeId, byFullUrl } = indexBundle(bundle);
  let referenceCount = 0;
  let internalCount = 0;
  let externalCount = 0;
  const dangling = [];

  bundle.entry.forEach((entry, i) => {
    const res = entry && typeof entry === 'object' ? entry.resource : undefined;
    if (!res || typeof res !== 'object') return;
    const label = isPresent(res.resourceType) ? res.resourceType : '?';

    for (const { reference, path } of collectReferences(res)) {
      referenceCount += 1;
      const parsed = parseReference(reference);
      const fullPath = `entry[${i}] (${label}).${path}`;

      if (parsed.kind === 'malformed') {
        errors.push(`${fullPath}: malformed reference '${String(reference)}'`);
        continue;
      }
      // urn / contained references are Bundle-local-by-design; not classified
      // against the type/id index.
      if (parsed.kind === 'urn' || parsed.kind === 'contained') {
        internalCount += 1;
        continue;
      }
      const typeId = `${parsed.resourceType}/${parsed.id}`;
      if (byTypeId.has(typeId) || byFullUrl.has(reference)) {
        internalCount += 1;
      } else {
        externalCount += 1;
        dangling.push({ reference, path: fullPath });
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    referenceCount,
    internalCount,
    externalCount,
    dangling,
  };
}

module.exports = {
  parseReference,
  collectReferences,
  checkResourceReferences,
  checkBundleReferences,
  isPresent,
};
