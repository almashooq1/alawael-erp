/**
 * Unit Tests — analyticsService.js
 * Batch 39 · P#78
 *
 * Class export with attached utility classes.
 * DB methods mocked (AnalyticsCache, Employee, Integration, Document).
 * In-memory engine methods tested directly.
 */

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

/* DB model mocks */
const mockFindOne = jest.fn();
const mockFindOneAndUpdate = jest.fn();
const mockCountDocuments = jest.fn();
const mockAggregate = jest.fn();
jest.mock('../../models/AnalyticsCache', () => ({
  findOne: mockFindOne,
  findOneAndUpdate: mockFindOneAndUpdate,
}));
jest.mock('../../models/HR/Employee', () => ({ countDocuments: mockCountDocuments }));
jest.mock('../../models/Integration', () => ({ countDocuments: mockCountDocuments }));
jest.mock('../../models/Document', () => ({}));

const AnalyticsService = require('../../services/analyticsService');

describe('AnalyticsService', () => {
  let svc;
  beforeEach(() => {
    jest.clearAllMocks();
    svc = new AnalyticsService();
  });

  // ═══════════════════════════════════
  // AnalyticsMetric (attached class)
  // ═══════════════════════════════════
  describe('AnalyticsMetric', () => {
    const Metric = AnalyticsService.AnalyticsMetric;

    test('constructor initialises fields', () => {
      const m = new Metric('cpu', 'CPU Usage', 'desc', '%');
      expect(m.name).toBe('cpu');
      expect(m.value).toBe(0);
      expect(m.history).toEqual([]);
    });

    test('updateValue tracks history and trend', () => {
      const m = new Metric('cpu', 'CPU', '', '%');
      m.updateValue(50);
      expect(m.value).toBe(50);
      expect(m.history.length).toBe(1);
      m.updateValue(75);
      expect(m.trend).toBe(50); // (75 - 50) / 50 * 100
    });

    test('setThreshold & status transitions', () => {
      const m = new Metric('mem', 'Memory', '', '%');
      m.setThreshold(70, 90);
      m.updateValue(60);
      expect(m.status).toBe('normal');
      m.updateValue(75);
      expect(m.status).toBe('warning');
      m.updateValue(95);
      expect(m.status).toBe('critical');
    });

    test('getStatusColor returns correct colors', () => {
      const m = new Metric('x', 'X');
      expect(m.getStatusColor()).toBe('#00aa00'); // normal
      m.status = 'warning';
      expect(m.getStatusColor()).toBe('#ffaa00');
      m.status = 'critical';
      expect(m.getStatusColor()).toBe('#ff4444');
    });

    test('getTrendColor returns based on trend', () => {
      const m = new Metric('x', 'X');
      m.trend = 10;
      expect(m.getTrendColor()).toBe('green');
      m.trend = -5;
      expect(m.getTrendColor()).toBe('orange');
      m.trend = -20;
      expect(m.getTrendColor()).toBe('red');
    });
  });

  // ═══════════════════════════════════
  // DashboardTemplate (attached class)
  // ═══════════════════════════════════
  describe('DashboardTemplate', () => {
    const Dashboard = AnalyticsService.DashboardTemplate;

    test('addMetric, addChart, addTable push widgets', () => {
      const d = new Dashboard('main', 'Main');
      d.addMetric('cpu', 'CPU');
      d.addChart('line', 'Sales');
      d.addTable([1, 2]);
      expect(d.widgets.length).toBe(3);
      expect(d.widgets[0].type).toBe('metric');
      expect(d.widgets[1].type).toBe('chart');
      expect(d.widgets[2].type).toBe('table');
    });

    test('validate returns invalid when no name or widgets', () => {
      const d = new Dashboard('', 'No Name');
      expect(d.validate().valid).toBe(false);
      const d2 = new Dashboard('ok', 'OK');
      expect(d2.validate().valid).toBe(false); // no widgets
      d2.addMetric('x', 'X');
      expect(d2.validate().valid).toBe(true);
    });
  });

  // ═══════════════════════════════════
  // TrendAnalyzer (attached class)
  // ═══════════════════════════════════
  describe('TrendAnalyzer', () => {
    const TA = AnalyticsService.TrendAnalyzer;
    let ta;
    beforeEach(() => {
      ta = new TA();
    });

    test('analyzeTrend classifies strong-up', () => {
      const r = ta.analyzeTrend([10, 20, 30, 40, 50]);
      expect(r.direction).toBe('up');
      expect(r.trend).toMatch(/up/);
    });

    test('analyzeTrend classifies strong-down', () => {
      const r = ta.analyzeTrend([100, 80, 60, 40, 20]);
      expect(r.direction).toBe('down');
    });

    test('analyzeTrend classifies flat', () => {
      const r = ta.analyzeTrend([50, 50, 50, 50]);
      expect(r.direction).toBe('flat');
    });

    test('get30DayTrend slices last 30', () => {
      const data = Array.from({ length: 60 }, (_, i) => i);
      const r = ta.get30DayTrend(data);
      expect(r.direction).toBe('up');
    });
  });

  // ═══════════════════════════════════
  // KPIAggregator (attached class)
  // ═══════════════════════════════════
  describe('KPIAggregator', () => {
    const KPI = AnalyticsService.KPIAggregator;
    const Metric = AnalyticsService.AnalyticsMetric;

    test('registerKPI and getKPI work', () => {
      const agg = new KPI();
      const m = new Metric('rev', 'Revenue');
      agg.registerKPI(m);
      expect(agg.getKPI('rev')).toBe(m);
    });

    test('getAllMetrics returns all', () => {
      const agg = new KPI();
      agg.registerKPI(new Metric('a', 'A'));
      agg.registerKPI(new Metric('b', 'B'));
      expect(agg.getAllMetrics().length).toBe(2);
    });

    test('compareMetrics returns correlation', () => {
      const agg = new KPI();
      const m1 = new Metric('x', 'X');
      const m2 = new Metric('y', 'Y');
      m1.updateValue(10);
      m1.updateValue(20);
      m2.updateValue(10);
      m2.updateValue(20);
      agg.registerKPI(m1);
      agg.registerKPI(m2);
      const r = agg.compareMetrics('x', 'y');
      expect(r).toHaveProperty('correlation');
    });

    test('compareMetrics returns null for missing kpi', () => {
      const agg = new KPI();
      expect(agg.compareMetrics('x', 'y')).toBeNull();
    });
  });

  // ═══════════════════════════════════
  // AnalyticsService — in-memory engine
  // ═══════════════════════════════════
  describe('In-memory engine', () => {
    test('createMetric and getAllMetrics', () => {
      svc.createMetric('cpu', 'CPU', 'usage', '%');
      const all = svc.getAllMetrics();
      expect(all.length).toBe(1);
      expect(all[0].name).toBe('cpu');
    });

    test('updateMetric changes value', () => {
      svc.createMetric('mem', 'Memory', '', '%');
      svc.updateMetric('mem', 80);
      const m = svc.getMetric('mem');
      expect(m.value).toBe(80);
    });

    test('setMetricThreshold sets threshold', () => {
      svc.createMetric('disk', 'Disk', '', '%');
      svc.setMetricThreshold('disk', 70, 90);
      svc.updateMetric('disk', 95);
      const m = svc.getMetric('disk');
      expect(m.status).toBe('critical');
    });

    test('createDashboard and getDashboard', () => {
      const d = svc.createDashboard('main', 'Main Dashboard', 'desc');
      expect(d.name).toBe('main');
      expect(svc.getDashboard('main')).toBe(d);
    });

    test('addWidgetToDashboard pushes widget', () => {
      svc.createDashboard('d1', 'D1');
      svc.addWidgetToDashboard('d1', { type: 'metric', name: 'cpu' });
      expect(svc.getDashboard('d1').widgets.length).toBe(1);
    });

    test('analyze30DayTrend with metric history', () => {
      svc.createMetric('sales', 'Sales', '', '$');
      for (let i = 0; i < 5; i++) svc.updateMetric('sales', 100 + i * 10);
      const r = svc.analyze30DayTrend('sales');
      expect(r).toBeDefined();
      expect(r.direction).toBe('up');
    });

    test('analyze30DayTrend returns null for missing metric', () => {
      expect(svc.analyze30DayTrend('nonexist')).toBeNull();
    });

    test('getComparisonTrends returns two trends', () => {
      svc.createMetric('a', 'A');
      svc.createMetric('b', 'B');
      const r = svc.getComparisonTrends('a', 'b');
      expect(r).toHaveProperty('metric1');
      expect(r).toHaveProperty('metric2');
    });

    test('takeSnapshot and getSnapshotHistory', () => {
      svc.createMetric('x', 'X');
      svc.updateMetric('x', 42);
      const snap = svc.takeSnapshot('v1');
      expect(snap.id).toBeDefined();
      expect(snap.metrics.x.value).toBe(42);
      const history = svc.getSnapshotHistory(10);
      expect(history.length).toBe(1);
    });

    test('compareSnapshots returns diff', () => {
      svc.createMetric('y', 'Y');
      svc.updateMetric('y', 10);
      const s1 = svc.takeSnapshot('s1');
      svc.updateMetric('y', 20);
      const s2 = svc.takeSnapshot('s2');
      const c = svc.compareSnapshots(s1.id, s2.id);
      expect(c.comparison.y.before).toBe(10);
      expect(c.comparison.y.after).toBe(20);
      expect(c.comparison.y.change).toBe(10);
    });

    test('compareSnapshots returns null for missing id', () => {
      expect(svc.compareSnapshots('a', 'b')).toBeNull();
    });

    test('createAlert and evaluateAlerts', () => {
      svc.createMetric('temp', 'Temp', '', 'C');
      svc.createAlert('temp', 'exceeds', 100, 'critical');
      svc.updateMetric('temp', 150);
      const triggered = svc.evaluateAlerts();
      expect(triggered.length).toBe(1);
      expect(triggered[0].severity).toBe('critical');
    });

    test('evaluateAlerts below operator', () => {
      svc.createMetric('level', 'Level');
      svc.createAlert('level', 'below', 10);
      svc.updateMetric('level', 5);
      const triggered = svc.evaluateAlerts();
      expect(triggered.length).toBe(1);
    });

    test('getActiveAlerts returns active', () => {
      svc.createMetric('q', 'Q');
      svc.createAlert('q', 'exceeds', 0);
      svc.updateMetric('q', 1);
      svc.evaluateAlerts();
      expect(svc.getActiveAlerts().length).toBe(1);
    });

    test('getSystemStats returns counts', () => {
      svc.createMetric('a', 'A');
      svc.createDashboard('d', 'D');
      const s = svc.getSystemStats();
      expect(s.metrics).toBe(1);
      expect(s.dashboards).toBe(1);
    });

    test('getHealthReport categorises warnings and criticals', () => {
      svc.createMetric('w', 'W');
      svc.setMetricThreshold('w', 50, 90);
      svc.updateMetric('w', 60); // warning
      svc.createMetric('c', 'C');
      svc.setMetricThreshold('c', 50, 90);
      svc.updateMetric('c', 95); // critical
      const r = svc.getHealthReport();
      expect(r.summary.warnings).toBe(1);
      expect(r.summary.criticals).toBe(1);
    });

    test('exportData json format', () => {
      svc.createMetric('z', 'Z');
      svc.updateMetric('z', 99);
      const json = svc.exportData('json');
      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed.metrics[0].value).toBe(99);
    });

    test('exportData non-json returns object', () => {
      svc.createMetric('z', 'Z');
      const obj = svc.exportData('csv');
      expect(typeof obj).toBe('object');
    });

    test('aggregateMetricByPeriod returns array', () => {
      svc.createMetric('rev', 'Revenue');
      svc.updateMetric('rev', 100);
      const r = svc.aggregateMetricByPeriod('rev', 'day');
      expect(Array.isArray(r)).toBe(true);
    });
  });

  // ═══════════════════════════════════
  // DB-backed async methods
  // ═══════════════════════════════════
  describe('DB-backed methods', () => {
    test('getHRMetrics returns cached data', async () => {
      mockFindOne.mockResolvedValueOnce({
        data: {
          totalEmployees: 5,
          activeEmployees: 3,
          retentionRate: '98%',
          departmentDistribution: {},
        },
        expiresAt: new Date(Date.now() + 60000),
      });
      const r = await svc.getHRMetrics();
      expect(r.totalEmployees).toBe(5);
    });

    test('getHRMetrics calculates when cache expired', async () => {
      mockFindOne.mockResolvedValueOnce(null);
      mockCountDocuments.mockResolvedValue(10);
      mockFindOneAndUpdate.mockResolvedValueOnce({});
      const r = await svc.getHRMetrics();
      expect(r).toHaveProperty('totalEmployees');
    });

    test('getSystemHealth returns cached data', async () => {
      mockFindOne.mockResolvedValueOnce({
        data: {
          uptime: '99.9%',
          integrationHealth: { total: 5, active: 4, issues: 1 },
          lastAudit: new Date(),
        },
        expiresAt: new Date(Date.now() + 60000),
      });
      const r = await svc.getSystemHealth();
      expect(r.uptime).toBe('99.9%');
    });

    test('getAIInsights returns cached insights', async () => {
      const cachedInsights = [{ severity: 'LOW', category: 'PERFORMANCE', message: 'OK' }];
      mockFindOne.mockResolvedValueOnce({
        data: cachedInsights,
        expiresAt: new Date(Date.now() + 60000),
      });
      const r = await svc.getAIInsights();
      expect(Array.isArray(r)).toBe(true);
      expect(r[0].severity).toBe('LOW');
    });
  });
});
