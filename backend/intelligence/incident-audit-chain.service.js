'use strict';

/**
 * incident-audit-chain.service.js — Wave 277i Pass 1 (foundation).
 *
 * Tamper-evident hash-chained ledger over the incident lifecycle.
 * Mirrors the attendance-audit-chain (W134) pattern. Pass 1 ships
 * the model + service in isolation; Pass 2 wires `append()` calls
 * into IncidentController + exposes the verifier as an HTTP
 * endpoint (separate commit so this lib lands self-contained and
 * its tests pass before any controller mutation).
 *
 * ── Why a parallel chain instead of one global audit log? ────────
 *
 * Per-domain chains give per-domain verification cadence + scoped
 * forensic queries. A global table mixing payroll + biometric +
 * incidents puts compliance signal next to operational noise; a
 * dedicated `incident_audit_chain` collection is what regulators
 * (Saudi MOH, JCI) actually want to inspect.
 *
 * ── Public API (matches AttendanceAuditChain for muscle memory) ──
 *
 *   append({ action, actorId?, actorRole?, subjectId?, branchId?,
 *             payload, occurredAt? })
 *     → { ok:true, entry } | { ok:false, reason, errors? }
 *
 *   verify({ fromSequence?, toSequence?, markVerified? })
 *     → { ok:true, intact:bool, breakAtSequence?, reason?,
 *         verifiedCount, from, to }
 *
 *   getHead() → { sequence, hash }
 *
 *   listEntries({ action?, actorId?, subjectId?, since?, limit?, skip? })
 *     → { ok:true, entries[] }
 *
 * Hash composition (identical to attendance-audit-chain):
 *   payloadHash = sha256(canonical(payload))
 *   entryHash   = sha256(prevHash || payloadHash || sequence ||
 *                        actorId || occurredAt.iso || action)
 *
 * Race handling: unique index on (sequence) + (hash); a concurrent
 * write that loses the race retries with a fresh head up to
 * MAX_RACE_RETRIES. The chain stays linearizable.
 */

const crypto = require('crypto');

const MAX_RACE_RETRIES = 5;
const GENESIS_HASH = '0'.repeat(64);

function _canonical(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(_canonical);
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    const out = {};
    for (const k of keys) out[k] = _canonical(value[k]);
    return out;
  }
  return value;
}

function computePayloadHash(payload) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(_canonical(payload)))
    .digest('hex');
}

function computeEntryHash({ prevHash, payloadHash, sequence, actorId, occurredAt, action }) {
  const parts = [
    String(prevHash || ''),
    String(payloadHash || ''),
    String(sequence),
    String(actorId || ''),
    occurredAt instanceof Date ? occurredAt.toISOString() : String(occurredAt || ''),
    String(action || ''),
  ];
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}

function createIncidentAuditChainService({
  chainModel = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!chainModel) {
    throw new Error('incident-audit-chain: chainModel required');
  }

  async function _getHead() {
    let cursor = chainModel.find({});
    if (typeof cursor.sort === 'function') cursor = cursor.sort({ sequence: -1 });
    if (typeof cursor.limit === 'function') cursor = cursor.limit(1);
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    try {
      const rows = (await cursor) || [];
      if (rows.length === 0) {
        return { sequence: -1, hash: GENESIS_HASH };
      }
      return { sequence: rows[0].sequence, hash: rows[0].hash };
    } catch (err) {
      logger.warn(`[incident-audit-chain] head lookup failed: ${err.message}`);
      return { sequence: -1, hash: GENESIS_HASH };
    }
  }

  async function append({
    action,
    actorId = null,
    actorRole = null,
    subjectId = null,
    branchId = null,
    payload,
    occurredAt = null,
  } = {}) {
    if (!action) {
      return { ok: false, reason: 'VALIDATION_FAILED', errors: { action: 'required' } };
    }
    if (payload === undefined || payload === null) {
      return { ok: false, reason: 'VALIDATION_FAILED', errors: { payload: 'required' } };
    }
    const at = occurredAt instanceof Date ? occurredAt : occurredAt ? new Date(occurredAt) : now();
    const payloadHash = computePayloadHash(payload);

    for (let attempt = 0; attempt < MAX_RACE_RETRIES; attempt++) {
      const head = await _getHead();
      const nextSeq = head.sequence + 1;
      const hash = computeEntryHash({
        prevHash: head.hash,
        payloadHash,
        sequence: nextSeq,
        actorId,
        occurredAt: at,
        action,
      });
      const doc = new chainModel({
        sequence: nextSeq,
        action,
        actorId,
        actorRole,
        subjectId,
        branchId,
        payload,
        payloadHash,
        prevHash: head.hash,
        hash,
        occurredAt: at,
      });
      try {
        await doc.validate();
      } catch (err) {
        const errors = {};
        if (err && err.errors) {
          for (const [k, v] of Object.entries(err.errors)) {
            errors[k] = (v && v.message) || String(v);
          }
        }
        return { ok: false, reason: 'VALIDATION_FAILED', errors };
      }
      try {
        await doc.save();
        return { ok: true, entry: doc.toObject ? doc.toObject() : doc };
      } catch (err) {
        const msg = String(err && err.message);
        const isDup = err && (err.code === 11000 || /duplicate key|E11000/i.test(msg));
        if (isDup && attempt < MAX_RACE_RETRIES - 1) continue;
        logger.error('[incident-audit-chain] append save failed:', msg);
        return { ok: false, reason: 'SAVE_FAILED', error: msg };
      }
    }
    return { ok: false, reason: 'TOO_MANY_RACES' };
  }

  async function verify({ fromSequence = 0, toSequence = null, markVerified = false } = {}) {
    const q = {};
    if (fromSequence != null) q.sequence = { $gte: fromSequence };
    if (toSequence != null) q.sequence = { ...(q.sequence || {}), $lte: toSequence };

    let cursor = chainModel.find(q);
    if (typeof cursor.sort === 'function') cursor = cursor.sort({ sequence: 1 });
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    let rows = [];
    try {
      rows = (await cursor) || [];
    } catch (err) {
      logger.warn(`[incident-audit-chain] verify load failed: ${err.message}`);
      return { ok: false, reason: 'LOAD_FAILED' };
    }
    if (rows.length === 0) {
      return { ok: true, intact: true, verifiedCount: 0 };
    }

    let expectedPrev;
    if (rows[0].sequence === 0) {
      expectedPrev = GENESIS_HASH;
    } else {
      let c2 = chainModel.find({ sequence: rows[0].sequence - 1 });
      if (typeof c2.lean === 'function') c2 = c2.lean();
      const prevRows = (await c2) || [];
      if (prevRows.length === 0) {
        return {
          ok: true,
          intact: false,
          breakAtSequence: rows[0].sequence,
          reason: 'PREV_ENTRY_MISSING',
        };
      }
      expectedPrev = prevRows[0].hash;
    }

    for (const row of rows) {
      if (row.prevHash !== expectedPrev) {
        return {
          ok: true,
          intact: false,
          breakAtSequence: row.sequence,
          reason: 'PREV_HASH_MISMATCH',
        };
      }
      const recomputedPayloadHash = computePayloadHash(row.payload);
      if (recomputedPayloadHash !== row.payloadHash) {
        return {
          ok: true,
          intact: false,
          breakAtSequence: row.sequence,
          reason: 'PAYLOAD_HASH_MISMATCH',
        };
      }
      const recomputedHash = computeEntryHash({
        prevHash: row.prevHash,
        payloadHash: row.payloadHash,
        sequence: row.sequence,
        actorId: row.actorId,
        occurredAt: row.occurredAt,
        action: row.action,
      });
      if (recomputedHash !== row.hash) {
        return {
          ok: true,
          intact: false,
          breakAtSequence: row.sequence,
          reason: 'ENTRY_HASH_MISMATCH',
        };
      }
      expectedPrev = row.hash;
    }

    if (markVerified && typeof chainModel.updateMany === 'function') {
      try {
        await chainModel.updateMany(q, { $set: { lastVerifiedAt: now() } });
      } catch (err) {
        logger.warn(`[incident-audit-chain] mark verified failed: ${err.message}`);
      }
    }

    return {
      ok: true,
      intact: true,
      verifiedCount: rows.length,
      from: rows[0].sequence,
      to: rows[rows.length - 1].sequence,
    };
  }

  async function getHead() {
    return _getHead();
  }

  async function listEntries({
    action = null,
    actorId = null,
    subjectId = null,
    since = null,
    limit = 100,
    skip = 0,
  } = {}) {
    const q = {};
    if (action) q.action = action;
    if (actorId) q.actorId = actorId;
    if (subjectId) q.subjectId = subjectId;
    if (since) q.occurredAt = { $gte: since };
    let cursor = chainModel.find(q);
    if (typeof cursor.sort === 'function') cursor = cursor.sort({ sequence: -1 });
    if (typeof cursor.skip === 'function') cursor = cursor.skip(skip);
    if (typeof cursor.limit === 'function') cursor = cursor.limit(limit);
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    try {
      return { ok: true, entries: (await cursor) || [] };
    } catch (err) {
      logger.warn(`[incident-audit-chain] listEntries failed: ${err.message}`);
      return { ok: false, reason: 'LOAD_FAILED' };
    }
  }

  return {
    append,
    verify,
    getHead,
    listEntries,
    computePayloadHash,
    computeEntryHash,
    GENESIS_HASH,
  };
}

module.exports = {
  createIncidentAuditChainService,
  computePayloadHash,
  computeEntryHash,
  GENESIS_HASH,
};
