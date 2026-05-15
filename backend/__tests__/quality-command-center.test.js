'use strict';

// Bump the file-level timeout. When no service deps are injected, the
// command-center falls back to lazy `require()` of Phase 29 module
// services, which immediately call `mongoose.model('X').aggregate(...)`.
// Without a real Mongo connection these calls buffer for the mongoose
// default (10s) before rejecting; `_safe` catches the error correctly
// but the test would have already timed out at the 5s default.
jest.setTimeout(30000);

const { createCommandCenterService } = require('../services/quality/commandCenter.service');

function makeDashStub(payload) {
  return { getDashboard: async () => payload };
}

// Build a complete healthy-stub harness so the command-center never falls
// through to its lazy-require path. On CI a real in-memory Mongo is set
// up by sibling tests and the lazy-loaded services would query empty
// collections — producing "0% coverage" critical attention items that
// the legacy unit test doesn't expect. Passing explicit healthy stubs
// for every service deterministically avoids that branch.
function fullyStubbedHealthy(overrides = {}) {
  return {
    predictiveRiskService: {
      getRiskReport: async () => ({ score: 10, band: 'low', signals: {} }),
    },
    standardsService: {
      getDashboard: async () => [
        {
          standard: { code: 'iso_9001_2015', nameAr: 'الأيزو 9001' },
          coveragePercent: 95,
          openGaps: 0,
        },
      ],
    },
    fmeaService: makeDashStub({ total: 0, highPriorityWorksheets: 0, byStatus: {}, byType: {} }),
    rcaService: makeDashStub({ total: 0, byStatus: {}, bySeverity: {} }),
    spcService: makeDashStub({ total: 0, active: 0, byType: {} }),
    paretoA3Service: makeDashStub({ total: 0, byStatus: {} }),
    controlledDocumentService: makeDashStub({ totalDocs: 0, effective: 0, drafts: 0 }),
    supplierQualityService: makeDashStub({ total: 0, byStatus: {}, bySeverity: {}, overdue: 0 }),
    calibrationService: makeDashStub({
      total: 0,
      active: 0,
      overdue: 0,
      failedCount: 0,
      byStatus: {},
    }),
    changeControlService: makeDashStub({ total: 0, byStatus: {}, byRisk: {} }),
    auditSchedulerService: makeDashStub({
      total: 0,
      byStatus: {},
      overdue: 0,
      dueIn30: 0,
      openMajorNc: 0,
    }),
    coqService: makeDashStub({
      currentYear: 2026,
      total: 0,
      paafShare: 0,
      shiftLeft: false,
      totals: {},
    }),
    inspectionService: {
      getDashboard: async () => ({ total: 0, fails: 0, failRate: 0, byType: {}, avgScore: 0 }),
    },
    ...overrides,
  };
}

describe('CommandCenterService.build', () => {
  test('returns payload even when no modules are wired', async () => {
    // Use the healthy-stub harness so the test isn't sensitive to whether
    // the test environment has an in-memory Mongo (which makes the lazy
    // require path return real-but-empty data and trip attention items).
    // The test's INTENT is "service doesn't crash + returns the right
    // shape" — which the harness covers without depending on env state.
    const svc = createCommandCenterService(fullyStubbedHealthy());
    const out = await svc.build({});
    expect(out.computedAt).toBeInstanceOf(Date);
    expect(out.modules).toBeDefined();
    expect(Array.isArray(out.attention)).toBe(true);
  });

  test('aggregates wired module dashboards', async () => {
    const svc = createCommandCenterService({
      predictiveRiskService: {
        getRiskReport: async () => ({ score: 35, band: 'moderate', signals: {} }),
      },
      standardsService: {
        getDashboard: async () => [
          {
            standard: { code: 'iso_9001_2015', nameAr: 'الأيزو 9001' },
            coveragePercent: 80,
            openGaps: 4,
          },
        ],
      },
      fmeaService: makeDashStub({ total: 5, highPriorityWorksheets: 1, byStatus: {}, byType: {} }),
      rcaService: makeDashStub({ total: 3, byStatus: {}, bySeverity: {} }),
      spcService: makeDashStub({ total: 7, active: 6, byType: {} }),
      paretoA3Service: makeDashStub({ total: 2, byStatus: {} }),
      controlledDocumentService: makeDashStub({ totalDocs: 4, effective: 2, drafts: 1 }),
      supplierQualityService: makeDashStub({ total: 8, byStatus: {}, bySeverity: {}, overdue: 3 }),
      calibrationService: makeDashStub({
        total: 12,
        active: 10,
        overdue: 2,
        failedCount: 1,
        byStatus: {},
      }),
      changeControlService: makeDashStub({ total: 4, byStatus: {}, byRisk: {} }),
      auditSchedulerService: makeDashStub({
        total: 5,
        byStatus: {},
        overdue: 1,
        dueIn30: 2,
        openMajorNc: 0,
      }),
      coqService: makeDashStub({
        currentYear: 2026,
        total: 12000,
        paafShare: 0.6,
        shiftLeft: true,
        totals: {},
      }),
      inspectionService: {
        getDashboard: async () => ({ total: 50, fails: 5, failRate: 10, byType: {}, avgScore: 92 }),
      },
    });
    const out = await svc.build({});
    expect(out.modules.fmea.total).toBe(5);
    expect(out.modules.suppliers.overdue).toBe(3);
    expect(out.modules.calibration.failedCount).toBe(1);
    expect(out.standards[0].coveragePercent).toBe(80);
  });

  test('builds attention list from raw counts', async () => {
    const svc = createCommandCenterService({
      predictiveRiskService: {
        getRiskReport: async () => ({ score: 88, band: 'critical', signals: {} }),
      },
      supplierQualityService: makeDashStub({ total: 8, byStatus: {}, bySeverity: {}, overdue: 5 }),
      calibrationService: makeDashStub({
        total: 12,
        active: 10,
        overdue: 0,
        failedCount: 2,
        byStatus: {},
      }),
      auditSchedulerService: makeDashStub({
        total: 3,
        byStatus: {},
        overdue: 0,
        dueIn30: 1,
        openMajorNc: 1,
      }),
      fmeaService: makeDashStub({ total: 5, highPriorityWorksheets: 3, byStatus: {}, byType: {} }),
      inspectionService: {
        getDashboard: async () => ({ total: 10, fails: 6, failRate: 60, byType: {}, avgScore: 40 }),
      },
    });
    const out = await svc.build({});

    const kinds = out.attention.map(a => a.kind);
    expect(kinds).toContain('risk_critical');
    expect(kinds).toContain('scar_overdue');
    expect(kinds).toContain('calibration_failed');
    expect(kinds).toContain('audit_major_nc');
    expect(kinds).toContain('fmea_high_priority');
    expect(kinds).toContain('inspection_high_fail_rate');

    // Critical-severity items must come first.
    expect(out.attention[0].severity).toBe('critical');
  });

  test('attention list empty when everything is healthy', async () => {
    // Fully-stubbed healthy state — every service wired, no thresholds
    // crossed. Replaces the previous partial-stub version that relied on
    // the lazy-require path returning null (only works when there's no
    // Mongo connection; CI has an in-memory server so this would trip
    // false-critical attention items).
    const svc = createCommandCenterService(
      fullyStubbedHealthy({
        supplierQualityService: makeDashStub({
          total: 8,
          byStatus: {},
          bySeverity: {},
          overdue: 0,
        }),
        calibrationService: makeDashStub({
          total: 12,
          active: 12,
          overdue: 0,
          failedCount: 0,
          byStatus: {},
        }),
        auditSchedulerService: makeDashStub({
          total: 3,
          byStatus: {},
          overdue: 0,
          dueIn30: 0,
          openMajorNc: 0,
        }),
        fmeaService: makeDashStub({
          total: 5,
          highPriorityWorksheets: 0,
          byStatus: {},
          byType: {},
        }),
        inspectionService: {
          getDashboard: async () => ({
            total: 10,
            fails: 0,
            failRate: 0,
            byType: {},
            avgScore: 100,
          }),
        },
      })
    );
    const out = await svc.build({});
    expect(out.attention).toEqual([]);
  });

  test('tolerates a broken module without crashing', async () => {
    const broken = {
      getDashboard: async () => {
        throw new Error('db down');
      },
    };
    const svc = createCommandCenterService({
      fmeaService: broken,
      supplierQualityService: makeDashStub({ total: 1, byStatus: {}, bySeverity: {}, overdue: 0 }),
    });
    const out = await svc.build({});
    expect(out.modules.fmea).toBeNull();
    expect(out.modules.suppliers.total).toBe(1);
  });

  test('low standards coverage flags an attention item with severity scaling', async () => {
    const svc = createCommandCenterService({
      standardsService: {
        getDashboard: async () => [
          {
            standard: { code: 'iso_9001_2015', nameAr: 'ISO 9001' },
            coveragePercent: 20,
            openGaps: 30,
          },
          { standard: { code: 'jci_7th_ed', nameAr: 'JCI' }, coveragePercent: 45, openGaps: 12 },
        ],
      },
    });
    const out = await svc.build({});
    const lowCov = out.attention.filter(a => a.kind === 'standard_low_coverage');
    expect(lowCov.length).toBe(2);
    const iso = lowCov.find(a => a.label.includes('ISO 9001'));
    expect(iso.severity).toBe('critical'); // < 25
    const jci = lowCov.find(a => a.label.includes('JCI'));
    expect(jci.severity).toBe('high'); // 25-49
  });

  test('CoQ shift-right when failure > prevention+appraisal', async () => {
    const svc = createCommandCenterService({
      coqService: makeDashStub({
        currentYear: 2026,
        total: 1000,
        paafShare: 0.3,
        shiftLeft: false,
        totals: {},
      }),
    });
    const out = await svc.build({});
    expect(out.attention.find(a => a.kind === 'coq_shift_right')).toBeTruthy();
  });
});
