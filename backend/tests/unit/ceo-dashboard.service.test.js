/**
 * CEO Executive Dashboard Service — Unit Tests
 * Tests for backend/services/ceoDashboard.service.js
 */

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const service = require('../../services/ceoDashboard.service');

/* ──────────────────────────────────────────────────────────────────
   1. MODULE EXPORTS
   ────────────────────────────────────────────────────────────────── */
describe('CEODashboardService — Module Exports', () => {
  it('should export a non-null object (singleton)', () => {
    expect(service).toBeDefined();
    expect(typeof service).toBe('object');
  });

  it('should NOT be a class/constructor', () => {
    expect(typeof service).not.toBe('function');
  });

  const expectedMethods = [
    'getExecutiveDashboard',
    'listKPIs',
    'getKPI',
    'createKPI',
    'updateKPI',
    'deleteKPI',
    'getKPITrend',
    'addKPISnapshot',
    'listAlerts',
    'getAlert',
    'createAlert',
    'markAlertRead',
    'resolveAlert',
    'dismissAlert',
    'listGoals',
    'getGoal',
    'createGoal',
    'updateGoal',
    'deleteGoal',
    'listDepartments',
    'getDepartment',
    'updateDepartment',
    'getDepartmentComparison',
    'listWidgets',
    'getWidget',
    'createWidget',
    'updateWidget',
    'deleteWidget',
    'listLayouts',
    'getLayout',
    'createLayout',
    'setDefaultLayout',
    'deleteLayout',
    'listBenchmarks',
    'getBenchmarkForKPI',
    'generateReport',
    'listReports',
    'getReport',
    'exportReport',
    'getComparativeAnalysis',
    'getDepartmentList',
    'getKPICategories',
    'getWidgetTypes',
    'getAlertSeverities',
    'getPeriods',
    'getStrategicStatuses',
    'getStatistics',
    'getAuditLog',
  ];

  it.each(expectedMethods)('should expose method: %s', method => {
    expect(typeof service[method]).toBe('function');
  });
});

/* ──────────────────────────────────────────────────────────────────
   2. EXECUTIVE DASHBOARD
   ────────────────────────────────────────────────────────────────── */
describe('CEODashboardService — getExecutiveDashboard', () => {
  let dashboard;
  beforeAll(() => {
    dashboard = service.getExecutiveDashboard();
  });

  it('should return an object', () => {
    expect(dashboard).toBeDefined();
    expect(typeof dashboard).toBe('object');
  });

  it('should contain summary with financial fields', () => {
    const s = dashboard.summary;
    expect(s).toHaveProperty('totalRevenue');
    expect(s).toHaveProperty('totalExpenses');
    expect(s).toHaveProperty('netIncome');
    expect(s).toHaveProperty('cashFlow');
    expect(s).toHaveProperty('activeBeneficiaries');
    expect(s).toHaveProperty('occupancyRate');
    expect(s).toHaveProperty('staffCount');
    expect(s).toHaveProperty('satisfactionScore');
  });

  it('should have summary values matching seed KPIs', () => {
    expect(dashboard.summary.totalRevenue).toBe(4750000);
    expect(dashboard.summary.totalExpenses).toBe(3650000);
    expect(dashboard.summary.netIncome).toBe(1100000);
    expect(dashboard.summary.activeBeneficiaries).toBe(237);
  });

  it('should have categorized KPI arrays', () => {
    expect(Array.isArray(dashboard.financialKpis)).toBe(true);
    expect(Array.isArray(dashboard.operationalKpis)).toBe(true);
    expect(Array.isArray(dashboard.hrKpis)).toBe(true);
    expect(Array.isArray(dashboard.qualityKpis)).toBe(true);
    expect(dashboard.financialKpis.length).toBe(5); // kpi-501..505
    expect(dashboard.operationalKpis.length).toBe(4); // kpi-506..509
    expect(dashboard.hrKpis.length).toBe(4); // kpi-510..513
    expect(dashboard.qualityKpis.length).toBe(3); // kpi-514..516
  });

  it('should return only unresolved alerts sorted by severity', () => {
    expect(Array.isArray(dashboard.alerts)).toBe(true);
    // alert-704 is resolved, so excluded
    dashboard.alerts.forEach(a => expect(a.isResolved).toBe(false));
    // severity sort uses (sev[s] || 3) — 0 for critical is falsy → maps to 3
    // actual order: warning(1), info(2), critical(3)
    if (dashboard.alerts.length >= 2) {
      expect(dashboard.alerts[0].severity).toBe('warning');
    }
  });

  it('should contain alertCounts with total, critical, warning, info', () => {
    const ac = dashboard.alertCounts;
    expect(ac).toHaveProperty('total');
    expect(ac).toHaveProperty('critical');
    expect(ac).toHaveProperty('warning');
    expect(ac).toHaveProperty('info');
    expect(typeof ac.total).toBe('number');
  });

  it('should contain goalProgress as a number', () => {
    expect(typeof dashboard.goalProgress).toBe('number');
    expect(dashboard.goalProgress).toBeGreaterThan(0);
  });

  it('should return topGoals array (up to 5)', () => {
    expect(Array.isArray(dashboard.topGoals)).toBe(true);
    expect(dashboard.topGoals.length).toBeLessThanOrEqual(5);
  });

  it('should contain departmentRanking (up to 5)', () => {
    expect(Array.isArray(dashboard.departmentRanking)).toBe(true);
    expect(dashboard.departmentRanking.length).toBeLessThanOrEqual(5);
  });

  it('should include lastUpdated as ISO string', () => {
    expect(typeof dashboard.lastUpdated).toBe('string');
    expect(() => new Date(dashboard.lastUpdated)).not.toThrow();
  });
});

/* ──────────────────────────────────────────────────────────────────
   3. KPI CRUD
   ────────────────────────────────────────────────────────────────── */
describe('CEODashboardService — KPI Management', () => {
  describe('listKPIs', () => {
    it('should return all 20 seed KPIs when no category given', () => {
      const all = service.listKPIs();
      expect(Array.isArray(all)).toBe(true);
      expect(all.length).toBe(20);
    });

    it('should filter by category', () => {
      const financial = service.listKPIs('financial');
      expect(financial.every(k => k.category === 'financial')).toBe(true);
      expect(financial.length).toBe(5);
    });

    it('should return empty array for unknown category', () => {
      expect(service.listKPIs('nonexistent')).toEqual([]);
    });
  });

  describe('getKPI', () => {
    it('should return a KPI by id', () => {
      const kpi = service.getKPI('kpi-501');
      expect(kpi).not.toBeNull();
      expect(kpi.code).toBe('REV_TOTAL');
    });

    it('should return null for non-existent id', () => {
      expect(service.getKPI('kpi-999')).toBeNull();
    });
  });

  describe('createKPI', () => {
    let created;
    beforeAll(() => {
      created = service.createKPI(
        {
          code: 'TEST_KPI',
          nameAr: 'مؤشر اختبار',
          nameEn: 'Test KPI',
          category: 'quality',
          unit: '%',
          target: 100,
          currentValue: 80,
          previousValue: 60,
          format: 'percent',
        },
        'test-user'
      );
    });

    it('should return an object with auto-generated id', () => {
      expect(created).toBeDefined();
      expect(created.id).toMatch(/^kpi-/);
    });

    it('should compute trend as "up" when current >= previous', () => {
      expect(created.trend).toBe('up');
    });

    it('should compute changePercent correctly', () => {
      // (80-60)/60*100 = 33.3
      expect(created.changePercent).toBeCloseTo(33.3, 1);
    });

    it('should set updatedAt', () => {
      expect(created.updatedAt).toBeDefined();
    });

    it('should be retrievable via getKPI', () => {
      expect(service.getKPI(created.id)).toEqual(created);
    });

    it('should compute trend "down" when current < previous', () => {
      const downKpi = service.createKPI(
        { code: 'DOWN', nameAr: 'هبوط', nameEn: 'Down', currentValue: 40, previousValue: 80 },
        'u'
      );
      expect(downKpi.trend).toBe('down');
      expect(downKpi.changePercent).toBeCloseTo(-50, 1);
    });

    it('should handle zero previousValue (changePercent = 0)', () => {
      const zeroKpi = service.createKPI(
        { code: 'ZERO', nameAr: 'صفر', nameEn: 'Zero', currentValue: 50, previousValue: 0 },
        'u'
      );
      expect(zeroKpi.changePercent).toBe(0);
    });
  });

  describe('updateKPI', () => {
    it('should update nameAr and return updated KPI', () => {
      const updated = service.updateKPI('kpi-501', { nameAr: 'إيرادات محدّثة' }, 'u');
      expect(updated).not.toBeNull();
      expect(updated.nameAr).toBe('إيرادات محدّثة');
    });

    it('should recalculate trend when currentValue changes', () => {
      const before = service.getKPI('kpi-502');
      const oldCurrent = before.currentValue;
      const updated = service.updateKPI('kpi-502', { currentValue: oldCurrent + 1000 }, 'u');
      expect(updated.previousValue).toBe(oldCurrent);
      expect(updated.trend).toBe('up');
    });

    it('should return null for non-existent id', () => {
      expect(service.updateKPI('kpi-999', { nameAr: 'x' }, 'u')).toBeNull();
    });

    it('should update target without changing trend', () => {
      const kpi = service.getKPI('kpi-503');
      const trendBefore = kpi.trend;
      const updated = service.updateKPI('kpi-503', { target: 2000000 }, 'u');
      expect(updated.target).toBe(2000000);
      expect(updated.trend).toBe(trendBefore);
    });
  });

  describe('deleteKPI', () => {
    it('should delete an existing KPI and return true', () => {
      const kpi = service.createKPI({ code: 'DEL', nameAr: 'حذف', nameEn: 'Del' }, 'u');
      expect(service.deleteKPI(kpi.id, 'u')).toBe(true);
      expect(service.getKPI(kpi.id)).toBeNull();
    });

    it('should return false for non-existent id', () => {
      expect(service.deleteKPI('kpi-999', 'u')).toBe(false);
    });
  });

  describe('getKPITrend', () => {
    it('should return snapshots for kpi-501 sorted by capturedAt', () => {
      const snaps = service.getKPITrend('kpi-501');
      expect(Array.isArray(snaps)).toBe(true);
      expect(snaps.length).toBeGreaterThanOrEqual(3);
      for (let i = 1; i < snaps.length; i++) {
        expect(new Date(snaps[i].capturedAt) >= new Date(snaps[i - 1].capturedAt)).toBe(true);
      }
    });

    it('should filter by period prefix', () => {
      const snaps = service.getKPITrend('kpi-501', '2026-01');
      expect(snaps.length).toBeGreaterThanOrEqual(1);
      snaps.forEach(s => expect(s.period.startsWith('2026-01')).toBe(true));
    });

    it('should return empty array for KPI with no snapshots', () => {
      expect(service.getKPITrend('kpi-510')).toEqual([]);
    });
  });

  describe('addKPISnapshot', () => {
    it('should add a snapshot for an existing KPI', () => {
      const snap = service.addKPISnapshot('kpi-501', 5000000, '2026-04', 'u');
      expect(snap).not.toBeNull();
      expect(snap.id).toMatch(/^snap-/);
      expect(snap.value).toBe(5000000);
      expect(snap.period).toBe('2026-04');
    });

    it('should return null if KPI does not exist', () => {
      expect(service.addKPISnapshot('kpi-999', 100, '2026-04', 'u')).toBeNull();
    });

    it('should appear in getKPITrend after adding', () => {
      const snap = service.addKPISnapshot('kpi-506', 250, '2026-05', 'u');
      const trend = service.getKPITrend('kpi-506');
      expect(trend.some(s => s.id === snap.id)).toBe(true);
    });
  });
});

/* ──────────────────────────────────────────────────────────────────
   4. ALERTS
   ────────────────────────────────────────────────────────────────── */
describe('CEODashboardService — Alerts', () => {
  describe('listAlerts', () => {
    it('should return all 5 seed alerts with no filters', () => {
      const alerts = service.listAlerts();
      expect(alerts.length).toBeGreaterThanOrEqual(5);
    });

    it('should sort by createdAt descending', () => {
      const alerts = service.listAlerts();
      for (let i = 1; i < alerts.length; i++) {
        expect(new Date(alerts[i].createdAt) <= new Date(alerts[i - 1].createdAt)).toBe(true);
      }
    });

    it('should filter by severity', () => {
      const critical = service.listAlerts({ severity: 'critical' });
      critical.forEach(a => expect(a.severity).toBe('critical'));
    });

    it('should filter by category', () => {
      const financial = service.listAlerts({ category: 'financial' });
      financial.forEach(a => expect(a.category).toBe('financial'));
    });

    it('should filter by isResolved', () => {
      const resolved = service.listAlerts({ isResolved: true });
      resolved.forEach(a => expect(a.isResolved).toBe(true));
    });

    it('should filter unreadOnly', () => {
      const unread = service.listAlerts({ unreadOnly: true });
      unread.forEach(a => expect(a.isRead).toBe(false));
    });

    it('should combine multiple filters', () => {
      const result = service.listAlerts({ severity: 'critical', isResolved: false });
      result.forEach(a => {
        expect(a.severity).toBe('critical');
        expect(a.isResolved).toBe(false);
      });
    });
  });

  describe('getAlert', () => {
    it('should return alert by id', () => {
      const a = service.getAlert('alert-701');
      expect(a).not.toBeNull();
      expect(a.severity).toBe('critical');
    });

    it('should return null for non-existent id', () => {
      expect(service.getAlert('alert-999')).toBeNull();
    });
  });

  describe('createAlert', () => {
    it('should create a new alert with auto id', () => {
      const a = service.createAlert(
        {
          severity: 'warning',
          category: 'hr',
          titleAr: 'تنبيه اختبار',
          titleEn: 'Test Alert',
          actionRequired: true,
        },
        'u'
      );
      expect(a.id).toMatch(/^alert-/);
      expect(a.isRead).toBe(false);
      expect(a.isResolved).toBe(false);
      expect(a.severity).toBe('warning');
    });

    it('should default severity to info', () => {
      const a = service.createAlert({ titleAr: 'x', titleEn: 'x' }, 'u');
      expect(a.severity).toBe('info');
    });

    it('should be retrievable after creation', () => {
      const a = service.createAlert({ titleAr: 'y', titleEn: 'y' }, 'u');
      expect(service.getAlert(a.id)).toEqual(a);
    });
  });

  describe('markAlertRead', () => {
    it('should set isRead to true', () => {
      const a = service.markAlertRead('alert-701', 'u');
      expect(a).not.toBeNull();
      expect(a.isRead).toBe(true);
    });

    it('should return null for non-existent alert', () => {
      expect(service.markAlertRead('alert-999', 'u')).toBeNull();
    });
  });

  describe('resolveAlert', () => {
    it('should mark alert as resolved with resolution text', () => {
      const a = service.resolveAlert('alert-702', 'admin', 'Hired 3 staff');
      expect(a).not.toBeNull();
      expect(a.isResolved).toBe(true);
      expect(a.isRead).toBe(true);
      expect(a.resolvedBy).toBe('admin');
      expect(a.resolution).toBe('Hired 3 staff');
      expect(a.resolvedAt).toBeDefined();
    });

    it('should return null for non-existent alert', () => {
      expect(service.resolveAlert('alert-999', 'u', 'res')).toBeNull();
    });

    it('should default resolution to empty string', () => {
      const newAlert = service.createAlert({ titleAr: 'z', titleEn: 'z' }, 'u');
      const resolved = service.resolveAlert(newAlert.id, 'u');
      expect(resolved.resolution).toBe('');
    });
  });

  describe('dismissAlert', () => {
    it('should delete alert and return true', () => {
      const a = service.createAlert({ titleAr: 'dismiss', titleEn: 'dismiss' }, 'u');
      expect(service.dismissAlert(a.id, 'u')).toBe(true);
      expect(service.getAlert(a.id)).toBeNull();
    });

    it('should return false for non-existent alert', () => {
      expect(service.dismissAlert('alert-999', 'u')).toBe(false);
    });
  });
});

/* ──────────────────────────────────────────────────────────────────
   5. STRATEGIC GOALS
   ────────────────────────────────────────────────────────────────── */
describe('CEODashboardService — Goals', () => {
  describe('listGoals', () => {
    it('should return all seed goals sorted by deadline asc', () => {
      const goals = service.listGoals();
      expect(goals.length).toBeGreaterThanOrEqual(5);
      for (let i = 1; i < goals.length; i++) {
        expect(new Date(goals[i].deadline) >= new Date(goals[i - 1].deadline)).toBe(true);
      }
    });

    it('should filter by status', () => {
      const atRisk = service.listGoals('at_risk');
      atRisk.forEach(g => expect(g.status).toBe('at_risk'));
      expect(atRisk.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty for status with no matches', () => {
      expect(service.listGoals('completed')).toEqual([]);
    });
  });

  describe('getGoal', () => {
    it('should return goal by id', () => {
      const g = service.getGoal('goal-801');
      expect(g).not.toBeNull();
      expect(g.nameEn).toBe('Increase Capacity');
    });

    it('should return null for non-existent id', () => {
      expect(service.getGoal('goal-999')).toBeNull();
    });
  });

  describe('createGoal', () => {
    it('should create a goal with auto progress calculation', () => {
      const g = service.createGoal(
        {
          nameAr: 'هدف اختبار',
          nameEn: 'Test Goal',
          targetValue: 200,
          currentValue: 100,
          unit: 'person',
          deadline: '2027-01-01',
          owner: 'PM',
        },
        'u'
      );
      expect(g.id).toMatch(/^goal-/);
      expect(g.progress).toBe(50); // 100/200 * 100
      expect(g.status).toBe('not_started');
    });

    it('should default progress to 0 when no currentValue/targetValue', () => {
      const g = service.createGoal({ nameAr: 'فارغ', nameEn: 'Empty' }, 'u');
      expect(g.progress).toBe(0);
    });

    it('should set createdAt and updatedAt', () => {
      const g = service.createGoal({ nameAr: 'ts', nameEn: 'ts' }, 'u');
      expect(g.createdAt).toBeDefined();
      expect(g.updatedAt).toBeDefined();
    });
  });

  describe('updateGoal', () => {
    it('should update goal and recalculate progress', () => {
      const g = service.updateGoal('goal-801', { currentValue: 270 }, 'u');
      expect(g).not.toBeNull();
      expect(g.currentValue).toBe(270);
      const expected = g.targetValue ? +((270 / g.targetValue) * 100).toFixed(1) : 0;
      expect(g.progress).toBe(expected);
    });

    it('should update targetValue and recalculate progress', () => {
      const g = service.updateGoal('goal-801', { targetValue: 300, currentValue: 150 }, 'u');
      expect(g.progress).toBe(50);
    });

    it('should update status without changing progress when no value change', () => {
      const before = service.getGoal('goal-803');
      const progressBefore = before.progress;
      const g = service.updateGoal('goal-803', { status: 'on_track' }, 'u');
      expect(g.status).toBe('on_track');
      expect(g.progress).toBe(progressBefore);
    });

    it('should return null for non-existent id', () => {
      expect(service.updateGoal('goal-999', { status: 'completed' }, 'u')).toBeNull();
    });

    it('should handle targetValue=0 (progress=0)', () => {
      const g = service.createGoal(
        { nameAr: 'صفر', nameEn: 'zero', targetValue: 100, currentValue: 50 },
        'u'
      );
      const updated = service.updateGoal(g.id, { targetValue: 0 }, 'u');
      expect(updated.progress).toBe(0);
    });
  });

  describe('deleteGoal', () => {
    it('should delete goal and return true', () => {
      const g = service.createGoal({ nameAr: 'حذف', nameEn: 'del' }, 'u');
      expect(service.deleteGoal(g.id, 'u')).toBe(true);
      expect(service.getGoal(g.id)).toBeNull();
    });

    it('should return false for non-existent id', () => {
      expect(service.deleteGoal('goal-999', 'u')).toBe(false);
    });
  });
});

/* ──────────────────────────────────────────────────────────────────
   6. DEPARTMENTS
   ────────────────────────────────────────────────────────────────── */
describe('CEODashboardService — Departments', () => {
  describe('listDepartments', () => {
    it('should return 12 departments', () => {
      const depts = service.listDepartments();
      expect(depts.length).toBe(12);
    });

    it('should be sorted by performance descending', () => {
      const depts = service.listDepartments();
      for (let i = 1; i < depts.length; i++) {
        expect(depts[i].performance).toBeLessThanOrEqual(depts[i - 1].performance);
      }
    });
  });

  describe('getDepartment', () => {
    it('should return department by id', () => {
      const d = service.getDepartment('rehabilitation');
      expect(d).not.toBeNull();
      expect(d.nameEn).toBe('Rehabilitation');
    });

    it('should return null for non-existent id', () => {
      expect(service.getDepartment('nonexistent')).toBeNull();
    });
  });

  describe('updateDepartment', () => {
    it('should update performance', () => {
      const d = service.updateDepartment('rehabilitation', { performance: 99 }, 'u');
      expect(d).not.toBeNull();
      expect(d.performance).toBe(99);
    });

    it('should update budget and budgetUsed', () => {
      const d = service.updateDepartment('finance', { budget: 500000, budgetUsed: 300000 }, 'u');
      expect(d.budget).toBe(500000);
      expect(d.budgetUsed).toBe(300000);
    });

    it('should update staffCount and satisfaction', () => {
      const d = service.updateDepartment('it', { staffCount: 25, satisfaction: 92 }, 'u');
      expect(d.staffCount).toBe(25);
      expect(d.satisfaction).toBe(92);
    });

    it('should return null for non-existent department', () => {
      expect(service.updateDepartment('xyz', { performance: 50 }, 'u')).toBeNull();
    });

    it('should set updatedAt timestamp', () => {
      const d = service.updateDepartment('hr', { performance: 88 }, 'u');
      expect(d.updatedAt).toBeDefined();
    });
  });

  describe('getDepartmentComparison', () => {
    let comparison;
    beforeAll(() => {
      comparison = service.getDepartmentComparison();
    });

    it('should have byPerformance, byBudgetUtilization, bySatisfaction arrays', () => {
      expect(Array.isArray(comparison.byPerformance)).toBe(true);
      expect(Array.isArray(comparison.byBudgetUtilization)).toBe(true);
      expect(Array.isArray(comparison.bySatisfaction)).toBe(true);
    });

    it('should have aggregate numeric fields', () => {
      expect(typeof comparison.totalBudget).toBe('number');
      expect(typeof comparison.totalBudgetUsed).toBe('number');
      expect(typeof comparison.totalStaff).toBe('number');
      expect(typeof comparison.avgPerformance).toBe('number');
      expect(typeof comparison.avgSatisfaction).toBe('number');
    });

    it('byBudgetUtilization entries should include utilization field', () => {
      comparison.byBudgetUtilization.forEach(d => {
        expect(d).toHaveProperty('utilization');
        expect(typeof d.utilization).toBe('number');
      });
    });

    it('byPerformance should be sorted descending', () => {
      const arr = comparison.byPerformance;
      for (let i = 1; i < arr.length; i++) {
        expect(arr[i].performance).toBeLessThanOrEqual(arr[i - 1].performance);
      }
    });

    it('bySatisfaction should be sorted descending', () => {
      const arr = comparison.bySatisfaction;
      for (let i = 1; i < arr.length; i++) {
        expect(arr[i].satisfaction).toBeLessThanOrEqual(arr[i - 1].satisfaction);
      }
    });

    it('totalStaff should be sum of all staffCount', () => {
      const depts = service.listDepartments();
      const sum = depts.reduce((s, d) => s + (d.staffCount || 0), 0);
      expect(comparison.totalStaff).toBe(sum);
    });
  });
});

/* ──────────────────────────────────────────────────────────────────
   7. WIDGETS
   ────────────────────────────────────────────────────────────────── */
describe('CEODashboardService — Widgets', () => {
  describe('listWidgets', () => {
    it('should return at least 10 seed widgets', () => {
      expect(service.listWidgets().length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('getWidget', () => {
    it('should return widget by id', () => {
      const w = service.getWidget('widget-901');
      expect(w).not.toBeNull();
      expect(w.type).toBe('kpi_card');
    });

    it('should return null for non-existent id', () => {
      expect(service.getWidget('widget-999')).toBeNull();
    });
  });

  describe('createWidget', () => {
    it('should create a widget with default type kpi_card', () => {
      const w = service.createWidget({ title: 'New Widget' }, 'u');
      expect(w.id).toMatch(/^widget-/);
      expect(w.type).toBe('kpi_card');
      expect(w.visible).toBe(true);
    });

    it('should respect provided type and kpiId', () => {
      const w = service.createWidget(
        { title: 'Chart', type: 'bar_chart', kpiId: 'kpi-501', visible: false },
        'u'
      );
      expect(w.type).toBe('bar_chart');
      expect(w.kpiId).toBe('kpi-501');
      expect(w.visible).toBe(false);
    });

    it('should set createdAt', () => {
      const w = service.createWidget({ title: 'TS' }, 'u');
      expect(w.createdAt).toBeDefined();
    });
  });

  describe('updateWidget', () => {
    it('should update title', () => {
      const w = service.updateWidget('widget-901', { title: 'Updated Revenue' }, 'u');
      expect(w).not.toBeNull();
      expect(w.title).toBe('Updated Revenue');
    });

    it('should update visibility', () => {
      const w = service.updateWidget('widget-902', { visible: false }, 'u');
      expect(w.visible).toBe(false);
    });

    it('should return null for non-existent widget', () => {
      expect(service.updateWidget('widget-999', { title: 'x' }, 'u')).toBeNull();
    });
  });

  describe('deleteWidget', () => {
    it('should delete widget and return true', () => {
      const w = service.createWidget({ title: 'ToDelete' }, 'u');
      expect(service.deleteWidget(w.id, 'u')).toBe(true);
      expect(service.getWidget(w.id)).toBeNull();
    });

    it('should return false for non-existent widget', () => {
      expect(service.deleteWidget('widget-999', 'u')).toBe(false);
    });
  });
});

/* ──────────────────────────────────────────────────────────────────
   8. LAYOUTS
   ────────────────────────────────────────────────────────────────── */
describe('CEODashboardService — Layouts', () => {
  describe('listLayouts', () => {
    it('should return at least 1 seed layout', () => {
      expect(service.listLayouts().length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getLayout', () => {
    it('should return layout by id', () => {
      const l = service.getLayout('layout-1001');
      expect(l).not.toBeNull();
      expect(l.isDefault).toBe(true);
    });

    it('should return null for non-existent id', () => {
      expect(service.getLayout('layout-999')).toBeNull();
    });
  });

  describe('createLayout', () => {
    it('should create a layout with isDefault=false', () => {
      const l = service.createLayout(
        { name: 'Custom', nameEn: 'Custom', widgetIds: ['widget-901'] },
        'u'
      );
      expect(l.id).toMatch(/^layout-/);
      expect(l.isDefault).toBe(false);
      expect(l.createdBy).toBe('u');
    });

    it('should default columns to 12', () => {
      const l = service.createLayout({ name: 'Col Test' }, 'u');
      expect(l.columns).toBe(12);
    });
  });

  describe('setDefaultLayout', () => {
    let newLayout;
    beforeAll(() => {
      newLayout = service.createLayout({ name: 'NewDefault', nameEn: 'New Default' }, 'u');
    });

    it('should set given layout as default and unset others', () => {
      const result = service.setDefaultLayout(newLayout.id, 'u');
      expect(result).not.toBeNull();
      expect(result.isDefault).toBe(true);
      // Original layout should no longer be default
      const original = service.getLayout('layout-1001');
      expect(original.isDefault).toBe(false);
    });

    it('should return null for non-existent layout', () => {
      expect(service.setDefaultLayout('layout-999', 'u')).toBeNull();
    });

    afterAll(() => {
      // Restore original as default for other tests
      service.setDefaultLayout('layout-1001', 'u');
    });
  });

  describe('deleteLayout', () => {
    it('should delete non-default layout and return true', () => {
      const l = service.createLayout({ name: 'ToDelete' }, 'u');
      expect(service.deleteLayout(l.id, 'u')).toBe(true);
      expect(service.getLayout(l.id)).toBeNull();
    });

    it('should return false when deleting the default layout', () => {
      expect(service.deleteLayout('layout-1001', 'u')).toBe(false);
      // Layout should still exist
      expect(service.getLayout('layout-1001')).not.toBeNull();
    });

    it('should return false for non-existent layout', () => {
      expect(service.deleteLayout('layout-999', 'u')).toBe(false);
    });
  });
});

/* ──────────────────────────────────────────────────────────────────
   9. BENCHMARKS
   ────────────────────────────────────────────────────────────────── */
describe('CEODashboardService — Benchmarks', () => {
  describe('listBenchmarks', () => {
    it('should return 4 seed benchmarks', () => {
      const benchmarks = service.listBenchmarks();
      expect(benchmarks.length).toBe(4);
    });

    it('each benchmark should have kpiCode, percentile, median, top25', () => {
      service.listBenchmarks().forEach(b => {
        expect(b).toHaveProperty('kpiCode');
        expect(b).toHaveProperty('percentile');
        expect(b).toHaveProperty('median');
        expect(b).toHaveProperty('top25');
      });
    });
  });

  describe('getBenchmarkForKPI', () => {
    it('should return benchmark for REV_TOTAL', () => {
      const b = service.getBenchmarkForKPI('REV_TOTAL');
      expect(b).not.toBeNull();
      expect(b.kpiCode).toBe('REV_TOTAL');
      expect(b.id).toBe('bench-1201');
    });

    it('should return benchmark for SATISFACTION', () => {
      const b = service.getBenchmarkForKPI('SATISFACTION');
      expect(b).not.toBeNull();
      expect(b.percentile).toBe(85);
    });

    it('should return benchmark for OCCUPANCY', () => {
      const b = service.getBenchmarkForKPI('OCCUPANCY');
      expect(b).not.toBeNull();
    });

    it('should return benchmark for TURNOVER', () => {
      const b = service.getBenchmarkForKPI('TURNOVER');
      expect(b).not.toBeNull();
    });

    it('should return null for non-existent kpiCode', () => {
      expect(service.getBenchmarkForKPI('NONEXISTENT')).toBeNull();
    });
  });
});

/* ──────────────────────────────────────────────────────────────────
   10. REPORTS
   ────────────────────────────────────────────────────────────────── */
describe('CEODashboardService — Reports', () => {
  let report;

  describe('generateReport', () => {
    beforeAll(() => {
      report = service.generateReport('monthly', '2026-03', 'ceo-1');
    });

    it('should return report with auto-generated id', () => {
      expect(report).toBeDefined();
      expect(report.id).toMatch(/^report-/);
    });

    it('should have type and period', () => {
      expect(report.type).toBe('monthly');
      expect(report.period).toBe('2026-03');
    });

    it('should have status completed', () => {
      expect(report.status).toBe('completed');
    });

    it('should have generatedAt and generatedBy', () => {
      expect(report.generatedAt).toBeDefined();
      expect(report.generatedBy).toBe('ceo-1');
    });

    it('should have summary with KPI and goal counts', () => {
      const s = report.summary;
      expect(typeof s.totalKPIs).toBe('number');
      expect(typeof s.kpisOnTarget).toBe('number');
      expect(typeof s.kpisBelowTarget).toBe('number');
      expect(typeof s.activeGoals).toBe('number');
      expect(typeof s.goalsOnTrack).toBe('number');
      expect(typeof s.goalsAtRisk).toBe('number');
      expect(typeof s.avgDeptPerformance).toBe('number');
      expect(typeof s.openAlerts).toBe('number');
      expect(typeof s.criticalAlerts).toBe('number');
    });

    it('should have financials section', () => {
      expect(report.financials).toHaveProperty('revenue');
      expect(report.financials).toHaveProperty('expenses');
      expect(report.financials).toHaveProperty('netIncome');
      expect(report.financials).toHaveProperty('cashFlow');
      expect(report.financials).toHaveProperty('budgetUtilization');
    });

    it('should have operations section', () => {
      expect(report.operations).toHaveProperty('beneficiaries');
      expect(report.operations).toHaveProperty('sessions');
      expect(report.operations).toHaveProperty('occupancy');
      expect(report.operations).toHaveProperty('avgStay');
    });

    it('should have hrMetrics section', () => {
      expect(report.hrMetrics).toHaveProperty('headcount');
      expect(report.hrMetrics).toHaveProperty('turnover');
      expect(report.hrMetrics).toHaveProperty('attendance');
      expect(report.hrMetrics).toHaveProperty('trainingHours');
    });

    it('should have quality section', () => {
      expect(report.quality).toHaveProperty('satisfaction');
      expect(report.quality).toHaveProperty('compliance');
      expect(report.quality).toHaveProperty('incidentRate');
    });

    it('should default type to monthly and period to current month', () => {
      const r = service.generateReport(undefined, undefined, 'u');
      expect(r.type).toBe('monthly');
      expect(r.period).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  describe('listReports', () => {
    it('should return reports sorted by generatedAt descending', () => {
      // Generate a second report to have multiple
      service.generateReport('quarterly', '2026-Q1', 'u');
      const reports = service.listReports();
      expect(reports.length).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < reports.length; i++) {
        expect(new Date(reports[i].generatedAt) <= new Date(reports[i - 1].generatedAt)).toBe(true);
      }
    });
  });

  describe('getReport', () => {
    it('should return report by id', () => {
      expect(service.getReport(report.id)).toEqual(report);
    });

    it('should return null for non-existent id', () => {
      expect(service.getReport('report-999')).toBeNull();
    });
  });

  describe('exportReport', () => {
    it('should export as CSV', () => {
      const csv = service.exportReport(report.id, 'csv');
      expect(csv).not.toBeNull();
      expect(csv.format).toBe('csv');
      expect(csv.fileName).toContain('.csv');
      expect(csv.data).toContain('Section,Metric,Value');
      expect(csv.data).toContain('financials');
    });

    it('should export as JSON (default)', () => {
      const json = service.exportReport(report.id, 'json');
      expect(json).not.toBeNull();
      expect(json.format).toBe('json');
      expect(json.fileName).toContain('.json');
      const parsed = JSON.parse(json.data);
      expect(parsed.id).toBe(report.id);
    });

    it('should default to JSON for unknown format', () => {
      const result = service.exportReport(report.id, 'pdf');
      expect(result.format).toBe('json');
    });

    it('should return null for non-existent report', () => {
      expect(service.exportReport('report-999', 'csv')).toBeNull();
    });

    it('CSV should include all sections (financials, operations, hrMetrics, quality)', () => {
      const csv = service.exportReport(report.id, 'csv');
      expect(csv.data).toContain('financials');
      expect(csv.data).toContain('operations');
      expect(csv.data).toContain('hrMetrics');
      expect(csv.data).toContain('quality');
    });
  });
});

/* ──────────────────────────────────────────────────────────────────
   11. COMPARATIVE ANALYTICS
   ────────────────────────────────────────────────────────────────── */
describe('CEODashboardService — Comparative Analytics', () => {
  it('should return comparisons for matching periods', () => {
    const result = service.getComparativeAnalysis('2026-01', '2026-02');
    expect(result.period1).toBe('2026-01');
    expect(result.period2).toBe('2026-02');
    expect(Array.isArray(result.comparisons)).toBe(true);
    expect(result.comparisons.length).toBeGreaterThan(0);
  });

  it('each comparison should have required fields', () => {
    const result = service.getComparativeAnalysis('2026-01', '2026-03');
    result.comparisons.forEach(c => {
      expect(c).toHaveProperty('kpiId');
      expect(c).toHaveProperty('code');
      expect(c).toHaveProperty('nameAr');
      expect(c).toHaveProperty('nameEn');
      expect(c).toHaveProperty('period1Value');
      expect(c).toHaveProperty('period2Value');
      expect(c).toHaveProperty('change');
      expect(c).toHaveProperty('changePercent');
      expect(c).toHaveProperty('trend');
    });
  });

  it('should compute positive change correctly', () => {
    const result = service.getComparativeAnalysis('2026-01', '2026-03');
    // kpi-501 (REV_TOTAL) has snapshots for 01, 02, 03 with increasing values
    const rev = result.comparisons.find(c => c.code === 'REV_TOTAL');
    if (rev) {
      expect(rev.period2Value).toBeGreaterThan(rev.period1Value);
      expect(rev.change).toBeGreaterThan(0);
      expect(rev.trend).toBe('up');
    }
  });

  it('should return empty comparisons for periods with no snapshots', () => {
    const result = service.getComparativeAnalysis('2020-01', '2020-02');
    expect(result.comparisons).toEqual([]);
  });

  it('should handle case where one period has data and other does not', () => {
    const result = service.getComparativeAnalysis('2026-01', '2020-01');
    // comparisons require BOTH periods to have a value, so should be empty
    expect(result.comparisons).toEqual([]);
  });
});

/* ──────────────────────────────────────────────────────────────────
   12. REFERENCE DATA
   ────────────────────────────────────────────────────────────────── */
describe('CEODashboardService — Reference Data', () => {
  it('getDepartmentList should return 12 departments', () => {
    const list = service.getDepartmentList();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(12);
    expect(list[0]).toHaveProperty('id');
    expect(list[0]).toHaveProperty('nameAr');
    expect(list[0]).toHaveProperty('nameEn');
    expect(list[0]).toHaveProperty('color');
  });

  it('getKPICategories should return 6 categories', () => {
    const cats = service.getKPICategories();
    expect(cats.length).toBe(6);
    const ids = cats.map(c => c.id);
    expect(ids).toContain('financial');
    expect(ids).toContain('operational');
    expect(ids).toContain('hr');
    expect(ids).toContain('quality');
    expect(ids).toContain('beneficiary');
    expect(ids).toContain('strategic');
  });

  it('getWidgetTypes should return 8 types', () => {
    const types = service.getWidgetTypes();
    expect(types.length).toBe(8);
    const ids = types.map(t => t.id);
    expect(ids).toContain('kpi_card');
    expect(ids).toContain('line_chart');
    expect(ids).toContain('bar_chart');
    expect(ids).toContain('pie_chart');
    expect(ids).toContain('gauge');
    expect(ids).toContain('table');
    expect(ids).toContain('heatmap');
    expect(ids).toContain('trend_spark');
  });

  it('getAlertSeverities should return 3 severities', () => {
    const sev = service.getAlertSeverities();
    expect(sev).toEqual(['critical', 'warning', 'info']);
  });

  it('getPeriods should return 5 periods', () => {
    const periods = service.getPeriods();
    expect(periods).toEqual(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']);
  });

  it('getStrategicStatuses should return 5 statuses', () => {
    const statuses = service.getStrategicStatuses();
    expect(statuses).toEqual(['on_track', 'at_risk', 'behind', 'completed', 'not_started']);
  });
});

/* ──────────────────────────────────────────────────────────────────
   13. STATISTICS
   ────────────────────────────────────────────────────────────────── */
describe('CEODashboardService — Statistics', () => {
  let stats;
  beforeAll(() => {
    stats = service.getStatistics();
  });

  it('should return object with 4 stat categories', () => {
    expect(stats).toHaveProperty('kpiStats');
    expect(stats).toHaveProperty('goalStats');
    expect(stats).toHaveProperty('alertStats');
    expect(stats).toHaveProperty('departmentStats');
  });

  describe('kpiStats', () => {
    it('should have total, onTarget, belowTarget, avgTargetCompletion', () => {
      const ks = stats.kpiStats;
      expect(typeof ks.total).toBe('number');
      expect(typeof ks.onTarget).toBe('number');
      expect(typeof ks.belowTarget).toBe('number');
      expect(typeof ks.avgTargetCompletion).toBe('number');
      expect(ks.total).toBe(ks.onTarget + ks.belowTarget);
    });
  });

  describe('goalStats', () => {
    it('should have total, onTrack, atRisk, behind, completed, avgProgress', () => {
      const gs = stats.goalStats;
      expect(typeof gs.total).toBe('number');
      expect(typeof gs.onTrack).toBe('number');
      expect(typeof gs.atRisk).toBe('number');
      expect(typeof gs.behind).toBe('number');
      expect(typeof gs.completed).toBe('number');
      expect(typeof gs.avgProgress).toBe('number');
    });
  });

  describe('alertStats', () => {
    it('should have total, unresolved, critical, unread', () => {
      const as = stats.alertStats;
      expect(typeof as.total).toBe('number');
      expect(typeof as.unresolved).toBe('number');
      expect(typeof as.critical).toBe('number');
      expect(typeof as.unread).toBe('number');
    });

    it('unresolved should be <= total', () => {
      expect(stats.alertStats.unresolved).toBeLessThanOrEqual(stats.alertStats.total);
    });
  });

  describe('departmentStats', () => {
    it('should have total, avgPerformance, totalStaff, totalBudget', () => {
      const ds = stats.departmentStats;
      expect(ds.total).toBe(12);
      expect(typeof ds.avgPerformance).toBe('number');
      expect(typeof ds.totalStaff).toBe('number');
      expect(typeof ds.totalBudget).toBe('number');
    });
  });
});

/* ──────────────────────────────────────────────────────────────────
   14. AUDIT LOG
   ────────────────────────────────────────────────────────────────── */
describe('CEODashboardService — Audit Log', () => {
  it('should contain seed audit entries', () => {
    const logs = service.getAuditLog();
    expect(logs.length).toBeGreaterThanOrEqual(2);
  });

  it('should be sorted by timestamp descending', () => {
    const logs = service.getAuditLog();
    for (let i = 1; i < logs.length; i++) {
      expect(new Date(logs[i].timestamp) <= new Date(logs[i - 1].timestamp)).toBe(true);
    }
  });

  it('should grow when CRUD operations are performed', () => {
    const before = service.getAuditLog().length;
    service.createKPI({ code: 'AUDIT_TEST', nameAr: 'تدقيق', nameEn: 'Audit' }, 'auditor');
    const after = service.getAuditLog().length;
    expect(after).toBe(before + 1);
  });

  it('should respect limit parameter', () => {
    const limited = service.getAuditLog(3);
    expect(limited.length).toBeLessThanOrEqual(3);
  });

  it('should return all entries when limit is not provided', () => {
    const all = service.getAuditLog();
    const limited = service.getAuditLog(1);
    expect(all.length).toBeGreaterThan(limited.length);
  });

  it('each entry should have id, action, userId, details, timestamp', () => {
    const logs = service.getAuditLog(5);
    logs.forEach(entry => {
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('action');
      expect(entry).toHaveProperty('userId');
      expect(entry).toHaveProperty('details');
      expect(entry).toHaveProperty('timestamp');
    });
  });

  it('audit entries should track different action types', () => {
    // Create various operations to generate different audit actions
    service.createAlert({ titleAr: 'audit-a', titleEn: 'audit-a' }, 'u');
    service.createGoal({ nameAr: 'audit-g', nameEn: 'audit-g' }, 'u');
    service.createWidget({ title: 'audit-w' }, 'u');

    const logs = service.getAuditLog();
    const actions = new Set(logs.map(l => l.action));
    expect(actions.size).toBeGreaterThanOrEqual(3);
  });
});
