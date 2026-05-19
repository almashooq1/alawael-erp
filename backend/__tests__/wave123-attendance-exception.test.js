/**
 * wave123-attendance-exception.test.js — Wave 123.
 *
 * Tests the attendance exception service: emit + lifecycle +
 * pattern detection.
 */

'use strict';

const reg = require('../intelligence/attendance.registry');
const {
  createAttendanceExceptionService,
} = require('../intelligence/attendance-exception.service');

const SILENT = { info: () => {}, warn: () => {}, error: () => {} };

// ─── In-memory mocks ───────────────────────────────────────────

function buildExceptionModel() {
  const store = [];
  let counter = 0;
  function M(data) {
    Object.assign(this, data);
    this._id = `exc-${++counter}`;
    this.toObject = () => ({ ...this });
    this.validate = async () => {
      if (!this.kind || !reg.EXCEPTION_KINDS.includes(this.kind)) {
        const e = new Error('Validation failed');
        e.errors = { kind: { message: 'invalid kind' } };
        throw e;
      }
      if (!this.dedupKey) {
        const e = new Error('Validation failed');
        e.errors = { dedupKey: { message: 'required' } };
        throw e;
      }
      if (
        (this.status === reg.EXCEPTION_STATUS.RESOLVED ||
          this.status === reg.EXCEPTION_STATUS.DISMISSED ||
          this.status === reg.EXCEPTION_STATUS.ESCALATED) &&
        (!this.resolution || !this.resolution.actorId)
      ) {
        const e = new Error('Validation failed');
        e.errors = { 'resolution.actorId': { message: 'required for terminal status' } };
        throw e;
      }
    };
    this.save = async () => {
      // unique on dedupKey
      const conflict = store.find(r => r.dedupKey === this.dedupKey);
      if (conflict) {
        const e = new Error('E11000 duplicate key');
        e.code = 11000;
        throw e;
      }
      store.push({ ...this });
      return this;
    };
  }
  M.findOne = q => {
    const match = store.find(r => {
      for (const [k, v] of Object.entries(q)) {
        if (String(r[k]) !== String(v)) return false;
      }
      return true;
    });
    return { lean: async () => (match ? { ...match } : null), then: r => r(match || null) };
  };
  M.findById = id => {
    const match = store.find(r => String(r._id) === String(id));
    return { lean: async () => (match ? { ...match } : null), then: r => r(match || null) };
  };
  M.find = (q = {}) => {
    let matches = store.filter(r => {
      for (const [k, v] of Object.entries(q)) {
        if (v && typeof v === 'object' && '$in' in v) {
          if (!v.$in.some(x => String(x) === String(r[k]))) return false;
        } else if (String(r[k]) !== String(v)) {
          return false;
        }
      }
      return true;
    });
    const chain = {
      sort() {
        return chain;
      },
      skip(n) {
        matches = matches.slice(n);
        return chain;
      },
      limit(n) {
        matches = matches.slice(0, n);
        return chain;
      },
      lean: async () => matches.map(r => ({ ...r })),
      then: r => r(matches.map(r2 => ({ ...r2 }))),
    };
    return chain;
  };
  M.updateOne = async (query, update) => {
    const t = store.find(
      r => String(r._id) === String(query._id) || String(r.dedupKey) === String(query.dedupKey)
    );
    if (!t) return { acknowledged: true, modifiedCount: 0, matchedCount: 0 };
    if (update.$set) {
      for (const [k, v] of Object.entries(update.$set)) {
        if (k.includes('.')) {
          const [head, ...rest] = k.split('.');
          t[head] = t[head] || {};
          let cur = t[head];
          for (let i = 0; i < rest.length - 1; i++) {
            cur[rest[i]] = cur[rest[i]] || {};
            cur = cur[rest[i]];
          }
          cur[rest[rest.length - 1]] = v;
        } else {
          t[k] = v;
        }
      }
    }
    return { acknowledged: true, modifiedCount: 1, matchedCount: 1 };
  };
  M.countDocuments = async (q = {}) => {
    return store.filter(r => {
      for (const [k, v] of Object.entries(q)) {
        if (String(r[k]) !== String(v)) return false;
      }
      return true;
    }).length;
  };
  M._store = store;
  return M;
}

function buildSourceEventModel(events = []) {
  const M = {};
  M.find = (q = {}) => {
    const filtered = events.filter(e => {
      if (q.eventTime && q.eventTime.$gte) {
        if (new Date(e.eventTime).getTime() < new Date(q.eventTime.$gte).getTime()) return false;
      }
      return true;
    });
    return {
      lean: async () => filtered.map(e => ({ ...e })),
      then: r => r(filtered.map(e => ({ ...e }))),
    };
  };
  return M;
}

// ─── 1. emitException basic flow ───────────────────────────────

describe('attendance-exception — emitException', () => {
  test('creates with severity + ownerRole derived from registry', async () => {
    const E = buildExceptionModel();
    const svc = createAttendanceExceptionService({
      exceptionModel: E,
      sourceEventModel: buildSourceEventModel(),
      logger: SILENT,
    });
    const r = await svc.emitException({
      kind: reg.EXCEPTION_KIND.IMPOSSIBLE_TRAVEL,
      employeeId: 'emp-1',
      branchId: 'br-1',
      shiftDate: new Date('2026-05-19T00:00:00Z'),
      summaryAr: 'سفر مستحيل بين الرياض وجدة خلال 3 دقائق',
      evidenceEventIds: ['evt-a', 'evt-b'],
    });
    expect(r.ok).toBe(true);
    expect(r.created).toBe(true);
    expect(r.exception.severity).toBe(reg.EXCEPTION_SEVERITY.CRITICAL);
    expect(r.exception.ownerRole).toBe(reg.EXCEPTION_OWNER.SECURITY);
  });

  test('re-emit with same (kind, employee, shiftDate) returns same row without duplicating', async () => {
    const E = buildExceptionModel();
    const svc = createAttendanceExceptionService({
      exceptionModel: E,
      sourceEventModel: buildSourceEventModel(),
      logger: SILENT,
    });
    const r1 = await svc.emitException({
      kind: reg.EXCEPTION_KIND.MISSING_CHECKOUT,
      employeeId: 'emp-1',
      branchId: 'br-1',
      shiftDate: new Date('2026-05-19T00:00:00Z'),
      summaryAr: 'first',
    });
    const r2 = await svc.emitException({
      kind: reg.EXCEPTION_KIND.MISSING_CHECKOUT,
      employeeId: 'emp-1',
      branchId: 'br-1',
      shiftDate: new Date('2026-05-19T00:00:00Z'),
      summaryAr: 'second',
    });
    expect(r1.created).toBe(true);
    expect(r2.created).toBe(false);
    expect(E._store).toHaveLength(1);
  });

  test('rejects unknown kind', async () => {
    const E = buildExceptionModel();
    const svc = createAttendanceExceptionService({
      exceptionModel: E,
      sourceEventModel: buildSourceEventModel(),
      logger: SILENT,
    });
    const r = await svc.emitException({
      kind: 'made-up-kind',
      employeeId: 'emp-1',
      summaryAr: 'x',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
  });

  test('does NOT reopen terminal-status exceptions on re-detection', async () => {
    const E = buildExceptionModel();
    const svc = createAttendanceExceptionService({
      exceptionModel: E,
      sourceEventModel: buildSourceEventModel(),
      logger: SILENT,
    });
    const r1 = await svc.emitException({
      kind: reg.EXCEPTION_KIND.MISSING_CHECKOUT,
      employeeId: 'emp-1',
      branchId: 'br-1',
      shiftDate: new Date('2026-05-19T00:00:00Z'),
      summaryAr: 'open',
    });
    await svc.resolveException(
      r1.exception._id,
      { actorId: 'mgr-1', role: 'branch_manager' },
      'fixed manually'
    );
    const r2 = await svc.emitException({
      kind: reg.EXCEPTION_KIND.MISSING_CHECKOUT,
      employeeId: 'emp-1',
      branchId: 'br-1',
      shiftDate: new Date('2026-05-19T00:00:00Z'),
      summaryAr: 'should not reopen',
    });
    expect(r2.skipped).toBe('terminal');
    expect(E._store[0].status).toBe(reg.EXCEPTION_STATUS.RESOLVED);
  });
});

// ─── 2. Lifecycle transitions ──────────────────────────────────

describe('attendance-exception — lifecycle', () => {
  test('acknowledge sets status + actor', async () => {
    const E = buildExceptionModel();
    const svc = createAttendanceExceptionService({
      exceptionModel: E,
      sourceEventModel: buildSourceEventModel(),
      logger: SILENT,
    });
    const created = await svc.emitException({
      kind: reg.EXCEPTION_KIND.GEOFENCE_OUTSIDE,
      employeeId: 'emp-1',
      summaryAr: 'x',
    });
    const r = await svc.acknowledgeException(created.exception._id, {
      actorId: 'mgr-1',
      role: 'branch_manager',
    });
    expect(r.ok).toBe(true);
    expect(r.exception.status).toBe(reg.EXCEPTION_STATUS.ACKNOWLEDGED);
    expect(r.exception.resolution.actorId).toBe('mgr-1');
  });

  test('dismiss requires note ≥ 5 chars', async () => {
    const E = buildExceptionModel();
    const svc = createAttendanceExceptionService({
      exceptionModel: E,
      sourceEventModel: buildSourceEventModel(),
      logger: SILENT,
    });
    const created = await svc.emitException({
      kind: reg.EXCEPTION_KIND.LATE_ARRIVAL_PATTERN,
      employeeId: 'emp-1',
      summaryAr: 'x',
    });
    const tooShort = await svc.dismissException(
      created.exception._id,
      { actorId: 'hr-1', role: 'hr_admin' },
      'no'
    );
    expect(tooShort.ok).toBe(false);
    expect(tooShort.errors.note).toMatch(/note ≥ 5/);

    const ok = await svc.dismissException(
      created.exception._id,
      { actorId: 'hr-1', role: 'hr_admin' },
      'employee was on approved sick leave — verified with doctor note'
    );
    expect(ok.ok).toBe(true);
    expect(ok.exception.status).toBe(reg.EXCEPTION_STATUS.DISMISSED);
  });

  test('escalate requires escalatedToRole + transfers ownership', async () => {
    const E = buildExceptionModel();
    const svc = createAttendanceExceptionService({
      exceptionModel: E,
      sourceEventModel: buildSourceEventModel(),
      logger: SILENT,
    });
    const created = await svc.emitException({
      kind: reg.EXCEPTION_KIND.MISSING_CHECKOUT,
      employeeId: 'emp-1',
      branchId: 'br-1',
      summaryAr: 'x',
    });
    // missing escalatedToRole → rejected
    const bad = await svc.escalateException(
      created.exception._id,
      { actorId: 'mgr-1', role: 'branch_manager' },
      '',
      'needs HR'
    );
    expect(bad.ok).toBe(false);

    const ok = await svc.escalateException(
      created.exception._id,
      { actorId: 'mgr-1', role: 'branch_manager' },
      'hr_director',
      'pattern emerging across team — needs HR review'
    );
    expect(ok.ok).toBe(true);
    expect(ok.exception.status).toBe(reg.EXCEPTION_STATUS.ESCALATED);
    expect(ok.exception.ownerRole).toBe('hr_director');
  });

  test('resolve requires actorId', async () => {
    const E = buildExceptionModel();
    const svc = createAttendanceExceptionService({
      exceptionModel: E,
      sourceEventModel: buildSourceEventModel(),
      logger: SILENT,
    });
    const created = await svc.emitException({
      kind: reg.EXCEPTION_KIND.MISSING_CHECKOUT,
      employeeId: 'emp-1',
      summaryAr: 'x',
    });
    const bad = await svc.resolveException(created.exception._id, {}, 'manual fix');
    expect(bad.ok).toBe(false);
  });
});

// ─── 3. Pattern detector ───────────────────────────────────────

describe('attendance-exception — detectPatterns', () => {
  test('emits LATE_ARRIVAL_PATTERN when ≥3 late events in 7 days', async () => {
    const E = buildExceptionModel();
    const baseDay = new Date('2026-05-15T09:30:00Z'); // 30 min after shift start
    const lateEvents = [0, 1, 2].map(i => ({
      _id: `evt-late-${i}`,
      employeeId: 'emp-1',
      branchId: 'br-1',
      eventTime: new Date(baseDay.getTime() + i * 24 * 3600 * 1000),
      eventKind: 'check-in',
      expectedWindow: {
        latestCheckIn: new Date(
          new Date(baseDay.getTime() + i * 24 * 3600 * 1000).setUTCHours(9, 10, 0, 0)
        ),
      },
    }));
    const Source = buildSourceEventModel(lateEvents);
    const svc = createAttendanceExceptionService({
      exceptionModel: E,
      sourceEventModel: Source,
      logger: SILENT,
      now: () => new Date('2026-05-20T00:00:00Z'),
    });
    const r = await svc.detectPatterns({ windowDays: 7 });
    expect(r.ok).toBe(true);
    expect(r.scanned).toBe(3);
    expect(r.patterns.find(p => p.kind === reg.EXCEPTION_KIND.LATE_ARRIVAL_PATTERN).count).toBe(1);
  });

  test('emits CARELESS_CLOCKING when ≥3 missing-checkouts in 30 days', async () => {
    const E = buildExceptionModel();
    const baseDay = new Date('2026-05-01T09:00:00Z');
    const events = [];
    // 3 days where employee has check-in but no check-out
    for (let i = 0; i < 3; i++) {
      events.push({
        _id: `evt-in-${i}`,
        employeeId: 'emp-1',
        branchId: 'br-1',
        eventTime: new Date(baseDay.getTime() + i * 24 * 3600 * 1000),
        eventKind: 'check-in',
      });
    }
    const Source = buildSourceEventModel(events);
    const svc = createAttendanceExceptionService({
      exceptionModel: E,
      sourceEventModel: Source,
      logger: SILENT,
      now: () => new Date('2026-05-20T00:00:00Z'),
    });
    const r = await svc.detectPatterns({ windowDays: 30 });
    expect(r.patterns.find(p => p.kind === reg.EXCEPTION_KIND.CARELESS_CLOCKING).count).toBe(1);
  });

  test('detector does not emit when threshold not met', async () => {
    const E = buildExceptionModel();
    // Only 2 late events — below threshold of 3
    const events = [0, 1].map(i => ({
      _id: `evt-${i}`,
      employeeId: 'emp-1',
      branchId: 'br-1',
      eventTime: new Date(`2026-05-1${i + 5}T09:30:00Z`),
      eventKind: 'check-in',
      expectedWindow: { latestCheckIn: new Date(`2026-05-1${i + 5}T09:10:00Z`) },
    }));
    const Source = buildSourceEventModel(events);
    const svc = createAttendanceExceptionService({
      exceptionModel: E,
      sourceEventModel: Source,
      logger: SILENT,
      now: () => new Date('2026-05-20T00:00:00Z'),
    });
    const r = await svc.detectPatterns({ windowDays: 7 });
    expect(r.patterns.find(p => p.kind === reg.EXCEPTION_KIND.LATE_ARRIVAL_PATTERN).count).toBe(0);
  });
});

// ─── 4. Read API ──────────────────────────────────────────────

describe('attendance-exception — read API', () => {
  test('listExceptions filters by owner + status', async () => {
    const E = buildExceptionModel();
    const svc = createAttendanceExceptionService({
      exceptionModel: E,
      sourceEventModel: buildSourceEventModel(),
      logger: SILENT,
    });
    await svc.emitException({
      kind: reg.EXCEPTION_KIND.MISSING_CHECKOUT,
      employeeId: 'emp-1',
      summaryAr: 'a',
    });
    await svc.emitException({
      kind: reg.EXCEPTION_KIND.ABSENCE_WITHOUT_LEAVE,
      employeeId: 'emp-2',
      summaryAr: 'b',
    });
    const r = await svc.listExceptions({ owner: reg.EXCEPTION_OWNER.BRANCH_MANAGER });
    expect(r.items.every(x => x.ownerRole === reg.EXCEPTION_OWNER.BRANCH_MANAGER)).toBe(true);
  });

  test('summarizeByOwner counts open + acknowledged only', async () => {
    const E = buildExceptionModel();
    const svc = createAttendanceExceptionService({
      exceptionModel: E,
      sourceEventModel: buildSourceEventModel(),
      logger: SILENT,
    });
    const a = await svc.emitException({
      kind: reg.EXCEPTION_KIND.MISSING_CHECKOUT,
      employeeId: 'emp-1',
      summaryAr: 'a',
    });
    const b = await svc.emitException({
      kind: reg.EXCEPTION_KIND.ABSENCE_WITHOUT_LEAVE,
      employeeId: 'emp-2',
      summaryAr: 'b',
    });
    await svc.resolveException(
      a.exception._id,
      { actorId: 'mgr-1', role: 'branch_manager' },
      'fixed'
    );
    void b;
    const s = await svc.summarizeByOwner();
    expect(s.totalOpen).toBe(1);
    expect(s.byOwner[reg.EXCEPTION_OWNER.HR_DIRECTOR]).toBe(1);
    expect(s.bySeverity.high).toBe(1);
  });
});

// ─── 5. Registry helpers ──────────────────────────────────────

describe('attendance.registry — exception helpers', () => {
  test('exceptionMeta returns severity + owner for every kind', () => {
    for (const k of reg.EXCEPTION_KINDS) {
      const m = reg.exceptionMeta(k);
      expect(m.severity).toBeDefined();
      expect(m.owner).toBeDefined();
      expect(m.labelAr).toBeDefined();
    }
  });

  test('exceptionMeta falls back for unknown kind', () => {
    const m = reg.exceptionMeta('totally-unknown');
    expect(m.severity).toBeDefined();
    expect(m.owner).toBeDefined();
  });

  test('exceptionDedupKey is deterministic', () => {
    const k1 = reg.exceptionDedupKey({
      kind: 'missing-checkout',
      employeeId: 'emp-1',
      branchId: 'br-1',
      shiftDate: new Date('2026-05-19T10:00:00Z'),
    });
    const k2 = reg.exceptionDedupKey({
      kind: 'missing-checkout',
      employeeId: 'emp-1',
      branchId: 'br-1',
      shiftDate: new Date('2026-05-19T15:00:00Z'), // same day, different hour
    });
    expect(k1).toBe(k2);
  });

  test('exceptionDedupKey differs across employees', () => {
    const a = reg.exceptionDedupKey({ kind: 'missing-checkout', employeeId: 'emp-1' });
    const b = reg.exceptionDedupKey({ kind: 'missing-checkout', employeeId: 'emp-2' });
    expect(a).not.toBe(b);
  });
});
