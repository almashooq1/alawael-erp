'use strict';

/**
 * hash-chain.lib.js — Wave 88 canonical unification (closes U1 from the
 * Wave-87 Canonical Domain Unification Architect analysis).
 *
 * Replaces four parallel hash-chain implementations that drifted apart
 * across the platform:
 *
 *   • intelligence/access-review.service.js  — attestation chain (Wave 38/72/87)
 *   • intelligence/care-plan-audit-trail.service.js — signatureChain verifier (Wave 45)
 *   • models/CarePlanVersion.computeSignatureHash — signature hash (kept separate;
 *                                                  this lib doesn't replace
 *                                                  model statics, only the
 *                                                  verifier infrastructure)
 *   • services/blockchain/chainAuditor.js     — external cert chain (OUT OF SCOPE
 *                                                — it's a 3rd-party certificate
 *                                                surface with merkle proofs +
 *                                                Ethereum anchors; uses cert-
 *                                                specific hashing the lib does
 *                                                not subsume)
 *
 * Design principles:
 *   1. DOMAIN-AGNOSTIC — the lib never knows what "attestation" or "signature"
 *      means. Each domain supplies a `computeEntryHash(entry, { previousHash,
 *      encodingVersion })` adapter that translates its own record into a hash.
 *   2. ENCODING-STABLE — temporal fields go through `encodeTemporal` which
 *      defaults to EPOCH_MS (Wave 87 fix). ISO_STRING legacy is accepted via
 *      `fallbackEncodings` and surfaces as `legacyEntryIds` so operators can
 *      re-anchor without a chain break.
 *   3. CHAIN-LINK INTEGRITY OPTIONAL — care-plan stores the prior hash on the
 *      entry itself (`prevHash`) and wants belt-and-braces verification;
 *      access-review derives prior hash from chain walk only. The lib supports
 *      both via `enforcePriorHashLink`.
 *   4. PRESERVES PER-DOMAIN RETURN SHAPES — the wrapper services translate
 *      lib output into their existing public contracts (no caller refactor).
 *
 * Public API:
 *
 *   HASH_ENCODING_VERSIONS — { EPOCH_MS, ISO_STRING }
 *   DEFAULT_ENCODING       — EPOCH_MS
 *   ALL_ENCODINGS          — [EPOCH_MS, ISO_STRING]
 *
 *   encodeTemporal(value, version?) → string
 *     Normalizes a Date/ISO/epoch input into the chosen encoding's canonical
 *     string. Use this in your computeEntryHash to ensure stability.
 *
 *   hashLinkedPayload(payload, previousHash?) → hex sha256 string
 *     `sha256("${payload}|${previousHash || 'GENESIS'}")`. Single source of
 *     truth for the chain-link concatenation rule.
 *
 *   verifyHashChain({
 *     entries,                                  // array, walked in order
 *     computeEntryHash,                         // (entry, { previousHash, encodingVersion }) → hash | null
 *     getCurrentHash = e => e.currentHash,      // domain accessor
 *     getPriorHashRef = e => e.priorHash,       // optional, only used when enforcePriorHashLink
 *     getEntryId = (e, idx) => String(e._id || e.id || idx),
 *     primaryEncoding = DEFAULT_ENCODING,
 *     fallbackEncodings = [ISO_STRING],         // tried in order if primary mismatches
 *     enforcePriorHashLink = false,             // also check entry.prevHash === prior.currentHash
 *   }) → {
 *     ok, broken, brokenAt, chainLength,
 *     legacyEncodingCount, legacyEntryIds, reason,
 *   }
 *
 *   When `computeEntryHash` returns null/undefined, the hash recomputation
 *   step is skipped (caller signals "no recomputation requested"). This
 *   preserves the Wave-45 care-plan behaviour where verifySignatureChain
 *   may be called without a model static available.
 */

const crypto = require('crypto');

const HASH_ENCODING_VERSIONS = Object.freeze({
  EPOCH_MS: 'epoch-ms',
  ISO_STRING: 'iso',
});

const DEFAULT_ENCODING = HASH_ENCODING_VERSIONS.EPOCH_MS;

const ALL_ENCODINGS = Object.freeze([
  HASH_ENCODING_VERSIONS.EPOCH_MS,
  HASH_ENCODING_VERSIONS.ISO_STRING,
]);

function encodeTemporal(value, version = DEFAULT_ENCODING) {
  if (value === null || value === undefined) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  if (version === HASH_ENCODING_VERSIONS.ISO_STRING) return d.toISOString();
  return String(d.getTime());
}

function hashLinkedPayload(payload, previousHash) {
  const canon = `${payload}|${previousHash || 'GENESIS'}`;
  return crypto.createHash('sha256').update(canon).digest('hex');
}

function verifyHashChain({
  entries,
  computeEntryHash = null,
  getCurrentHash = e => e.currentHash,
  getPriorHashRef = e => e.priorHash,
  getEntryId = (e, idx) => String((e && (e._id || e.id)) || idx),
  primaryEncoding = DEFAULT_ENCODING,
  fallbackEncodings = [HASH_ENCODING_VERSIONS.ISO_STRING],
  enforcePriorHashLink = false,
} = {}) {
  const list = Array.isArray(entries) ? entries : [];
  const broken = [];
  const legacyEntryIds = [];
  let brokenAt = null;
  let reason = null;
  let walkPriorHash = null;

  // Build the encoding sequence: primary first, then any fallback not equal
  // to primary (preserves de-dup without reordering).
  const encodings = [primaryEncoding, ...fallbackEncodings.filter(e => e !== primaryEncoding)];

  for (let i = 0; i < list.length; i++) {
    const entry = list[i];
    const storedHash = getCurrentHash(entry);
    const entryId = getEntryId(entry, i);

    // Optional chain-link integrity (entry.prevHash === prior.currentHash).
    // At i === 0 the prior is null (GENESIS) — entry.prevHash MUST also be
    // null/undefined, else the chain doesn't actually start at the beginning.
    // We normalise null/undefined → null so callers don't need to set the
    // field explicitly on the genesis entry.
    if (enforcePriorHashLink) {
      const storedPriorRef = getPriorHashRef(entry) ?? null;
      const expectedPriorRef = i === 0 ? null : (getCurrentHash(list[i - 1]) ?? null);
      if (storedPriorRef !== expectedPriorRef) {
        broken.push({
          entryId,
          expected: expectedPriorRef,
          actual: storedPriorRef,
          triedEncodings: [],
        });
        if (brokenAt === null) brokenAt = i;
        if (!reason) reason = 'PREV_HASH_MISMATCH';
        walkPriorHash = storedHash;
        continue;
      }
    }

    // Hash recomputation (skipped when no computeEntryHash supplied OR when
    // a single call returns null — caller signals "hash check unavailable").
    if (typeof computeEntryHash === 'function') {
      let matchedEncoding = null;
      let firstRecomputed = null;
      let recomputationSkipped = false;
      for (const enc of encodings) {
        const recomputed = computeEntryHash(entry, {
          previousHash: walkPriorHash,
          encodingVersion: enc,
        });
        if (recomputed === null || recomputed === undefined) {
          recomputationSkipped = true;
          break;
        }
        if (firstRecomputed === null) firstRecomputed = recomputed;
        if (recomputed === storedHash) {
          matchedEncoding = enc;
          break;
        }
      }

      if (!recomputationSkipped) {
        if (matchedEncoding === null) {
          broken.push({
            entryId,
            expected: firstRecomputed,
            actual: storedHash,
            triedEncodings: encodings.slice(),
          });
          if (brokenAt === null) brokenAt = i;
          if (!reason) reason = 'HASH_MISMATCH';
        } else if (matchedEncoding !== primaryEncoding) {
          legacyEntryIds.push(entryId);
        }
      }
    }

    walkPriorHash = storedHash;
  }

  return {
    ok: broken.length === 0,
    broken,
    brokenAt,
    chainLength: list.length,
    legacyEncodingCount: legacyEntryIds.length,
    legacyEntryIds,
    reason,
  };
}

module.exports = {
  HASH_ENCODING_VERSIONS,
  DEFAULT_ENCODING,
  ALL_ENCODINGS,
  encodeTemporal,
  hashLinkedPayload,
  verifyHashChain,
};
