/**
 * wave131-unified-reconciliation.test.js — Wave 131.
 */

'use strict';

const reg = require('../intelligence/attendance.registry');
const {
  createUnifiedReconciliationService,
  CONFLICT_TOLERANCE_MS,
} = require('../intelligence/unified-reconciliation.service');

const SILENT = { info: () => {}, warn: () => {}, error: () => {} };

function buildSourceEventModel(seed = []) {
  const M = {};
  M.find = function (q = {}) {
    const matches = seed.filter(r => {
      if (q.employeeId && String(r.employeeId) !== String(q.employeeId)) return false;
      if (q.branchId && String(r.branchId) !== String(q.branchId)) return false;
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

function buildDailyRecordModel(seed = []) {
  const store = seed.map((s, i) => ({ _id: s._id || `rec-${i + 1}`, ...s }));
  let counter = store.length;
  function M(data) {
    Object.assign(this, data);
    this._id = `rec-${++counter}`;
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
      if (q.employeeId && String(r.employeeId) !== String(q.employeeId)) return false;
      if (q.shiftDate && new Date(r.shiftDate).getTime() !== new Date(q.shiftDate).getTime()) {
        return false;
      }
      return true;
    });
    if (!m) return Promise.resolve(null);
    // Return a model-like instance so .save() works on update.
    const inst = new M(m);
    inst._id = m._id;
    return Promise.resolve(inst);
  };
  M._store = store;
  return M;
}

const DAY = new Date('2026-05-19T00:00:00Z');

// ─── single source happy path ──────────────────────────────────

describe('unified-reconciliation — single-source closed day', () => {
  test('one check-in + one check-out → status=closed, workedMinutes computed', async () => {
    const events = [
      {
        _id: 'e-1',
        employeeId: 'emp-1',
        branchId: 'br-1',
        eventTime: new Date('2026-05-19T08:00:00Z'),
        eventKind: 'check-in',
        source: reg.SOURCE_KIND.FACE_TERMINAL,
        tierLabel: 'T1',
        confidence: 95,
        flags: [],
      },
      {
        _id: 'e-2',
        employeeId: 'emp-1',
        branchId: 'br-1',
        eventTime: new Date('2026-05-19T17:00:00Z'),
        eventKind: 'check-out',
        source: reg.SOURCE_KIND.FACE_TERMINAL,
        tierLabel: 'T1',
        confidence: 95,
        flags: [],
      },
    ];
    const Rec = buildDailyRecordModel();
    const svc = createUnifiedReconciliationService({
      sourceEventModel: buildSourceEventModel(events),
      dailyRecordModel: Rec,
      logger: SILENT,
    });
    const r = await svc.reconcileEmployeeDay({
      employeeId: 'emp-1',
      shiftDate: DAY,
    });
    expect(r.ok).toBe(true);
    expect(r.record.status).toBe('closed');
    expect(r.record.attendanceType).toBe('on-site');
    expect(r.record.workedMinutes).toBe(9 * 60);
    expect(r.record.bestTierLabel).toBe('T1');
    expect(r.record.contributingSources).toContain('face-terminal');
    expect(r.record.requiresReview).toBe(false);
  });
});

// ─── tier-priority selection ───────────────────────────────────

describe('unified-reconciliation — tier priority', () => {
  test('T1 face wins over T3 mobile-gps for check-in', async () => {
    const events = [
      {
        _id: 'mobile',
        employeeId: 'emp-1',
        branchId: 'br-1',
        eventTime: new Date('2026-05-19T07:55:00Z'),
        eventKind: 'check-in',
        source: reg.SOURCE_KIND.MOBILE_GPS,
        tierLabel: 'T3',
      },
      {
        _id: 'face',
        employeeId: 'emp-1',
        branchId: 'br-1',
        eventTime: new Date('2026-05-19T08:05:00Z'),
        eventKind: 'check-in',
        source: reg.SOURCE_KIND.FACE_TERMINAL,
        tierLabel: 'T1',
      },
    ];
    const svc = createUnifiedReconciliationService({
      sourceEventModel: buildSourceEventModel(events),
      dailyRecordModel: buildDailyRecordModel(),
      logger: SILENT,
    });
    const r = await svc.reconcileEmployeeDay({ employeeId: 'emp-1', shiftDate: DAY });
    expect(r.ok).toBe(true);
    // T1 face wins even though mobile-gps was earlier.
    expect(r.record.checkIn.source).toBe('face-terminal');
    expect(r.record.bestTierLabel).toBe('T1');
  });

  test('earliest event among ties wins for check-in', async () => {
    const events = [
      {
        _id: 'a',
        employeeId: 'emp-1',
        eventTime: new Date('2026-05-19T08:10:00Z'),
        eventKind: 'check-in',
        source: reg.SOURCE_KIND.FACE_TERMINAL,
        tierLabel: 'T1',
      },
      {
        _id: 'b',
        employeeId: 'emp-1',
        eventTime: new Date('2026-05-19T08:02:00Z'),
        eventKind: 'check-in',
        source: reg.SOURCE_KIND.FINGERPRINT,
        tierLabel: 'T1',
      },
    ];
    const svc = createUnifiedReconciliationService({
      sourceEventModel: buildSourceEventModel(events),
      dailyRecordModel: buildDailyRecordModel(),
      logger: SILENT,
    });
    const r = await svc.reconcileEmployeeDay({ employeeId: 'emp-1', shiftDate: DAY });
    expect(r.record.checkIn.sourceEventId).toBe('b'); // earlier of the two T1s
  });

  test('latest event among ties wins for check-out', async () => {
    const events = [
      {
        _id: 'in',
        employeeId: 'emp-1',
        eventTime: new Date('2026-05-19T08:00:00Z'),
        eventKind: 'check-in',
        source: reg.SOURCE_KIND.FACE_TERMINAL,
        tierLabel: 'T1',
      },
      {
        _id: 'out-a',
        employeeId: 'emp-1',
        eventTime: new Date('2026-05-19T17:05:00Z'),
        eventKind: 'check-out',
        source: reg.SOURCE_KIND.FACE_TERMINAL,
        tierLabel: 'T1',
      },
      {
        _id: 'out-b',
        employeeId: 'emp-1',
        eventTime: new Date('2026-05-19T17:08:00Z'),
        eventKind: 'check-out',
        source: reg.SOURCE_KIND.FINGERPRINT,
        tierLabel: 'T1',
      },
    ];
    const svc = createUnifiedReconciliationService({
      sourceEventModel: buildSourceEventModel(events),
      dailyRecordModel: buildDailyRecordModel(),
      logger: SILENT,
    });
    const r = await svc.reconcileEmployeeDay({ employeeId: 'emp-1', shiftDate: DAY });
    expect(r.record.checkOut.sourceEventId).toBe('out-b'); // later of the two T1s
  });
});

// ─── conflict detection ───────────────────────────────────────

describe('unified-reconciliation — conflicts', () => {
  test('two T1 check-ins > 5min apart → status=overridden + reviewReasons includes checkin-conflict', async () => {
    const events = [
      {
        employeeId: 'emp-1',
        eventTime: new Date('2026-05-19T08:00:00Z'),
        eventKind: 'check-in',
        source: reg.SOURCE_KIND.FACE_TERMINAL,
        tierLabel: 'T1',
      },
      {
        employeeId: 'emp-1',
        eventTime: new Date('2026-05-19T08:30:00Z'),
        eventKind: 'check-in',
        source: reg.SOURCE_KIND.FINGERPRINT,
        tierLabel: 'T1',
      },
      {
        employeeId: 'emp-1',
        eventTime: new Date('2026-05-19T17:00:00Z'),
        eventKind: 'check-out',
        source: reg.SOURCE_KIND.FACE_TERMINAL,
        tierLabel: 'T1',
      },
    ];
    const svc = createUnifiedReconciliationService({
      sourceEventModel: buildSourceEventModel(events),
      dailyRecordModel: buildDailyRecordModel(),
      logger: SILENT,
    });
    const r = await svc.reconcileEmployeeDay({ employeeId: 'emp-1', shiftDate: DAY });
    expect(r.record.status).toBe('overridden');
    expect(r.record.reviewReasons).toContain('checkin-conflict');
    expect(r.record.requiresReview).toBe(true);
  });

  test('two T1 events WITHIN 5min → no conflict', async () => {
    const events = [
      {
        employeeId: 'emp-1',
        eventTime: new Date('2026-05-19T08:00:00Z'),
        eventKind: 'check-in',
        source: reg.SOURCE_KIND.FACE_TERMINAL,
        tierLabel: 'T1',
      },
      {
        employeeId: 'emp-1',
        eventTime: new Date('2026-05-19T08:03:00Z'),
        eventKind: 'check-in',
        source: reg.SOURCE_KIND.FINGERPRINT,
        tierLabel: 'T1',
      },
      {
        employeeId: 'emp-1',
        eventTime: new Date('2026-05-19T17:00:00Z'),
        eventKind: 'check-out',
        source: reg.SOURCE_KIND.FACE_TERMINAL,
        tierLabel: 'T1',
      },
    ];
    const svc = createUnifiedReconciliationService({
      sourceEventModel: buildSourceEventModel(events),
      dailyRecordModel: buildDailyRecordModel(),
      logger: SILENT,
    });
    const r = await svc.reconcileEmployeeDay({ employeeId: 'emp-1', shiftDate: DAY });
    expect(r.record.status).toBe('closed');
    expect(r.record.reviewReasons).not.toContain('checkin-conflict');
  });
});

// ─── confirm-only sources filtered out ─────────────────────────

describe('unified-reconciliation — confirm-only sources', () => {
  test('camera-passive alone does NOT yield a check-in', async () => {
    const events = [
      {
        employeeId: 'emp-1',
        eventTime: new Date('2026-05-19T08:00:00Z'),
        eventKind: 'check-in',
        source: reg.SOURCE_KIND.CAMERA_PASSIVE,
        tierLabel: 'T2',
      },
    ];
    const svc = createUnifiedReconciliationService({
      sourceEventModel: buildSourceEventModel(events),
      dailyRecordModel: buildDailyRecordModel(),
      logger: SILENT,
    });
    const r = await svc.reconcileEmployeeDay({ employeeId: 'emp-1', shiftDate: DAY });
    expect(r.record.checkIn).toBeNull();
    expect(r.record.status).toBe('open');
  });
});

// ─── flag-driven review ────────────────────────────────────────

describe('unified-reconciliation — review flags', () => {
  test('tailgate flag triggers review + corresponding reason', async () => {
    const events = [
      {
        employeeId: 'emp-1',
        eventTime: new Date('2026-05-19T08:00:00Z'),
        eventKind: 'check-in',
        source: reg.SOURCE_KIND.NFC,
        tierLabel: 'T2',
        flags: ['tailgate'],
      },
      {
        employeeId: 'emp-1',
        eventTime: new Date('2026-05-19T17:00:00Z'),
        eventKind: 'check-out',
        source: reg.SOURCE_KIND.NFC,
        tierLabel: 'T2',
        flags: [],
      },
    ];
    const svc = createUnifiedReconciliationService({
      sourceEventModel: buildSourceEventModel(events),
      dailyRecordModel: buildDailyRecordModel(),
      logger: SILENT,
    });
    const r = await svc.reconcileEmployeeDay({ employeeId: 'emp-1', shiftDate: DAY });
    expect(r.record.requiresReview).toBe(true);
    expect(r.record.reviewReasons).toContain('flag-tailgate');
    expect(r.record.aggregatedFlags).toContain('tailgate');
  });
});

// ─── absent / partial / shift-aware classification ────────────

describe('unified-reconciliation — classification', () => {
  test('no events → absent', async () => {
    const svc = createUnifiedReconciliationService({
      sourceEventModel: buildSourceEventModel([]),
      dailyRecordModel: buildDailyRecordModel(),
      logger: SILENT,
    });
    const r = await svc.reconcileEmployeeDay({ employeeId: 'emp-1', shiftDate: DAY });
    expect(r.record.status).toBe('open');
    expect(r.record.attendanceType).toBe('absent');
  });

  test('check-in without check-out → partial', async () => {
    const events = [
      {
        employeeId: 'emp-1',
        eventTime: new Date('2026-05-19T08:00:00Z'),
        eventKind: 'check-in',
        source: reg.SOURCE_KIND.FACE_TERMINAL,
        tierLabel: 'T1',
      },
    ];
    const svc = createUnifiedReconciliationService({
      sourceEventModel: buildSourceEventModel(events),
      dailyRecordModel: buildDailyRecordModel(),
      logger: SILENT,
    });
    const r = await svc.reconcileEmployeeDay({ employeeId: 'emp-1', shiftDate: DAY });
    expect(r.record.status).toBe('partial');
    expect(r.record.attendanceType).toBe('partial-day');
  });

  test('overtime classification when shift threshold exceeded', async () => {
    const events = [
      {
        employeeId: 'emp-1',
        eventTime: new Date('2026-05-19T08:00:00Z'),
        eventKind: 'check-in',
        source: reg.SOURCE_KIND.FACE_TERMINAL,
        tierLabel: 'T1',
      },
      {
        employeeId: 'emp-1',
        eventTime: new Date('2026-05-19T22:00:00Z'), // 14h day
        eventKind: 'check-out',
        source: reg.SOURCE_KIND.FACE_TERMINAL,
        tierLabel: 'T1',
      },
    ];
    const shiftResolver = {
      resolveShiftForEmployee: async () => ({
        ok: true,
        shift: { halfDayThreshold: 240, overtimeThreshold: 480 }, // 8h ot threshold
      }),
    };
    const svc = createUnifiedReconciliationService({
      sourceEventModel: buildSourceEventModel(events),
      dailyRecordModel: buildDailyRecordModel(),
      shiftResolver,
      logger: SILENT,
    });
    const r = await svc.reconcileEmployeeDay({ employeeId: 'emp-1', shiftDate: DAY });
    expect(r.record.attendanceType).toBe('overtime');
    expect(r.record.overtimeMinutes).toBe(14 * 60 - 480);
  });

  test('worked below half-day threshold flagged as partial-day', async () => {
    const events = [
      {
        employeeId: 'emp-1',
        eventTime: new Date('2026-05-19T08:00:00Z'),
        eventKind: 'check-in',
        source: reg.SOURCE_KIND.FACE_TERMINAL,
        tierLabel: 'T1',
      },
      {
        employeeId: 'emp-1',
        eventTime: new Date('2026-05-19T10:00:00Z'), // only 2h
        eventKind: 'check-out',
        source: reg.SOURCE_KIND.FACE_TERMINAL,
        tierLabel: 'T1',
      },
    ];
    const shiftResolver = {
      resolveShiftForEmployee: async () => ({
        ok: true,
        shift: { halfDayThreshold: 240, overtimeThreshold: 480 },
      }),
    };
    const svc = createUnifiedReconciliationService({
      sourceEventModel: buildSourceEventModel(events),
      dailyRecordModel: buildDailyRecordModel(),
      shiftResolver,
      logger: SILENT,
    });
    const r = await svc.reconcileEmployeeDay({ employeeId: 'emp-1', shiftDate: DAY });
    expect(r.record.attendanceType).toBe('partial-day');
    expect(r.record.halfDay).toBe(true);
    expect(r.record.reviewReasons).toContain('worked-below-half-day-threshold');
  });
});

// ─── idempotency + locked records ──────────────────────────────

describe('unified-reconciliation — idempotency + locked', () => {
  test('re-running on same day updates the existing record', async () => {
    const events = [
      {
        employeeId: 'emp-1',
        eventTime: new Date('2026-05-19T08:00:00Z'),
        eventKind: 'check-in',
        source: reg.SOURCE_KIND.FACE_TERMINAL,
        tierLabel: 'T1',
      },
      {
        employeeId: 'emp-1',
        eventTime: new Date('2026-05-19T17:00:00Z'),
        eventKind: 'check-out',
        source: reg.SOURCE_KIND.FACE_TERMINAL,
        tierLabel: 'T1',
      },
    ];
    const Rec = buildDailyRecordModel();
    const svc = createUnifiedReconciliationService({
      sourceEventModel: buildSourceEventModel(events),
      dailyRecordModel: Rec,
      logger: SILENT,
    });
    await svc.reconcileEmployeeDay({ employeeId: 'emp-1', shiftDate: DAY });
    await svc.reconcileEmployeeDay({ employeeId: 'emp-1', shiftDate: DAY });
    // Should still be one record.
    const recs = Rec._store.filter(r => String(r.employeeId) === 'emp-1');
    expect(recs).toHaveLength(1);
  });

  test('locked status is preserved (no reconciliation overwrites it)', async () => {
    const Rec = buildDailyRecordModel([
      {
        _id: 'r-locked',
        employeeId: 'emp-1',
        shiftDate: DAY,
        status: 'locked',
        workedMinutes: 480,
        attendanceType: 'on-site',
        contributingSources: ['face-terminal'],
      },
    ]);
    const svc = createUnifiedReconciliationService({
      sourceEventModel: buildSourceEventModel([
        {
          employeeId: 'emp-1',
          eventTime: new Date('2026-05-19T08:00:00Z'),
          eventKind: 'check-in',
          source: reg.SOURCE_KIND.MOBILE_GPS,
          tierLabel: 'T3',
        },
      ]),
      dailyRecordModel: Rec,
      logger: SILENT,
    });
    const r = await svc.reconcileEmployeeDay({ employeeId: 'emp-1', shiftDate: DAY });
    expect(r.locked).toBe(true);
    expect(Rec._store[0].status).toBe('locked');
    expect(Rec._store[0].workedMinutes).toBe(480);
  });
});

// ─── dryRun ───────────────────────────────────────────────────

describe('unified-reconciliation — dryRun', () => {
  test('does not persist when opts.dryRun=true', async () => {
    const Rec = buildDailyRecordModel();
    const events = [
      {
        employeeId: 'emp-1',
        eventTime: new Date('2026-05-19T08:00:00Z'),
        eventKind: 'check-in',
        source: reg.SOURCE_KIND.FACE_TERMINAL,
        tierLabel: 'T1',
      },
    ];
    const svc = createUnifiedReconciliationService({
      sourceEventModel: buildSourceEventModel(events),
      dailyRecordModel: Rec,
      logger: SILENT,
    });
    const r = await svc.reconcileEmployeeDay({
      employeeId: 'emp-1',
      shiftDate: DAY,
      opts: { dryRun: true },
    });
    expect(r.ok).toBe(true);
    expect(r.dryRun).toBe(true);
    expect(Rec._store).toHaveLength(0);
  });
});

// ─── eventEmitter wiring ──────────────────────────────────────

describe('unified-reconciliation — event emitter', () => {
  test('emits attendance.daily-rollup on persisted record', async () => {
    const emitted = [];
    const eventEmitter = {
      emit: async e => {
        emitted.push(e);
        return { ok: true };
      },
    };
    const events = [
      {
        employeeId: 'emp-1',
        eventTime: new Date('2026-05-19T08:00:00Z'),
        eventKind: 'check-in',
        source: reg.SOURCE_KIND.FACE_TERMINAL,
        tierLabel: 'T1',
      },
      {
        employeeId: 'emp-1',
        eventTime: new Date('2026-05-19T17:00:00Z'),
        eventKind: 'check-out',
        source: reg.SOURCE_KIND.FACE_TERMINAL,
        tierLabel: 'T1',
      },
    ];
    const svc = createUnifiedReconciliationService({
      sourceEventModel: buildSourceEventModel(events),
      dailyRecordModel: buildDailyRecordModel(),
      eventEmitter,
      logger: SILENT,
    });
    await svc.reconcileEmployeeDay({ employeeId: 'emp-1', shiftDate: DAY });
    expect(emitted).toHaveLength(1);
    expect(emitted[0].topic).toBe('attendance.daily-rollup');
    expect(emitted[0].payload.status).toBe('closed');
  });
});

// ─── branch + org rollups ──────────────────────────────────────

describe('unified-reconciliation — bulk reconcilers', () => {
  test('reconcileBranchDay produces one record per unique employee', async () => {
    const events = [
      {
        employeeId: 'emp-1',
        branchId: 'br-1',
        eventTime: new Date('2026-05-19T08:00:00Z'),
        eventKind: 'check-in',
        source: reg.SOURCE_KIND.FACE_TERMINAL,
        tierLabel: 'T1',
      },
      {
        employeeId: 'emp-2',
        branchId: 'br-1',
        eventTime: new Date('2026-05-19T08:00:00Z'),
        eventKind: 'check-in',
        source: reg.SOURCE_KIND.FACE_TERMINAL,
        tierLabel: 'T1',
      },
      {
        employeeId: 'emp-3',
        branchId: 'br-2',
        eventTime: new Date('2026-05-19T08:00:00Z'),
        eventKind: 'check-in',
        source: reg.SOURCE_KIND.FACE_TERMINAL,
        tierLabel: 'T1',
      },
    ];
    const svc = createUnifiedReconciliationService({
      sourceEventModel: buildSourceEventModel(events),
      dailyRecordModel: buildDailyRecordModel(),
      logger: SILENT,
    });
    const r = await svc.reconcileBranchDay({ branchId: 'br-1', shiftDate: DAY });
    expect(r.ok).toBe(true);
    expect(r.total).toBe(2);
    expect(r.results).toHaveLength(2);
  });
});

// ─── constants ─────────────────────────────────────────────────

describe('unified-reconciliation — constants', () => {
  test('CONFLICT_TOLERANCE_MS = 5min', () => {
    expect(CONFLICT_TOLERANCE_MS).toBe(5 * 60_000);
  });
});
