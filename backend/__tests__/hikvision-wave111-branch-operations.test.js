/**
 * hikvision-wave111-branch-operations.test.js — Wave 111.
 *
 * Aggregator wraps existing per-service queries. Tests:
 *   1. Happy path — all sections populated when all services available
 *   2. Missing services — per-section degradation (ok:false reason)
 *   3. branchId validation — missing → VALIDATION_FAILED
 *   4. Leaf throws — per-section captured as leaf-error
 *   5. Stream filter — only branch devices counted
 *   6. Drift filter — only branch libraries included
 *   7. Devices grouping — byKind counts correct
 *   8. openReviewLimit / openCaseLimit forwarded to leaves
 *   9. Empty branch — devices=0, stream=empty, sync=empty without throwing
 */

'use strict';

const reg = require('../intelligence/hikvision.registry');
const {
  createHikvisionBranchOperationsService,
} = require('../intelligence/hikvision-branch-operations.service');

// ─── Mock-model + service builders ─────────────────────────────

function buildDeviceModel(devices) {
  const M = {};
  M.find = function (q = {}) {
    let filtered = devices;
    for (const [k, v] of Object.entries(q)) {
      filtered = filtered.filter(d => String(d[k]) === String(v));
    }
    return {
      lean: async () => filtered.map(d => ({ ...d })),
      then: r => r(filtered.map(d => ({ ...d }))),
    };
  };
  return M;
}

function buildLibraryModel(libs) {
  const M = {};
  M.find = function (q = {}) {
    let filtered = libs;
    for (const [k, v] of Object.entries(q)) {
      filtered = filtered.filter(d => String(d[k]) === String(v));
    }
    return {
      lean: async () => filtered.map(d => ({ ...d })),
      then: r => r(filtered.map(d => ({ ...d }))),
    };
  };
  return M;
}

const SILENT = { info: () => {}, warn: () => {}, error: () => {} };

// ═══ 1. Happy path ═══════════════════════════════════════════════

describe('branch-operations.snapshot — happy path', () => {
  test('all sections populate when every service is wired', async () => {
    const devices = [
      { _id: 'd1', deviceCode: 'TRM-001', branchId: 'br-A', kind: 'face-terminal' },
      { _id: 'd2', deviceCode: 'TRM-002', branchId: 'br-A', kind: 'face-terminal' },
      { _id: 'd3', deviceCode: 'CAM-001', branchId: 'br-A', kind: 'camera' },
    ];
    const libs = [
      { _id: 'lib-1', branchId: 'br-A' },
      { _id: 'lib-2', branchId: 'br-B' }, // different branch
    ];
    const svc = createHikvisionBranchOperationsService({
      deviceModel: buildDeviceModel(devices),
      libraryModel: buildLibraryModel(libs),
      healthService: {
        getBranchSummary: async () => ({
          ok: true,
          totals: { online: 2, degraded: 1, offline: 0 },
        }),
      },
      streamSupervisor: {
        getStatus: () => ({
          running: true,
          items: [
            { deviceCode: 'TRM-001', state: 'connected' },
            { deviceCode: 'TRM-002', state: 'reconnecting' },
            { deviceCode: 'OUT-OF-BRANCH', state: 'connected' },
          ],
        }),
      },
      attendanceSourceService: {
        listReviews: async () => ({ ok: true, items: [{ _id: 'rv-1' }], total: 1 }),
      },
      reconciliationService: {
        listCases: async () => ({ ok: true, items: [{ _id: 'rc-1' }], total: 1 }),
      },
      fraudScoreService: {
        getBranchSummary: async () => ({ ok: true, band: 'medium', count: 5 }),
      },
      branchConfigService: {
        resolveEffective: async () => ({
          ok: true,
          source: 'branch-override',
          effective: { confidenceThresholds: { FACE_TERMINAL_AUTO_ACCEPT: 92 } },
        }),
      },
      syncWorker: {
        detectDriftAll: async () => ({
          ok: true,
          results: [
            { libraryId: 'lib-1', hasDrift: false },
            { libraryId: 'lib-2', hasDrift: true }, // belongs to br-B
          ],
        }),
      },
      logger: SILENT,
    });

    const r = await svc.snapshot('br-A');
    expect(r.ok).toBe(true);
    expect(r.branchId).toBe('br-A');
    expect(r.health.ok).toBe(true);
    expect(r.health.totals.online).toBe(2);
    expect(r.stream.ok).toBe(true);
    expect(r.stream.streamedDevices).toBe(2); // OUT-OF-BRANCH filtered
    expect(r.stream.byState.connected).toBe(1);
    expect(r.stream.byState.reconnecting).toBe(1);
    expect(r.reviews.ok).toBe(true);
    expect(r.reconciliation.ok).toBe(true);
    expect(r.fraud.ok).toBe(true);
    expect(r.thresholds.ok).toBe(true);
    expect(r.sync.ok).toBe(true);
    expect(r.sync.summary.scanned).toBe(1); // only lib-1 (br-B filtered)
    expect(r.devices.ok).toBe(true);
    expect(r.devices.total).toBe(3);
    expect(r.devices.byKind['face-terminal']).toBe(2);
    expect(r.devices.byKind.camera).toBe(1);
  });
});

// ═══ 2. Missing services degrade per-section ═══════════════════

describe('branch-operations.snapshot — degraded services', () => {
  test('missing services produce per-section ok:false with reason', async () => {
    const svc = createHikvisionBranchOperationsService({
      deviceModel: buildDeviceModel([]),
      logger: SILENT,
      // every other service intentionally absent
    });
    const r = await svc.snapshot('br-A');
    expect(r.ok).toBe(true);
    expect(r.health.ok).toBe(false);
    expect(r.stream.ok).toBe(false);
    expect(r.reviews.ok).toBe(false);
    expect(r.reconciliation.ok).toBe(false);
    expect(r.fraud.ok).toBe(false);
    expect(r.thresholds.ok).toBe(false);
    expect(r.sync.ok).toBe(false);
    // devices section is always available because it only needs deviceModel
    expect(r.devices.ok).toBe(true);
    expect(r.devices.total).toBe(0);
  });
});

// ═══ 3. branchId validation ═════════════════════════════════════

describe('branch-operations.snapshot — branchId validation', () => {
  test('missing branchId → VALIDATION_FAILED', async () => {
    const svc = createHikvisionBranchOperationsService({
      deviceModel: buildDeviceModel([]),
      logger: SILENT,
    });
    const r = await svc.snapshot(null);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
  });

  test('empty string branchId → VALIDATION_FAILED', async () => {
    const svc = createHikvisionBranchOperationsService({
      deviceModel: buildDeviceModel([]),
      logger: SILENT,
    });
    const r = await svc.snapshot('');
    expect(r.ok).toBe(false);
  });
});

// ═══ 4. Leaf throws captured ════════════════════════════════════

describe('branch-operations.snapshot — leaf throws', () => {
  test('health service throws → section ok:false with leaf-error', async () => {
    const svc = createHikvisionBranchOperationsService({
      deviceModel: buildDeviceModel([]),
      healthService: {
        getBranchSummary: async () => {
          throw new Error('mongo offline');
        },
      },
      logger: SILENT,
    });
    const r = await svc.snapshot('br-A');
    expect(r.ok).toBe(true);
    expect(r.health.ok).toBe(false);
    expect(r.health.reason).toBe('leaf-error');
    expect(r.health.message).toMatch(/mongo offline/);
  });

  test('stream supervisor throws → section degrades cleanly', async () => {
    const svc = createHikvisionBranchOperationsService({
      deviceModel: buildDeviceModel([]),
      streamSupervisor: {
        getStatus: () => {
          throw new Error('supervisor crashed');
        },
      },
      logger: SILENT,
    });
    const r = await svc.snapshot('br-A');
    expect(r.ok).toBe(true);
    expect(r.stream.ok).toBe(false);
    expect(r.stream.message).toMatch(/supervisor crashed/);
  });
});

// ═══ 5. Stream filter ═══════════════════════════════════════════

describe('branch-operations.snapshot — stream filter', () => {
  test('only branch devices counted in stream summary', async () => {
    const svc = createHikvisionBranchOperationsService({
      deviceModel: buildDeviceModel([
        { _id: 'd1', deviceCode: 'TRM-001', branchId: 'br-A', kind: 'face-terminal' },
      ]),
      streamSupervisor: {
        getStatus: () => ({
          running: true,
          items: [
            { deviceCode: 'TRM-001', state: 'connected' },
            { deviceCode: 'OTHER-001', state: 'connected' },
            { deviceCode: 'OTHER-002', state: 'circuit-open' },
          ],
        }),
      },
      logger: SILENT,
    });
    const r = await svc.snapshot('br-A');
    expect(r.stream.streamedDevices).toBe(1);
    expect(r.stream.totalBranchDevices).toBe(1);
    expect(r.stream.byState.connected).toBe(1);
    expect(r.stream.byState['circuit-open']).toBeUndefined();
  });
});

// ═══ 6. Drift filter ════════════════════════════════════════════

describe('branch-operations.snapshot — drift filter', () => {
  test('only branch libraries included in sync summary', async () => {
    const svc = createHikvisionBranchOperationsService({
      deviceModel: buildDeviceModel([]),
      libraryModel: buildLibraryModel([
        { _id: 'lib-A', branchId: 'br-A' },
        { _id: 'lib-B', branchId: 'br-B' },
      ]),
      syncWorker: {
        detectDriftAll: async () => ({
          ok: true,
          results: [
            { libraryId: 'lib-A', hasDrift: true },
            { libraryId: 'lib-B', hasDrift: true },
          ],
        }),
      },
      logger: SILENT,
    });
    const r = await svc.snapshot('br-A');
    expect(r.sync.ok).toBe(true);
    expect(r.sync.summary.scanned).toBe(1);
    expect(r.sync.summary.withDrift).toBe(1);
  });

  test('no libraries for branch → empty sync results without sync call', async () => {
    let driftCalls = 0;
    const svc = createHikvisionBranchOperationsService({
      deviceModel: buildDeviceModel([]),
      libraryModel: buildLibraryModel([{ _id: 'lib-X', branchId: 'br-X' }]),
      syncWorker: {
        detectDriftAll: async () => {
          driftCalls += 1;
          return { ok: true, results: [] };
        },
      },
      logger: SILENT,
    });
    const r = await svc.snapshot('br-A');
    expect(r.sync.ok).toBe(true);
    expect(r.sync.summary.scanned).toBe(0);
    expect(driftCalls).toBe(0); // short-circuited
  });
});

// ═══ 7. Devices grouping ════════════════════════════════════════

describe('branch-operations.snapshot — devices', () => {
  test('byKind groups correctly + retired counted', async () => {
    const svc = createHikvisionBranchOperationsService({
      deviceModel: buildDeviceModel([
        { _id: 'd1', deviceCode: 'A', branchId: 'br-A', kind: 'face-terminal' },
        { _id: 'd2', deviceCode: 'B', branchId: 'br-A', kind: 'face-terminal' },
        { _id: 'd3', deviceCode: 'C', branchId: 'br-A', kind: 'camera' },
        {
          _id: 'd4',
          deviceCode: 'D',
          branchId: 'br-A',
          kind: 'camera',
          retiredAt: new Date(),
        },
      ]),
      logger: SILENT,
    });
    const r = await svc.snapshot('br-A');
    expect(r.devices.total).toBe(4);
    expect(r.devices.byKind['face-terminal']).toBe(2);
    expect(r.devices.byKind.camera).toBe(2);
    expect(r.devices.retired).toBe(1);
  });
});

// ═══ 8. openReviewLimit / openCaseLimit forwarding ═════════════

describe('branch-operations.snapshot — limit forwarding', () => {
  test('openReviewLimit forwarded to listReviews', async () => {
    let captured;
    const svc = createHikvisionBranchOperationsService({
      deviceModel: buildDeviceModel([]),
      attendanceSourceService: {
        listReviews: async args => {
          captured = args;
          return { ok: true, items: [], total: 0 };
        },
      },
      logger: SILENT,
    });
    await svc.snapshot('br-A', { openReviewLimit: 12 });
    expect(captured.limit).toBe(12);
  });

  test('openCaseLimit forwarded to listCases', async () => {
    let captured;
    const svc = createHikvisionBranchOperationsService({
      deviceModel: buildDeviceModel([]),
      reconciliationService: {
        listCases: async args => {
          captured = args;
          return { ok: true, items: [], total: 0 };
        },
      },
      logger: SILENT,
    });
    await svc.snapshot('br-A', { openCaseLimit: 8 });
    expect(captured.limit).toBe(8);
  });

  test('out-of-range openReviewLimit clamped to bounds', async () => {
    let captured;
    const svc = createHikvisionBranchOperationsService({
      deviceModel: buildDeviceModel([]),
      attendanceSourceService: {
        listReviews: async args => {
          captured = args;
          return { ok: true, items: [], total: 0 };
        },
      },
      logger: SILENT,
    });
    await svc.snapshot('br-A', { openReviewLimit: 999 });
    expect(captured.limit).toBeLessThanOrEqual(20);
  });
});
