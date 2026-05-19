/**
 * wave127-driver-attendance.test.js — Wave 127.
 *
 * Tests driver trip-linked attendance synthesis.
 */

'use strict';

const reg = require('../intelligence/attendance.registry');
const {
  createDriverAttendanceService,
  RECENT_TAP_WINDOW_MS,
} = require('../intelligence/driver-attendance.service');

const SILENT = { info: () => {}, warn: () => {}, error: () => {} };

// ─── Mock source event model ───────────────────────────────────

function buildSourceEventModel(seed = []) {
  const store = seed.map((s, i) => ({ _id: s._id || `evt-seed-${i + 1}`, ...s }));
  let counter = store.length;
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
  M.find = function (q = {}) {
    const matches = store.filter(r => {
      if (q.employeeId && String(r.employeeId) !== String(q.employeeId)) return false;
      if (q.eventKind && r.eventKind !== q.eventKind) return false;
      if (q.source) {
        if (q.source.$in) {
          if (!q.source.$in.includes(r.source)) return false;
        } else if (r.source !== q.source) {
          return false;
        }
      }
      if (
        q['sourceRef.tripId'] &&
        String((r.sourceRef || {}).tripId) !== String(q['sourceRef.tripId'])
      ) {
        return false;
      }
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
  M._store = store;
  return M;
}

// ─── recordTripStart ────────────────────────────────────────────

describe('driver-attendance — recordTripStart', () => {
  test('happy path: no prior taps → synthesises auto-rule check-in', async () => {
    const Source = buildSourceEventModel([]);
    const svc = createDriverAttendanceService({
      sourceEventModel: Source,
      logger: SILENT,
      now: () => new Date('2026-05-19T10:00:30Z'),
    });
    const r = await svc.recordTripStart({
      driverId: 'drv-1',
      tripId: 'trip-A',
      vehicleId: 'veh-7',
      originBranchId: 'br-garage',
      eventTime: new Date('2026-05-19T10:00:00Z'),
    });
    expect(r.ok).toBe(true);
    expect(r.event.source).toBe('auto-rule');
    expect(r.event.eventKind).toBe('check-in');
    expect(r.event.sourceRef.tripId).toBe('trip-A');
    expect(r.flags).toContain('low-confidence');
  });

  test('skipped if driver already tapped NFC within window', async () => {
    const Source = buildSourceEventModel([
      {
        employeeId: 'drv-1',
        eventKind: 'check-in',
        source: reg.SOURCE_KIND.NFC,
        eventTime: new Date('2026-05-19T09:30:00Z'),
      },
    ]);
    const svc = createDriverAttendanceService({
      sourceEventModel: Source,
      logger: SILENT,
      now: () => new Date('2026-05-19T10:00:30Z'),
    });
    const r = await svc.recordTripStart({
      driverId: 'drv-1',
      tripId: 'trip-A',
      eventTime: new Date('2026-05-19T10:00:00Z'),
    });
    expect(r.ok).toBe(true);
    expect(r.skipped).toBe(true);
    expect(r.reason).toBe('DRIVER_ALREADY_CHECKED_IN');
    expect(Source._store).toHaveLength(1); // no new event added
  });

  test('idempotent: same tripId twice returns TRIP_START_ALREADY_RECORDED', async () => {
    const Source = buildSourceEventModel([]);
    const svc = createDriverAttendanceService({
      sourceEventModel: Source,
      logger: SILENT,
      now: () => new Date('2026-05-19T10:00:30Z'),
    });
    const first = await svc.recordTripStart({
      driverId: 'drv-1',
      tripId: 'trip-A',
      eventTime: new Date('2026-05-19T10:00:00Z'),
    });
    expect(first.ok).toBe(true);

    const second = await svc.recordTripStart({
      driverId: 'drv-1',
      tripId: 'trip-A',
      eventTime: new Date('2026-05-19T10:00:05Z'),
    });
    expect(second.ok).toBe(true);
    expect(second.idempotent).toBe(true);
    expect(second.reason).toBe('TRIP_START_ALREADY_RECORDED');
    expect(Source._store).toHaveLength(1);
  });

  test('NFC tap OUTSIDE window does NOT prevent synthesis', async () => {
    const Source = buildSourceEventModel([
      {
        employeeId: 'drv-1',
        eventKind: 'check-in',
        source: reg.SOURCE_KIND.NFC,
        eventTime: new Date('2026-05-19T05:00:00Z'), // 5h before — outside 2h window
      },
    ]);
    const svc = createDriverAttendanceService({
      sourceEventModel: Source,
      logger: SILENT,
      now: () => new Date('2026-05-19T10:00:30Z'),
    });
    const r = await svc.recordTripStart({
      driverId: 'drv-1',
      tripId: 'trip-A',
      eventTime: new Date('2026-05-19T10:00:00Z'),
    });
    expect(r.ok).toBe(true);
    expect(r.skipped).toBeUndefined();
    expect(r.event).toBeDefined();
  });

  test('missing driver → EMPLOYEE_REQUIRED', async () => {
    const svc = createDriverAttendanceService({
      sourceEventModel: buildSourceEventModel([]),
      logger: SILENT,
    });
    const r = await svc.recordTripStart({ tripId: 'x', eventTime: new Date() });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.EMPLOYEE_REQUIRED);
  });

  test('missing tripId → VALIDATION_FAILED', async () => {
    const svc = createDriverAttendanceService({
      sourceEventModel: buildSourceEventModel([]),
      logger: SILENT,
    });
    const r = await svc.recordTripStart({ driverId: 'drv-1', eventTime: new Date() });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
  });

  test('future event rejected', async () => {
    const svc = createDriverAttendanceService({
      sourceEventModel: buildSourceEventModel([]),
      logger: SILENT,
      now: () => new Date('2026-05-19T10:00:00Z'),
    });
    const r = await svc.recordTripStart({
      driverId: 'drv-1',
      tripId: 'trip-A',
      eventTime: new Date('2026-05-19T11:00:00Z'),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.EVENT_TIME_FUTURE);
  });
});

// ─── recordTripEnd ──────────────────────────────────────────────

describe('driver-attendance — recordTripEnd', () => {
  test('happy path: synthesises check-out', async () => {
    const Source = buildSourceEventModel([]);
    const svc = createDriverAttendanceService({
      sourceEventModel: Source,
      logger: SILENT,
      now: () => new Date('2026-05-19T17:00:30Z'),
    });
    const r = await svc.recordTripEnd({
      driverId: 'drv-1',
      tripId: 'trip-A',
      vehicleId: 'veh-7',
      destinationBranchId: 'br-garage',
      eventTime: new Date('2026-05-19T17:00:00Z'),
    });
    expect(r.ok).toBe(true);
    expect(r.event.eventKind).toBe('check-out');
    expect(r.event.source).toBe('auto-rule');
  });

  test('skipped if driver tapped NFC check-out within window', async () => {
    const Source = buildSourceEventModel([
      {
        employeeId: 'drv-1',
        eventKind: 'check-out',
        source: reg.SOURCE_KIND.NFC,
        eventTime: new Date('2026-05-19T16:55:00Z'),
      },
    ]);
    const svc = createDriverAttendanceService({
      sourceEventModel: Source,
      logger: SILENT,
      now: () => new Date('2026-05-19T17:00:30Z'),
    });
    const r = await svc.recordTripEnd({
      driverId: 'drv-1',
      tripId: 'trip-A',
      eventTime: new Date('2026-05-19T17:00:00Z'),
    });
    expect(r.ok).toBe(true);
    expect(r.skipped).toBe(true);
    expect(r.reason).toBe('DRIVER_ALREADY_CHECKED_OUT');
  });

  test('idempotent on same tripId', async () => {
    const Source = buildSourceEventModel([]);
    const svc = createDriverAttendanceService({
      sourceEventModel: Source,
      logger: SILENT,
      now: () => new Date('2026-05-19T17:00:30Z'),
    });
    const first = await svc.recordTripEnd({
      driverId: 'drv-1',
      tripId: 'trip-A',
      eventTime: new Date('2026-05-19T17:00:00Z'),
    });
    expect(first.ok).toBe(true);
    const second = await svc.recordTripEnd({
      driverId: 'drv-1',
      tripId: 'trip-A',
      eventTime: new Date('2026-05-19T17:01:00Z'),
    });
    expect(second.idempotent).toBe(true);
    expect(Source._store).toHaveLength(1);
  });
});

// ─── summarizeDriverDay ─────────────────────────────────────────

describe('driver-attendance — summarizeDriverDay', () => {
  test('returns taps + synthesised separated and ordered', async () => {
    const Source = buildSourceEventModel([
      {
        employeeId: 'drv-1',
        eventKind: 'check-in',
        source: reg.SOURCE_KIND.NFC,
        eventTime: new Date('2026-05-19T07:00:00Z'),
      },
      {
        employeeId: 'drv-1',
        eventKind: 'check-in',
        source: reg.SOURCE_KIND.AUTO_RULE,
        eventTime: new Date('2026-05-19T09:30:00Z'),
        sourceRef: { tripId: 'trip-B' },
      },
      {
        employeeId: 'drv-1',
        eventKind: 'check-out',
        source: reg.SOURCE_KIND.AUTO_RULE,
        eventTime: new Date('2026-05-19T15:30:00Z'),
        sourceRef: { tripId: 'trip-B' },
      },
      {
        employeeId: 'drv-1',
        eventKind: 'check-out',
        source: reg.SOURCE_KIND.NFC,
        eventTime: new Date('2026-05-19T17:00:00Z'),
      },
    ]);
    const svc = createDriverAttendanceService({
      sourceEventModel: Source,
      logger: SILENT,
    });
    const r = await svc.summarizeDriverDay({
      driverId: 'drv-1',
      dayDate: new Date('2026-05-19T12:00:00Z'),
    });
    expect(r.ok).toBe(true);
    expect(r.totalEvents).toBe(4);
    expect(r.taps).toHaveLength(2);
    expect(r.tripStarts).toHaveLength(1);
    expect(r.tripEnds).toHaveLength(1);
    expect(new Date(r.firstSeenAt).getTime()).toBe(new Date('2026-05-19T07:00:00Z').getTime());
    expect(new Date(r.lastSeenAt).getTime()).toBe(new Date('2026-05-19T17:00:00Z').getTime());
  });

  test('empty day returns zero counts and null timestamps', async () => {
    const svc = createDriverAttendanceService({
      sourceEventModel: buildSourceEventModel([]),
      logger: SILENT,
    });
    const r = await svc.summarizeDriverDay({
      driverId: 'drv-2',
      dayDate: new Date('2026-05-19T12:00:00Z'),
    });
    expect(r.ok).toBe(true);
    expect(r.totalEvents).toBe(0);
    expect(r.firstSeenAt).toBeNull();
    expect(r.lastSeenAt).toBeNull();
  });

  test('missing dayDate → VALIDATION_FAILED', async () => {
    const svc = createDriverAttendanceService({
      sourceEventModel: buildSourceEventModel([]),
      logger: SILENT,
    });
    const r = await svc.summarizeDriverDay({ driverId: 'drv-1' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
  });
});

// ─── constants ──────────────────────────────────────────────────

describe('driver-attendance — RECENT_TAP_WINDOW_MS', () => {
  test('default 2 hours', () => {
    expect(RECENT_TAP_WINDOW_MS).toBe(2 * 60 * 60 * 1000);
  });
});
