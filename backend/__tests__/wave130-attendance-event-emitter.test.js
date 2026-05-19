/**
 * wave130-attendance-event-emitter.test.js — Wave 130.
 *
 * Outbox-pattern event emitter for downstream Payroll/HR/KPI hooks.
 */

'use strict';

const reg = require('../intelligence/attendance.registry');
const {
  createAttendanceEventEmitter,
  DEFAULT_MAX_ATTEMPTS,
} = require('../intelligence/attendance-event-emitter.service');

const SILENT = { info: () => {}, warn: () => {}, error: () => {} };

// ─── Mocks ──────────────────────────────────────────────────────

function buildOutboxModel(seed = []) {
  const store = seed.map((s, i) => ({ _id: s._id || `out-seed-${i + 1}`, ...s }));
  let counter = store.length;
  function M(data) {
    Object.assign(this, data);
    this._id = `out-${++counter}`;
    this.toObject = () => ({ ...this });
    this.validate = async () => {};
    this.save = async () => {
      store.push({ ...this });
      return this;
    };
  }
  M.findOne = function (q = {}) {
    const m = store.find(r => {
      if (q.idempotencyKey && r.idempotencyKey !== q.idempotencyKey) return false;
      return true;
    });
    return {
      lean: async () => (m ? { ...m } : null),
      then: r => r(m ? { ...m } : null),
    };
  };
  M.find = function (q = {}) {
    const matches = store.filter(r => {
      if (q.status && r.status !== q.status) return false;
      if (q.topic && r.topic !== q.topic) return false;
      return true;
    });
    let sortFn = null;
    let limitN = matches.length;
    const cursor = {
      sort(s) {
        sortFn = (a, b) => {
          for (const k of Object.keys(s)) {
            const av = new Date(a[k]).getTime();
            const bv = new Date(b[k]).getTime();
            if (av < bv) return -s[k];
            if (av > bv) return s[k];
          }
          return 0;
        };
        return cursor;
      },
      limit(n) {
        limitN = n;
        return cursor;
      },
      lean: async () => {
        const arr = [...matches];
        if (sortFn) arr.sort(sortFn);
        return arr.slice(0, limitN);
      },
      then(r) {
        const arr = [...matches];
        if (sortFn) arr.sort(sortFn);
        return r(arr.slice(0, limitN));
      },
    };
    return cursor;
  };
  M.updateOne = async function (q, update) {
    const idx = store.findIndex(r => String(r._id) === String(q._id));
    if (idx < 0) return { acknowledged: false };
    if (update.$set) {
      Object.assign(store[idx], update.$set);
    }
    return { acknowledged: true };
  };
  M._store = store;
  return M;
}

function buildSourceEventModel(seed = []) {
  const M = {};
  M.find = function (q = {}) {
    const matches = seed.filter(r => {
      if (q.employeeId && String(r.employeeId) !== String(q.employeeId)) return false;
      if (q.eventTime && q.eventTime.$gte) {
        if (new Date(r.eventTime).getTime() < new Date(q.eventTime.$gte).getTime()) return false;
      }
      if (q.eventTime && q.eventTime.$lte) {
        if (new Date(r.eventTime).getTime() > new Date(q.eventTime.$lte).getTime()) return false;
      }
      return true;
    });
    return {
      lean: async () => matches.map(r => ({ ...r })),
      then: r => r(matches.map(x => ({ ...x }))),
    };
  };
  return M;
}

// ─── emit ──────────────────────────────────────────────────────

describe('event-emitter — emit', () => {
  test('persists pending row', async () => {
    const Out = buildOutboxModel();
    const svc = createAttendanceEventEmitter({
      outboxModel: Out,
      logger: SILENT,
      now: () => new Date('2026-05-19T10:00:00Z'),
    });
    const r = await svc.emit({
      topic: 'attendance.source-event.persisted',
      payload: { eventId: 'evt-1' },
      idempotencyKey: 'attendance.source-event.persisted|evt-1',
    });
    expect(r.ok).toBe(true);
    expect(Out._store).toHaveLength(1);
    expect(Out._store[0].status).toBe('pending');
  });

  test('idempotent on same key', async () => {
    const Out = buildOutboxModel();
    const svc = createAttendanceEventEmitter({ outboxModel: Out, logger: SILENT });
    const first = await svc.emit({
      topic: 'attendance.daily-rollup',
      payload: { day: '2026-05-19', employeeId: 'emp-1' },
      idempotencyKey: 'daily-rollup|emp-1|2026-05-19',
    });
    expect(first.ok).toBe(true);
    const second = await svc.emit({
      topic: 'attendance.daily-rollup',
      payload: { day: '2026-05-19', employeeId: 'emp-1' },
      idempotencyKey: 'daily-rollup|emp-1|2026-05-19',
    });
    expect(second.ok).toBe(true);
    expect(second.idempotent).toBe(true);
    expect(Out._store).toHaveLength(1);
  });

  test('missing topic → VALIDATION_FAILED', async () => {
    const svc = createAttendanceEventEmitter({
      outboxModel: buildOutboxModel(),
      logger: SILENT,
    });
    const r = await svc.emit({
      payload: { x: 1 },
      idempotencyKey: 'k',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
  });

  test('missing idempotencyKey → VALIDATION_FAILED', async () => {
    const svc = createAttendanceEventEmitter({
      outboxModel: buildOutboxModel(),
      logger: SILENT,
    });
    const r = await svc.emit({
      topic: 't',
      payload: { x: 1 },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
  });
});

// ─── subscribe + dispatchPending ───────────────────────────────

describe('event-emitter — subscribe + dispatchPending', () => {
  test('delivers pending event to subscriber and marks delivered', async () => {
    const Out = buildOutboxModel();
    const svc = createAttendanceEventEmitter({ outboxModel: Out, logger: SILENT });
    let received = null;
    svc.subscribe('attendance.daily-rollup', async ({ topic, payload }) => {
      received = { topic, payload };
      return { ok: true };
    });
    await svc.emit({
      topic: 'attendance.daily-rollup',
      payload: { employeeId: 'emp-1' },
      idempotencyKey: 'k1',
    });
    const r = await svc.dispatchPending();
    expect(r.delivered).toBe(1);
    expect(Out._store[0].status).toBe('delivered');
    expect(received.payload.employeeId).toBe('emp-1');
  });

  test('no handlers registered → counted but row stays pending', async () => {
    const Out = buildOutboxModel();
    const svc = createAttendanceEventEmitter({ outboxModel: Out, logger: SILENT });
    await svc.emit({
      topic: 'attendance.daily-rollup',
      payload: { x: 1 },
      idempotencyKey: 'k1',
    });
    const r = await svc.dispatchPending();
    expect(r.noHandlers).toBe(1);
    expect(r.delivered).toBe(0);
    expect(Out._store[0].status).toBe('pending');
  });

  test('handler throws → row marked failed after maxAttempts', async () => {
    const Out = buildOutboxModel();
    const svc = createAttendanceEventEmitter({ outboxModel: Out, logger: SILENT });
    svc.subscribe('attendance.daily-rollup', async () => {
      throw new Error('payroll-down');
    });
    await svc.emit({
      topic: 'attendance.daily-rollup',
      payload: { x: 1 },
      idempotencyKey: 'k1',
    });
    // Run dispatch maxAttempts times.
    for (let i = 0; i < DEFAULT_MAX_ATTEMPTS; i++) {
      await svc.dispatchPending();
    }
    expect(Out._store[0].status).toBe('failed');
    expect(Out._store[0].deliveryAttempts).toBe(DEFAULT_MAX_ATTEMPTS);
    expect(Out._store[0].lastError).toContain('payroll-down');
  });

  test('handler returns ok:false → row pending with attempts incremented', async () => {
    const Out = buildOutboxModel();
    const svc = createAttendanceEventEmitter({ outboxModel: Out, logger: SILENT });
    svc.subscribe('attendance.daily-rollup', async () => ({
      ok: false,
      error: 'temporary-glitch',
    }));
    await svc.emit({
      topic: 'attendance.daily-rollup',
      payload: { x: 1 },
      idempotencyKey: 'k1',
    });
    const r1 = await svc.dispatchPending();
    expect(r1.delivered).toBe(0);
    expect(Out._store[0].status).toBe('pending');
    expect(Out._store[0].deliveryAttempts).toBe(1);
    expect(Out._store[0].lastError).toBe('temporary-glitch');
  });

  test('multiple subscribers — all must succeed for delivery', async () => {
    const Out = buildOutboxModel();
    const svc = createAttendanceEventEmitter({ outboxModel: Out, logger: SILENT });
    let sub1Called = false;
    let sub2Called = false;
    svc.subscribe('attendance.exception.opened', async () => {
      sub1Called = true;
      return { ok: true };
    });
    svc.subscribe('attendance.exception.opened', async () => {
      sub2Called = true;
      return { ok: false, error: 'sub2-down' };
    });
    await svc.emit({
      topic: 'attendance.exception.opened',
      payload: { excId: 'e-1' },
      idempotencyKey: 'k1',
    });
    await svc.dispatchPending();
    expect(sub1Called).toBe(true);
    // sub2 ran and failed → row stays pending.
    expect(Out._store[0].status).toBe('pending');
    expect(Out._store[0].lastError).toBe('sub2-down');
  });

  test('topic filter on dispatch', async () => {
    const Out = buildOutboxModel();
    const svc = createAttendanceEventEmitter({ outboxModel: Out, logger: SILENT });
    svc.subscribe('attendance.daily-rollup', async () => ({ ok: true }));
    svc.subscribe('attendance.exception.opened', async () => ({ ok: true }));
    await svc.emit({
      topic: 'attendance.daily-rollup',
      payload: { x: 1 },
      idempotencyKey: 'k1',
    });
    await svc.emit({
      topic: 'attendance.exception.opened',
      payload: { x: 2 },
      idempotencyKey: 'k2',
    });
    const r = await svc.dispatchPending({ topic: 'attendance.daily-rollup' });
    expect(r.delivered).toBe(1);
    expect(r.scanned).toBe(1);
    // The other topic is untouched.
    const otherRow = Out._store.find(row => row.topic === 'attendance.exception.opened');
    expect(otherRow.status).toBe('pending');
  });

  test('unsubscribe removes handler', async () => {
    const Out = buildOutboxModel();
    const svc = createAttendanceEventEmitter({ outboxModel: Out, logger: SILENT });
    const h = async () => ({ ok: true });
    svc.subscribe('topic-x', h);
    expect(svc.listSubscribers('topic-x')).toHaveLength(1);
    svc.unsubscribe('topic-x', h);
    expect(svc.listSubscribers('topic-x')).toHaveLength(0);
  });
});

// ─── computeDailyRollup ────────────────────────────────────────

describe('event-emitter — computeDailyRollup', () => {
  test('computes worked minutes from check-in/out span', async () => {
    const events = [
      {
        employeeId: 'emp-1',
        eventTime: new Date('2026-05-19T08:00:00Z'),
        eventKind: 'check-in',
        source: 'face-terminal',
      },
      {
        employeeId: 'emp-1',
        eventTime: new Date('2026-05-19T17:30:00Z'),
        eventKind: 'check-out',
        source: 'face-terminal',
      },
    ];
    const svc = createAttendanceEventEmitter({
      outboxModel: buildOutboxModel(),
      logger: SILENT,
    });
    const r = await svc.computeDailyRollup({
      employeeId: 'emp-1',
      dayDate: new Date('2026-05-19'),
      sourceEventModel: buildSourceEventModel(events),
    });
    expect(r.ok).toBe(true);
    expect(r.workedMinutes).toBe(9 * 60 + 30); // 9h 30m
    expect(r.eventCount).toBe(2);
    expect(r.sources).toContain('face-terminal');
  });

  test('check-in without check-out → workedMinutes null', async () => {
    const events = [
      {
        employeeId: 'emp-1',
        eventTime: new Date('2026-05-19T08:00:00Z'),
        eventKind: 'check-in',
        source: 'nfc',
      },
    ];
    const svc = createAttendanceEventEmitter({
      outboxModel: buildOutboxModel(),
      logger: SILENT,
    });
    const r = await svc.computeDailyRollup({
      employeeId: 'emp-1',
      dayDate: new Date('2026-05-19'),
      sourceEventModel: buildSourceEventModel(events),
    });
    expect(r.workedMinutes).toBeNull();
    expect(r.checkInAt).toBeTruthy();
    expect(r.checkOutAt).toBeNull();
  });

  test('missing args validated', async () => {
    const svc = createAttendanceEventEmitter({
      outboxModel: buildOutboxModel(),
      logger: SILENT,
    });
    const r = await svc.computeDailyRollup({});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.EMPLOYEE_REQUIRED);
  });
});
