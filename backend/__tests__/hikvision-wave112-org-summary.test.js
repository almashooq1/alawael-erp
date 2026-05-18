/**
 * hikvision-wave112-org-summary.test.js — Wave 112.
 *
 * Sections:
 *   1. snapshot — happy path with every service wired
 *   2. Per-section degradation when service missing
 *   3. Per-section degradation when leaf throws
 *   4. Devices section aggregates byKind + byBranch
 *   5. Fraud section aggregates top branches + top employees
 *   6. Sync section maps libraries → branches when libraryModel given
 *   7. Stream section captures reconnecting/circuit-open as topReconnecting
 *   8. Branch-config coverage % when branchModel given
 *   9. Scheduler section counts running + failed
 *  10. Caching — repeated snapshot calls hit cache; skipCache bypasses
 *  11. Empty branch — all sections still produce ok:true shells
 */

'use strict';

const reg = require('../intelligence/hikvision.registry');
const {
  createHikvisionOrgSummaryService,
} = require('../intelligence/hikvision-org-summary.service');

const SILENT = { info: () => {}, warn: () => {}, error: () => {} };

function makeClock(initial = 1_700_000_000_000) {
  const state = { t: initial };
  return {
    now: () => new Date(state.t),
    advance: ms => {
      state.t += ms;
    },
  };
}

// Mock libraryModel
function buildLibraryModel(libs) {
  const M = {};
  M.find = function () {
    return {
      lean: async () => libs.map(l => ({ ...l })),
      then: r => r(libs.map(l => ({ ...l }))),
    };
  };
  return M;
}

function buildBranchModel(count) {
  return { countDocuments: async () => count };
}

// ═══ 1. Happy path ═══════════════════════════════════════════════

describe('org-summary.snapshot — happy path', () => {
  test('returns ok=true with every section populated when all services wired', async () => {
    const svc = createHikvisionOrgSummaryService({
      deviceService: {
        listDevices: async () => ({
          ok: true,
          items: [
            { _id: 'd1', branchId: 'br-A', kind: 'face-terminal' },
            { _id: 'd2', branchId: 'br-A', kind: 'face-terminal' },
            { _id: 'd3', branchId: 'br-B', kind: 'camera', retiredAt: new Date() },
          ],
        }),
      },
      streamSupervisor: {
        getStatus: () => ({
          running: true,
          totalDevices: 2,
          items: [
            { deviceCode: 'TRM-001', state: 'connected', parseErrors: 0 },
            { deviceCode: 'TRM-002', state: 'reconnecting', parseErrors: 3, lastReason: 'timeout' },
          ],
          metrics: { eventsAccepted: 100 },
        }),
      },
      attendanceSourceService: {
        listReviews: async () => ({
          ok: true,
          items: [
            { _id: 'rv-1', queue: 'supervisor', openedAt: '2026-05-01T08:00:00Z' },
            { _id: 'rv-2', queue: 'security', openedAt: '2026-05-01T09:00:00Z' },
          ],
          total: 2,
        }),
      },
      reconciliationService: {
        listCases: async () => ({
          ok: true,
          items: [{ _id: 'rc-1', status: 'open', openedAt: '2026-05-01T07:00:00Z' }],
          total: 1,
        }),
      },
      fraudScoreService: {
        listScores: async () => ({
          ok: true,
          items: [
            { employeeId: 'e1', primaryBranchId: 'br-A', currentScore: 85, band: 'high' },
            { employeeId: 'e2', primaryBranchId: 'br-A', currentScore: 70, band: 'medium' },
            { employeeId: 'e3', primaryBranchId: 'br-B', currentScore: 40, band: 'low' },
          ],
          total: 3,
        }),
      },
      syncWorker: {
        detectDriftAll: async () => ({
          ok: true,
          results: [
            { libraryId: 'lib-1', hasDrift: true },
            { libraryId: 'lib-2', hasDrift: false },
          ],
        }),
      },
      schedulerService: {
        listJobs: async () => ({
          items: [
            { id: 'job-1', labelAr: 'JOB1', available: true, latest: { status: 'succeeded' } },
            { id: 'job-2', labelAr: 'JOB2', available: true, latest: { status: 'failed' } },
          ],
        }),
      },
      branchConfigService: {
        list: async () => ({ ok: true, total: 1, items: [{ branchId: 'br-A' }] }),
      },
      branchModel: buildBranchModel(5),
      libraryModel: buildLibraryModel([
        { _id: 'lib-1', branchId: 'br-A' },
        { _id: 'lib-2', branchId: 'br-B' },
      ]),
      logger: SILENT,
    });

    const r = await svc.snapshot();
    expect(r.ok).toBe(true);
    expect(r.devices.ok).toBe(true);
    expect(r.devices.total).toBe(3);
    expect(r.stream.ok).toBe(true);
    expect(r.reviews.ok).toBe(true);
    expect(r.reconciliation.ok).toBe(true);
    expect(r.fraud.ok).toBe(true);
    expect(r.sync.ok).toBe(true);
    expect(r.scheduler.ok).toBe(true);
    expect(r.branchConfig.ok).toBe(true);
  });
});

// ═══ 2. Service missing → degraded ═════════════════════════════

describe('org-summary.snapshot — degraded services', () => {
  test('missing services produce ok:false reasons but snapshot still returns', async () => {
    const svc = createHikvisionOrgSummaryService({ logger: SILENT });
    const r = await svc.snapshot();
    expect(r.ok).toBe(true);
    expect(r.devices.ok).toBe(false);
    expect(r.stream.ok).toBe(false);
    expect(r.reviews.ok).toBe(false);
    expect(r.reconciliation.ok).toBe(false);
    expect(r.fraud.ok).toBe(false);
    expect(r.sync.ok).toBe(false);
    expect(r.branchConfig.ok).toBe(false);
    expect(r.scheduler.ok).toBe(false);
  });
});

// ═══ 3. Leaf throws → leaf-error reason ═══════════════════════════

describe('org-summary.snapshot — leaf throws', () => {
  test('device service throws → degraded section, snapshot still ok', async () => {
    const svc = createHikvisionOrgSummaryService({
      deviceService: {
        listDevices: async () => {
          throw new Error('mongo offline');
        },
      },
      logger: SILENT,
    });
    const r = await svc.snapshot();
    expect(r.ok).toBe(true);
    expect(r.devices.ok).toBe(false);
    expect(r.devices.reason).toBe('leaf-error');
    expect(r.devices.message).toMatch(/mongo offline/);
  });
});

// ═══ 4. Devices section ═══════════════════════════════════════════

describe('org-summary.snapshot — devices aggregation', () => {
  test('byKind + byBranch counts correctly + retired flag respected', async () => {
    const svc = createHikvisionOrgSummaryService({
      deviceService: {
        listDevices: async () => ({
          ok: true,
          items: [
            { _id: 'd1', branchId: 'br-A', kind: 'face-terminal' },
            { _id: 'd2', branchId: 'br-A', kind: 'face-terminal' },
            { _id: 'd3', branchId: 'br-A', kind: 'camera' },
            { _id: 'd4', branchId: 'br-B', kind: 'face-terminal', retiredAt: new Date() },
            { _id: 'd5', branchId: 'br-B', kind: 'camera' },
          ],
        }),
      },
      logger: SILENT,
    });
    const r = await svc.snapshot();
    expect(r.devices.total).toBe(5);
    expect(r.devices.retired).toBe(1);
    expect(r.devices.active).toBe(4);
    expect(r.devices.byKind['face-terminal']).toBe(3);
    expect(r.devices.byKind.camera).toBe(2);
    expect(r.devices.byBranch.length).toBe(2);
    expect(r.devices.byBranch[0].count).toBe(3); // br-A first (sorted desc)
    expect(r.devices.byBranch[0].branchId).toBe('br-A');
  });
});

// ═══ 5. Fraud section ═════════════════════════════════════════════

describe('org-summary.snapshot — fraud aggregation', () => {
  test('topBranches sorted by maxScore + topEmployees sorted by currentScore', async () => {
    const svc = createHikvisionOrgSummaryService({
      fraudScoreService: {
        listScores: async () => ({
          ok: true,
          items: [
            { employeeId: 'e1', primaryBranchId: 'br-A', currentScore: 30, band: 'low' },
            { employeeId: 'e2', primaryBranchId: 'br-A', currentScore: 90, band: 'critical' },
            { employeeId: 'e3', primaryBranchId: 'br-B', currentScore: 50, band: 'medium' },
            { employeeId: 'e4', primaryBranchId: 'br-C', currentScore: 75, band: 'high' },
          ],
        }),
      },
      logger: SILENT,
    });
    const r = await svc.snapshot();
    expect(r.fraud.ok).toBe(true);
    expect(r.fraud.byBand.critical).toBe(1);
    expect(r.fraud.byBand.high).toBe(1);
    expect(r.fraud.topBranches[0].branchId).toBe('br-A'); // max=90
    expect(r.fraud.topBranches[0].maxScore).toBe(90);
    expect(r.fraud.topEmployees[0].employeeId).toBe('e2');
    expect(r.fraud.topEmployees[0].currentScore).toBe(90);
  });
});

// ═══ 6. Sync section with libraryModel ═══════════════════════════

describe('org-summary.snapshot — sync libraries → branches', () => {
  test('byBranch built from libToBranch lookup when libraryModel given', async () => {
    const svc = createHikvisionOrgSummaryService({
      syncWorker: {
        detectDriftAll: async () => ({
          ok: true,
          results: [
            { libraryId: 'lib-1', hasDrift: true },
            { libraryId: 'lib-2', hasDrift: true },
            { libraryId: 'lib-3', hasDrift: false },
          ],
        }),
      },
      libraryModel: buildLibraryModel([
        { _id: 'lib-1', branchId: 'br-A' },
        { _id: 'lib-2', branchId: 'br-A' },
        { _id: 'lib-3', branchId: 'br-B' },
      ]),
      logger: SILENT,
    });
    const r = await svc.snapshot();
    expect(r.sync.ok).toBe(true);
    expect(r.sync.librariesScanned).toBe(3);
    expect(r.sync.withDrift).toBe(2);
    const aRow = r.sync.byBranch.find(x => x.branchId === 'br-A');
    const bRow = r.sync.byBranch.find(x => x.branchId === 'br-B');
    expect(aRow.withDrift).toBe(2);
    expect(bRow.withDrift).toBe(0);
  });

  test('no libraryModel → byBranch empty but section still ok', async () => {
    const svc = createHikvisionOrgSummaryService({
      syncWorker: {
        detectDriftAll: async () => ({
          ok: true,
          results: [{ libraryId: 'lib-1', hasDrift: true }],
        }),
      },
      logger: SILENT,
    });
    const r = await svc.snapshot();
    expect(r.sync.ok).toBe(true);
    expect(r.sync.byBranch).toEqual([]);
  });
});

// ═══ 7. Stream topReconnecting ═══════════════════════════════════

describe('org-summary.snapshot — stream topReconnecting', () => {
  test('reconnecting + circuit-open captured, sorted by parseErrors desc', async () => {
    const svc = createHikvisionOrgSummaryService({
      streamSupervisor: {
        getStatus: () => ({
          running: true,
          items: [
            { deviceCode: 'A', state: 'connected', parseErrors: 0 },
            { deviceCode: 'B', state: 'reconnecting', parseErrors: 5 },
            { deviceCode: 'C', state: 'circuit-open', parseErrors: 12 },
            { deviceCode: 'D', state: 'reconnecting', parseErrors: 2 },
          ],
        }),
      },
      logger: SILENT,
    });
    const r = await svc.snapshot();
    expect(r.stream.topReconnecting.length).toBe(3);
    expect(r.stream.topReconnecting[0].deviceCode).toBe('C'); // 12 errors
    expect(r.stream.topReconnecting[1].deviceCode).toBe('B');
  });
});

// ═══ 8. Branch-config coverage % ═════════════════════════════════

describe('org-summary.snapshot — branchConfig coverage', () => {
  test('coveragePct computed when branchModel + branchConfigService both present', async () => {
    const svc = createHikvisionOrgSummaryService({
      branchConfigService: {
        list: async () => ({ ok: true, total: 3, items: [] }),
      },
      branchModel: buildBranchModel(10),
      logger: SILENT,
    });
    const r = await svc.snapshot();
    expect(r.branchConfig.ok).toBe(true);
    expect(r.branchConfig.branchesWithOverrides).toBe(3);
    expect(r.branchConfig.allBranchCount).toBe(10);
    expect(r.branchConfig.overrideCoveragePct).toBe(30);
  });

  test('no branchModel → coveragePct=null', async () => {
    const svc = createHikvisionOrgSummaryService({
      branchConfigService: {
        list: async () => ({ ok: true, total: 5, items: [] }),
      },
      logger: SILENT,
    });
    const r = await svc.snapshot();
    expect(r.branchConfig.overrideCoveragePct).toBeNull();
  });
});

// ═══ 9. Scheduler section ════════════════════════════════════════

describe('org-summary.snapshot — scheduler counts', () => {
  test('counts running + failed correctly', async () => {
    const svc = createHikvisionOrgSummaryService({
      schedulerService: {
        listJobs: async () => ({
          items: [
            { id: 'a', available: true, latest: { status: reg.JOB_STATUS.RUNNING } },
            { id: 'b', available: true, latest: { status: reg.JOB_STATUS.SUCCEEDED } },
            { id: 'c', available: true, latest: { status: reg.JOB_STATUS.FAILED } },
            { id: 'd', available: false, latest: null },
          ],
        }),
      },
      logger: SILENT,
    });
    const r = await svc.snapshot();
    expect(r.scheduler.ok).toBe(true);
    expect(r.scheduler.jobsTotal).toBe(4);
    expect(r.scheduler.jobsAvailable).toBe(3);
    expect(r.scheduler.jobsRunning).toBe(1);
    expect(r.scheduler.jobsFailedRecent).toBe(1);
  });
});

// ═══ 10. Caching ═════════════════════════════════════════════════

describe('org-summary.snapshot — cache', () => {
  test('cached value returned on second call within TTL', async () => {
    let devCalls = 0;
    const clock = makeClock();
    const svc = createHikvisionOrgSummaryService({
      deviceService: {
        listDevices: async () => {
          devCalls += 1;
          return { ok: true, items: [] };
        },
      },
      logger: SILENT,
      now: clock.now,
      cacheTtlMs: 30_000,
    });
    await svc.snapshot();
    await svc.snapshot();
    await svc.snapshot();
    expect(devCalls).toBe(1);
  });

  test('skipCache=true bypasses cache', async () => {
    let devCalls = 0;
    const svc = createHikvisionOrgSummaryService({
      deviceService: {
        listDevices: async () => {
          devCalls += 1;
          return { ok: true, items: [] };
        },
      },
      logger: SILENT,
      cacheTtlMs: 60_000,
    });
    await svc.snapshot();
    await svc.snapshot({ skipCache: true });
    await svc.snapshot({ skipCache: true });
    expect(devCalls).toBe(3);
  });

  test('cache expires after TTL', async () => {
    let devCalls = 0;
    const clock = makeClock();
    const svc = createHikvisionOrgSummaryService({
      deviceService: {
        listDevices: async () => {
          devCalls += 1;
          return { ok: true, items: [] };
        },
      },
      logger: SILENT,
      now: clock.now,
      cacheTtlMs: 1_000,
    });
    await svc.snapshot();
    clock.advance(2_000); // past TTL
    await svc.snapshot();
    expect(devCalls).toBe(2);
  });
});

// ═══ 11. Empty org ═══════════════════════════════════════════════

describe('org-summary.snapshot — empty org', () => {
  test('all sections return ok:true with empty shells', async () => {
    const svc = createHikvisionOrgSummaryService({
      deviceService: { listDevices: async () => ({ ok: true, items: [] }) },
      attendanceSourceService: {
        listReviews: async () => ({ ok: true, items: [], total: 0 }),
      },
      reconciliationService: {
        listCases: async () => ({ ok: true, items: [], total: 0 }),
      },
      fraudScoreService: {
        listScores: async () => ({ ok: true, items: [], total: 0 }),
      },
      logger: SILENT,
    });
    const r = await svc.snapshot();
    expect(r.devices.total).toBe(0);
    expect(r.reviews.totalOpen).toBe(0);
    expect(r.reconciliation.totalOpen).toBe(0);
    expect(r.fraud.totalEmployees).toBe(0);
    expect(r.fraud.topBranches).toEqual([]);
    expect(r.fraud.topEmployees).toEqual([]);
  });
});
