/**
 * CEO Executive Dashboard — Tests
 * Phase 19 — لوحة تحكم الإدارة التنفيذية
 */
const request = require('supertest');
const express = require('express');

/* ── mock auth ── */
jest.mock('../middleware/authMiddleware', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'u1', role: 'admin' };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

const ceoRoutes = require('../routes/ceoDashboard.routes');
const svc = require('../services/ceoDashboard.service');

const app = express();
app.use(express.json());
app.use('/api/ceo-dashboard', ceoRoutes);

/* ══════════════════════════════════════════════════════════════════
   TEST SUITES
   ══════════════════════════════════════════════════════════════════ */

describe('Phase 19 — CEO Executive Dashboard', () => {
  /* ════════════════════════════════════════════
     EXECUTIVE DASHBOARD
     ════════════════════════════════════════════ */
  describe('GET /api/ceo-dashboard/dashboard', () => {
    it('should return executive dashboard with all aggregated KPIs', async () => {
      const res = await request(app).get('/api/ceo-dashboard/dashboard');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const d = res.body.data;
      expect(d.summary).toBeDefined();
      expect(d.summary.totalRevenue).toBeGreaterThan(0);
      expect(d.summary.totalExpenses).toBeGreaterThan(0);
      expect(d.summary.netIncome).toBeDefined();
      expect(d.summary.activeBeneficiaries).toBeGreaterThan(0);
      expect(d.summary.occupancyRate).toBeGreaterThan(0);
      expect(d.summary.staffCount).toBeGreaterThan(0);
      expect(d.summary.satisfactionScore).toBeGreaterThan(0);
      expect(d.financialKpis.length).toBeGreaterThanOrEqual(3);
      expect(d.operationalKpis.length).toBeGreaterThanOrEqual(3);
      expect(d.hrKpis.length).toBeGreaterThanOrEqual(3);
      expect(d.qualityKpis.length).toBeGreaterThanOrEqual(2);
      expect(d.alerts).toBeDefined();
      expect(d.alertCounts).toBeDefined();
      expect(d.alertCounts).toHaveProperty('critical');
      expect(d.alertCounts).toHaveProperty('warning');
      expect(d.alertCounts).toHaveProperty('total');
      expect(typeof d.goalProgress).toBe('number');
      expect(d.topGoals.length).toBeGreaterThan(0);
      expect(d.departmentRanking.length).toBeGreaterThan(0);
      expect(d.lastUpdated).toBeDefined();
    });
  });

  /* ════════════════════════════════════════════
     REFERENCE DATA
     ════════════════════════════════════════════ */
  describe('Reference Data endpoints', () => {
    it('GET /departments-list returns department reference data', async () => {
      const res = await request(app).get('/api/ceo-dashboard/departments-list');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(10);
      expect(res.body.data[0]).toHaveProperty('id');
      expect(res.body.data[0]).toHaveProperty('nameAr');
      expect(res.body.data[0]).toHaveProperty('nameEn');
    });

    it('GET /kpi-categories returns categories', async () => {
      const res = await request(app).get('/api/ceo-dashboard/kpi-categories');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(5);
    });

    it('GET /widget-types returns widget types', async () => {
      const res = await request(app).get('/api/ceo-dashboard/widget-types');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(5);
    });

    it('GET /alert-severities returns severities', async () => {
      const res = await request(app).get('/api/ceo-dashboard/alert-severities');
      expect(res.status).toBe(200);
      expect(res.body.data).toContain('critical');
      expect(res.body.data).toContain('warning');
      expect(res.body.data).toContain('info');
    });

    it('GET /periods returns period types', async () => {
      const res = await request(app).get('/api/ceo-dashboard/periods');
      expect(res.status).toBe(200);
      expect(res.body.data).toContain('monthly');
      expect(res.body.data).toContain('quarterly');
    });

    it('GET /strategic-statuses returns goal statuses', async () => {
      const res = await request(app).get('/api/ceo-dashboard/strategic-statuses');
      expect(res.status).toBe(200);
      expect(res.body.data).toContain('on_track');
      expect(res.body.data).toContain('at_risk');
    });

    it('GET /statistics returns comprehensive statistics', async () => {
      const res = await request(app).get('/api/ceo-dashboard/statistics');
      expect(res.status).toBe(200);
      const s = res.body.data;
      expect(s.kpiStats).toBeDefined();
      expect(s.kpiStats.total).toBeGreaterThan(0);
      expect(s.goalStats).toBeDefined();
      expect(s.alertStats).toBeDefined();
      expect(s.departmentStats).toBeDefined();
    });
  });

  /* ════════════════════════════════════════════
     KPI MANAGEMENT
     ════════════════════════════════════════════ */
  describe('KPI Management', () => {
    it('GET /kpis returns all KPIs', async () => {
      const res = await request(app).get('/api/ceo-dashboard/kpis');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(15);
      expect(res.body.data[0]).toHaveProperty('code');
      expect(res.body.data[0]).toHaveProperty('nameAr');
      expect(res.body.data[0]).toHaveProperty('currentValue');
      expect(res.body.data[0]).toHaveProperty('target');
    });

    it('GET /kpis?category=financial returns only financial KPIs', async () => {
      const res = await request(app).get('/api/ceo-dashboard/kpis?category=financial');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      res.body.data.forEach((k) => expect(k.category).toBe('financial'));
    });

    it('GET /kpis/:id returns a single KPI', async () => {
      const res = await request(app).get('/api/ceo-dashboard/kpis/kpi-501');
      expect(res.status).toBe(200);
      expect(res.body.data.code).toBe('REV_TOTAL');
      expect(res.body.data.currentValue).toBeGreaterThan(0);
    });

    it('GET /kpis/:id returns 404 for non-existent KPI', async () => {
      const res = await request(app).get('/api/ceo-dashboard/kpis/kpi-99999');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('POST /kpis creates a new KPI', async () => {
      const res = await request(app)
        .post('/api/ceo-dashboard/kpis')
        .send({ code: 'TEST_KPI', nameAr: 'مؤشر اختبار', nameEn: 'Test KPI', target: 100, currentValue: 75, previousValue: 60 });
      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe('TEST_KPI');
      expect(res.body.data.changePercent).toBe(25);
      expect(res.body.data.trend).toBe('up');
    });

    it('POST /kpis rejects without required fields', async () => {
      const res = await request(app)
        .post('/api/ceo-dashboard/kpis')
        .send({ nameAr: 'بدون رمز' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('PUT /kpis/:id updates a KPI value', async () => {
      const res = await request(app)
        .put('/api/ceo-dashboard/kpis/kpi-501')
        .send({ currentValue: 5200000 });
      expect(res.status).toBe(200);
      expect(res.body.data.currentValue).toBe(5200000);
      expect(res.body.data.trend).toBeDefined();
    });

    it('PUT /kpis/:id returns 404 for non-existent', async () => {
      const res = await request(app).put('/api/ceo-dashboard/kpis/kpi-99999').send({ currentValue: 99 });
      expect(res.status).toBe(404);
    });

    it('DELETE /kpis/:id deletes a KPI', async () => {
      // Create first, then delete
      const created = await request(app)
        .post('/api/ceo-dashboard/kpis')
        .send({ code: 'DEL_KPI', nameAr: 'سيتم حذفه' });
      const res = await request(app).delete(`/api/ceo-dashboard/kpis/${created.body.data.id}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('DELETE /kpis/:id returns 404 for non-existent', async () => {
      const res = await request(app).delete('/api/ceo-dashboard/kpis/kpi-99999');
      expect(res.status).toBe(404);
    });
  });

  /* ── KPI Trends ── */
  describe('KPI Trends', () => {
    it('GET /kpis/:id/trend returns historical snapshots', async () => {
      const res = await request(app).get('/api/ceo-dashboard/kpis/kpi-501/trend');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0]).toHaveProperty('kpiId');
      expect(res.body.data[0]).toHaveProperty('value');
      expect(res.body.data[0]).toHaveProperty('period');
    });

    it('GET /kpis/:id/trend?period=2026-01 filters by period', async () => {
      const res = await request(app).get('/api/ceo-dashboard/kpis/kpi-501/trend?period=2026-01');
      expect(res.status).toBe(200);
      res.body.data.forEach((s) => expect(s.period).toContain('2026-01'));
    });

    it('POST /kpis/:id/snapshots adds a snapshot', async () => {
      const res = await request(app)
        .post('/api/ceo-dashboard/kpis/kpi-501/snapshots')
        .send({ value: 4900000, period: '2026-04' });
      expect(res.status).toBe(201);
      expect(res.body.data.kpiId).toBe('kpi-501');
      expect(res.body.data.value).toBe(4900000);
    });

    it('POST /kpis/:id/snapshots rejects without required fields', async () => {
      const res = await request(app)
        .post('/api/ceo-dashboard/kpis/kpi-501/snapshots')
        .send({ value: 100 });
      expect(res.status).toBe(400);
    });
  });

  /* ════════════════════════════════════════════
     ALERTS
     ════════════════════════════════════════════ */
  describe('Alerts Management', () => {
    it('GET /alerts returns all alerts', async () => {
      const res = await request(app).get('/api/ceo-dashboard/alerts');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      expect(res.body.data[0]).toHaveProperty('severity');
      expect(res.body.data[0]).toHaveProperty('titleAr');
    });

    it('GET /alerts?severity=critical returns only critical alerts', async () => {
      const res = await request(app).get('/api/ceo-dashboard/alerts?severity=critical');
      expect(res.status).toBe(200);
      res.body.data.forEach((a) => expect(a.severity).toBe('critical'));
    });

    it('GET /alerts?isResolved=false returns only unresolved', async () => {
      const res = await request(app).get('/api/ceo-dashboard/alerts?isResolved=false');
      expect(res.status).toBe(200);
      res.body.data.forEach((a) => expect(a.isResolved).toBe(false));
    });

    it('GET /alerts/:id returns a single alert', async () => {
      const res = await request(app).get('/api/ceo-dashboard/alerts/alert-701');
      expect(res.status).toBe(200);
      expect(res.body.data.severity).toBe('critical');
    });

    it('GET /alerts/:id returns 404 for non-existent', async () => {
      const res = await request(app).get('/api/ceo-dashboard/alerts/alert-99999');
      expect(res.status).toBe(404);
    });

    it('POST /alerts creates a new alert', async () => {
      const res = await request(app)
        .post('/api/ceo-dashboard/alerts')
        .send({ titleAr: 'تنبيه اختبار', titleEn: 'Test Alert', severity: 'warning', category: 'financial' });
      expect(res.status).toBe(201);
      expect(res.body.data.titleAr).toBe('تنبيه اختبار');
      expect(res.body.data.isRead).toBe(false);
      expect(res.body.data.isResolved).toBe(false);
    });

    it('POST /alerts rejects without titleAr', async () => {
      const res = await request(app).post('/api/ceo-dashboard/alerts').send({ titleEn: 'No Arabic' });
      expect(res.status).toBe(400);
    });

    it('PATCH /alerts/:id/read marks alert as read', async () => {
      const res = await request(app).patch('/api/ceo-dashboard/alerts/alert-701/read');
      expect(res.status).toBe(200);
      expect(res.body.data.isRead).toBe(true);
    });

    it('PATCH /alerts/:id/resolve resolves an alert', async () => {
      const res = await request(app)
        .patch('/api/ceo-dashboard/alerts/alert-702/resolve')
        .send({ resolution: 'تم توظيف 3 أخصائيين' });
      expect(res.status).toBe(200);
      expect(res.body.data.isResolved).toBe(true);
      expect(res.body.data.resolution).toBe('تم توظيف 3 أخصائيين');
    });

    it('DELETE /alerts/:id dismisses an alert', async () => {
      const created = await request(app)
        .post('/api/ceo-dashboard/alerts')
        .send({ titleAr: 'سيحذف', severity: 'info' });
      const res = await request(app).delete(`/api/ceo-dashboard/alerts/${created.body.data.id}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  /* ════════════════════════════════════════════
     STRATEGIC GOALS
     ════════════════════════════════════════════ */
  describe('Strategic Goals', () => {
    it('GET /goals returns all goals', async () => {
      const res = await request(app).get('/api/ceo-dashboard/goals');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);
      expect(res.body.data[0]).toHaveProperty('nameAr');
      expect(res.body.data[0]).toHaveProperty('progress');
      expect(res.body.data[0]).toHaveProperty('status');
    });

    it('GET /goals?status=on_track returns filtered goals', async () => {
      const res = await request(app).get('/api/ceo-dashboard/goals?status=on_track');
      expect(res.status).toBe(200);
      res.body.data.forEach((g) => expect(g.status).toBe('on_track'));
    });

    it('GET /goals/:id returns a single goal', async () => {
      const res = await request(app).get('/api/ceo-dashboard/goals/goal-801');
      expect(res.status).toBe(200);
      expect(res.body.data.nameEn).toBe('Increase Capacity');
      expect(res.body.data.milestones.length).toBeGreaterThan(0);
    });

    it('GET /goals/:id returns 404 for non-existent', async () => {
      const res = await request(app).get('/api/ceo-dashboard/goals/goal-99999');
      expect(res.status).toBe(404);
    });

    it('POST /goals creates a new goal', async () => {
      const res = await request(app)
        .post('/api/ceo-dashboard/goals')
        .send({ nameAr: 'هدف اختبار', nameEn: 'Test Goal', targetValue: 50, currentValue: 20, deadline: '2027-01-01' });
      expect(res.status).toBe(201);
      expect(res.body.data.nameAr).toBe('هدف اختبار');
      expect(res.body.data.progress).toBe(40);
    });

    it('POST /goals rejects without nameAr', async () => {
      const res = await request(app).post('/api/ceo-dashboard/goals').send({ nameEn: 'No Arabic' });
      expect(res.status).toBe(400);
    });

    it('PUT /goals/:id updates a goal', async () => {
      const res = await request(app)
        .put('/api/ceo-dashboard/goals/goal-801')
        .send({ currentValue: 260, status: 'on_track' });
      expect(res.status).toBe(200);
      expect(res.body.data.currentValue).toBe(260);
      expect(res.body.data.progress).toBeGreaterThan(0);
    });

    it('DELETE /goals/:id deletes a goal', async () => {
      const created = await request(app)
        .post('/api/ceo-dashboard/goals')
        .send({ nameAr: 'سيحذف' });
      const res = await request(app).delete(`/api/ceo-dashboard/goals/${created.body.data.id}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  /* ════════════════════════════════════════════
     DEPARTMENT PERFORMANCE
     ════════════════════════════════════════════ */
  describe('Department Performance', () => {
    it('GET /departments returns all departments sorted by performance', async () => {
      const res = await request(app).get('/api/ceo-dashboard/departments');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(10);
      expect(res.body.data[0]).toHaveProperty('performance');
      expect(res.body.data[0]).toHaveProperty('nameAr');
      // Sorted descending
      for (let i = 1; i < res.body.data.length; i++) {
        expect(res.body.data[i - 1].performance).toBeGreaterThanOrEqual(res.body.data[i].performance);
      }
    });

    it('GET /departments/comparison returns comparative analysis', async () => {
      const res = await request(app).get('/api/ceo-dashboard/departments/comparison');
      expect(res.status).toBe(200);
      const d = res.body.data;
      expect(d.byPerformance).toBeDefined();
      expect(d.byBudgetUtilization).toBeDefined();
      expect(d.bySatisfaction).toBeDefined();
      expect(d.totalBudget).toBeGreaterThan(0);
      expect(d.totalStaff).toBeGreaterThan(0);
      expect(d.avgPerformance).toBeGreaterThan(0);
    });

    it('GET /departments/:id returns a single department', async () => {
      const res = await request(app).get('/api/ceo-dashboard/departments/rehabilitation');
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('rehabilitation');
      expect(res.body.data).toHaveProperty('budget');
    });

    it('GET /departments/:id returns 404 for non-existent', async () => {
      const res = await request(app).get('/api/ceo-dashboard/departments/nonexistent');
      expect(res.status).toBe(404);
    });

    it('PUT /departments/:id updates department data', async () => {
      const res = await request(app)
        .put('/api/ceo-dashboard/departments/rehabilitation')
        .send({ performance: 95, satisfaction: 92 });
      expect(res.status).toBe(200);
      expect(res.body.data.performance).toBe(95);
      expect(res.body.data.satisfaction).toBe(92);
    });
  });

  /* ════════════════════════════════════════════
     WIDGETS & LAYOUTS
     ════════════════════════════════════════════ */
  describe('Widgets', () => {
    it('GET /widgets returns all widgets', async () => {
      const res = await request(app).get('/api/ceo-dashboard/widgets');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(8);
      expect(res.body.data[0]).toHaveProperty('type');
      expect(res.body.data[0]).toHaveProperty('title');
      expect(res.body.data[0]).toHaveProperty('position');
    });

    it('GET /widgets/:id returns a single widget', async () => {
      const res = await request(app).get('/api/ceo-dashboard/widgets/widget-901');
      expect(res.status).toBe(200);
      expect(res.body.data.type).toBe('kpi_card');
    });

    it('POST /widgets creates a widget', async () => {
      const res = await request(app)
        .post('/api/ceo-dashboard/widgets')
        .send({ title: 'أداة جديدة', type: 'gauge', kpiId: 'kpi-508' });
      expect(res.status).toBe(201);
      expect(res.body.data.type).toBe('gauge');
    });

    it('PUT /widgets/:id updates a widget', async () => {
      const res = await request(app)
        .put('/api/ceo-dashboard/widgets/widget-901')
        .send({ title: 'عنوان محدث', visible: false });
      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('عنوان محدث');
      expect(res.body.data.visible).toBe(false);
    });

    it('DELETE /widgets/:id deletes a widget', async () => {
      const created = await request(app)
        .post('/api/ceo-dashboard/widgets')
        .send({ title: 'سيحذف' });
      const res = await request(app).delete(`/api/ceo-dashboard/widgets/${created.body.data.id}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Layouts', () => {
    it('GET /layouts returns all layouts', async () => {
      const res = await request(app).get('/api/ceo-dashboard/layouts');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0]).toHaveProperty('name');
      expect(res.body.data[0]).toHaveProperty('widgetIds');
    });

    it('GET /layouts/:id returns a single layout', async () => {
      const res = await request(app).get('/api/ceo-dashboard/layouts/layout-1001');
      expect(res.status).toBe(200);
      expect(res.body.data.isDefault).toBe(true);
    });

    it('POST /layouts creates a layout', async () => {
      const res = await request(app)
        .post('/api/ceo-dashboard/layouts')
        .send({ name: 'تخطيط مخصص', widgetIds: ['widget-901', 'widget-902'] });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('تخطيط مخصص');
      expect(res.body.data.isDefault).toBe(false);
    });

    it('PATCH /layouts/:id/set-default sets layout as default', async () => {
      const created = await request(app)
        .post('/api/ceo-dashboard/layouts')
        .send({ name: 'سيكون افتراضي' });
      const res = await request(app).patch(`/api/ceo-dashboard/layouts/${created.body.data.id}/set-default`);
      expect(res.status).toBe(200);
      expect(res.body.data.isDefault).toBe(true);
    });

    it('DELETE /layouts/:id deletes a non-default layout', async () => {
      const created = await request(app)
        .post('/api/ceo-dashboard/layouts')
        .send({ name: 'سيحذف' });
      const res = await request(app).delete(`/api/ceo-dashboard/layouts/${created.body.data.id}`);
      expect(res.status).toBe(200);
    });
  });

  /* ════════════════════════════════════════════
     BENCHMARKS
     ════════════════════════════════════════════ */
  describe('Benchmarks', () => {
    it('GET /benchmarks returns all benchmarks', async () => {
      const res = await request(app).get('/api/ceo-dashboard/benchmarks');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      expect(res.body.data[0]).toHaveProperty('kpiCode');
      expect(res.body.data[0]).toHaveProperty('percentile');
    });

    it('GET /benchmarks/:kpiCode returns benchmark for specific KPI', async () => {
      const res = await request(app).get('/api/ceo-dashboard/benchmarks/REV_TOTAL');
      expect(res.status).toBe(200);
      expect(res.body.data.kpiCode).toBe('REV_TOTAL');
      expect(res.body.data.percentile).toBeGreaterThan(0);
    });

    it('GET /benchmarks/:kpiCode returns 404 for non-existent', async () => {
      const res = await request(app).get('/api/ceo-dashboard/benchmarks/NONEXISTENT');
      expect(res.status).toBe(404);
    });
  });

  /* ════════════════════════════════════════════
     EXECUTIVE REPORTS
     ════════════════════════════════════════════ */
  describe('Executive Reports', () => {
    it('POST /reports/generate creates an executive report', async () => {
      const res = await request(app)
        .post('/api/ceo-dashboard/reports/generate')
        .send({ type: 'monthly', period: '2026-03' });
      expect(res.status).toBe(201);
      const r = res.body.data;
      expect(r.type).toBe('monthly');
      expect(r.period).toBe('2026-03');
      expect(r.status).toBe('completed');
      expect(r.summary).toBeDefined();
      expect(r.summary.totalKPIs).toBeGreaterThan(0);
      expect(r.financials).toBeDefined();
      expect(r.operations).toBeDefined();
      expect(r.hrMetrics).toBeDefined();
      expect(r.quality).toBeDefined();
    });

    it('GET /reports lists all reports', async () => {
      // Generate at least one
      await request(app).post('/api/ceo-dashboard/reports/generate').send({ type: 'quarterly' });
      const res = await request(app).get('/api/ceo-dashboard/reports');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /reports/:id returns a single report', async () => {
      const gen = await request(app).post('/api/ceo-dashboard/reports/generate').send({ type: 'monthly' });
      const res = await request(app).get(`/api/ceo-dashboard/reports/${gen.body.data.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.type).toBe('monthly');
    });

    it('GET /reports/:id returns 404 for non-existent', async () => {
      const res = await request(app).get('/api/ceo-dashboard/reports/report-99999');
      expect(res.status).toBe(404);
    });

    it('GET /reports/:id/export exports as JSON', async () => {
      const gen = await request(app).post('/api/ceo-dashboard/reports/generate').send({});
      const res = await request(app).get(`/api/ceo-dashboard/reports/${gen.body.data.id}/export?format=json`);
      expect(res.status).toBe(200);
      expect(res.body.data.format).toBe('json');
      expect(res.body.data.fileName).toContain('executive_report');
    });

    it('GET /reports/:id/export exports as CSV', async () => {
      const gen = await request(app).post('/api/ceo-dashboard/reports/generate').send({});
      const res = await request(app).get(`/api/ceo-dashboard/reports/${gen.body.data.id}/export?format=csv`);
      expect(res.status).toBe(200);
      expect(res.body.data.format).toBe('csv');
      expect(res.body.data.data).toContain('Section,Metric,Value');
    });
  });

  /* ════════════════════════════════════════════
     COMPARATIVE ANALYTICS
     ════════════════════════════════════════════ */
  describe('Comparative Analytics', () => {
    it('GET /compare returns period comparison', async () => {
      const res = await request(app).get('/api/ceo-dashboard/compare?period1=2026-01&period2=2026-03');
      expect(res.status).toBe(200);
      expect(res.body.data.period1).toBe('2026-01');
      expect(res.body.data.period2).toBe('2026-03');
      expect(res.body.data.comparisons).toBeDefined();
      if (res.body.data.comparisons.length > 0) {
        expect(res.body.data.comparisons[0]).toHaveProperty('change');
        expect(res.body.data.comparisons[0]).toHaveProperty('changePercent');
        expect(res.body.data.comparisons[0]).toHaveProperty('trend');
      }
    });

    it('GET /compare rejects without required periods', async () => {
      const res = await request(app).get('/api/ceo-dashboard/compare?period1=2026-01');
      expect(res.status).toBe(400);
    });
  });

  /* ════════════════════════════════════════════
     AUDIT LOG
     ════════════════════════════════════════════ */
  describe('Audit Log', () => {
    it('GET /audit-log returns audit entries', async () => {
      const res = await request(app).get('/api/ceo-dashboard/audit-log');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0]).toHaveProperty('action');
      expect(res.body.data[0]).toHaveProperty('details');
      expect(res.body.data[0]).toHaveProperty('timestamp');
    });

    it('GET /audit-log?limit=5 limits results', async () => {
      const res = await request(app).get('/api/ceo-dashboard/audit-log?limit=5');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
    });
  });

  /* ════════════════════════════════════════════
     SERVICE UNIT TESTS
     ════════════════════════════════════════════ */
  describe('Service Unit Tests', () => {
    it('getExecutiveDashboard() returns complete structure', () => {
      const dash = svc.getExecutiveDashboard();
      expect(dash.summary.totalRevenue).toBe(svc._getKpiValue('REV_TOTAL'));
      expect(dash.financialKpis.length).toBeGreaterThan(0);
      expect(dash.operationalKpis.length).toBeGreaterThan(0);
    });

    it('listKPIs() returns all or filtered', () => {
      const all = svc.listKPIs();
      const fin = svc.listKPIs('financial');
      expect(all.length).toBeGreaterThan(fin.length);
      fin.forEach((k) => expect(k.category).toBe('financial'));
    });

    it('createKPI() and deleteKPI() lifecycle', () => {
      const kpi = svc.createKPI({ code: 'LIFE', nameAr: 'دورة حياة', currentValue: 10, previousValue: 5 }, 'u1');
      expect(kpi.id).toBeDefined();
      expect(svc.getKPI(kpi.id)).toBeTruthy();
      expect(svc.deleteKPI(kpi.id, 'u1')).toBe(true);
      expect(svc.getKPI(kpi.id)).toBeNull();
    });

    it('updateKPI() recalculates trend', () => {
      const kpi = svc.createKPI({ code: 'TREND', nameAr: 'اتجاه', currentValue: 100, previousValue: 80 }, 'u1');
      const updated = svc.updateKPI(kpi.id, { currentValue: 50 }, 'u1');
      expect(updated.trend).toBe('down');
      expect(updated.previousValue).toBe(100);
      svc.deleteKPI(kpi.id, 'u1');
    });

    it('addKPISnapshot() stores and retrieves', () => {
      const snap = svc.addKPISnapshot('kpi-501', 4800000, '2026-05', 'u1');
      expect(snap.kpiId).toBe('kpi-501');
      const trend = svc.getKPITrend('kpi-501', '2026-05');
      expect(trend.some((s) => s.value === 4800000)).toBe(true);
    });

    it('resolveAlert() sets resolution metadata', () => {
      const alert = svc.createAlert({ titleAr: 'حل', severity: 'warning' }, 'u1');
      const resolved = svc.resolveAlert(alert.id, 'u1', 'تم الحل');
      expect(resolved.isResolved).toBe(true);
      expect(resolved.resolution).toBe('تم الحل');
      expect(resolved.resolvedBy).toBe('u1');
    });

    it('getDepartmentComparison() computes aggregates', () => {
      const comp = svc.getDepartmentComparison();
      expect(comp.totalBudget).toBeGreaterThan(0);
      expect(comp.avgPerformance).toBeGreaterThan(0);
      expect(comp.byBudgetUtilization[0]).toHaveProperty('utilization');
    });

    it('generateReport() produces comprehensive snapshot', () => {
      const report = svc.generateReport('monthly', '2026-03', 'u1');
      expect(report.financials.revenue).toBeDefined();
      expect(report.operations.beneficiaries).toBeGreaterThan(0);
      expect(report.summary.totalKPIs).toBeGreaterThan(0);
    });

    it('exportReport() CSV format', () => {
      const report = svc.generateReport('monthly', '2026-03', 'u1');
      const exported = svc.exportReport(report.id, 'csv');
      expect(exported.format).toBe('csv');
      expect(exported.data).toContain('financials');
    });

    it('getComparativeAnalysis() computes changes', () => {
      const comp = svc.getComparativeAnalysis('2026-01', '2026-03');
      expect(comp.period1).toBe('2026-01');
      expect(comp.comparisons.length).toBeGreaterThan(0);
      comp.comparisons.forEach((c) => {
        expect(c).toHaveProperty('change');
        expect(c).toHaveProperty('trend');
      });
    });

    it('getStatistics() returns all stat categories', () => {
      const stats = svc.getStatistics();
      expect(stats.kpiStats.total).toBeGreaterThan(0);
      expect(stats.goalStats.total).toBeGreaterThan(0);
      expect(stats.alertStats.total).toBeGreaterThan(0);
      expect(stats.departmentStats.total).toBeGreaterThan(0);
    });

    it('layout management: create, set default, delete', () => {
      const layout = svc.createLayout({ name: 'اختبار', widgetIds: ['w1'] }, 'u1');
      expect(layout.isDefault).toBe(false);
      svc.setDefaultLayout(layout.id, 'u1');
      expect(svc.getLayout(layout.id).isDefault).toBe(true);
      // Cannot delete default
      expect(svc.deleteLayout(layout.id, 'u1')).toBe(false);
    });

    it('getAuditLog() returns entries', () => {
      const logs = svc.getAuditLog(3);
      expect(logs.length).toBeLessThanOrEqual(3);
      expect(logs[0]).toHaveProperty('action');
    });
  });
});
