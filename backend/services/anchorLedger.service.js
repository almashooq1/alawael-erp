/**
 * anchorLedger.service.js — minimal anchor-ledger forwarder.
 *
 * Same pattern as services/auditLog.service.js (shipped 2026-05-19):
 * the optional hook in app.js try/catch-loaded this file and degraded
 * silently when it didn't exist. This minimal implementation activates
 * the hook with a structured log line and a safe no-op return shape —
 * without forging a fake `txId` that would masquerade as a real
 * blockchain anchor reference (a real audit/compliance risk).
 *
 * Contract (matches the call sites — see access-review.service.js:239
 * and beneficiary-lifecycle.service.js:532):
 *
 *   anchorLedger.commit({
 *     kind | type,     // string label, REQUIRED (callers diverge on key
 *                      // name: access-review uses `kind`, lifecycle uses `type`)
 *     payloadHash,     // hex sha256 OR
 *     payload,         // freeform object — service hashes it internally
 *     entityId,        // string|ObjectId — what is being anchored
 *   })
 *
 * Return shape: `{ txId, anchored, kind, payloadHash, hashedAt }`.
 * `txId` is **null** in this minimal implementation — callers all use
 * the pattern `res?.txId || null` and skip the `record.anchorTxId`
 * write when txId is falsy, so consumer behavior is identical to
 * "service missing" except for the new audit-log line.
 *
 * P1 follow-up: delegate to services/blockchainCertService.js (which
 * already wires the live Polygon/Ethereum signer when
 * BLOCKCHAIN_NETWORK + BLOCKCHAIN_CONTRACT_ADDRESS are set, per the
 * Phase 27 + Blockchain Certs A-F memory entries). The contract here
 * is stable so swap-in is non-breaking.
 *
 * Test impact: zero. All consumers wrap `.commit()` in try/catch and
 * defensively check `res?.txId` before storing it. Tests that pass
 * `anchorLedger: null` are unaffected.
 */

'use strict';

const crypto = require('crypto');
const logger = require('../utils/logger');

function sha256Hex(input) {
  const buf = typeof input === 'string' ? input : JSON.stringify(input);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

const anchorLedgerService = {
  /**
   * Anchor a payload reference. Returns null txId in this minimal
   * implementation; future P1 wires a real chain.
   * @param {{
   *   kind?: string,
   *   type?: string,
   *   payloadHash?: string,
   *   payload?: any,
   *   entityId?: string,
   * }} input
   * @returns {Promise<{txId: null, anchored: boolean, kind: string|null, payloadHash: string|null, hashedAt: string}>}
   */
  async commit(input) {
    const event = input && typeof input === 'object' ? input : {};
    const kind = event.kind || event.type || null;

    // Prefer caller-supplied payloadHash; fall back to hashing payload.
    let payloadHash = null;
    if (event.payloadHash) {
      payloadHash = String(event.payloadHash);
    } else if (event.payload != null) {
      try {
        payloadHash = sha256Hex(event.payload);
      } catch {
        payloadHash = null;
      }
    }

    const line = {
      kind,
      entityId: event.entityId != null ? String(event.entityId) : null,
      payloadHash,
      anchored: false,
      reason: 'no-chain-client-wired',
    };
    if (logger && typeof logger.info === 'function') {
      logger.info(`anchor: ${kind || 'unknown'}`, line);
    }

    return {
      txId: null,
      anchored: false,
      kind,
      payloadHash,
      hashedAt: new Date().toISOString(),
    };
  },
};

module.exports = {
  anchorLedgerService,
};
