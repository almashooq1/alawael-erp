/**
 * auditHashChainService.js — Phase-7 tamper-evident audit trail.
 *
 * Each audit entry gets a `chainHash` computed as:
 *
 *   chainHash = SHA-256( prevHash || canonicalJSON(entry) )
 *
 * where `prevHash` is the chainHash of the immediately preceding
 * entry (empty-string genesis for the first entry). The chain is
 * append-only — modifying any historical entry breaks every hash
 * downstream from it, which the verifier detects and alerts on.
 *
 * We canonicalize the entry (sorted keys, deterministic JSON) before
 * hashing so two runs against the same doc produce the same hash.
 * Fields excluded from the hash: `_id`, `__v`, `chainHash`, `prevHash`,
 * `createdAt`, `updatedAt`, `expiresAt` — these are storage-layer
 * artifacts that shouldn't be part of the integrity claim.
 *
 * CBAHI / PDPL / MOH audit-log immutability expectations are met by
 * the combination of:
 *   • append-only write path (no update/delete in hot path)
 *   • this hash chain (modifications of historical entries detectable)
 *   • a scheduled `audit-chain-verify` job + alert (see the CLI)
 *
 * No network / no I/O — pure crypto. The mongoose-side hook in
 * models/auditLog.model.js reads the previous hash from the most
 * recent entry on save, then calls computeEntryHash() to set its own.
 */

'use strict';

const crypto = require('crypto');

// Fields that are storage-layer metadata, not part of the integrity
// claim. A human typo in `updatedAt` (impossible) shouldn't break the
// chain; a change to `actor` (meaningful) must.
const EXCLUDED_FIELDS = new Set([
  '_id',
  '__v',
  'chainHash',
  'prevHash',
  'createdAt',
  'updatedAt',
  'expiresAt',
  // Mongoose internals
  '$__',
  '_doc',
  '$locals',
]);

/**
 * Deterministic JSON: sorts object keys recursively so two runs on
 * the same data produce identical bytes.
 */
function canonicalJSON(value) {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (typeof value !== 'object') return JSON.stringify(value);
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return '[' + value.map(canonicalJSON).join(',') + ']';
  const keys = Object.keys(value)
    .filter(k => !EXCLUDED_FIELDS.has(k))
    .sort();
  const parts = keys.map(k => JSON.stringify(k) + ':' + canonicalJSON(value[k]));
  return '{' + parts.join(',') + '}';
}

/**
 * Compute the chain hash for one entry, given the previous entry's
 * chainHash (empty string for the first / genesis entry).
 *
 * @param {object} entry — the audit log doc (or a lean object with the
 *                         same fields). Storage-only fields are stripped.
 * @param {string} prevHash — previous chainHash, or '' for genesis.
 * @returns {string} 64-char hex SHA-256
 */
function computeEntryHash(entry, prevHash = '') {
  if (typeof prevHash !== 'string') {
    throw new TypeError('prevHash must be a string');
  }
  // Normalize — mongoose docs carry toObject; plain objects don't.
  const plain = entry && typeof entry.toObject === 'function' ? entry.toObject() : entry || {};
  const canonical = canonicalJSON(plain);
  return crypto
    .createHash('sha256')
    .update(prevHash + canonical)
    .digest('hex');
}

/**
 * Walk an ORDERED list of entries (oldest → newest) and verify each
 * entry's `chainHash` equals `computeEntryHash(entry, prevHash)`.
 *
 * Returns { ok: boolean, verifiedCount, breaks: [{ index, entryId,
 * expected, actual }] }.
 *
 * Convention: the first entry's `prevHash` is '' (genesis). If a
 * record's `prevHash` field is set but doesn't match the previous
 * record's `chainHash`, we report that as a break too — detects
 * insertion attacks (appending entries in the middle).
 */
function verifyChain(entries) {
  const breaks = [];
  let lastHash = '';
  for (let i = 0; i < entries.length; i += 1) {
    const e = entries[i];

    // Detect insertion attack: if the entry claims a prevHash, it
    // must match the previous entry's chainHash.
    if (e.prevHash !== undefined && e.prevHash !== null && e.prevHash !== lastHash) {
      breaks.push({
        index: i,
        entryId: String(e._id || e.id || i),
        reason: 'prev_hash_mismatch',
        expected: lastHash,
        actual: e.prevHash,
      });
    }

    const expected = computeEntryHash(e, lastHash);
    if (e.chainHash !== expected) {
      breaks.push({
        index: i,
        entryId: String(e._id || e.id || i),
        reason: 'chain_hash_mismatch',
        expected,
        actual: e.chainHash,
      });
    }
    // Always advance `lastHash` using the expected value — if the
    // current entry is tampered, downstream entries are ALSO wrong,
    // but we want to report each individually, not cascade.
    lastHash = expected;
  }
  return { ok: breaks.length === 0, verifiedCount: entries.length, breaks };
}

module.exports = {
  canonicalJSON,
  computeEntryHash,
  verifyChain,
  EXCLUDED_FIELDS,
};
