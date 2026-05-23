'use strict';
/**
 * Canonical schema registry — Wave 285.
 *
 * Central lookup: name → { schema, mongooseModel?, mongooseFieldMap? }.
 *
 * `mongooseFieldMap` allows the drift guard to map canonical field names
 * to Mongoose paths when they differ (e.g. canonical `beneficiaryId` →
 * Mongoose path `beneficiaryId`, both same — but `episodeNumber` in
 * canonical may differ in legacy models).
 */

const REGISTRY = new Map();

/**
 * @typedef {object} CanonicalEntry
 * @property {string} name
 * @property {import('zod').ZodTypeAny} schema
 * @property {string} [mongooseModelName]   - e.g. 'Beneficiary'
 * @property {string} [modulePath]          - e.g. 'Beneficiary Core'
 * @property {Record<string,string>} [mongooseFieldMap] - canonicalField → mongoosePath
 */

/**
 * @param {CanonicalEntry} entry
 */
function register(entry) {
  if (!entry || !entry.name) throw new Error('canonical.register: name required');
  if (!entry.schema || typeof entry.schema.safeParse !== 'function') {
    throw new Error(`canonical.register(${entry.name}): schema must be a Zod schema`);
  }
  if (REGISTRY.has(entry.name)) {
    throw new Error(`canonical.register: duplicate registration for ${entry.name}`);
  }
  REGISTRY.set(entry.name, Object.freeze({ ...entry }));
}

function get(name) {
  return REGISTRY.get(name) || null;
}

function require_(name) {
  const e = REGISTRY.get(name);
  if (!e) throw new Error(`canonical.require: unknown entity "${name}"`);
  return e;
}

function list() {
  return Array.from(REGISTRY.values());
}

function names() {
  return Array.from(REGISTRY.keys());
}

module.exports = { register, get, require: require_, list, names };
