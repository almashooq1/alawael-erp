'use strict';

/**
 * evidence-snapshot.lib.js — Wave 91 canonical unification (closes U6 +
 * governance rule G6 from the Wave-87 analysis).
 *
 * Captures a tamper-evident snapshot of an entity at decision time so
 * that, when a HIGH/CRITICAL decision is later challenged or audited,
 * we can prove what the approver actually saw — not what the record
 * looks like today after subsequent edits.
 *
 * Before this lib:
 *   • care-plan: `evidenceHash` on CarePlanVersion (sha256 of body)
 *   • access-review: `snapshotAtAttestation` on AccessReviewAttestation
 *   • controlled-document: stored `documentHash`
 *   • beneficiary-lifecycle: NO snapshot — pure gap. A transfer-branch
 *     approval taken today and challenged in 6 months has no proof of
 *     the beneficiary state at request time. This wave fixes that.
 *
 * Design principles:
 *   1. DOMAIN-AGNOSTIC — caller provides entity + fields to capture.
 *      The lib does NOT decide what's auditable; that's a policy
 *      decision per entity type.
 *   2. DETERMINISTIC HASH — payload keys sorted before JSON encoding,
 *      temporal fields encoded via hash-chain.lib (EPOCH_MS default)
 *      so the snapshot survives JSON round-trip / timezone drift /
 *      precision loss.
 *   3. FROZEN OUTPUT — captured snapshots can't be mutated downstream.
 *   4. VERIFIABLE — verifySnapshot re-hashes and compares; if the
 *      stored payload was tampered with after capture, this will catch it.
 *
 * Public API:
 *
 *   captureSnapshot({ entity, dataKinds, fields, takenAt, encodingVersion })
 *     → frozen { takenAt, dataKinds, payload, payloadHash, hashEncodingVersion }
 *
 *   verifySnapshot(snapshot)
 *     → { ok, expected, actual, reason? }
 *
 *   pickFields(entity, fields)
 *     → plain object with serialised values (helper exposed for tests
 *       and for callers that want to inspect what would be captured
 *       without actually computing a hash)
 *
 * Hash recipe:
 *
 *   canonical  = JSON.stringify(payload, sortedKeys)
 *   payloadKey = `${canonical}|${encodeTemporal(takenAt, encodingVersion)}`
 *   payloadHash = hashLinkedPayload(payloadKey, null)
 */

const hashChain = require('./hash-chain.lib');

function _getByPath(obj, path) {
  if (!obj || !path) return undefined;
  const parts = String(path).split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[p];
  }
  return cur;
}

function _serialize(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    // ObjectId or Buffer or any object with custom toString
    if (
      value.constructor &&
      typeof value.constructor.name === 'string' &&
      (value.constructor.name === 'ObjectId' || value.constructor.name === 'ObjectID')
    ) {
      return String(value);
    }
    // Plain objects and arrays pass through; let JSON.stringify handle nesting.
    return value;
  }
  return value;
}

function pickFields(entity, fields = []) {
  if (!entity || typeof entity !== 'object') return {};
  const src = typeof entity.toObject === 'function' ? entity.toObject() : entity;
  const out = {};
  for (const key of fields) {
    const value = _getByPath(src, key);
    if (value !== undefined) {
      out[key] = _serialize(value);
    }
  }
  return out;
}

function _canonicalJson(payload) {
  // Sort top-level keys for stable hashing. Nested objects are NOT
  // sorted recursively — callers should pass flat fields or accept
  // that nested object key order is whatever JSON.stringify emits.
  // For Wave 91 lifecycle snapshots the fields are all scalars/dates,
  // so this is sufficient.
  const sorted = Object.keys(payload || {}).sort();
  return JSON.stringify(payload, sorted);
}

function captureSnapshot({
  entity,
  dataKinds = [],
  fields = [],
  takenAt = new Date(),
  encodingVersion = hashChain.DEFAULT_ENCODING,
} = {}) {
  if (!Array.isArray(fields) || fields.length === 0) {
    throw new Error('captureSnapshot: fields[] is required and must be non-empty');
  }
  const payload = pickFields(entity, fields);
  const at = takenAt instanceof Date ? takenAt : new Date(takenAt);
  const canonical = _canonicalJson(payload);
  const payloadKey = `${canonical}|${hashChain.encodeTemporal(at, encodingVersion)}`;
  const payloadHash = hashChain.hashLinkedPayload(payloadKey, null);

  return Object.freeze({
    takenAt: at,
    dataKinds: Object.freeze([...dataKinds]),
    payload: Object.freeze({ ...payload }),
    payloadHash,
    hashEncodingVersion: encodingVersion,
  });
}

function verifySnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || !snapshot.payload) {
    return { ok: false, reason: 'INVALID_SNAPSHOT', expected: null, actual: null };
  }
  const encoding = snapshot.hashEncodingVersion || hashChain.DEFAULT_ENCODING;
  const canonical = _canonicalJson(snapshot.payload);
  const at = snapshot.takenAt instanceof Date ? snapshot.takenAt : new Date(snapshot.takenAt);
  const payloadKey = `${canonical}|${hashChain.encodeTemporal(at, encoding)}`;
  const expected = hashChain.hashLinkedPayload(payloadKey, null);
  if (expected === snapshot.payloadHash) {
    return { ok: true, expected, actual: snapshot.payloadHash };
  }
  return {
    ok: false,
    reason: 'HASH_MISMATCH',
    expected,
    actual: snapshot.payloadHash,
  };
}

module.exports = {
  captureSnapshot,
  verifySnapshot,
  pickFields,
};
