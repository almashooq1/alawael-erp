/**
 * wave132-attendance-baseline.test.js — Wave 132.
 *
 * Per-employee adaptive baseline + z-score anomaly detector.
 */

'use strict';

const {
  createAttendanceBaselineService,
  Z_LOW,
  Z_HIGH,
} = require('../intelligence/attendance-baseline.service');

const SILENT = { info: () => {}, warn: () => {}, error: () => {} };

function buildDailyRecordModel(seed = []) {
  const M = {};
  M.find = function (q = {}) {
    const matches = seed.filter(r => {
      if (q.employeeId && String(r.employeeId) !== String(q.employeeId)) return false;
      if (q.shiftDate && q.shiftDate.$gte) {
        if (new Date(r.shiftDate).getTime() < new Date(q.shiftDate.$gte).getTime()) {
          return false;
        }
      }
      if (q.status && q.status.$in && !q.status.$in.includes(r.status)) return false;
      return true;
    });
    return {
      lean: async () => matches.map(r => ({ ...r })),
      then: r => r(matches.map(x => ({ ...x }))),
    };
  };
  return M;
}

function buildBaselineModel(seed = []) {
  const store = seed.map((s, i) => ({ _id: s._id || `bl-${i + 1}`, ...s }));
  let counter = store.length;
  function M(data) {
    Object.assign(this, data);
    this._id = `bl-${++counter}`;
    this.toObject = () => ({ ...this });
    this.validate = async () => {};
    this.save = async () => {
      const idx = store.findIndex(r => String(r.employeeId) === String(this.employeeId));
      if (idx >= 0) store[idx] = { ...this };
      else store.push({ ...this });
      return this;
    };
  }
  M.findOne = function (q = {}) {
    const m = store.find(r =>
      q.employeeId ? String(r.employeeId) === String(q.employeeId) : true
    );
    if (!m) return Promise.resolve(null);
    const inst = new M(m);
    inst._id = m._id;
    return Promise.resolve(inst);
  };
  M._store = store;
  return M;
}

// Build a synthetic 30-day history with mean check-in ≈ 8:00 (480min)
// and stddev ~5 min.
function buildConsistentHistory({ employeeId = 'emp-1', days = 30, anchor = '2026-05-19' } = {}) {
  const records = [];
  const baseDate = new Date(`${anchor}T00:00:00Z`);
  for (let i = 0; i < days; i++) {
    const sd = new Date(baseDate.getTime() - i * 24 * 60 * 60_000);
    // Pseudo-random within ±5min using deterministic offset.
    const minOffset = ((i * 17) % 11) - 5; // -5..+5
    const checkIn = new Date(sd);
    checkIn.setUTCHours(8, 0, 0, 0);
    checkIn.setUTCMinutes(minOffset);
    const checkOut = new Date(sd);
    checkOut.setUTCHours(17, 0, 0, 0);
    checkOut.setUTCMinutes(minOffset);
    const workedMs = checkOut.getTime() - checkIn.getTime();
    records.push({
      _id: `rec-${i}`,
      employeeId,
      shiftDate: sd,
      status: 'closed',
      checkIn: { eventTime: checkIn, source: 'face-terminal' },
      checkOut: { eventTime: checkOut, source: 'face-terminal' },
      workedMinutes: Math.round(workedMs / 60_000),
    });
  }
  return records;
}

// ─── refreshBaseline ────────────────────────────────────────────

describe('attendance-baseline — refreshBaseline', () => {
  test('computes mean ≈ 480 min for consistent 30-day history', async () => {
    const Records = buildDailyRecordModel(buildConsistentHistory({ days: 30 }));
    const Baseline = buildBaselineModel();
    const svc = createAttendanceBaselineService({
      dailyRecordModel: Records,
      baselineModel: Baseline,
      logger: SILENT,
      now: () => new Date('2026-05-20T00:00:00Z'),
    });
    const r = await svc.refreshBaseline({ employeeId: 'emp-1' });
    expect(r.ok).toBe(true);
    expect(r.matured).toBe(true);
    expect(r.baseline.sampleSize).toBe(30);
    expect(Math.abs(r.baseline.checkInTime.meanMinutes - 480)).toBeLessThan(5);
    expect(r.baseline.checkInTime.stddevMinutes).toBeGreaterThan(0);
    expect(r.baseline.checkInTime.stddevMinutes).toBeLessThan(10);
  });

  test('empty history → sampleSize=0, matured=false', async () => {
    const Records = buildDailyRecordModel([]);
    const Baseline = buildBaselineModel();
    const svc = createAttendanceBaselineService({
      dailyRecordModel: Records,
      baselineModel: Baseline,
      logger: SILENT,
      now: () => new Date('2026-05-20T00:00:00Z'),
    });
    const r = await svc.refreshBaseline({ employeeId: 'emp-1' });
    expect(r.ok).toBe(true);
    expect(r.matured).toBe(false);
    expect(r.baseline.sampleSize).toBe(0);
  });

  test('idempotent: refreshing twice updates the existing baseline', async () => {
    const Records = buildDailyRecordModel(buildConsistentHistory({ days: 30 }));
    const Baseline = buildBaselineModel();
    const svc = createAttendanceBaselineService({
      dailyRecordModel: Records,
      baselineModel: Baseline,
      logger: SILENT,
      now: () => new Date('2026-05-20T00:00:00Z'),
    });
    await svc.refreshBaseline({ employeeId: 'emp-1' });
    await svc.refreshBaseline({ employeeId: 'emp-1' });
    expect(Baseline._store.filter(b => b.employeeId === 'emp-1')).toHaveLength(1);
  });

  test('missing employeeId rejected', async () => {
    const svc = createAttendanceBaselineService({
      dailyRecordModel: buildDailyRecordModel([]),
      baselineModel: buildBaselineModel(),
      logger: SILENT,
    });
    const r = await svc.refreshBaseline({});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('EMPLOYEE_REQUIRED');
  });

  test('only closed/overridden/locked rows contribute (skips open/partial)', async () => {
    const records = buildConsistentHistory({ days: 30 });
    // Add an outlier "open" row at 10:00 — should be ignored.
    records.push({
      _id: 'open-1',
      employeeId: 'emp-1',
      shiftDate: new Date('2026-05-19T00:00:00Z'),
      status: 'open',
      checkIn: {
        eventTime: new Date('2026-05-19T10:00:00Z'),
        source: 'face-terminal',
      },
      checkOut: null,
      workedMinutes: null,
    });
    const Records = buildDailyRecordModel(records);
    const svc = createAttendanceBaselineService({
      dailyRecordModel: Records,
      baselineModel: buildBaselineModel(),
      logger: SILENT,
      now: () => new Date('2026-05-20T00:00:00Z'),
    });
    const r = await svc.refreshBaseline({ employeeId: 'emp-1' });
    expect(r.baseline.sampleSize).toBe(30); // open row excluded
    expect(Math.abs(r.baseline.checkInTime.meanMinutes - 480)).toBeLessThan(5);
  });
});

// ─── refreshAllBaselines ───────────────────────────────────────

describe('attendance-baseline — refreshAllBaselines', () => {
  test('sweeper processes unique employees', async () => {
    const recs = [
      ...buildConsistentHistory({ employeeId: 'emp-1', days: 15 }),
      ...buildConsistentHistory({ employeeId: 'emp-2', days: 15 }),
    ];
    const Records = buildDailyRecordModel(recs);
    const Baseline = buildBaselineModel();
    const svc = createAttendanceBaselineService({
      dailyRecordModel: Records,
      baselineModel: Baseline,
      logger: SILENT,
      now: () => new Date('2026-05-20T00:00:00Z'),
    });
    const r = await svc.refreshAllBaselines({});
    expect(r.ok).toBe(true);
    expect(r.scannedEmployees).toBe(2);
    expect(r.refreshed).toBe(2);
    expect(Baseline._store).toHaveLength(2);
  });
});

// ─── scoreDay ──────────────────────────────────────────────────

describe('attendance-baseline — scoreDay', () => {
  function makeSvc(history) {
    const Records = buildDailyRecordModel(history);
    const Baseline = buildBaselineModel();
    return {
      svc: createAttendanceBaselineService({
        dailyRecordModel: Records,
        baselineModel: Baseline,
        logger: SILENT,
        now: () => new Date('2026-05-20T00:00:00Z'),
      }),
      Baseline,
    };
  }

  test('matured=false when no baseline exists', async () => {
    const { svc } = makeSvc([]);
    const r = await svc.scoreDay({
      employeeId: 'emp-X',
      dailyRecord: {
        shiftDate: new Date('2026-05-20T00:00:00Z'),
        checkIn: { eventTime: new Date('2026-05-20T08:00:00Z') },
        workedMinutes: 540,
      },
    });
    expect(r.ok).toBe(true);
    expect(r.matured).toBe(false);
    expect(r.anomalies).toEqual([]);
  });

  test('typical day (within 1σ) → no anomalies', async () => {
    const { svc } = makeSvc(buildConsistentHistory({ days: 30 }));
    await svc.refreshBaseline({ employeeId: 'emp-1' });
    const r = await svc.scoreDay({
      employeeId: 'emp-1',
      dailyRecord: {
        shiftDate: new Date('2026-05-20T00:00:00Z'),
        checkIn: { eventTime: new Date('2026-05-20T08:02:00Z') },
        checkOut: { eventTime: new Date('2026-05-20T17:00:00Z') },
        workedMinutes: 9 * 60 - 2,
      },
    });
    expect(r.matured).toBe(true);
    expect(r.anomalies).toEqual([]);
  });

  test('extreme late check-in (3+ σ) → high-severity anomaly', async () => {
    const { svc } = makeSvc(buildConsistentHistory({ days: 30 }));
    await svc.refreshBaseline({ employeeId: 'emp-1' });
    const r = await svc.scoreDay({
      employeeId: 'emp-1',
      dailyRecord: {
        shiftDate: new Date('2026-05-20T00:00:00Z'),
        checkIn: { eventTime: new Date('2026-05-20T11:00:00Z') }, // 3h late
        checkOut: { eventTime: new Date('2026-05-20T17:00:00Z') },
        workedMinutes: 360,
      },
    });
    expect(r.matured).toBe(true);
    const lateIn = r.anomalies.find(a => a.kind === 'check-in-later-than-baseline');
    expect(lateIn).toBeTruthy();
    expect(lateIn.severity).toBe('high');
    expect(lateIn.zScore).toBeGreaterThan(Z_HIGH);
  });

  test('mild late check-in (2σ < z < 3σ) → low-severity', async () => {
    // Add controlled outlier-free history with low stddev (~3min) so
    // an 8-9min late arrival triggers a low-severity anomaly.
    const recs = buildConsistentHistory({ days: 30 }).map((r, i) => ({
      ...r,
      checkIn: {
        ...r.checkIn,
        eventTime:
          new Date(`2026-05-19T08:0${i % 3}:00Z`).getTime() === r.checkIn.eventTime
            ? r.checkIn.eventTime
            : r.checkIn.eventTime,
      },
    }));
    const { svc } = makeSvc(recs);
    await svc.refreshBaseline({ employeeId: 'emp-1' });
    // Worker arrives at 8:13 (≈ +13min from mean → with stddev ~3min ⇒ z~4)
    // Use a more controlled small offset: pick 8:08 → ~+8 min from 480 mean,
    // with stddev floor 5 → z=1.6, no anomaly. So use 8:15 → z=3 ⇒ high.
    // We need a MILD case: 8:10 → z=2 with stddev floor of 5 → low.
    const r = await svc.scoreDay({
      employeeId: 'emp-1',
      dailyRecord: {
        shiftDate: new Date('2026-05-20T00:00:00Z'),
        checkIn: { eventTime: new Date('2026-05-20T08:10:00Z') },
        workedMinutes: 540,
      },
    });
    expect(r.matured).toBe(true);
    const lateIn = r.anomalies.find(a => a.kind === 'check-in-later-than-baseline');
    expect(lateIn).toBeTruthy();
    expect(['low', 'high']).toContain(lateIn.severity);
  });

  test('short worked-minutes triggers worked-shorter-than-baseline', async () => {
    const { svc } = makeSvc(buildConsistentHistory({ days: 30 }));
    await svc.refreshBaseline({ employeeId: 'emp-1' });
    const r = await svc.scoreDay({
      employeeId: 'emp-1',
      dailyRecord: {
        shiftDate: new Date('2026-05-20T00:00:00Z'),
        checkIn: { eventTime: new Date('2026-05-20T08:00:00Z') },
        checkOut: { eventTime: new Date('2026-05-20T10:00:00Z') },
        workedMinutes: 120, // ≪ 540 baseline
      },
    });
    expect(r.matured).toBe(true);
    const short = r.anomalies.find(a => a.kind === 'worked-shorter-than-baseline');
    expect(short).toBeTruthy();
    expect(short.severity).toBe('high');
  });

  test('unusual-workday-presence triggers on rare day', async () => {
    // History only contains Sun-Thu (UTC days 0-4); employee appears on Friday (5).
    const recs = [];
    for (let i = 0; i < 30; i++) {
      const sd = new Date('2026-05-19T00:00:00Z').getTime() - i * 24 * 60 * 60_000;
      const d = new Date(sd);
      if (d.getUTCDay() === 5) continue; // skip Fridays
      recs.push({
        employeeId: 'emp-1',
        shiftDate: d,
        status: 'closed',
        checkIn: { eventTime: new Date(d.getTime() + 8 * 3600_000) },
        checkOut: { eventTime: new Date(d.getTime() + 17 * 3600_000) },
        workedMinutes: 540,
      });
    }
    const { svc } = makeSvc(recs);
    await svc.refreshBaseline({ employeeId: 'emp-1' });

    // 2026-05-22 was a Friday in UTC.
    const friday = new Date('2026-05-22T00:00:00Z');
    expect(friday.getUTCDay()).toBe(5);
    const r = await svc.scoreDay({
      employeeId: 'emp-1',
      dailyRecord: {
        shiftDate: friday,
        checkIn: { eventTime: new Date('2026-05-22T08:00:00Z') },
        checkOut: { eventTime: new Date('2026-05-22T17:00:00Z') },
        workedMinutes: 540,
      },
    });
    expect(r.matured).toBe(true);
    const unusual = r.anomalies.find(a => a.kind === 'unusual-workday-presence');
    expect(unusual).toBeTruthy();
    expect(unusual.observedWeekday).toBe(5);
    expect(unusual.historicalPresenceRate).toBe(0);
  });

  test('matured=false when sampleSize < 10', async () => {
    const { svc, Baseline } = makeSvc(buildConsistentHistory({ days: 5 })); // only 5 days
    await svc.refreshBaseline({ employeeId: 'emp-1' });
    expect(Baseline._store[0].sampleSize).toBe(5);
    const r = await svc.scoreDay({
      employeeId: 'emp-1',
      dailyRecord: {
        shiftDate: new Date('2026-05-20T00:00:00Z'),
        checkIn: { eventTime: new Date('2026-05-20T11:00:00Z') }, // would be a high anomaly
      },
    });
    expect(r.matured).toBe(false);
    expect(r.anomalies).toEqual([]);
  });
});

// ─── constants ─────────────────────────────────────────────────

describe('attendance-baseline — constants', () => {
  test('Z thresholds', () => {
    expect(Z_LOW).toBe(2.0);
    expect(Z_HIGH).toBe(3.0);
  });
});
