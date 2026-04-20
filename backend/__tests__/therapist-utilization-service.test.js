/**
 * therapist-utilization-service.test.js — pure math.
 */

'use strict';

const svc = require('../services/therapistUtilizationService');

function session({
  id,
  therapist = 'T1',
  beneficiary = 'B1',
  status = 'COMPLETED',
  duration = 60,
}) {
  return { _id: id, therapist, beneficiary, status, duration };
}
function attendance({ sessionId, status, billable = false }) {
  return { sessionId, status, billable };
}

describe('therapistUtilizationService.indexAttendance', () => {
  it('indexes by sessionId as a Map', () => {
    const m = svc.indexAttendance([attendance({ sessionId: 'S1', status: 'present' })]);
    expect(m.get('S1').status).toBe('present');
  });

  it('skips entries without sessionId', () => {
    const m = svc.indexAttendance([{ status: 'present' }]);
    expect(m.size).toBe(0);
  });
});

describe('therapistUtilizationService.summarizeByTherapist', () => {
  it('buckets by therapist + tallies scheduled/completed/cancelled', () => {
    const sessions = [
      session({ id: 'S1', therapist: 'T1', status: 'COMPLETED' }),
      session({ id: 'S2', therapist: 'T1', status: 'CANCELLED' }),
      session({ id: 'S3', therapist: 'T2', status: 'COMPLETED' }),
    ];
    const byT = svc.summarizeByTherapist(sessions, new Map());
    expect(byT.T1.sessionsScheduled).toBe(2);
    expect(byT.T1.sessionsCompleted).toBe(1);
    expect(byT.T1.sessionsCancelled).toBe(1);
    expect(byT.T2.sessionsCompleted).toBe(1);
  });

  it('counts billable minutes from attendance present/late/billable flag', () => {
    const sessions = [
      session({ id: 'S1', duration: 60 }),
      session({ id: 'S2', duration: 45 }),
      session({ id: 'S3', duration: 30 }),
      session({ id: 'S4', duration: 60 }),
    ];
    const att = svc.indexAttendance([
      attendance({ sessionId: 'S1', status: 'present' }),
      attendance({ sessionId: 'S2', status: 'late' }),
      attendance({ sessionId: 'S3', status: 'no_show', billable: true }),
      attendance({ sessionId: 'S4', status: 'no_show', billable: false }),
    ]);
    const t = svc.summarizeByTherapist(sessions, att).T1;
    expect(t.billableMinutes).toBe(60 + 45 + 30); // 135
    expect(t.nonBillableMinutes).toBe(60);
  });

  it('falls back to status=COMPLETED when no attendance row exists', () => {
    const sessions = [
      session({ id: 'S1', duration: 60, status: 'COMPLETED' }),
      session({ id: 'S2', duration: 60, status: 'SCHEDULED' }),
    ];
    const t = svc.summarizeByTherapist(sessions, new Map()).T1;
    expect(t.billableMinutes).toBe(60);
    expect(t.nonBillableMinutes).toBe(60);
  });

  it('uniqueBeneficiaries dedupes correctly', () => {
    const sessions = [
      session({ id: 'S1', beneficiary: 'B1' }),
      session({ id: 'S2', beneficiary: 'B1' }),
      session({ id: 'S3', beneficiary: 'B2' }),
    ];
    const t = svc.summarizeByTherapist(sessions, new Map()).T1;
    expect(t.uniqueBeneficiaries).toBe(2);
  });

  it('computes completionRate + noShowRate with 1-decimal rounding', () => {
    const sessions = [
      session({ id: 'S1', status: 'COMPLETED' }),
      session({ id: 'S2', status: 'COMPLETED' }),
      session({ id: 'S3', status: 'SCHEDULED' }),
    ];
    const att = svc.indexAttendance([attendance({ sessionId: 'S3', status: 'no_show' })]);
    const t = svc.summarizeByTherapist(sessions, att).T1;
    expect(t.completionRate).toBe(66.7);
    expect(t.noShowRate).toBe(33.3);
  });

  it('handles empty inputs gracefully', () => {
    expect(svc.summarizeByTherapist([], new Map())).toEqual({});
  });
});

describe('therapistUtilizationService.utilizationRate', () => {
  it('billable / capacity × 100', () => {
    expect(svc.utilizationRate({ billableMinutes: 5280 }, 10560)).toBe(50);
  });

  it('null when capacity invalid', () => {
    expect(svc.utilizationRate({ billableMinutes: 100 }, 0)).toBeNull();
    expect(svc.utilizationRate(null)).toBeNull();
  });

  it('allows >100 (over-booked)', () => {
    expect(svc.utilizationRate({ billableMinutes: 12000 }, 10000)).toBe(120);
  });
});

describe('therapistUtilizationService.rankByMetric', () => {
  it('sorts descending by metric value and trims to limit', () => {
    const byT = {
      T1: { billableMinutes: 100 },
      T2: { billableMinutes: 500 },
      T3: { billableMinutes: 200 },
    };
    const top2 = svc.rankByMetric(byT, 'billableMinutes', { limit: 2 });
    expect(top2.map(r => r.therapistId)).toEqual(['T2', 'T3']);
  });

  it('asc option flips the order', () => {
    const byT = {
      T1: { billableMinutes: 100 },
      T2: { billableMinutes: 500 },
    };
    const asc = svc.rankByMetric(byT, 'billableMinutes', { asc: true });
    expect(asc[0].therapistId).toBe('T1');
  });

  it('null/undefined values sort as zero', () => {
    const byT = { T1: { x: null }, T2: { x: 5 }, T3: { x: -3 } };
    const ranked = svc.rankByMetric(byT, 'x');
    expect(ranked.map(r => r.therapistId)).toEqual(['T2', 'T1', 'T3']);
  });
});
