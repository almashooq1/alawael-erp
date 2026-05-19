/**
 * wave128-attendance-correction.test.js — Wave 128.
 *
 * Self-service correction workflow.
 */

'use strict';

const reg = require('../intelligence/attendance.registry');
const {
  createAttendanceCorrectionService,
  MIN_NOTE_CHARS,
} = require('../intelligence/attendance-correction.service');

const SILENT = { info: () => {}, warn: () => {}, error: () => {} };

// ─── Mocks ──────────────────────────────────────────────────────

function buildCorrectionRequestModel(seed = []) {
  const store = seed.map((s, i) => ({ _id: s._id || `req-seed-${i + 1}`, ...s }));
  let counter = store.length;
  function M(data) {
    Object.assign(this, data);
    this._id = data._id || `req-${++counter}`;
    this.toObject = () => ({ ...this });
    this.validate = async () => {};
    this.save = async () => {
      const idx = store.findIndex(r => String(r._id) === String(this._id));
      if (idx >= 0) {
        store[idx] = { ...this };
      } else {
        store.push({ ...this });
      }
      return this;
    };
  }
  M.findById = function (id) {
    const m = store.find(r => String(r._id) === String(id));
    if (!m) return Promise.resolve(null);
    const inst = new M(m);
    inst._id = m._id;
    return Promise.resolve(inst);
  };
  M.find = function (q = {}) {
    const matches = store.filter(r => {
      if (q.status && r.status !== q.status) return false;
      if (q.branchId && String(r.branchId) !== String(q.branchId)) return false;
      if (q.requesterId && String(r.requesterId) !== String(q.requesterId)) return false;
      return true;
    });
    let sortFn = null;
    let skipN = 0;
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
  M._store = store;
  return M;
}

function buildSourceEventModel() {
  const store = [];
  let counter = 0;
  function M(data) {
    Object.assign(this, data);
    this._id = `evt-${++counter}`;
    this.toObject = () => ({ ...this });
    this.validate = async () => {};
    this.save = async () => {
      store.push({ ...this });
      return this;
    };
  }
  M._store = store;
  return M;
}

const baseCreate = (extra = {}) => ({
  requesterId: 'emp-1',
  requesterRole: 'therapist',
  kind: 'missing-checkout',
  targetDate: new Date('2026-05-18T00:00:00Z'),
  requestedEventTime: new Date('2026-05-18T17:00:00Z'),
  requestedEventKind: 'check-out',
  reasonAr: 'نسيت تسجيل خروجي في نهاية الدوام',
  branchId: 'br-1',
  ...extra,
});

function buildSvc(extra = {}) {
  return createAttendanceCorrectionService({
    correctionRequestModel: extra.correctionRequestModel || buildCorrectionRequestModel(),
    sourceEventModel: extra.sourceEventModel || buildSourceEventModel(),
    lockGuard: extra.lockGuard || null,
    logger: SILENT,
    now: () => new Date('2026-05-19T10:00:00Z'),
    ...extra,
  });
}

// ─── createRequest ──────────────────────────────────────────────

describe('attendance-correction — createRequest', () => {
  test('happy path: pending request persisted', async () => {
    const Req = buildCorrectionRequestModel();
    const svc = buildSvc({ correctionRequestModel: Req });
    const r = await svc.createRequest(baseCreate());
    expect(r.ok).toBe(true);
    expect(r.request.status).toBe('pending');
    expect(Req._store).toHaveLength(1);
  });

  test('unknown kind rejected', async () => {
    const svc = buildSvc();
    const r = await svc.createRequest(baseCreate({ kind: 'bogus' }));
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
  });

  test('missing requester → EMPLOYEE_REQUIRED', async () => {
    const svc = buildSvc();
    const r = await svc.createRequest(baseCreate({ requesterId: null }));
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.EMPLOYEE_REQUIRED);
  });

  test('reason shorter than MIN_NOTE_CHARS rejected', async () => {
    const svc = buildSvc();
    const r = await svc.createRequest(baseCreate({ reasonAr: 'short' }));
    // exactly MIN_NOTE_CHARS = 5; "short" length = 5 — should pass
    expect(r.ok).toBe(true);

    const r2 = await svc.createRequest(baseCreate({ reasonAr: 'foo' }));
    expect(r2.ok).toBe(false);
    expect(r2.reason).toBe(reg.REASON.VALIDATION_FAILED);
  });

  test('missing-checkin/out without requestedEventTime rejected', async () => {
    const svc = buildSvc();
    const r = await svc.createRequest(
      baseCreate({ kind: 'missing-checkin', requestedEventTime: null })
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
  });

  test('remote-day does NOT require requestedEventTime', async () => {
    const svc = buildSvc();
    const r = await svc.createRequest(
      baseCreate({ kind: 'remote-day', requestedEventTime: null, requestedEventKind: null })
    );
    expect(r.ok).toBe(true);
  });

  test('requestedEventTime in the future rejected', async () => {
    const svc = buildSvc();
    const r = await svc.createRequest(
      baseCreate({
        requestedEventTime: new Date('2026-05-20T17:00:00Z'),
      })
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.EVENT_TIME_FUTURE);
  });
});

// ─── withdrawRequest ────────────────────────────────────────────

describe('attendance-correction — withdrawRequest', () => {
  test('owner can withdraw pending request', async () => {
    const Req = buildCorrectionRequestModel([
      {
        _id: 'r-1',
        requesterId: 'emp-1',
        kind: 'missing-checkout',
        targetDate: new Date('2026-05-18T00:00:00Z'),
        status: 'pending',
      },
    ]);
    const svc = buildSvc({ correctionRequestModel: Req });
    const r = await svc.withdrawRequest({ requestId: 'r-1', requesterId: 'emp-1' });
    expect(r.ok).toBe(true);
    expect(Req._store[0].status).toBe('withdrawn');
  });

  test('non-owner cannot withdraw', async () => {
    const Req = buildCorrectionRequestModel([
      {
        _id: 'r-1',
        requesterId: 'emp-1',
        kind: 'missing-checkout',
        targetDate: new Date('2026-05-18T00:00:00Z'),
        status: 'pending',
      },
    ]);
    const svc = buildSvc({ correctionRequestModel: Req });
    const r = await svc.withdrawRequest({ requestId: 'r-1', requesterId: 'emp-other' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ATTENDANCE_CORRECTION_NOT_OWNER');
  });

  test('cannot withdraw a non-pending request', async () => {
    const Req = buildCorrectionRequestModel([
      {
        _id: 'r-1',
        requesterId: 'emp-1',
        kind: 'missing-checkout',
        targetDate: new Date('2026-05-18T00:00:00Z'),
        status: 'approved',
      },
    ]);
    const svc = buildSvc({ correctionRequestModel: Req });
    const r = await svc.withdrawRequest({ requestId: 'r-1', requesterId: 'emp-1' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ATTENDANCE_CORRECTION_NOT_PENDING');
  });
});

// ─── approveRequest / rejectRequest ─────────────────────────────

describe('attendance-correction — approve / reject', () => {
  function seed() {
    return buildCorrectionRequestModel([
      {
        _id: 'r-1',
        requesterId: 'emp-1',
        requesterRole: 'therapist',
        kind: 'missing-checkout',
        targetDate: new Date('2026-05-18T00:00:00Z'),
        requestedEventTime: new Date('2026-05-18T17:00:00Z'),
        requestedEventKind: 'check-out',
        branchId: 'br-1',
        status: 'pending',
      },
    ]);
  }

  test('approve emits supervisor-override event + sets resultingEventId', async () => {
    const Req = seed();
    const Source = buildSourceEventModel();
    const svc = buildSvc({ correctionRequestModel: Req, sourceEventModel: Source });
    const r = await svc.approveRequest({
      requestId: 'r-1',
      approverId: 'mgr-1',
      approverRole: 'branch_manager',
      approverNote: 'verified with witness',
    });
    expect(r.ok).toBe(true);
    expect(Req._store[0].status).toBe('approved');
    expect(Source._store).toHaveLength(1);
    expect(Source._store[0].source).toBe('supervisor-override');
    expect(Source._store[0].eventKind).toBe('check-out');
    expect(Source._store[0].flags).toContain('manual-override');
    expect(String(Req._store[0].resultingEventId)).toBe(String(Source._store[0]._id));
  });

  test('reject does NOT emit event', async () => {
    const Req = seed();
    const Source = buildSourceEventModel();
    const svc = buildSvc({ correctionRequestModel: Req, sourceEventModel: Source });
    const r = await svc.rejectRequest({
      requestId: 'r-1',
      approverId: 'mgr-1',
      approverRole: 'branch_manager',
      approverNote: 'no evidence provided',
    });
    expect(r.ok).toBe(true);
    expect(Req._store[0].status).toBe('rejected');
    expect(Source._store).toHaveLength(0);
  });

  test('SoD: requester cannot approve own request', async () => {
    const Req = seed();
    const svc = buildSvc({ correctionRequestModel: Req });
    const r = await svc.approveRequest({
      requestId: 'r-1',
      approverId: 'emp-1', // same as requesterId
      approverRole: 'branch_manager',
      approverNote: 'approving self',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('SELF_APPROVAL_FORBIDDEN');
  });

  test('approverNote shorter than MIN_NOTE_CHARS rejected', async () => {
    const Req = seed();
    const svc = buildSvc({ correctionRequestModel: Req });
    const r = await svc.approveRequest({
      requestId: 'r-1',
      approverId: 'mgr-1',
      approverRole: 'branch_manager',
      approverNote: 'k',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
  });

  test('cannot approve a non-pending request', async () => {
    const Req = buildCorrectionRequestModel([
      {
        _id: 'r-1',
        requesterId: 'emp-1',
        kind: 'missing-checkout',
        targetDate: new Date('2026-05-18T00:00:00Z'),
        status: 'rejected',
      },
    ]);
    const svc = buildSvc({ correctionRequestModel: Req });
    const r = await svc.approveRequest({
      requestId: 'r-1',
      approverId: 'mgr-1',
      approverRole: 'branch_manager',
      approverNote: 'trying anyway',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ATTENDANCE_CORRECTION_NOT_PENDING');
  });

  test('payroll-locked targetDate blocks approval', async () => {
    const Req = seed();
    const svc = buildSvc({
      correctionRequestModel: Req,
      lockGuard: { isPayrollPeriodLocked: async () => true },
    });
    const r = await svc.approveRequest({
      requestId: 'r-1',
      approverId: 'mgr-1',
      approverRole: 'branch_manager',
      approverNote: 'period locked attempt',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ATTENDANCE_CORRECTION_PAYROLL_LOCKED');
  });

  test('remote-day approval skips event emission', async () => {
    const Req = buildCorrectionRequestModel([
      {
        _id: 'r-1',
        requesterId: 'emp-1',
        kind: 'remote-day',
        targetDate: new Date('2026-05-18T00:00:00Z'),
        branchId: 'br-1',
        status: 'pending',
      },
    ]);
    const Source = buildSourceEventModel();
    const svc = buildSvc({ correctionRequestModel: Req, sourceEventModel: Source });
    const r = await svc.approveRequest({
      requestId: 'r-1',
      approverId: 'mgr-1',
      approverRole: 'branch_manager',
      approverNote: 'verified remote work',
    });
    expect(r.ok).toBe(true);
    expect(Req._store[0].status).toBe('approved');
    expect(Source._store).toHaveLength(0);
  });
});

// ─── listRequests + getRequest ──────────────────────────────────

describe('attendance-correction — list + get', () => {
  test('listRequests filters by status + branch', async () => {
    const Req = buildCorrectionRequestModel([
      {
        _id: 'r-1',
        requesterId: 'emp-1',
        kind: 'missing-checkout',
        targetDate: new Date('2026-05-18'),
        branchId: 'br-1',
        status: 'pending',
        submittedAt: new Date('2026-05-18T08:00:00Z'),
      },
      {
        _id: 'r-2',
        requesterId: 'emp-2',
        kind: 'missing-checkin',
        targetDate: new Date('2026-05-18'),
        branchId: 'br-2',
        status: 'pending',
        submittedAt: new Date('2026-05-18T09:00:00Z'),
      },
      {
        _id: 'r-3',
        requesterId: 'emp-1',
        kind: 'edit-time',
        targetDate: new Date('2026-05-17'),
        branchId: 'br-1',
        status: 'approved',
        submittedAt: new Date('2026-05-17T08:00:00Z'),
      },
    ]);
    const svc = buildSvc({ correctionRequestModel: Req });
    const r = await svc.listRequests({ status: 'pending', branchId: 'br-1' });
    expect(r.ok).toBe(true);
    expect(r.requests).toHaveLength(1);
    expect(r.requests[0]._id).toBe('r-1');
  });

  test('getRequest unknown → NOT_FOUND', async () => {
    const svc = buildSvc({ correctionRequestModel: buildCorrectionRequestModel([]) });
    const r = await svc.getRequest({ requestId: 'ghost' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ATTENDANCE_CORRECTION_NOT_FOUND');
  });
});

// ─── constants ──────────────────────────────────────────────────

describe('attendance-correction — constants', () => {
  test('MIN_NOTE_CHARS is 5', () => {
    expect(MIN_NOTE_CHARS).toBe(5);
  });
});
