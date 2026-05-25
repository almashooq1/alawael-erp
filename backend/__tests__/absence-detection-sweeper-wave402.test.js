'use strict';

/**
 * W402 — unit tests for the absence-detection sweeper.
 *
 * Verifies the producer's behaviour:
 *   - emits one publish per absent record in yesterday's window
 *   - envelope matches ATTENDANCE_EVENTS.ABSENCE_DETECTED shape
 *   - respects configured status filter
 *   - graceful when deps missing or find fails
 *
 * Pairs with the W382 ratchet (KNOWN_DEAD_CONTRACTS:
 * `attendance.ABSENCE_DETECTED` removed) + W392 ratchet
 * (`attendance.absence.detected` no longer in KNOWN_LIVE_ORPHAN_SUBSCRIBERS).
 */

const {
  sweepAbsenceDetection,
  yesterdayWindow,
  TYPE_MAP,
} = require('../services/hr/absenceDetectionSweeper');

function mockAttendanceModel(docs, { fail = false } = {}) {
  return {
    find: jest.fn().mockReturnValue({
      lean: () => (fail ? Promise.reject(new Error('db down')) : Promise.resolve(docs)),
    }),
  };
}

function mockBus() {
  return { publish: jest.fn().mockResolvedValue(undefined) };
}

describe('W402 absence-detection sweeper', () => {
  it('TYPE_MAP exposes absent/on_leave/sick mapping', () => {
    expect(TYPE_MAP.absent).toBe('unscheduled_absence');
    expect(TYPE_MAP.on_leave).toBe('scheduled_leave');
    expect(TYPE_MAP.sick).toBe('sick_leave');
  });

  it('yesterdayWindow returns a 24h previous-day [start, end) window', () => {
    const now = new Date('2026-05-25T12:34:56.000Z');
    const { start, end } = yesterdayWindow(now);
    expect(start.toISOString()).toBe('2026-05-24T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-05-25T00:00:00.000Z');
  });

  it('returns { reason: missing_deps } when AttendanceRecordModel or bus missing', async () => {
    const r1 = await sweepAbsenceDetection({});
    expect(r1).toEqual({ scanned: 0, emitted: 0, errors: 0, reason: 'missing_deps' });
    const r2 = await sweepAbsenceDetection({
      AttendanceRecordModel: mockAttendanceModel([]),
    });
    expect(r2.reason).toBe('missing_deps');
  });

  it('returns { reason: find_failed } when query throws', async () => {
    const bus = mockBus();
    const res = await sweepAbsenceDetection({
      AttendanceRecordModel: mockAttendanceModel([], { fail: true }),
      integrationBus: bus,
    });
    expect(res.reason).toBe('find_failed');
    expect(res.errors).toBe(1);
    expect(bus.publish).not.toHaveBeenCalled();
  });

  it('emits one publish per absent record in window', async () => {
    const yesterday = new Date('2026-05-24T08:00:00.000Z');
    const docs = [
      { _id: 'r1', employee_id: 'e1', date: yesterday, status: 'absent' },
      { _id: 'r2', employee_id: 'e2', date: yesterday, status: 'absent' },
      { _id: 'r3', employee_id: 'e3', date: yesterday, status: 'absent' },
    ];
    const bus = mockBus();
    const res = await sweepAbsenceDetection({
      AttendanceRecordModel: mockAttendanceModel(docs),
      integrationBus: bus,
      now: new Date('2026-05-25T00:30:00.000Z'),
    });
    expect(res.scanned).toBe(3);
    expect(res.emitted).toBe(3);
    expect(bus.publish).toHaveBeenCalledTimes(3);
  });

  it('publishes the canonical envelope shape (employeeId, date, type)', async () => {
    const date = new Date('2026-05-24T08:00:00.000Z');
    const bus = mockBus();
    await sweepAbsenceDetection({
      AttendanceRecordModel: mockAttendanceModel([
        { _id: 'r1', employee_id: 'e1', date, status: 'absent' },
      ]),
      integrationBus: bus,
      now: new Date('2026-05-25T00:30:00.000Z'),
    });
    expect(bus.publish).toHaveBeenCalledWith('attendance', 'absence.detected', {
      employeeId: 'e1',
      date: date.toISOString(),
      type: 'unscheduled_absence',
    });
  });

  it('respects custom statuses filter (passed to find $in)', async () => {
    const bus = mockBus();
    const model = mockAttendanceModel([]);
    await sweepAbsenceDetection({
      AttendanceRecordModel: model,
      integrationBus: bus,
      statuses: ['absent', 'on_leave', 'sick'],
    });
    const call = model.find.mock.calls[0][0];
    expect(call.status.$in).toEqual(['absent', 'on_leave', 'sick']);
  });

  it('maps status to type via TYPE_MAP; unknown status → "unknown"', async () => {
    const date = new Date('2026-05-24T08:00:00.000Z');
    const bus = mockBus();
    await sweepAbsenceDetection({
      AttendanceRecordModel: mockAttendanceModel([
        { _id: 'r1', employee_id: 'e1', date, status: 'sick' },
        { _id: 'r2', employee_id: 'e2', date, status: 'mystery' },
      ]),
      integrationBus: bus,
      statuses: ['absent', 'sick', 'mystery'],
    });
    expect(bus.publish).toHaveBeenNthCalledWith(
      1,
      'attendance',
      'absence.detected',
      expect.objectContaining({ type: 'sick_leave' })
    );
    expect(bus.publish).toHaveBeenNthCalledWith(
      2,
      'attendance',
      'absence.detected',
      expect.objectContaining({ type: 'unknown' })
    );
  });

  it('counts publish failures as errors without aborting the sweep', async () => {
    const date = new Date('2026-05-24T08:00:00.000Z');
    const bus = {
      publish: jest
        .fn()
        .mockRejectedValueOnce(new Error('bus down'))
        .mockResolvedValueOnce(undefined),
    };
    const res = await sweepAbsenceDetection({
      AttendanceRecordModel: mockAttendanceModel([
        { _id: 'r1', employee_id: 'e1', date, status: 'absent' },
        { _id: 'r2', employee_id: 'e2', date, status: 'absent' },
      ]),
      integrationBus: bus,
    });
    expect(res.scanned).toBe(2);
    expect(res.emitted).toBe(1);
    expect(res.errors).toBe(1);
  });
});
