/**
 * parent-report-service.test.js — pure-math unit tests.
 *
 * These only cover the no-I/O helpers of parentReportService. renderPdf
 * is intentionally not exercised here — it's a pdfkit stream wrapper;
 * the PDF surface is verified via the route-level smoke test.
 */

'use strict';

const {
  attendanceRate,
  goalProgress,
  latestAssessments,
  displayName,
  assembleReport,
} = require('../services/parentReportService');

describe('parentReportService.attendanceRate', () => {
  test('returns null for missing / invalid input', () => {
    expect(attendanceRate(null)).toBeNull();
    expect(attendanceRate(undefined)).toBeNull();
    expect(attendanceRate('x')).toBeNull();
  });

  test('returns null when no settled sessions', () => {
    expect(attendanceRate({ completed: 0, noShow: 0, cancelled: 0 })).toBeNull();
  });

  test('computes one-decimal percent', () => {
    expect(attendanceRate({ completed: 3, noShow: 1, cancelled: 0 })).toBe(75);
    expect(attendanceRate({ completed: 7, noShow: 2, cancelled: 1 })).toBe(70);
  });

  test('ignores scheduled / upcoming (only settled counted)', () => {
    // total includes scheduled but settled denom doesn't — rate uses settled
    const r = attendanceRate({ completed: 1, noShow: 1, cancelled: 0, total: 10 });
    expect(r).toBe(50);
  });
});

describe('parentReportService.goalProgress', () => {
  test('empty plan ⇒ zeros', () => {
    expect(goalProgress(null)).toEqual({
      total: 0,
      achieved: 0,
      inProgress: 0,
      percentage: null,
    });
  });

  test('counts statuses + percentage', () => {
    const plan = {
      goals: [
        { status: 'ACHIEVED' },
        { status: 'ACHIEVED' },
        { status: 'IN_PROGRESS' },
        { status: 'NOT_STARTED' },
      ],
    };
    expect(goalProgress(plan)).toEqual({
      total: 4,
      achieved: 2,
      inProgress: 1,
      percentage: 50,
    });
  });

  test('non-array goals handled', () => {
    expect(goalProgress({ goals: null })).toEqual({
      total: 0,
      achieved: 0,
      inProgress: 0,
      percentage: null,
    });
  });
});

describe('parentReportService.latestAssessments', () => {
  test('empty ⇒ []', () => {
    expect(latestAssessments(null)).toEqual([]);
    expect(latestAssessments({ items: [] })).toEqual([]);
  });

  test('returns newest first, capped at N', () => {
    const items = {
      items: [
        { tool: 'A', date: '2026-01-01', score: 10 },
        { tool: 'B', date: '2026-03-01', score: 20 },
        { tool: 'C', date: '2026-02-01', score: 15 },
      ],
    };
    const out = latestAssessments(items, 2);
    expect(out).toHaveLength(2);
    expect(out[0].tool).toBe('B');
    expect(out[1].tool).toBe('C');
  });

  test('maps shape defensively (toolName → tool, createdAt → date)', () => {
    const out = latestAssessments({
      items: [{ toolName: 'X', createdAt: '2026-04-01', score: 5 }],
    });
    expect(out[0]).toEqual({
      tool: 'X',
      date: '2026-04-01',
      score: 5,
      interpretation: null,
    });
  });
});

describe('parentReportService.displayName', () => {
  test('null ⇒ em-dash', () => {
    expect(displayName(null)).toBe('—');
    expect(displayName({})).toBe('—');
  });

  test('prefers Arabic first name', () => {
    expect(displayName({ firstName_ar: 'محمد', firstName: 'Mohammed' })).toBe('محمد');
  });

  test('falls back to fullName then first+last', () => {
    expect(displayName({ fullName: 'John Doe' })).toBe('John Doe');
    expect(displayName({ firstName: 'Jane', lastName: 'Smith' })).toBe('Jane Smith');
  });
});

describe('parentReportService.assembleReport', () => {
  const baseChild = {
    _id: 'abc123',
    firstName_ar: 'سارة',
    beneficiaryNumber: 'B-001',
    dateOfBirth: '2018-06-15',
    enrollmentDate: '2025-09-01',
    status: 'ACTIVE',
    disabilityType: 'autism',
  };

  test('empty inputs degrade gracefully', () => {
    const r = assembleReport({});
    expect(r.meta.title).toBe('تقرير تقدّم الطفل');
    expect(r.child.name).toBe('—');
    expect(r.summary).toEqual({
      totalSessions: 0,
      upcomingAppointments: 0,
      activeCarePlans: 0,
      assessmentsRun: 0,
    });
    expect(r.attendance.ratePct).toBeNull();
    expect(r.carePlan.total).toBe(0);
    expect(r.recentAssessments).toEqual([]);
  });

  test('full tree shape', () => {
    const r = assembleReport({
      child: baseChild,
      overview: {
        sessionCount: 42,
        upcomingCount: 3,
        activeCarePlansCount: 1,
        assessmentsCount: 8,
      },
      attendance: { completed: 15, noShow: 2, cancelled: 3, lateArrival: 1 },
      carePlan: {
        title: 'خطة ربيع 2026',
        status: 'ACTIVE',
        goals: [{ status: 'ACHIEVED' }, { status: 'IN_PROGRESS' }],
      },
      assessments: { items: [{ tool: 'VB-MAPP', date: '2026-03-15', score: 88 }] },
      generatedAt: new Date('2026-04-21T10:00:00Z'),
    });
    expect(r.child.id).toBe('abc123');
    expect(r.child.name).toBe('سارة');
    expect(r.summary.totalSessions).toBe(42);
    expect(r.attendance.ratePct).toBe(75); // 15 / (15+2+3)
    expect(r.carePlan.total).toBe(2);
    expect(r.carePlan.achieved).toBe(1);
    expect(r.carePlan.percentage).toBe(50);
    expect(r.recentAssessments).toHaveLength(1);
    expect(r.recentAssessments[0].tool).toBe('VB-MAPP');
    expect(r.meta.generatedAt).toBe('2026-04-21T10:00:00.000Z');
  });

  test('default generatedAt is a valid ISO string', () => {
    const r = assembleReport({ child: baseChild });
    expect(typeof r.meta.generatedAt).toBe('string');
    expect(r.meta.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
