/**
 * wave136-clinical-reconciliation.test.js — Wave 136.
 */

'use strict';

const {
  createClinicalAttendanceReconciliationService,
  SEVERITY_BY_KIND,
} = require('../intelligence/clinical-attendance-reconciliation.service');

const SILENT = { info: () => {}, warn: () => {}, error: () => {} };

const DAY = new Date('2026-05-19T00:00:00Z');

function buildDiscrepancyModel(seed = []) {
  const store = seed.map((s, i) => ({ _id: s._id || `disc-${i + 1}`, ...s }));
  let counter = store.length;
  function M(data) {
    Object.assign(this, data);
    this._id = `disc-${++counter}`;
    this.toObject = () => ({ ...this });
    this.validate = async () => {};
    this.save = async () => {
      const idx = store.findIndex(r => String(r._id) === String(this._id));
      if (idx >= 0) store[idx] = { ...this };
      else store.push({ ...this });
      return this;
    };
  }
  M.findOne = function (q = {}) {
    const m = store.find(r => {
      if (q.dedupKey && r.dedupKey !== q.dedupKey) return false;
      return true;
    });
    if (!m) return Promise.resolve(null);
    return Promise.resolve({ ...m });
  };
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
      if (q.kind && r.kind !== q.kind) return false;
      if (q.employeeId && String(r.employeeId) !== String(q.employeeId)) return false;
      if (q.branchId && String(r.branchId) !== String(q.branchId)) return false;
      return true;
    });
    let sortFn = null;
    let limitN = matches.length;
    let skipN = 0;
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

function buildDailyRecordModel(records = []) {
  const M = {};
  M.findOne = function (q = {}) {
    const m = records.find(r => {
      if (q.employeeId && String(r.employeeId) !== String(q.employeeId)) return false;
      if (q.shiftDate && new Date(r.shiftDate).getTime() !== new Date(q.shiftDate).getTime()) {
        return false;
      }
      return true;
    });
    return {
      lean: async () => (m ? { ...m } : null),
      then: r => r(m ? { ...m } : null),
    };
  };
  M.find = function (q = {}) {
    const matches = records.filter(r => {
      if (q.branchId && String(r.branchId) !== String(q.branchId)) return false;
      if (q.shiftDate && new Date(r.shiftDate).getTime() !== new Date(q.shiftDate).getTime()) {
        return false;
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

function buildSessionModel(sessions = []) {
  const M = {};
  M.find = function (q = {}) {
    const matches = sessions.filter(r => {
      if (q.therapistId && String(r.therapistId) !== String(q.therapistId)) return false;
      if (q.branchId && String(r.branchId) !== String(q.branchId)) return false;
      if (q.sessionDate) {
        if (
          q.sessionDate.$gte &&
          new Date(r.sessionDate).getTime() < new Date(q.sessionDate.$gte).getTime()
        ) {
          return false;
        }
        if (
          q.sessionDate.$lte &&
          new Date(r.sessionDate).getTime() > new Date(q.sessionDate.$lte).getTime()
        ) {
          return false;
        }
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

// ─── phantom-session: completed session, no attendance ─────────

describe('clinical-reconcile — phantom-session', () => {
  test('completed session with absent therapist → critical discrepancy', async () => {
    const Disc = buildDiscrepancyModel();
    const Daily = buildDailyRecordModel([]); // no attendance row
    const Sessions = buildSessionModel([
      {
        _id: 'sess-1',
        therapistId: 'emp-1',
        sessionDate: DAY,
        status: 'completed',
      },
    ]);
    const svc = createClinicalAttendanceReconciliationService({
      discrepancyModel: Disc,
      dailyRecordModel: Daily,
      therapySessionModel: Sessions,
      logger: SILENT,
    });
    const r = await svc.reconcileEmployeeDay({ employeeId: 'emp-1', sessionDate: DAY });
    expect(r.ok).toBe(true);
    expect(r.discrepanciesEmitted).toBe(1);
    expect(Disc._store[0].kind).toBe('phantom-session');
    expect(Disc._store[0].severity).toBe('critical');
  });
});

// ─── ghost-presence: present but no sessions delivered ─────────

describe('clinical-reconcile — ghost-presence', () => {
  test('present + scheduled-but-zero-completed → high', async () => {
    const Disc = buildDiscrepancyModel();
    const Daily = buildDailyRecordModel([
      {
        _id: 'rec-1',
        employeeId: 'emp-1',
        branchId: 'br-1',
        shiftDate: DAY,
        status: 'closed',
        attendanceType: 'on-site',
        workedMinutes: 480,
        checkIn: { eventTime: new Date('2026-05-19T08:00:00Z') },
      },
    ]);
    const Sessions = buildSessionModel([
      {
        _id: 's-1',
        therapistId: 'emp-1',
        sessionDate: DAY,
        startTime: new Date('2026-05-19T09:00:00Z'),
        status: 'scheduled',
      },
      {
        _id: 's-2',
        therapistId: 'emp-1',
        sessionDate: DAY,
        startTime: new Date('2026-05-19T11:00:00Z'),
        status: 'scheduled',
      },
    ]);
    const svc = createClinicalAttendanceReconciliationService({
      discrepancyModel: Disc,
      dailyRecordModel: Daily,
      therapySessionModel: Sessions,
      logger: SILENT,
    });
    const r = await svc.reconcileEmployeeDay({ employeeId: 'emp-1', sessionDate: DAY });
    expect(r.ok).toBe(true);
    const ghost = Disc._store.find(d => d.kind === 'ghost-presence');
    expect(ghost).toBeTruthy();
    expect(ghost.severity).toBe('high');
    expect(ghost.sessionIds).toHaveLength(2);
  });
});

// ─── late-for-session ──────────────────────────────────────────

describe('clinical-reconcile — late-for-session', () => {
  test('check-in after first session start by ≥5min → medium', async () => {
    const Disc = buildDiscrepancyModel();
    const Daily = buildDailyRecordModel([
      {
        _id: 'rec-1',
        employeeId: 'emp-1',
        branchId: 'br-1',
        shiftDate: DAY,
        status: 'closed',
        attendanceType: 'on-site',
        checkIn: { eventTime: new Date('2026-05-19T09:30:00Z') },
      },
    ]);
    const Sessions = buildSessionModel([
      {
        _id: 's-1',
        therapistId: 'emp-1',
        sessionDate: DAY,
        startTime: new Date('2026-05-19T09:00:00Z'),
        status: 'completed',
      },
    ]);
    const svc = createClinicalAttendanceReconciliationService({
      discrepancyModel: Disc,
      dailyRecordModel: Daily,
      therapySessionModel: Sessions,
      logger: SILENT,
    });
    const r = await svc.reconcileEmployeeDay({ employeeId: 'emp-1', sessionDate: DAY });
    expect(r.ok).toBe(true);
    const late = Disc._store.find(d => d.kind === 'late-for-session');
    expect(late).toBeTruthy();
    expect(late.severity).toBe('medium');
    expect(late.details.lateMinutes).toBe(30);
  });

  test('check-in BEFORE first session → no late discrepancy', async () => {
    const Disc = buildDiscrepancyModel();
    const Daily = buildDailyRecordModel([
      {
        _id: 'rec-1',
        employeeId: 'emp-1',
        shiftDate: DAY,
        status: 'closed',
        attendanceType: 'on-site',
        checkIn: { eventTime: new Date('2026-05-19T08:45:00Z') },
      },
    ]);
    const Sessions = buildSessionModel([
      {
        _id: 's-1',
        therapistId: 'emp-1',
        sessionDate: DAY,
        startTime: new Date('2026-05-19T09:00:00Z'),
        status: 'completed',
      },
    ]);
    const svc = createClinicalAttendanceReconciliationService({
      discrepancyModel: Disc,
      dailyRecordModel: Daily,
      therapySessionModel: Sessions,
      logger: SILENT,
    });
    await svc.reconcileEmployeeDay({ employeeId: 'emp-1', sessionDate: DAY });
    expect(Disc._store.find(d => d.kind === 'late-for-session')).toBeUndefined();
  });

  test('only 2 minutes late → below 5min threshold, no discrepancy', async () => {
    const Disc = buildDiscrepancyModel();
    const Daily = buildDailyRecordModel([
      {
        _id: 'rec-1',
        employeeId: 'emp-1',
        shiftDate: DAY,
        status: 'closed',
        attendanceType: 'on-site',
        checkIn: { eventTime: new Date('2026-05-19T09:02:00Z') },
      },
    ]);
    const Sessions = buildSessionModel([
      {
        _id: 's-1',
        therapistId: 'emp-1',
        sessionDate: DAY,
        startTime: new Date('2026-05-19T09:00:00Z'),
        status: 'completed',
      },
    ]);
    const svc = createClinicalAttendanceReconciliationService({
      discrepancyModel: Disc,
      dailyRecordModel: Daily,
      therapySessionModel: Sessions,
      logger: SILENT,
    });
    await svc.reconcileEmployeeDay({ employeeId: 'emp-1', sessionDate: DAY });
    expect(Disc._store.find(d => d.kind === 'late-for-session')).toBeUndefined();
  });
});

// ─── shift-mismatch ────────────────────────────────────────────

describe('clinical-reconcile — shift-mismatch', () => {
  test('present day, zero sessions → low-severity discrepancy', async () => {
    const Disc = buildDiscrepancyModel();
    const Daily = buildDailyRecordModel([
      {
        _id: 'rec-1',
        employeeId: 'emp-1',
        shiftDate: DAY,
        status: 'closed',
        attendanceType: 'on-site',
        checkIn: { eventTime: new Date('2026-05-19T08:00:00Z') },
        workedMinutes: 480,
      },
    ]);
    const Sessions = buildSessionModel([]);
    const svc = createClinicalAttendanceReconciliationService({
      discrepancyModel: Disc,
      dailyRecordModel: Daily,
      therapySessionModel: Sessions,
      logger: SILENT,
    });
    const r = await svc.reconcileEmployeeDay({ employeeId: 'emp-1', sessionDate: DAY });
    expect(r.discrepanciesEmitted).toBe(1);
    expect(Disc._store[0].kind).toBe('shift-mismatch');
    expect(Disc._store[0].severity).toBe('low');
  });
});

// ─── idempotency ───────────────────────────────────────────────

describe('clinical-reconcile — idempotency', () => {
  test('re-running on same day does NOT duplicate discrepancies', async () => {
    const Disc = buildDiscrepancyModel();
    const Daily = buildDailyRecordModel([]);
    const Sessions = buildSessionModel([
      {
        _id: 's-1',
        therapistId: 'emp-1',
        sessionDate: DAY,
        status: 'completed',
      },
    ]);
    const svc = createClinicalAttendanceReconciliationService({
      discrepancyModel: Disc,
      dailyRecordModel: Daily,
      therapySessionModel: Sessions,
      logger: SILENT,
    });
    await svc.reconcileEmployeeDay({ employeeId: 'emp-1', sessionDate: DAY });
    await svc.reconcileEmployeeDay({ employeeId: 'emp-1', sessionDate: DAY });
    expect(Disc._store).toHaveLength(1);
  });
});

// ─── happy day (no discrepancies) ──────────────────────────────

describe('clinical-reconcile — happy path', () => {
  test('present + sessions completed normally → no discrepancies', async () => {
    const Disc = buildDiscrepancyModel();
    const Daily = buildDailyRecordModel([
      {
        _id: 'rec-1',
        employeeId: 'emp-1',
        shiftDate: DAY,
        status: 'closed',
        attendanceType: 'on-site',
        checkIn: { eventTime: new Date('2026-05-19T08:30:00Z') },
      },
    ]);
    const Sessions = buildSessionModel([
      {
        _id: 's-1',
        therapistId: 'emp-1',
        sessionDate: DAY,
        startTime: new Date('2026-05-19T09:00:00Z'),
        status: 'completed',
      },
    ]);
    const svc = createClinicalAttendanceReconciliationService({
      discrepancyModel: Disc,
      dailyRecordModel: Daily,
      therapySessionModel: Sessions,
      logger: SILENT,
    });
    const r = await svc.reconcileEmployeeDay({ employeeId: 'emp-1', sessionDate: DAY });
    expect(r.discrepanciesEmitted).toBe(0);
    expect(Disc._store).toHaveLength(0);
  });
});

// ─── reconcileBranchDay ────────────────────────────────────────

describe('clinical-reconcile — reconcileBranchDay', () => {
  test('union of employees from both daily-records + sessions', async () => {
    const Disc = buildDiscrepancyModel();
    const Daily = buildDailyRecordModel([
      {
        employeeId: 'emp-A',
        branchId: 'br-1',
        shiftDate: DAY,
        status: 'closed',
        attendanceType: 'on-site',
        checkIn: { eventTime: new Date('2026-05-19T08:00:00Z') },
      },
    ]);
    const Sessions = buildSessionModel([
      {
        _id: 's-X',
        therapistId: 'emp-B', // different therapist, no attendance
        branchId: 'br-1',
        sessionDate: DAY,
        status: 'completed',
      },
    ]);
    const svc = createClinicalAttendanceReconciliationService({
      discrepancyModel: Disc,
      dailyRecordModel: Daily,
      therapySessionModel: Sessions,
      logger: SILENT,
    });
    const r = await svc.reconcileBranchDay({ branchId: 'br-1', sessionDate: DAY });
    expect(r.ok).toBe(true);
    expect(r.employeesScanned).toBe(2);
    // emp-A: present, no sessions → shift-mismatch
    // emp-B: phantom-session
    expect(r.totalDiscrepancies).toBe(2);
  });
});

// ─── resolve + dismiss lifecycle ──────────────────────────────

describe('clinical-reconcile — lifecycle', () => {
  function makeOne(extra = {}) {
    return buildDiscrepancyModel([
      {
        _id: 'disc-existing',
        kind: 'phantom-session',
        severity: 'critical',
        employeeId: 'emp-1',
        sessionDate: DAY,
        dedupKey: 'phantom-session|emp-1|2026-05-19|',
        summaryAr: 'test',
        status: 'open',
        ...extra,
      },
    ]);
  }

  test('resolveDiscrepancy moves open → resolved + records actor', async () => {
    const Disc = makeOne();
    const svc = createClinicalAttendanceReconciliationService({
      discrepancyModel: Disc,
      dailyRecordModel: buildDailyRecordModel(),
      therapySessionModel: buildSessionModel(),
      logger: SILENT,
    });
    const r = await svc.resolveDiscrepancy({
      discrepancyId: 'disc-existing',
      actorId: 'hr-1',
      actorRole: 'hr_admin',
      note: 'verified session via paper backup',
    });
    expect(r.ok).toBe(true);
    expect(Disc._store[0].status).toBe('resolved');
    expect(String(Disc._store[0].resolution.actorId)).toBe('hr-1');
  });

  test('dismiss requires note ≥5 chars', async () => {
    const Disc = makeOne();
    const svc = createClinicalAttendanceReconciliationService({
      discrepancyModel: Disc,
      dailyRecordModel: buildDailyRecordModel(),
      therapySessionModel: buildSessionModel(),
      logger: SILENT,
    });
    const r = await svc.dismissDiscrepancy({
      discrepancyId: 'disc-existing',
      actorId: 'hr-1',
      actorRole: 'hr_admin',
      note: 'k',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('NOTE_TOO_SHORT');
  });

  test('cannot resolve a resolved discrepancy', async () => {
    const Disc = makeOne({ status: 'resolved' });
    const svc = createClinicalAttendanceReconciliationService({
      discrepancyModel: Disc,
      dailyRecordModel: buildDailyRecordModel(),
      therapySessionModel: buildSessionModel(),
      logger: SILENT,
    });
    const r = await svc.resolveDiscrepancy({
      discrepancyId: 'disc-existing',
      actorId: 'hr-1',
      note: 'attempting double-resolve',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('NOT_PENDING');
  });
});

// ─── severity policy constants ─────────────────────────────────

describe('clinical-reconcile — severity policy', () => {
  test('SEVERITY_BY_KIND matches healthcare-critical hierarchy', () => {
    expect(SEVERITY_BY_KIND['phantom-session']).toBe('critical');
    expect(SEVERITY_BY_KIND['ghost-presence']).toBe('high');
    expect(SEVERITY_BY_KIND['late-for-session']).toBe('medium');
    expect(SEVERITY_BY_KIND['shift-mismatch']).toBe('low');
  });
});
