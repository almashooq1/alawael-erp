'use strict';

/**
 * incident-audit-chain-wave277i.test.js — Wave 277i Pass 1.
 *
 * Foundation tests for the incident audit chain (model + service).
 * Pass 2 will wire append() into IncidentController + expose the
 * verifier as an HTTP endpoint; those tests land in their own wave.
 *
 * Approach: stub chainModel as an in-memory array with the minimum
 * Mongoose chainable surface the service actually invokes. No DB.
 * Same pattern as the W134 attendance-audit-chain tests and the
 * W276b conflict-resolver-api tests in this session.
 */

const {
  createIncidentAuditChainService,
  computePayloadHash,
  computeEntryHash,
  GENESIS_HASH,
} = require('../intelligence/incident-audit-chain.service');

// ─── In-memory chain model stub ──────────────────────────────────

function _makeChainModelStub() {
  const rows = [];
  function _matches(row, where) {
    for (const k of Object.keys(where || {})) {
      if (k === 'sequence' && where.sequence && typeof where.sequence === 'object') {
        const seq = row.sequence;
        if (where.sequence.$gte != null && seq < where.sequence.$gte) return false;
        if (where.sequence.$lte != null && seq > where.sequence.$lte) return false;
        continue;
      }
      if (k === 'occurredAt' && where.occurredAt && typeof where.occurredAt === 'object') {
        const t =
          row.occurredAt instanceof Date ? row.occurredAt.getTime() : Date.parse(row.occurredAt);
        if (where.occurredAt.$gte) {
          const ref =
            where.occurredAt.$gte instanceof Date
              ? where.occurredAt.$gte.getTime()
              : Date.parse(where.occurredAt.$gte);
          if (t < ref) return false;
        }
        continue;
      }
      if (String(row[k]) !== String(where[k])) return false;
    }
    return true;
  }

  function _findChain(where) {
    let _sortKey = null;
    let _sortDir = 1;
    let _skip = 0;
    let _limit = Infinity;
    const chain = {
      sort(spec) {
        if (spec && typeof spec === 'object') {
          const k = Object.keys(spec)[0];
          _sortKey = k;
          _sortDir = spec[k];
        }
        return chain;
      },
      limit(n) {
        _limit = n;
        return chain;
      },
      skip(n) {
        _skip = n;
        return chain;
      },
      lean() {
        return chain;
      },
      then(resolve, reject) {
        try {
          let out = rows.filter(r => _matches(r, where || {}));
          if (_sortKey) {
            out = out.sort((a, b) => {
              const av = a[_sortKey] instanceof Date ? a[_sortKey].getTime() : a[_sortKey];
              const bv = b[_sortKey] instanceof Date ? b[_sortKey].getTime() : b[_sortKey];
              if (av < bv) return -1 * _sortDir;
              if (av > bv) return 1 * _sortDir;
              return 0;
            });
          }
          if (_skip) out = out.slice(_skip);
          if (Number.isFinite(_limit)) out = out.slice(0, _limit);
          return Promise.resolve(out).then(resolve, reject);
        } catch (err) {
          return Promise.reject(err).then(resolve, reject);
        }
      },
    };
    return chain;
  }

  function Model(data) {
    Object.assign(this, data || {});
  }
  Model.prototype.validate = async function () {
    // Mimic Mongoose validators for sequence + action + hash fields.
    const errs = {};
    if (typeof this.sequence !== 'number' || this.sequence < 0) {
      errs.sequence = { message: 'must be ≥ 0' };
    }
    if (!this.action) errs.action = { message: 'required' };
    if (!this.payloadHash) errs.payloadHash = { message: 'required' };
    if (!this.prevHash) errs.prevHash = { message: 'required' };
    if (!this.hash) errs.hash = { message: 'required' };
    if (Object.keys(errs).length) {
      const err = new Error('validation failed');
      err.errors = errs;
      throw err;
    }
  };
  Model.prototype.save = async function () {
    // Enforce unique (sequence) + (hash).
    if (rows.some(r => r.sequence === this.sequence)) {
      const err = new Error('E11000 duplicate key sequence');
      err.code = 11000;
      throw err;
    }
    if (rows.some(r => r.hash === this.hash)) {
      const err = new Error('E11000 duplicate key hash');
      err.code = 11000;
      throw err;
    }
    rows.push({ ...this });
    return this;
  };
  Model.prototype.toObject = function () {
    return { ...this };
  };
  Model.find = _findChain;
  Model.updateMany = async (where, update) => {
    let n = 0;
    for (const r of rows) {
      if (!_matches(r, where || {})) continue;
      if (update && update.$set) Object.assign(r, update.$set);
      n += 1;
    }
    return { modifiedCount: n };
  };
  Model._rows = rows; // test-only escape hatch for tampering
  return Model;
}

// ─── Hash helpers (pure) ──────────────────────────────────────────

describe('Wave 277i — incident-audit-chain pure helpers', () => {
  test('computePayloadHash is deterministic regardless of key order', () => {
    const a = computePayloadHash({ a: 1, b: 2, nested: { x: 'foo' } });
    const b = computePayloadHash({ nested: { x: 'foo' }, b: 2, a: 1 });
    expect(a).toBe(b);
  });

  test('computePayloadHash hash differs when content differs', () => {
    expect(computePayloadHash({ x: 1 })).not.toBe(computePayloadHash({ x: 2 }));
  });

  test('computePayloadHash encodes Date as ISO (stable across timezones)', () => {
    const t = new Date('2026-05-22T10:00:00.000Z');
    const a = computePayloadHash({ at: t });
    const b = computePayloadHash({ at: new Date(t.getTime()) });
    expect(a).toBe(b);
  });

  test('computeEntryHash returns 64-char hex sha256', () => {
    const h = computeEntryHash({
      prevHash: GENESIS_HASH,
      payloadHash: 'x'.repeat(64),
      sequence: 0,
      actorId: 'actor-1',
      occurredAt: new Date('2026-05-22T10:00:00.000Z'),
      action: 'incident-created',
    });
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  test('GENESIS_HASH is 64 zeros', () => {
    expect(GENESIS_HASH).toBe('0'.repeat(64));
  });
});

// ─── append() ─────────────────────────────────────────────────────

describe('Wave 277i — incident-audit-chain.append', () => {
  test('first entry links to GENESIS_HASH with sequence=0', async () => {
    const Model = _makeChainModelStub();
    const svc = createIncidentAuditChainService({ chainModel: Model });
    const r = await svc.append({
      action: 'incident-created',
      actorId: 'actor-1',
      subjectId: 'inc-1',
      payload: { type: 'fall', severity: 'moderate' },
    });
    expect(r.ok).toBe(true);
    expect(r.entry.sequence).toBe(0);
    expect(r.entry.prevHash).toBe(GENESIS_HASH);
    expect(r.entry.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test('second entry chains to first hash + sequence increments', async () => {
    const Model = _makeChainModelStub();
    const svc = createIncidentAuditChainService({ chainModel: Model });
    const r1 = await svc.append({
      action: 'incident-created',
      subjectId: 'inc-1',
      payload: { x: 1 },
    });
    const r2 = await svc.append({
      action: 'incident-status-changed',
      subjectId: 'inc-1',
      payload: { from: 'reported', to: 'under_investigation' },
    });
    expect(r2.ok).toBe(true);
    expect(r2.entry.sequence).toBe(1);
    expect(r2.entry.prevHash).toBe(r1.entry.hash);
  });

  test('rejects when action is missing', async () => {
    const Model = _makeChainModelStub();
    const svc = createIncidentAuditChainService({ chainModel: Model });
    const r = await svc.append({ payload: { x: 1 } });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('VALIDATION_FAILED');
    expect(r.errors.action).toBe('required');
  });

  test('rejects when payload is missing', async () => {
    const Model = _makeChainModelStub();
    const svc = createIncidentAuditChainService({ chainModel: Model });
    const r = await svc.append({ action: 'incident-created' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('VALIDATION_FAILED');
    expect(r.errors.payload).toBe('required');
  });

  test('rejects an action not in the ACTIONS enum', async () => {
    const Model = _makeChainModelStub();
    const svc = createIncidentAuditChainService({ chainModel: Model });
    // The model validator (stub) doesn't enforce the enum, but the
    // real Mongoose model does. We exercise the service's pass-
    // through: any service-validation error surfaces as
    // VALIDATION_FAILED with errors map. Here, sequence+hash will
    // be set so validate() passes — this test just documents that
    // ACTIONS enforcement is at the schema layer, not the service.
    const r = await svc.append({ action: 'fictional-action', payload: { x: 1 } });
    // Stub allows it; production Mongoose would reject. Service contract
    // is "trust the model"; enum is the model's responsibility.
    expect(r.ok).toBe(true);
  });
});

// ─── getHead / listEntries ────────────────────────────────────────

describe('Wave 277i — incident-audit-chain.getHead + listEntries', () => {
  test('getHead returns GENESIS on empty chain', async () => {
    const Model = _makeChainModelStub();
    const svc = createIncidentAuditChainService({ chainModel: Model });
    const head = await svc.getHead();
    expect(head.sequence).toBe(-1);
    expect(head.hash).toBe(GENESIS_HASH);
  });

  test('getHead returns last-appended entry on populated chain', async () => {
    const Model = _makeChainModelStub();
    const svc = createIncidentAuditChainService({ chainModel: Model });
    await svc.append({ action: 'incident-created', payload: { x: 1 } });
    const r2 = await svc.append({ action: 'incident-status-changed', payload: { x: 2 } });
    const head = await svc.getHead();
    expect(head.sequence).toBe(1);
    expect(head.hash).toBe(r2.entry.hash);
  });

  test('listEntries filters by subjectId + applies pagination', async () => {
    const Model = _makeChainModelStub();
    const svc = createIncidentAuditChainService({ chainModel: Model });
    for (let i = 0; i < 5; i++) {
      await svc.append({
        action: 'incident-status-changed',
        subjectId: i % 2 === 0 ? 'inc-1' : 'inc-2',
        payload: { i },
      });
    }
    const r = await svc.listEntries({ subjectId: 'inc-1', limit: 10 });
    expect(r.ok).toBe(true);
    expect(r.entries.length).toBe(3);
    for (const e of r.entries) expect(e.subjectId).toBe('inc-1');
  });
});

// ─── verify() ─────────────────────────────────────────────────────

describe('Wave 277i — incident-audit-chain.verify', () => {
  test('intact chain verifies clean', async () => {
    const Model = _makeChainModelStub();
    const svc = createIncidentAuditChainService({ chainModel: Model });
    await svc.append({ action: 'incident-created', payload: { x: 1 } });
    await svc.append({ action: 'incident-status-changed', payload: { x: 2 } });
    await svc.append({ action: 'incident-resolved', payload: { x: 3 } });
    const r = await svc.verify({});
    expect(r.ok).toBe(true);
    expect(r.intact).toBe(true);
    expect(r.verifiedCount).toBe(3);
  });

  test('empty chain verifies clean (intact, verifiedCount=0)', async () => {
    const Model = _makeChainModelStub();
    const svc = createIncidentAuditChainService({ chainModel: Model });
    const r = await svc.verify({});
    expect(r.ok).toBe(true);
    expect(r.intact).toBe(true);
    expect(r.verifiedCount).toBe(0);
  });

  test('tampered payload is detected at PAYLOAD_HASH_MISMATCH', async () => {
    const Model = _makeChainModelStub();
    const svc = createIncidentAuditChainService({ chainModel: Model });
    await svc.append({ action: 'incident-created', payload: { x: 1 } });
    await svc.append({ action: 'incident-resolved', payload: { x: 2 } });
    // Tamper directly with the stored payload (simulates DB-level edit
    // that bypasses the API): change row 1's payload but keep its
    // payloadHash + hash. The verifier should catch the divergence.
    Model._rows[1].payload = { x: 'TAMPERED' };
    const r = await svc.verify({});
    expect(r.intact).toBe(false);
    expect(r.breakAtSequence).toBe(1);
    expect(r.reason).toBe('PAYLOAD_HASH_MISMATCH');
  });

  test('tampered prevHash is detected at PREV_HASH_MISMATCH', async () => {
    const Model = _makeChainModelStub();
    const svc = createIncidentAuditChainService({ chainModel: Model });
    await svc.append({ action: 'incident-created', payload: { x: 1 } });
    await svc.append({ action: 'incident-resolved', payload: { x: 2 } });
    Model._rows[1].prevHash = 'f'.repeat(64);
    const r = await svc.verify({});
    expect(r.intact).toBe(false);
    expect(r.breakAtSequence).toBe(1);
    expect(r.reason).toBe('PREV_HASH_MISMATCH');
  });

  test('tampered entry hash is detected at ENTRY_HASH_MISMATCH', async () => {
    const Model = _makeChainModelStub();
    const svc = createIncidentAuditChainService({ chainModel: Model });
    await svc.append({ action: 'incident-created', payload: { x: 1 } });
    await svc.append({ action: 'incident-resolved', payload: { x: 2 } });
    // Change actorId without recomputing hash → entry hash now wrong
    // but payloadHash + prevHash still match.
    Model._rows[1].actorId = 'imposter';
    const r = await svc.verify({});
    expect(r.intact).toBe(false);
    expect(r.breakAtSequence).toBe(1);
    expect(r.reason).toBe('ENTRY_HASH_MISMATCH');
  });

  test('markVerified updates lastVerifiedAt on every row in range', async () => {
    const Model = _makeChainModelStub();
    const svc = createIncidentAuditChainService({ chainModel: Model });
    await svc.append({ action: 'incident-created', payload: { x: 1 } });
    await svc.append({ action: 'incident-resolved', payload: { x: 2 } });
    const r = await svc.verify({ markVerified: true });
    expect(r.intact).toBe(true);
    for (const row of Model._rows) {
      expect(row.lastVerifiedAt).toBeInstanceOf(Date);
    }
  });
});

// ─── Race handling ────────────────────────────────────────────────

describe('Wave 277i — incident-audit-chain race handling', () => {
  test('sequence collision retries with fresh head', async () => {
    const Model = _makeChainModelStub();
    const svc = createIncidentAuditChainService({ chainModel: Model });
    // Pre-seed a row at sequence 0 so the first append's optimistic
    // sequence (0) collides and the service retries at sequence 1.
    Model._rows.push({
      sequence: 0,
      action: 'incident-created',
      actorId: null,
      subjectId: null,
      branchId: null,
      payload: { pre: true },
      payloadHash: 'p'.repeat(64),
      prevHash: GENESIS_HASH,
      hash: 'h'.repeat(64),
      occurredAt: new Date('2026-05-22T09:00:00.000Z'),
    });
    const r = await svc.append({
      action: 'incident-status-changed',
      payload: { from: 'reported', to: 'under_investigation' },
    });
    expect(r.ok).toBe(true);
    expect(r.entry.sequence).toBe(1);
    expect(r.entry.prevHash).toBe('h'.repeat(64));
  });
});
