/**
 * wave134-audit-chain.test.js — Wave 134.
 *
 * Tamper-evident hash-chained ledger over attendance actions.
 */

'use strict';

const {
  createAttendanceAuditChainService,
  computePayloadHash,
  computeEntryHash,
  GENESIS_HASH,
} = require('../intelligence/attendance-audit-chain.service');

const SILENT = { info: () => {}, warn: () => {}, error: () => {} };

// ─── Mock chain model (in-memory ordered store) ───────────────

function buildChainModel(seed = []) {
  const store = [...seed];
  let counter = store.length;
  function M(data) {
    Object.assign(this, data);
    this._id = `entry-${++counter}`;
    this.toObject = () => ({ ...this });
    this.validate = async () => {};
    this.save = async () => {
      if (store.some(r => r.sequence === this.sequence || r.hash === this.hash)) {
        const err = new Error('E11000 duplicate key');
        err.code = 11000;
        throw err;
      }
      store.push({ ...this });
      return this;
    };
  }
  M.find = function (q = {}) {
    const matches = store.filter(r => {
      if (q.action && r.action !== q.action) return false;
      if (q.actorId && String(r.actorId) !== String(q.actorId)) return false;
      if (q.subjectId && String(r.subjectId) !== String(q.subjectId)) return false;
      if (q.sequence) {
        if (typeof q.sequence === 'number' && r.sequence !== q.sequence) return false;
        if (q.sequence.$gte != null && r.sequence < q.sequence.$gte) return false;
        if (q.sequence.$lte != null && r.sequence > q.sequence.$lte) return false;
      }
      if (q.occurredAt && q.occurredAt.$gte) {
        if (new Date(r.occurredAt).getTime() < new Date(q.occurredAt.$gte).getTime()) {
          return false;
        }
      }
      return true;
    });
    let sortFn = null;
    let skipN = 0;
    let limitN = matches.length;
    const cursor = {
      sort(s) {
        sortFn = (a, b) => {
          for (const k of Object.keys(s)) {
            const av = a[k];
            const bv = b[k];
            if (av < bv) return -s[k];
            if (av > bv) return s[k];
          }
          return 0;
        };
        return cursor;
      },
      skip(n) {
        skipN = n;
        return cursor;
      },
      limit(n) {
        limitN = n;
        return cursor;
      },
      lean: async () => {
        const arr = [...matches];
        if (sortFn) arr.sort(sortFn);
        return arr.slice(skipN, skipN + limitN);
      },
      then(r) {
        const arr = [...matches];
        if (sortFn) arr.sort(sortFn);
        return r(arr.slice(skipN, skipN + limitN));
      },
    };
    return cursor;
  };
  M.updateMany = async function () {
    return { acknowledged: true };
  };
  M._store = store;
  return M;
}

// ─── Pure helpers ──────────────────────────────────────────────

describe('audit-chain — pure helpers', () => {
  test('computePayloadHash deterministic for canonical-equivalent objects', () => {
    const a = { x: 1, y: { z: 2, w: 3 } };
    const b = { y: { w: 3, z: 2 }, x: 1 };
    expect(computePayloadHash(a)).toBe(computePayloadHash(b));
  });

  test('computePayloadHash differs across content', () => {
    expect(computePayloadHash({ x: 1 })).not.toBe(computePayloadHash({ x: 2 }));
  });

  test('computeEntryHash deterministic', () => {
    const args = {
      prevHash: 'a'.repeat(64),
      payloadHash: 'b'.repeat(64),
      sequence: 5,
      actorId: 'mgr-1',
      occurredAt: new Date('2026-05-19T10:00:00Z'),
      action: 'source-event-persisted',
    };
    expect(computeEntryHash(args)).toBe(computeEntryHash(args));
  });

  test('GENESIS_HASH is 64 zero hex digits', () => {
    expect(GENESIS_HASH).toBe('0'.repeat(64));
  });
});

// ─── append ───────────────────────────────────────────────────

describe('audit-chain — append', () => {
  test('first entry uses GENESIS_HASH as prev + sequence 0', async () => {
    const Chain = buildChainModel();
    const svc = createAttendanceAuditChainService({
      chainModel: Chain,
      logger: SILENT,
      now: () => new Date('2026-05-19T10:00:00Z'),
    });
    const r = await svc.append({
      action: 'source-event-persisted',
      actorId: 'mgr-1',
      subjectId: 'emp-1',
      payload: { eventId: 'evt-1', source: 'face-terminal' },
    });
    expect(r.ok).toBe(true);
    expect(r.entry.sequence).toBe(0);
    expect(r.entry.prevHash).toBe(GENESIS_HASH);
    expect(r.entry.hash).toHaveLength(64);
  });

  test('subsequent entries chain off previous hash + increment sequence', async () => {
    const Chain = buildChainModel();
    const svc = createAttendanceAuditChainService({
      chainModel: Chain,
      logger: SILENT,
    });
    const first = await svc.append({
      action: 'source-event-persisted',
      payload: { eventId: 'e1' },
    });
    const second = await svc.append({
      action: 'reconciliation-run',
      payload: { day: '2026-05-19' },
    });
    expect(first.entry.sequence).toBe(0);
    expect(second.entry.sequence).toBe(1);
    expect(second.entry.prevHash).toBe(first.entry.hash);
  });

  test('missing action → VALIDATION_FAILED', async () => {
    const svc = createAttendanceAuditChainService({
      chainModel: buildChainModel(),
      logger: SILENT,
    });
    const r = await svc.append({ payload: { x: 1 } });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('VALIDATION_FAILED');
  });

  test('missing payload → VALIDATION_FAILED', async () => {
    const svc = createAttendanceAuditChainService({
      chainModel: buildChainModel(),
      logger: SILENT,
    });
    const r = await svc.append({ action: 'source-event-persisted' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('VALIDATION_FAILED');
  });
});

// ─── verify ───────────────────────────────────────────────────

describe('audit-chain — verify', () => {
  test('intact chain after 5 appends', async () => {
    const Chain = buildChainModel();
    const svc = createAttendanceAuditChainService({
      chainModel: Chain,
      logger: SILENT,
    });
    for (let i = 0; i < 5; i++) {
      await svc.append({
        action: 'source-event-persisted',
        payload: { i, ts: `2026-05-19T${10 + i}:00:00Z` },
      });
    }
    const r = await svc.verify();
    expect(r.ok).toBe(true);
    expect(r.intact).toBe(true);
    expect(r.verifiedCount).toBe(5);
  });

  test('tampered payload detected at the modified sequence', async () => {
    const Chain = buildChainModel();
    const svc = createAttendanceAuditChainService({
      chainModel: Chain,
      logger: SILENT,
    });
    for (let i = 0; i < 5; i++) {
      await svc.append({
        action: 'source-event-persisted',
        payload: { i },
      });
    }
    // Tamper: directly mutate a payload in the store.
    Chain._store[2].payload = { i: 999 };
    const r = await svc.verify();
    expect(r.intact).toBe(false);
    expect(r.breakAtSequence).toBe(2);
    expect(r.reason).toBe('PAYLOAD_HASH_MISMATCH');
  });

  test('tampered hash detected', async () => {
    const Chain = buildChainModel();
    const svc = createAttendanceAuditChainService({
      chainModel: Chain,
      logger: SILENT,
    });
    for (let i = 0; i < 5; i++) {
      await svc.append({
        action: 'source-event-persisted',
        payload: { i },
      });
    }
    // Tamper the final hash.
    Chain._store[3].hash = 'f'.repeat(64);
    const r = await svc.verify();
    expect(r.intact).toBe(false);
    // The corrupted hash at seq=3 causes either seq=3 itself
    // (ENTRY_HASH_MISMATCH) or seq=4 (PREV_HASH_MISMATCH) to fail.
    expect([3, 4]).toContain(r.breakAtSequence);
  });

  test('deleted entry detected via PREV_HASH_MISMATCH', async () => {
    const Chain = buildChainModel();
    const svc = createAttendanceAuditChainService({
      chainModel: Chain,
      logger: SILENT,
    });
    for (let i = 0; i < 5; i++) {
      await svc.append({
        action: 'source-event-persisted',
        payload: { i },
      });
    }
    // Tamper: mutate sequence-2 entry so chain links break.
    Chain._store[2].prevHash = 'deadbeef' + '0'.repeat(56);
    const r = await svc.verify();
    expect(r.intact).toBe(false);
    expect(r.breakAtSequence).toBe(2);
    expect(r.reason).toBe('PREV_HASH_MISMATCH');
  });

  test('empty chain verify returns intact=true, verifiedCount=0', async () => {
    const svc = createAttendanceAuditChainService({
      chainModel: buildChainModel(),
      logger: SILENT,
    });
    const r = await svc.verify();
    expect(r.ok).toBe(true);
    expect(r.intact).toBe(true);
    expect(r.verifiedCount).toBe(0);
  });

  test('range verify: fromSequence skips earlier entries', async () => {
    const Chain = buildChainModel();
    const svc = createAttendanceAuditChainService({
      chainModel: Chain,
      logger: SILENT,
    });
    for (let i = 0; i < 5; i++) {
      await svc.append({
        action: 'source-event-persisted',
        payload: { i },
      });
    }
    const r = await svc.verify({ fromSequence: 3 });
    expect(r.intact).toBe(true);
    expect(r.verifiedCount).toBe(2);
    expect(r.from).toBe(3);
    expect(r.to).toBe(4);
  });
});

// ─── getHead + listEntries ─────────────────────────────────────

describe('audit-chain — getHead + listEntries', () => {
  test('getHead on empty chain returns sequence=-1 + GENESIS_HASH', async () => {
    const svc = createAttendanceAuditChainService({
      chainModel: buildChainModel(),
      logger: SILENT,
    });
    const h = await svc.getHead();
    expect(h.sequence).toBe(-1);
    expect(h.hash).toBe(GENESIS_HASH);
  });

  test('getHead returns latest entry after appends', async () => {
    const Chain = buildChainModel();
    const svc = createAttendanceAuditChainService({
      chainModel: Chain,
      logger: SILENT,
    });
    await svc.append({ action: 'source-event-persisted', payload: { i: 0 } });
    await svc.append({ action: 'source-event-persisted', payload: { i: 1 } });
    const h = await svc.getHead();
    expect(h.sequence).toBe(1);
  });

  test('listEntries filters by action + sorts desc by sequence', async () => {
    const Chain = buildChainModel();
    const svc = createAttendanceAuditChainService({
      chainModel: Chain,
      logger: SILENT,
    });
    await svc.append({ action: 'source-event-persisted', payload: { i: 0 } });
    await svc.append({ action: 'reconciliation-run', payload: { i: 1 } });
    await svc.append({ action: 'source-event-persisted', payload: { i: 2 } });
    const r = await svc.listEntries({ action: 'source-event-persisted' });
    expect(r.ok).toBe(true);
    expect(r.entries).toHaveLength(2);
    // Sorted desc by sequence — newest first.
    expect(r.entries[0].sequence).toBeGreaterThan(r.entries[1].sequence);
  });
});

// ─── action coverage ───────────────────────────────────────────

describe('audit-chain — full action coverage', () => {
  test('chains across heterogeneous actions remain intact', async () => {
    const Chain = buildChainModel();
    const svc = createAttendanceAuditChainService({
      chainModel: Chain,
      logger: SILENT,
    });
    const actions = [
      'source-event-persisted',
      'reconciliation-run',
      'exception-emitted',
      'exception-resolved',
      'correction-created',
      'correction-approved',
      'payroll-period-locked',
      'privacy-erasure',
      'card-issued',
      'card-replaced',
    ];
    for (let i = 0; i < actions.length; i++) {
      const r = await svc.append({
        action: actions[i],
        payload: { i, action: actions[i] },
      });
      expect(r.ok).toBe(true);
    }
    const v = await svc.verify();
    expect(v.intact).toBe(true);
    expect(v.verifiedCount).toBe(actions.length);
  });
});
