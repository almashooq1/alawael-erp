/**
 * attendance-service.test.js — pure-math assertions for the session
 * attendance service. No DB, no mongoose — plain arrays in, plain
 * objects out.
 */

'use strict';

const svc = require('../services/sessionAttendanceService');

function rec({ status, daysAgo = 0, billable = false, beneficiaryId = 'B1' }) {
  return {
    beneficiaryId,
    status,
    billable,
    scheduledDate: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
  };
}

describe('attendanceService.summarize', () => {
  it('empty records → attendanceRate null, all counters 0', () => {
    const s = svc.summarize([]);
    expect(s.total).toBe(0);
    expect(s.attendanceRate).toBeNull();
    expect(s.presentCount).toBe(0);
    expect(s.absentCount).toBe(0);
  });

  it('counts each status into the right bucket', () => {
    const s = svc.summarize([
      rec({ status: 'present', daysAgo: 1 }),
      rec({ status: 'late', daysAgo: 2 }),
      rec({ status: 'absent', daysAgo: 3 }),
      rec({ status: 'no_show', daysAgo: 4 }),
      rec({ status: 'cancelled', daysAgo: 5 }),
    ]);
    expect(s.present).toBe(1);
    expect(s.late).toBe(1);
    expect(s.absent).toBe(1);
    expect(s.noShow).toBe(1);
    expect(s.cancelled).toBe(1);
    expect(s.total).toBe(5);
    expect(s.presentCount).toBe(2); // present + late
    expect(s.absentCount).toBe(3); // absent + no_show + cancelled
  });

  it('attendanceRate is (present+late)/total × 100 with 1 decimal', () => {
    const s = svc.summarize([
      rec({ status: 'present' }),
      rec({ status: 'late' }),
      rec({ status: 'absent' }),
      rec({ status: 'no_show' }),
    ]);
    // 2/4 = 50%
    expect(s.attendanceRate).toBe(50);
  });

  it('attendanceRate rounds to 1 decimal place', () => {
    const s = svc.summarize([
      rec({ status: 'present' }),
      rec({ status: 'present' }),
      rec({ status: 'absent' }),
    ]);
    // 2/3 = 66.67 → rounds to 66.7
    expect(s.attendanceRate).toBe(66.7);
  });

  it('billableCount counts records with billable=true regardless of status', () => {
    const s = svc.summarize([
      rec({ status: 'no_show', billable: true }),
      rec({ status: 'no_show', billable: false }),
      rec({ status: 'present', billable: true }),
    ]);
    expect(s.billableCount).toBe(2);
  });

  it('windowStart/windowEnd filter records to the range', () => {
    const s = svc.summarize(
      [
        rec({ status: 'present', daysAgo: 10 }),
        rec({ status: 'absent', daysAgo: 40 }), // outside window
        rec({ status: 'present', daysAgo: 60 }), // outside window
      ],
      {
        windowStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      }
    );
    expect(s.total).toBe(1);
    expect(s.present).toBe(1);
  });

  it('records with missing scheduledDate are skipped (defensive)', () => {
    const s = svc.summarize([
      { beneficiaryId: 'B1', status: 'present' }, // no date
      rec({ status: 'present', daysAgo: 1 }),
    ]);
    expect(s.total).toBe(1);
  });
});

describe('attendanceService.bucketByNoShowRisk', () => {
  it('bucket empty when no beneficiaries', () => {
    const b = svc.bucketByNoShowRisk(new Map());
    expect(b.ok).toEqual([]);
    expect(b.attention).toEqual([]);
    expect(b.critical).toEqual([]);
  });

  it('≥3 no-shows in window → attention; ≥5 → critical', () => {
    const map = new Map([
      [
        'B1',
        [
          rec({ status: 'no_show', daysAgo: 1 }),
          rec({ status: 'no_show', daysAgo: 2 }),
          rec({ status: 'no_show', daysAgo: 3 }),
          rec({ status: 'present', daysAgo: 4 }),
        ],
      ],
      [
        'B2',
        [
          rec({ status: 'no_show', daysAgo: 1 }),
          rec({ status: 'no_show', daysAgo: 2 }),
          rec({ status: 'no_show', daysAgo: 3 }),
          rec({ status: 'no_show', daysAgo: 4 }),
          rec({ status: 'no_show', daysAgo: 5 }),
        ],
      ],
      ['B3', [rec({ status: 'no_show', daysAgo: 1 })]],
    ]);
    const b = svc.bucketByNoShowRisk(map);
    expect(b.attention).toHaveLength(1);
    expect(b.attention[0].beneficiaryId).toBe('B1');
    expect(b.attention[0].noShows).toBe(3);
    expect(b.critical).toHaveLength(1);
    expect(b.critical[0].beneficiaryId).toBe('B2');
    expect(b.critical[0].noShows).toBe(5);
    expect(b.ok).toHaveLength(1);
    expect(b.ok[0].beneficiaryId).toBe('B3');
  });

  it("no-shows outside the 30-day window don't count", () => {
    const map = new Map([
      [
        'B1',
        [
          rec({ status: 'no_show', daysAgo: 40 }),
          rec({ status: 'no_show', daysAgo: 50 }),
          rec({ status: 'no_show', daysAgo: 60 }),
        ],
      ],
    ]);
    const b = svc.bucketByNoShowRisk(map);
    expect(b.critical).toEqual([]);
    expect(b.attention).toEqual([]);
    expect(b.ok).toHaveLength(1);
    expect(b.ok[0].noShows).toBe(0);
  });

  it('lastNoShow returns the most recent no-show date', () => {
    const map = new Map([
      [
        'B1',
        [
          rec({ status: 'no_show', daysAgo: 20 }),
          rec({ status: 'no_show', daysAgo: 5 }),
          rec({ status: 'no_show', daysAgo: 10 }),
        ],
      ],
    ]);
    const b = svc.bucketByNoShowRisk(map);
    const entry = b.attention[0];
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    // Within ~1 hour tolerance
    expect(Math.abs(entry.lastNoShow.getTime() - fiveDaysAgo.getTime())).toBeLessThan(3600000);
  });

  it('env override tunes the attention threshold', () => {
    process.env.ATTENDANCE_NOSHOW_ATTENTION = '2';
    try {
      expect(svc.THRESHOLDS.noShowAttention).toBe(2);
      const map = new Map([
        ['B1', [rec({ status: 'no_show', daysAgo: 1 }), rec({ status: 'no_show', daysAgo: 2 })]],
      ]);
      const b = svc.bucketByNoShowRisk(map);
      expect(b.attention).toHaveLength(1);
    } finally {
      delete process.env.ATTENDANCE_NOSHOW_ATTENTION;
    }
  });
});

describe('attendanceService.groupByBeneficiary', () => {
  it('groups records into a Map by beneficiaryId (string key)', () => {
    const records = [
      rec({ status: 'present', beneficiaryId: 'B1' }),
      rec({ status: 'absent', beneficiaryId: 'B2' }),
      rec({ status: 'no_show', beneficiaryId: 'B1' }),
    ];
    const map = svc.groupByBeneficiary(records);
    expect(map.size).toBe(2);
    expect(map.get('B1')).toHaveLength(2);
    expect(map.get('B2')).toHaveLength(1);
  });
});
