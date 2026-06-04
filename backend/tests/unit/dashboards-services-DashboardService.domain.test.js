/**
 * Functional unit tests for DashboardService
 * Covers: module exports, listDashboards() query, updateWidgetLayout(),
 * recordSnapshot() status/trend/variance, listAlerts() query, createAlert(),
 * getExecutiveSummary() shape
 */
'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

let mockModels = {};

jest.mock('mongoose', () => ({
  model: jest.fn(name => mockModels[name] || {}),
  Types: { ObjectId: jest.fn(id => id) },
}));

const { dashboardService } = require('../../domains/dashboards/services/DashboardService');

/* ─── helpers ─────────────────────────────────────────────── */

function makeKPIDefinitionMock(kpi = null) {
  return {
    findById: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(kpi),
    }),
  };
}

function makeKPISnapshotMock(previousSnapshot = null) {
  return {
    create: jest.fn().mockImplementation(async data => data),
    findOne: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(previousSnapshot),
      }),
    }),
  };
}

function makeDashboardMock(find = [], total = 0) {
  return {
    create: jest.fn().mockResolvedValue({}),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(find),
    }),
    findById: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    }),
    findByIdAndUpdate: jest.fn().mockResolvedValue(null),
    countDocuments: jest.fn().mockResolvedValue(total),
  };
}

function makeAlertMock(items = [], total = 0) {
  return {
    create: jest.fn().mockResolvedValue({}),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(items),
    }),
    countDocuments: jest.fn().mockResolvedValue(total),
    aggregate: jest.fn().mockResolvedValue([]),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockModels = {};
  const mongoose = require('mongoose');
  mongoose.model.mockImplementation(name => mockModels[name] || {});
});

/* ═══════════════════════ MODULE EXPORTS ═══════════════════════ */

describe('dashboardService module exports', () => {
  test('exports dashboardService as an object', () => {
    expect(dashboardService).toBeDefined();
    expect(typeof dashboardService).toBe('object');
  });

  test('has dashboard CRUD methods', () => {
    [
      'createDashboard',
      'listDashboards',
      'getDashboard',
      'updateDashboard',
      'deleteDashboard',
    ].forEach(m => expect(typeof dashboardService[m]).toBe('function'));
  });

  test('has widget management methods', () => {
    ['addWidget', 'removeWidget', 'updateWidgetLayout'].forEach(m =>
      expect(typeof dashboardService[m]).toBe('function')
    );
  });

  test('has KPI methods', () => {
    [
      'createKPI',
      'listKPIs',
      'getKPI',
      'updateKPI',
      'recordSnapshot',
      'getKPITrend',
      'getLatestSnapshots',
    ].forEach(m => expect(typeof dashboardService[m]).toBe('function'));
  });

  test('has alert methods', () => {
    [
      'createAlert',
      'listAlerts',
      'getAlert',
      'acknowledgeAlert',
      'resolveAlert',
      'dismissAlert',
      'escalateAlert',
      'assignAlert',
    ].forEach(m => expect(typeof dashboardService[m]).toBe('function'));
  });

  test('has summary and analytics methods', () => {
    ['getExecutiveSummary', 'getAlertAnalytics'].forEach(m =>
      expect(typeof dashboardService[m]).toBe('function')
    );
  });
});

/* ═══════════════════════ listDashboards ═══════════════════════ */

describe('DashboardService.listDashboards()', () => {
  function setup(total = 0) {
    mockModels.DashboardConfig = makeDashboardMock([], total);
    return mockModels.DashboardConfig;
  }

  test('builds $or query when userId is provided', async () => {
    const mock = setup();
    await dashboardService.listDashboards({ userId: 'user1' });
    const [query] = mock.countDocuments.mock.calls[0];
    expect(query.$or).toEqual([{ userId: 'user1' }, { isShared: true }, { type: 'role_default' }]);
  });

  test('does not add $or when userId is absent', async () => {
    const mock = setup();
    await dashboardService.listDashboards({ role: 'clinician' });
    const [query] = mock.countDocuments.mock.calls[0];
    expect(query.$or).toBeUndefined();
    expect(query.role).toBe('clinician');
  });

  test('adds type and category filters when provided', async () => {
    const mock = setup();
    await dashboardService.listDashboards({ type: 'clinical', category: 'therapy' });
    const [query] = mock.countDocuments.mock.calls[0];
    expect(query.type).toBe('clinical');
    expect(query.category).toBe('therapy');
  });

  test('always includes isDeleted filter', async () => {
    const mock = setup();
    await dashboardService.listDashboards();
    const [query] = mock.countDocuments.mock.calls[0];
    expect(query).toMatchObject({ isDeleted: { $ne: true } });
  });

  test('returns { data, total, page, pages }', async () => {
    setup(15);
    const result = await dashboardService.listDashboards({ page: 2, limit: 5 });
    expect(result).toHaveProperty('data');
    expect(result.total).toBe(15);
    expect(result.page).toBe(2);
    expect(result.pages).toBe(3);
  });
});

/* ═══════════════════════ updateWidgetLayout ═══════════════════════ */

describe('DashboardService.updateWidgetLayout()', () => {
  test('throws "Dashboard not found" when findById returns null', async () => {
    mockModels.DashboardConfig = {
      findById: jest.fn().mockResolvedValue(null),
    };
    await expect(
      dashboardService.updateWidgetLayout('dash1', [{ widgetId: 'w1', layout: { x: 0 } }])
    ).rejects.toThrow('Dashboard not found');
  });

  test('updates matching widget layout and saves', async () => {
    const mockSave = jest.fn().mockResolvedValue({});
    const mockDash = {
      widgets: [{ widgetId: 'w1', layout: { x: 0, y: 0 } }],
      save: mockSave,
    };
    mockModels.DashboardConfig = { findById: jest.fn().mockResolvedValue(mockDash) };
    const result = await dashboardService.updateWidgetLayout('dash1', [
      { widgetId: 'w1', layout: { x: 5, y: 3 } },
    ]);
    expect(mockDash.widgets[0].layout.x).toBe(5);
    expect(mockDash.widgets[0].layout.y).toBe(3);
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockDash);
  });
});

/* ═══════════════════════ recordSnapshot — status (higher_is_better) ═══════════════════════ */

describe('DashboardService.recordSnapshot() — higher_is_better status', () => {
  const kpiBase = {
    direction: 'higher_is_better',
    target: { value: 80, stretch: 95, warningThreshold: 70, criticalThreshold: 60 },
  };

  async function snap(value) {
    mockModels.DashboardKPIDefinition = makeKPIDefinitionMock({ ...kpiBase });
    mockModels.KPISnapshot = makeKPISnapshotMock(null);
    const data = { kpiId: 'kpi1', value };
    await dashboardService.recordSnapshot(data);
    return data;
  }

  test('value >= stretch → exceeds_target', async () => {
    const d = await snap(96);
    expect(d.status).toBe('exceeds_target');
  });

  test('value >= target but < stretch → on_target', async () => {
    const d = await snap(85);
    expect(d.status).toBe('on_target');
  });

  test('value exactly at target → on_target', async () => {
    const d = await snap(80);
    expect(d.status).toBe('on_target');
  });

  test('value between warning and target → warning', async () => {
    const d = await snap(75);
    expect(d.status).toBe('warning');
  });

  test('value between critical and warning → warning', async () => {
    const d = await snap(65);
    expect(d.status).toBe('warning');
  });

  test('value at or below criticalThreshold → critical', async () => {
    const d = await snap(55);
    expect(d.status).toBe('critical');
  });
});

/* ═══════════════════════ recordSnapshot — status (lower_is_better) ═══════════════════════ */

describe('DashboardService.recordSnapshot() — lower_is_better status', () => {
  const kpiLower = {
    direction: 'lower_is_better',
    target: { value: 10, warningThreshold: 15, criticalThreshold: 20 },
  };

  async function snap(value) {
    mockModels.DashboardKPIDefinition = makeKPIDefinitionMock({ ...kpiLower });
    mockModels.KPISnapshot = makeKPISnapshotMock(null);
    const data = { kpiId: 'kpi1', value };
    await dashboardService.recordSnapshot(data);
    return data;
  }

  test('value at or below target → on_target', async () => {
    const d = await snap(8);
    expect(d.status).toBe('on_target');
  });

  test('value exactly at target → on_target', async () => {
    const d = await snap(10);
    expect(d.status).toBe('on_target');
  });

  test('value between target and warningThreshold → warning', async () => {
    const d = await snap(13);
    expect(d.status).toBe('warning');
  });

  test('value at or above warningThreshold but below critical → warning', async () => {
    const d = await snap(17);
    expect(d.status).toBe('warning');
  });

  test('value at or above criticalThreshold → critical', async () => {
    const d = await snap(22);
    expect(d.status).toBe('critical');
  });
});

/* ═══════════════════════ recordSnapshot — variance ═══════════════════════ */

describe('DashboardService.recordSnapshot() — variance calculation', () => {
  test('sets variance, variancePercentage, and target from KPI', async () => {
    mockModels.DashboardKPIDefinition = makeKPIDefinitionMock({
      direction: 'higher_is_better',
      target: { value: 100 },
    });
    mockModels.KPISnapshot = makeKPISnapshotMock(null);
    const data = { kpiId: 'kpi1', value: 120 };
    await dashboardService.recordSnapshot(data);
    expect(data.target).toBe(100);
    expect(data.variance).toBe(20);
    expect(data.variancePercentage).toBeCloseTo(20, 5);
  });

  test('variancePercentage is 0 when target is 0', async () => {
    mockModels.DashboardKPIDefinition = makeKPIDefinitionMock({
      direction: 'higher_is_better',
      target: { value: 0 },
    });
    mockModels.KPISnapshot = makeKPISnapshotMock(null);
    const data = { kpiId: 'kpi1', value: 50 };
    await dashboardService.recordSnapshot(data);
    expect(data.variancePercentage).toBe(0);
  });
});

/* ═══════════════════════ recordSnapshot — trend ═══════════════════════ */

describe('DashboardService.recordSnapshot() — trend calculation', () => {
  async function snapWithPrev(value, previousValue, direction = 'higher_is_better') {
    mockModels.DashboardKPIDefinition = makeKPIDefinitionMock({
      direction,
      target: { value: 80 },
    });
    mockModels.KPISnapshot = makeKPISnapshotMock({ value: previousValue, _id: 'prev1' });
    const data = { kpiId: 'kpi1', value };
    await dashboardService.recordSnapshot(data);
    return data;
  }

  test('sets previousValue and changeFromPrevious', async () => {
    const d = await snapWithPrev(90, 80);
    expect(d.previousValue).toBe(80);
    expect(d.changeFromPrevious).toBe(10);
  });

  test('less than 2% change → stable', async () => {
    const d = await snapWithPrev(81, 80); // 1.25% change
    expect(d.trend).toBe('stable');
  });

  test('higher_is_better + positive change → improving', async () => {
    const d = await snapWithPrev(90, 80); // +12.5%
    expect(d.trend).toBe('improving');
  });

  test('higher_is_better + negative change → declining', async () => {
    const d = await snapWithPrev(70, 80); // −12.5%
    expect(d.trend).toBe('declining');
  });

  test('lower_is_better + negative change → improving', async () => {
    const d = await snapWithPrev(7, 10, 'lower_is_better'); // −30%
    expect(d.trend).toBe('improving');
  });

  test('lower_is_better + positive change → declining', async () => {
    const d = await snapWithPrev(13, 10, 'lower_is_better'); // +30%
    expect(d.trend).toBe('declining');
  });

  test('no previous snapshot → no trend set', async () => {
    mockModels.DashboardKPIDefinition = makeKPIDefinitionMock({
      direction: 'higher_is_better',
      target: { value: 80 },
    });
    mockModels.KPISnapshot = makeKPISnapshotMock(null); // no previous
    const data = { kpiId: 'kpi1', value: 90 };
    await dashboardService.recordSnapshot(data);
    expect(data.trend).toBeUndefined();
  });
});

/* ═══════════════════════ recordSnapshot — no KPI ═══════════════════════ */

describe('DashboardService.recordSnapshot() — no KPI definition', () => {
  test('creates snapshot with no status when KPI is null', async () => {
    mockModels.DashboardKPIDefinition = makeKPIDefinitionMock(null);
    mockModels.KPISnapshot = makeKPISnapshotMock(null);
    const data = { kpiId: 'unknown_kpi', value: 50 };
    await dashboardService.recordSnapshot(data);
    expect(data.status).toBeUndefined();
    expect(mockModels.KPISnapshot.create).toHaveBeenCalledWith(data);
  });
});

/* ═══════════════════════ listAlerts ═══════════════════════ */

describe('DashboardService.listAlerts()', () => {
  function setup(total = 0) {
    mockModels.DecisionAlert = makeAlertMock([], total);
    return mockModels.DecisionAlert;
  }

  test('always includes isDeleted: {$ne: true}', async () => {
    const mock = setup();
    await dashboardService.listAlerts();
    const [query] = mock.countDocuments.mock.calls[0];
    expect(query).toMatchObject({ isDeleted: { $ne: true } });
  });

  test('adds status as $in when status is an array', async () => {
    const mock = setup();
    await dashboardService.listAlerts({ status: ['new', 'acknowledged'] });
    const [query] = mock.countDocuments.mock.calls[0];
    expect(query.status).toEqual({ $in: ['new', 'acknowledged'] });
  });

  test('adds status as scalar when status is a string', async () => {
    const mock = setup();
    await dashboardService.listAlerts({ status: 'new' });
    const [query] = mock.countDocuments.mock.calls[0];
    expect(query.status).toBe('new');
  });

  test('adds severity filter when provided', async () => {
    const mock = setup();
    await dashboardService.listAlerts({ severity: 'critical' });
    const [query] = mock.countDocuments.mock.calls[0];
    expect(query.severity).toBe('critical');
  });

  test('adds category filter when provided', async () => {
    const mock = setup();
    await dashboardService.listAlerts({ category: 'clinical_risk' });
    const [query] = mock.countDocuments.mock.calls[0];
    expect(query.category).toBe('clinical_risk');
  });

  test('adds beneficiaryId filter when provided', async () => {
    const mock = setup();
    await dashboardService.listAlerts({ beneficiaryId: 'b1' });
    const [query] = mock.countDocuments.mock.calls[0];
    expect(query.beneficiaryId).toBe('b1');
  });

  test('returns { data, total, page, pages }', async () => {
    setup(25);
    const result = await dashboardService.listAlerts({ page: 2, limit: 10 });
    expect(result).toHaveProperty('data');
    expect(result.total).toBe(25);
    expect(result.page).toBe(2);
    expect(result.pages).toBe(3);
  });

  test('pages rounds up for partial page', async () => {
    setup(21);
    const result = await dashboardService.listAlerts({ page: 1, limit: 10 });
    expect(result.pages).toBe(3);
  });
});

/* ═══════════════════════ createAlert ═══════════════════════ */

describe('DashboardService.createAlert()', () => {
  test('calls DecisionAlert.create with provided data', async () => {
    const mockAlert = { _id: 'alert1', severity: 'high' };
    mockModels.DecisionAlert = { create: jest.fn().mockResolvedValue(mockAlert) };
    const result = await dashboardService.createAlert({
      severity: 'high',
      category: 'clinical_risk',
    });
    expect(result).toBe(mockAlert);
    expect(mockModels.DecisionAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'high', category: 'clinical_risk' })
    );
  });
});

/* ═══════════════════════ getExecutiveSummary ═══════════════════════ */

describe('DashboardService.getExecutiveSummary()', () => {
  test('returns correct shape with merged data', async () => {
    mockModels.Beneficiary = { countDocuments: jest.fn().mockResolvedValue(45) };
    mockModels.EpisodeOfCare = { countDocuments: jest.fn().mockResolvedValue(30) };
    mockModels.ClinicalSession = { countDocuments: jest.fn().mockResolvedValue(120) };
    mockModels.DecisionAlert = {
      aggregate: jest.fn().mockResolvedValue([
        { _id: 'high', count: 3 },
        { _id: 'critical', count: 1 },
      ]),
    };
    mockModels.KPISnapshot = {
      aggregate: jest.fn().mockResolvedValue([
        { _id: 'on_target', count: 10 },
        { _id: 'warning', count: 4 },
      ]),
    };

    const result = await dashboardService.getExecutiveSummary();

    expect(result.activeBeneficiaries).toBe(45);
    expect(result.activeEpisodes).toBe(30);
    expect(result.sessionsThisMonth).toBe(120);
    expect(result.alerts.total).toBe(4); // 3 + 1
    expect(result.alerts.bySeverity).toEqual({ high: 3, critical: 1 });
    expect(result.kpis.byStatus).toEqual({ on_target: 10, warning: 4 });
  });

  test('returns zero counts when no data exists', async () => {
    mockModels.Beneficiary = { countDocuments: jest.fn().mockResolvedValue(0) };
    mockModels.EpisodeOfCare = { countDocuments: jest.fn().mockResolvedValue(0) };
    mockModels.ClinicalSession = { countDocuments: jest.fn().mockResolvedValue(0) };
    mockModels.DecisionAlert = { aggregate: jest.fn().mockResolvedValue([]) };
    mockModels.KPISnapshot = { aggregate: jest.fn().mockResolvedValue([]) };

    const result = await dashboardService.getExecutiveSummary();
    expect(result.activeBeneficiaries).toBe(0);
    expect(result.alerts.total).toBe(0);
    expect(result.alerts.bySeverity).toEqual({});
    expect(result.kpis.byStatus).toEqual({});
  });
});
