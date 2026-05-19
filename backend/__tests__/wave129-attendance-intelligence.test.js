/**
 * wave129-attendance-intelligence.test.js — Wave 129.
 *
 * Tests for the 7 persona dashboards.
 */

'use strict';

const reg = require('../intelligence/attendance.registry');
const {
  createAttendanceIntelligenceService,
} = require('../intelligence/attendance-intelligence.service');

const SILENT = { info: () => {}, warn: () => {}, error: () => {} };

// ─── Mocks ──────────────────────────────────────────────────────

function buildSourceEventModel(seed = []) {
  const M = {};
  M.find = function (q = {}) {
    const matches = seed.filter(r => {
      if (q.employeeId && String(r.employeeId) !== String(q.employeeId)) return false;
      if (q.branchId && String(r.branchId) !== String(q.branchId)) return false;
      if (q.source) {
        if (q.source.$in) {
          if (!q.source.$in.includes(r.source)) return false;
        } else if (r.source !== q.source) {
          return false;
        }
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
  return M;
}

function buildExceptionModel(seed = []) {
  const M = {};
  M.find = function (q = {}) {
    const matches = seed.filter(r => {
      if (q.employeeId && String(r.employeeId) !== String(q.employeeId)) return false;
      if (q.branchId && String(r.branchId) !== String(q.branchId)) return false;
      if (q.ownerRole && r.ownerRole !== q.ownerRole) return false;
      if (q.severity && r.severity !== q.severity) return false;
      if (q.status && q.status.$in && !q.status.$in.includes(r.status)) return false;
      if (q.detectedAt && q.detectedAt.$gte) {
        if (new Date(r.detectedAt).getTime() < new Date(q.detectedAt.$gte).getTime()) return false;
      }
      if (q.detectedAt && q.detectedAt.$lte) {
        if (new Date(r.detectedAt).getTime() > new Date(q.detectedAt.$lte).getTime()) return false;
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

function buildCorrectionModel(seed = []) {
  const M = {};
  M.find = function (q = {}) {
    const matches = seed.filter(r => {
      if (q.requesterId && String(r.requesterId) !== String(q.requesterId)) return false;
      if (q.branchId && String(r.branchId) !== String(q.branchId)) return false;
      if (q.status && r.status !== q.status) return false;
      return true;
    });
    return {
      lean: async () => matches.map(r => ({ ...r })),
      then: r => r(matches.map(x => ({ ...x }))),
    };
  };
  return M;
}

// ─── Common test fixtures ──────────────────────────────────────

const ASOF = new Date('2026-05-19T15:00:00Z');

const EVENTS_TODAY = [
  // emp-1 checked in + out today
  {
    employeeId: 'emp-1',
    branchId: 'br-1',
    eventTime: new Date('2026-05-19T08:00:00Z'),
    eventKind: 'check-in',
    source: reg.SOURCE_KIND.FACE_TERMINAL,
    flags: [],
  },
  {
    employeeId: 'emp-1',
    branchId: 'br-1',
    eventTime: new Date('2026-05-19T17:00:00Z'),
    eventKind: 'check-out',
    source: reg.SOURCE_KIND.FACE_TERMINAL,
    flags: [],
  },
  // emp-2 checked in but no out — present-open
  {
    employeeId: 'emp-2',
    branchId: 'br-1',
    eventTime: new Date('2026-05-19T08:30:00Z'),
    eventKind: 'check-in',
    source: reg.SOURCE_KIND.NFC,
    flags: ['tailgate'],
  },
  // emp-3 at branch-2
  {
    employeeId: 'emp-3',
    branchId: 'br-2',
    eventTime: new Date('2026-05-19T09:00:00Z'),
    eventKind: 'check-in',
    source: reg.SOURCE_KIND.MOBILE_GPS,
    flags: ['geofence-edge'],
  },
];

// ─── employeeDashboard ──────────────────────────────────────────

describe('attendance-intelligence — employeeDashboard', () => {
  test('present-closed when both in + out exist today', async () => {
    const svc = createAttendanceIntelligenceService({
      sourceEventModel: buildSourceEventModel(EVENTS_TODAY),
      logger: SILENT,
    });
    const r = await svc.employeeDashboard({ employeeId: 'emp-1', asOf: ASOF });
    expect(r.ok).toBe(true);
    expect(r.today.status).toBe('present-closed');
    expect(r.today.checkInSource).toBe('face-terminal');
    expect(r.today.checkOutAt).toBeTruthy();
  });

  test('present-open when check-in only', async () => {
    const svc = createAttendanceIntelligenceService({
      sourceEventModel: buildSourceEventModel(EVENTS_TODAY),
      logger: SILENT,
    });
    const r = await svc.employeeDashboard({ employeeId: 'emp-2', asOf: ASOF });
    expect(r.today.status).toBe('present-open');
    expect(r.today.checkOutAt).toBeNull();
  });

  test('absent when no events', async () => {
    const svc = createAttendanceIntelligenceService({
      sourceEventModel: buildSourceEventModel(EVENTS_TODAY),
      logger: SILENT,
    });
    const r = await svc.employeeDashboard({ employeeId: 'ghost', asOf: ASOF });
    expect(r.today.status).toBe('absent');
    expect(r.today.eventCount).toBe(0);
  });

  test('includes open exceptions + pending corrections when models supplied', async () => {
    const svc = createAttendanceIntelligenceService({
      sourceEventModel: buildSourceEventModel(EVENTS_TODAY),
      exceptionModel: buildExceptionModel([
        { employeeId: 'emp-1', kind: 'missing-checkout', status: 'open' },
      ]),
      correctionRequestModel: buildCorrectionModel([
        { requesterId: 'emp-1', kind: 'edit-time', status: 'pending' },
      ]),
      logger: SILENT,
    });
    const r = await svc.employeeDashboard({ employeeId: 'emp-1', asOf: ASOF });
    expect(r.openExceptions).toHaveLength(1);
    expect(r.pendingCorrections).toHaveLength(1);
  });

  test('missing employeeId → EMPLOYEE_REQUIRED', async () => {
    const svc = createAttendanceIntelligenceService({
      sourceEventModel: buildSourceEventModel([]),
      logger: SILENT,
    });
    const r = await svc.employeeDashboard({});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.EMPLOYEE_REQUIRED);
  });
});

// ─── branchManagerDashboard ─────────────────────────────────────

describe('attendance-intelligence — branchManagerDashboard', () => {
  test('counts present + still-open for branch', async () => {
    const svc = createAttendanceIntelligenceService({
      sourceEventModel: buildSourceEventModel(EVENTS_TODAY),
      logger: SILENT,
    });
    const r = await svc.branchManagerDashboard({ branchId: 'br-1', dayDate: ASOF });
    expect(r.ok).toBe(true);
    expect(r.headcount).toBe(2); // emp-1 + emp-2
    expect(r.presentCount).toBe(2);
    expect(r.missingCheckoutCount).toBe(1); // emp-2
    expect(r.sourceCounts['face-terminal']).toBe(2);
    expect(r.sourceCounts['nfc']).toBe(1);
    expect(r.flagCounts['tailgate']).toBe(1);
  });

  test('different branch filters out other branch employees', async () => {
    const svc = createAttendanceIntelligenceService({
      sourceEventModel: buildSourceEventModel(EVENTS_TODAY),
      logger: SILENT,
    });
    const r = await svc.branchManagerDashboard({ branchId: 'br-2', dayDate: ASOF });
    expect(r.headcount).toBe(1);
    expect(r.employees[0].employeeId).toBe('emp-3');
  });

  test('missing branchId → BRANCH_REQUIRED', async () => {
    const svc = createAttendanceIntelligenceService({
      sourceEventModel: buildSourceEventModel([]),
      logger: SILENT,
    });
    const r = await svc.branchManagerDashboard({});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.BRANCH_REQUIRED);
  });
});

// ─── hrAdminDashboard ──────────────────────────────────────────

describe('attendance-intelligence — hrAdminDashboard', () => {
  test('aggregates org-wide source distribution + per-branch presence', async () => {
    const svc = createAttendanceIntelligenceService({
      sourceEventModel: buildSourceEventModel(EVENTS_TODAY),
      logger: SILENT,
    });
    const r = await svc.hrAdminDashboard({ dayDate: ASOF });
    expect(r.ok).toBe(true);
    expect(r.activeEmployeeCount).toBe(3);
    expect(r.totalEvents).toBe(4);
    expect(r.sourceCounts['face-terminal']).toBe(2);
    expect(r.presencePerBranch['br-1']).toBe(2);
    expect(r.presencePerBranch['br-2']).toBe(1);
  });

  test('exception-by-kind tally', async () => {
    const svc = createAttendanceIntelligenceService({
      sourceEventModel: buildSourceEventModel(EVENTS_TODAY),
      exceptionModel: buildExceptionModel([
        {
          kind: 'late-arrival-pattern',
          status: 'open',
          detectedAt: new Date('2026-05-19T10:00:00Z'),
        },
        {
          kind: 'late-arrival-pattern',
          status: 'acknowledged',
          detectedAt: new Date('2026-05-19T11:00:00Z'),
        },
        {
          kind: 'missing-checkout',
          status: 'open',
          detectedAt: new Date('2026-05-19T12:00:00Z'),
        },
      ]),
      logger: SILENT,
    });
    const r = await svc.hrAdminDashboard({ dayDate: ASOF });
    expect(r.openExceptionCount).toBe(3);
    expect(r.exceptionByKind['late-arrival-pattern']).toBe(2);
    expect(r.exceptionByKind['missing-checkout']).toBe(1);
  });
});

// ─── securityDashboard ─────────────────────────────────────────

describe('attendance-intelligence — securityDashboard', () => {
  test('counts security-relevant flags across lookback window', async () => {
    const svc = createAttendanceIntelligenceService({
      sourceEventModel: buildSourceEventModel(EVENTS_TODAY),
      logger: SILENT,
    });
    const r = await svc.securityDashboard({ asOf: ASOF, lookbackDays: 7 });
    expect(r.ok).toBe(true);
    expect(r.flagCounts.tailgate).toBe(1);
    expect(r.flagCounts['geofence-edge']).toBe(1);
    expect(r.flagCounts['spoof-suspected']).toBe(0);
  });
});

// ─── fleetDashboard ────────────────────────────────────────────

describe('attendance-intelligence — fleetDashboard', () => {
  test('computes tap coverage percentage', async () => {
    const events = [
      // Trip start at 08:00 (auto-rule)
      {
        employeeId: 'drv-1',
        eventTime: new Date('2026-05-19T08:00:00Z'),
        eventKind: 'check-in',
        source: reg.SOURCE_KIND.AUTO_RULE,
      },
      // Driver also tapped NFC within 2h
      {
        employeeId: 'drv-1',
        eventTime: new Date('2026-05-19T07:55:00Z'),
        eventKind: 'check-in',
        source: reg.SOURCE_KIND.NFC,
      },
      // Trip start at 10:00 (no tap)
      {
        employeeId: 'drv-2',
        eventTime: new Date('2026-05-19T10:00:00Z'),
        eventKind: 'check-in',
        source: reg.SOURCE_KIND.AUTO_RULE,
      },
    ];
    const svc = createAttendanceIntelligenceService({
      sourceEventModel: buildSourceEventModel(events),
      logger: SILENT,
    });
    const r = await svc.fleetDashboard({ asOf: ASOF, lookbackDays: 7 });
    expect(r.ok).toBe(true);
    expect(r.tripStartCount).toBe(2);
    expect(r.tripsWithTap).toBe(1);
    expect(r.tripsWithoutTap).toBe(1);
    expect(r.tapCoveragePct).toBe(50);
  });

  test('zero trips → null coverage pct', async () => {
    const svc = createAttendanceIntelligenceService({
      sourceEventModel: buildSourceEventModel([]),
      logger: SILENT,
    });
    const r = await svc.fleetDashboard({ asOf: ASOF, lookbackDays: 7 });
    expect(r.tripStartCount).toBe(0);
    expect(r.tapCoveragePct).toBeNull();
  });
});

// ─── hrDirectorDashboard ───────────────────────────────────────

describe('attendance-intelligence — hrDirectorDashboard', () => {
  test('aggregates by branch over month', async () => {
    const svc = createAttendanceIntelligenceService({
      sourceEventModel: buildSourceEventModel(EVENTS_TODAY),
      logger: SILENT,
    });
    const r = await svc.hrDirectorDashboard({ asOf: ASOF });
    expect(r.ok).toBe(true);
    expect(r.totalEvents).toBe(4);
    expect(r.branchSummary).toHaveLength(2);
    // Ordered desc by eventCount.
    expect(r.branchSummary[0].eventCount).toBeGreaterThanOrEqual(r.branchSummary[1].eventCount);
  });
});

// ─── executiveDashboard ────────────────────────────────────────

describe('attendance-intelligence — executiveDashboard', () => {
  test('computes checkout-coverage + critical exception count', async () => {
    const svc = createAttendanceIntelligenceService({
      sourceEventModel: buildSourceEventModel(EVENTS_TODAY),
      exceptionModel: buildExceptionModel([
        {
          severity: 'critical',
          status: 'open',
          detectedAt: new Date('2026-05-19T08:00:00Z'),
        },
        {
          severity: 'critical',
          status: 'acknowledged',
          detectedAt: new Date('2026-05-15T08:00:00Z'),
        },
        {
          severity: 'high',
          status: 'open',
          detectedAt: new Date('2026-05-19T09:00:00Z'),
        },
      ]),
      logger: SILENT,
    });
    const r = await svc.executiveDashboard({ asOf: ASOF, lookbackDays: 30 });
    expect(r.ok).toBe(true);
    expect(r.totalCheckIns).toBe(3);
    expect(r.totalCheckOuts).toBe(1);
    expect(r.checkoutCoveragePct).toBe(33); // 1/3 rounded
    expect(r.openCriticalExceptions).toBe(2);
    expect(r.activeEmployees).toBe(3);
  });
});
