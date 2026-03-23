/**
 * Report Builder — backend integration tests
 *
 * Tests the /api/report-builder endpoints:
 *  - Dashboard & KPIs
 *  - Data Sources & Fields
 *  - Report CRUD + Duplicate
 *  - Designer: Columns, Filters, Sorting, Grouping, Calculated Fields, Charts
 *  - Execution & Pagination
 *  - Templates (list, get, create-from, save-as)
 *  - Export (PDF, Excel, CSV, JSON)
 *  - Schedules CRUD
 *  - Sharing
 *  - Favorites
 *  - Version History
 *  - Full Workflow
 */

const request = require('supertest');
const express = require('express');

// ── Minimal auth mock ──
jest.mock('../middleware/authMiddleware', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'u1', name: 'Test Admin', role: 'admin' };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

let app;
beforeAll(() => {
  app = express();
  app.use(express.json());
  const router = require('../routes/reportBuilder.routes');
  app.use('/api/report-builder', router);
});

// ══════════════════════════════════════════════════════════
//  1. Dashboard & KPIs
// ══════════════════════════════════════════════════════════

describe('Report Builder — Dashboard', () => {
  test('GET /dashboard/overview → returns KPIs', async () => {
    const res = await request(app).get('/api/report-builder/dashboard/overview');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { kpi, recentReports, recentExecutions } = res.body.data;
    expect(kpi).toHaveProperty('totalReports');
    expect(kpi).toHaveProperty('publishedReports');
    expect(kpi).toHaveProperty('draftReports');
    expect(kpi).toHaveProperty('totalTemplates');
    expect(kpi).toHaveProperty('totalSchedules');
    expect(kpi.totalReports).toBeGreaterThanOrEqual(3);
    expect(kpi.totalTemplates).toBeGreaterThanOrEqual(4);
    expect(recentReports).toBeInstanceOf(Array);
    expect(recentExecutions).toBeInstanceOf(Array);
  });
});

// ══════════════════════════════════════════════════════════
//  2. Data Sources
// ══════════════════════════════════════════════════════════

describe('Report Builder — Data Sources', () => {
  test('GET /data-sources → lists all sources', async () => {
    const res = await request(app).get('/api/report-builder/data-sources');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(6);
    expect(res.body.data[0]).toHaveProperty('nameAr');
    expect(res.body.data[0]).toHaveProperty('fields');
  });

  test('GET /data-sources/:id/fields → returns fields for a source', async () => {
    const res = await request(app).get('/api/report-builder/data-sources/3000/fields');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(5);
    expect(res.body.data[0]).toHaveProperty('id');
    expect(res.body.data[0]).toHaveProperty('type');
    expect(res.body.data[0]).toHaveProperty('labelAr');
  });

  test('GET /data-sources/:id/fields → 404 for unknown source', async () => {
    const res = await request(app).get('/api/report-builder/data-sources/9999/fields');
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════
//  3. Report CRUD
// ══════════════════════════════════════════════════════════

let createdReportId;

describe('Report Builder — Report CRUD', () => {
  test('GET /reports → lists seeded reports', async () => {
    const res = await request(app).get('/api/report-builder/reports');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    expect(res.body).toHaveProperty('total');
  });

  test('GET /reports?status=published → filters by status', async () => {
    const res = await request(app).get('/api/report-builder/reports?status=published');
    expect(res.status).toBe(200);
    res.body.data.forEach(r => expect(r.status).toBe('published'));
  });

  test('GET /reports?search=مالي → search by Arabic text', async () => {
    const res = await request(app).get('/api/report-builder/reports?search=%D9%85%D8%A7%D9%84%D9%8A');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('POST /reports → creates a new report', async () => {
    const res = await request(app)
      .post('/api/report-builder/reports')
      .send({ name: 'Test Report', nameAr: 'تقرير اختبار', dataSourceId: '3000', category: 'test' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.name).toBe('Test Report');
    expect(res.body.data.status).toBe('draft');
    createdReportId = res.body.data.id;
  });

  test('GET /reports/:id → retrieves report with versions & shares', async () => {
    const res = await request(app).get(`/api/report-builder/reports/${createdReportId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Test Report');
    expect(res.body.data).toHaveProperty('versions');
    expect(res.body.data).toHaveProperty('shares');
  });

  test('PUT /reports/:id → updates report fields', async () => {
    const res = await request(app)
      .put(`/api/report-builder/reports/${createdReportId}`)
      .send({ name: 'Updated Report', status: 'published' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Report');
    expect(res.body.data.status).toBe('published');
    expect(res.body.data.version).toBe(2);
  });

  test('POST /reports/:id/duplicate → clones report', async () => {
    const res = await request(app)
      .post(`/api/report-builder/reports/${createdReportId}/duplicate`);
    expect(res.status).toBe(201);
    expect(res.body.data.name).toContain('نسخة');
    expect(res.body.data.status).toBe('draft');
  });

  test('DELETE /reports/:id → removes report', async () => {
    // Delete the duplicate
    const list = await request(app).get('/api/report-builder/reports');
    const dup = list.body.data.find(r => r.name.includes('نسخة'));
    const res = await request(app).delete(`/api/report-builder/reports/${dup.id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /reports → validation error for missing name', async () => {
    const res = await request(app)
      .post('/api/report-builder/reports')
      .send({ dataSourceId: '3000' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  test('GET /reports/:id → 404 for non-existent', async () => {
    const res = await request(app).get('/api/report-builder/reports/99999');
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════
//  4. Designer — Columns (Drag & Drop)
// ══════════════════════════════════════════════════════════

describe('Report Builder — Designer Columns', () => {
  test('POST /reports/:id/columns → adds a column', async () => {
    const res = await request(app)
      .post(`/api/report-builder/reports/${createdReportId}/columns`)
      .send({ fieldId: 'b_name', label: 'الاسم' });
    expect(res.status).toBe(200);
    expect(res.body.data.columns.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.columns.some(c => c.fieldId === 'b_name')).toBe(true);
  });

  test('POST /reports/:id/columns → adds second column', async () => {
    const res = await request(app)
      .post(`/api/report-builder/reports/${createdReportId}/columns`)
      .send({ fieldId: 'b_age', label: 'العمر' });
    expect(res.status).toBe(200);
    expect(res.body.data.columns.length).toBeGreaterThanOrEqual(2);
  });

  test('POST /reports/:id/columns → adds third column', async () => {
    const res = await request(app)
      .post(`/api/report-builder/reports/${createdReportId}/columns`)
      .send({ fieldId: 'b_status' });
    expect(res.status).toBe(200);
    expect(res.body.data.columns.length).toBeGreaterThanOrEqual(3);
  });

  test('PUT /reports/:id/columns/reorder → reorders columns', async () => {
    const res = await request(app)
      .put(`/api/report-builder/reports/${createdReportId}/columns/reorder`)
      .send({ orderedFieldIds: ['b_status', 'b_name', 'b_age'] });
    expect(res.status).toBe(200);
    expect(res.body.data.columns[0].fieldId).toBe('b_status');
    expect(res.body.data.columns[1].fieldId).toBe('b_name');
  });

  test('DELETE /reports/:id/columns/:fieldId → removes column', async () => {
    const res = await request(app)
      .delete(`/api/report-builder/reports/${createdReportId}/columns/b_age`);
    expect(res.status).toBe(200);
    expect(res.body.data.columns.some(c => c.fieldId === 'b_age')).toBe(false);
  });

  test('POST /reports/:id/columns → validation: missing fieldId', async () => {
    const res = await request(app)
      .post(`/api/report-builder/reports/${createdReportId}/columns`)
      .send({});
    expect(res.status).toBe(400);
  });

  test('POST /reports/:id/columns → error: field not in data source', async () => {
    const res = await request(app)
      .post(`/api/report-builder/reports/${createdReportId}/columns`)
      .send({ fieldId: 'nonexistent_field' });
    // Service returns 404 when field not found in data source
    expect([400, 404]).toContain(res.status);
  });
});

// ══════════════════════════════════════════════════════════
//  5. Designer — Filters
// ══════════════════════════════════════════════════════════

let addedFilterId;

describe('Report Builder — Filters', () => {
  test('POST /reports/:id/filters → adds a filter', async () => {
    const res = await request(app)
      .post(`/api/report-builder/reports/${createdReportId}/filters`)
      .send({ fieldId: 'b_status', operator: 'eq', value: 'مكتمل' });
    expect(res.status).toBe(200);
    expect(res.body.data.filters.length).toBeGreaterThanOrEqual(1);
    addedFilterId = res.body.data.filters[res.body.data.filters.length - 1].id;
  });

  test('PUT /reports/:id/filters/:filterId → updates filter', async () => {
    const res = await request(app)
      .put(`/api/report-builder/reports/${createdReportId}/filters/${addedFilterId}`)
      .send({ operator: 'ne', value: 'ملغي' });
    expect(res.status).toBe(200);
  });

  test('DELETE /reports/:id/filters/:filterId → removes filter', async () => {
    const res = await request(app)
      .delete(`/api/report-builder/reports/${createdReportId}/filters/${addedFilterId}`);
    expect(res.status).toBe(200);
  });

  test('POST /reports/:id/filters → validation: missing operator', async () => {
    const res = await request(app)
      .post(`/api/report-builder/reports/${createdReportId}/filters`)
      .send({ fieldId: 'b_status' });
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════
//  6. Designer — Sorting & Grouping
// ══════════════════════════════════════════════════════════

describe('Report Builder — Sorting & Grouping', () => {
  test('PUT /reports/:id/sorting → sets sorting', async () => {
    const res = await request(app)
      .put(`/api/report-builder/reports/${createdReportId}/sorting`)
      .send({ sorting: [{ fieldId: 'b_name', direction: 'asc' }, { fieldId: 'b_status', direction: 'desc' }] });
    expect(res.status).toBe(200);
    expect(res.body.data.sorting.length).toBe(2);
    expect(res.body.data.sorting[0].direction).toBe('asc');
  });

  test('PUT /reports/:id/group-by → sets grouping with aggregation', async () => {
    const res = await request(app)
      .put(`/api/report-builder/reports/${createdReportId}/group-by`)
      .send({ groupBy: [{ fieldId: 'b_status', aggregation: 'count' }] });
    expect(res.status).toBe(200);
    expect(res.body.data.groupBy.length).toBe(1);
    expect(res.body.data.groupBy[0].aggregation).toBe('count');
  });
});

// ══════════════════════════════════════════════════════════
//  7. Designer — Calculated Fields
// ══════════════════════════════════════════════════════════

let calcFieldId;

describe('Report Builder — Calculated Fields', () => {
  test('POST /reports/:id/calculated-fields → adds calculated field', async () => {
    // First update to use Finance source for numeric formulas
    await request(app)
      .put(`/api/report-builder/reports/${createdReportId}`)
      .send({ dataSourceId: '3002' });

    const res = await request(app)
      .post(`/api/report-builder/reports/${createdReportId}/calculated-fields`)
      .send({ name: 'Tax Amount', nameAr: 'قيمة الضريبة', formula: '{f_amount} * 0.15', type: 'currency' });
    expect(res.status).toBe(200);
    expect(res.body.data.calculatedFields.length).toBeGreaterThanOrEqual(1);
    calcFieldId = res.body.data.calculatedFields[0].id;
  });

  test('DELETE /reports/:id/calculated-fields/:fieldId → removes it', async () => {
    const res = await request(app)
      .delete(`/api/report-builder/reports/${createdReportId}/calculated-fields/${calcFieldId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.calculatedFields.length).toBe(0);
  });

  test('POST /reports/:id/calculated-fields → validation: missing formula', async () => {
    const res = await request(app)
      .post(`/api/report-builder/reports/${createdReportId}/calculated-fields`)
      .send({ name: 'Bad Field' });
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════
//  8. Designer — Chart Config
// ══════════════════════════════════════════════════════════

describe('Report Builder — Chart Configuration', () => {
  test('PUT /reports/:id/chart → sets chart config', async () => {
    const res = await request(app)
      .put(`/api/report-builder/reports/${createdReportId}/chart`)
      .send({
        chartConfig: {
          type: 'bar',
          xAxis: 'f_category',
          yAxis: 'f_amount',
          title: 'المصروفات حسب الفئة',
        },
      });
    expect(res.status).toBe(200);
    expect(res.body.data.chartConfig.type).toBe('bar');
    expect(res.body.data.chartConfig.showLegend).toBe(true);
  });

  test('PUT /reports/:id/chart → removes chart (null)', async () => {
    const res = await request(app)
      .put(`/api/report-builder/reports/${createdReportId}/chart`)
      .send({ chartConfig: null });
    expect(res.status).toBe(200);
    expect(res.body.data.chartConfig).toBeNull();
  });

  test('PUT /reports/:id/chart → error: invalid chart type', async () => {
    const res = await request(app)
      .put(`/api/report-builder/reports/${createdReportId}/chart`)
      .send({ chartConfig: { type: 'invalid_type' } });
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════
//  9. Execution
// ══════════════════════════════════════════════════════════

describe('Report Builder — Execution', () => {
  test('POST /reports/:id/execute → runs report and returns data', async () => {
    // Restore data source for seeded report
    const res = await request(app)
      .post('/api/report-builder/reports/1000/execute')
      .send({ page: 1, pageSize: 10 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { rows, pagination, columns, executionId, duration } = res.body.data;
    expect(rows).toBeInstanceOf(Array);
    expect(rows.length).toBeLessThanOrEqual(10);
    expect(pagination.page).toBe(1);
    expect(pagination.pageSize).toBe(10);
    expect(pagination.totalRows).toBeGreaterThan(0);
    expect(pagination.totalPages).toBeGreaterThan(0);
    expect(columns).toBeInstanceOf(Array);
    expect(executionId).toBeDefined();
    expect(duration).toBeGreaterThan(0);
  });

  test('POST /reports/:id/execute → pagination page 2', async () => {
    const res = await request(app)
      .post('/api/report-builder/reports/1000/execute')
      .send({ page: 2, pageSize: 10 });
    expect(res.status).toBe(200);
    expect(res.body.data.pagination.page).toBe(2);
  });

  test('POST /reports/:id/execute → with grouping returns grouped data', async () => {
    const res = await request(app)
      .post('/api/report-builder/reports/1001/execute')
      .send({});
    expect(res.status).toBe(200);
    // Report 1001 (financial) has groupBy configured
    expect(res.body.data.grouped).toBeDefined();
  });

  test('POST /reports/:id/execute → 404 for non-existent', async () => {
    const res = await request(app)
      .post('/api/report-builder/reports/99999/execute');
    expect(res.status).toBe(404);
  });

  test('GET /reports/:id/executions → returns execution history', async () => {
    const res = await request(app).get('/api/report-builder/reports/1000/executions');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0]).toHaveProperty('executedAt');
    expect(res.body.data[0]).toHaveProperty('rowCount');
    expect(res.body.data[0]).toHaveProperty('duration');
  });
});

// ══════════════════════════════════════════════════════════
//  10. Templates
// ══════════════════════════════════════════════════════════

describe('Report Builder — Templates', () => {
  test('GET /templates → lists all templates', async () => {
    const res = await request(app).get('/api/report-builder/templates');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(4);
  });

  test('GET /templates?category=hr → filters by category', async () => {
    const res = await request(app).get('/api/report-builder/templates?category=hr');
    expect(res.status).toBe(200);
    res.body.data.forEach(t => expect(t.category).toBe('hr'));
  });

  test('GET /templates/:id → retrieves template detail', async () => {
    const res = await request(app).get('/api/report-builder/templates/2000');
    expect(res.status).toBe(200);
    expect(res.body.data.nameAr).toBe('تقرير المستفيدين الشهري');
    expect(res.body.data.columns).toBeInstanceOf(Array);
  });

  test('GET /templates/:id → 404 for non-existent', async () => {
    const res = await request(app).get('/api/report-builder/templates/9999');
    expect(res.status).toBe(404);
  });

  test('POST /templates/:id/create-report → creates report from template', async () => {
    const res = await request(app).post('/api/report-builder/templates/2001/create-report');
    expect(res.status).toBe(201);
    expect(res.body.data.nameAr).toBe('ملخص الرواتب');
    expect(res.body.data.columns.length).toBeGreaterThanOrEqual(3);
    expect(res.body.data.status).toBe('draft');
  });

  test('POST /reports/:id/save-as-template → saves report as template', async () => {
    const res = await request(app)
      .post(`/api/report-builder/reports/${createdReportId}/save-as-template`)
      .send({ name: 'My Template', nameAr: 'قالب مخصص' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('My Template');
    expect(res.body.data).toHaveProperty('id');
  });
});

// ══════════════════════════════════════════════════════════
//  11. Export
// ══════════════════════════════════════════════════════════

describe('Report Builder — Export', () => {
  test('POST /reports/:id/export → exports as PDF', async () => {
    const res = await request(app)
      .post('/api/report-builder/reports/1000/export')
      .send({ format: 'pdf' });
    expect(res.status).toBe(200);
    expect(res.body.data.format).toBe('pdf');
    expect(res.body.data.fileName).toContain('.pdf');
    expect(res.body.data.downloadUrl).toBeDefined();
  });

  test('POST /reports/:id/export → exports as Excel', async () => {
    const res = await request(app)
      .post('/api/report-builder/reports/1000/export')
      .send({ format: 'excel' });
    expect(res.status).toBe(200);
    expect(res.body.data.format).toBe('excel');
    expect(res.body.data.fileName).toContain('.xlsx');
  });

  test('POST /reports/:id/export → exports as CSV', async () => {
    const res = await request(app)
      .post('/api/report-builder/reports/1000/export')
      .send({ format: 'csv' });
    expect(res.status).toBe(200);
    expect(res.body.data.format).toBe('csv');
  });

  test('POST /reports/:id/export → validation: unsupported format', async () => {
    const res = await request(app)
      .post('/api/report-builder/reports/1000/export')
      .send({ format: 'docx' });
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════
//  12. Schedules
// ══════════════════════════════════════════════════════════

let createdScheduleId;

describe('Report Builder — Schedules', () => {
  test('GET /schedules → lists schedules', async () => {
    const res = await request(app).get('/api/report-builder/schedules');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('POST /schedules → creates a schedule', async () => {
    const res = await request(app)
      .post('/api/report-builder/schedules')
      .send({
        reportId: '1000',
        frequency: 'daily',
        time: '09:00',
        recipients: ['test@alawael.org'],
        format: 'excel',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.frequency).toBe('daily');
    expect(res.body.data.enabled).toBe(true);
    expect(res.body.data.nextRunAt).toBeDefined();
    createdScheduleId = res.body.data.id;
  });

  test('PUT /schedules/:id → updates schedule', async () => {
    const res = await request(app)
      .put(`/api/report-builder/schedules/${createdScheduleId}`)
      .send({ frequency: 'weekly', enabled: false });
    expect(res.status).toBe(200);
    expect(res.body.data.frequency).toBe('weekly');
    expect(res.body.data.enabled).toBe(false);
  });

  test('DELETE /schedules/:id → removes schedule', async () => {
    const res = await request(app).delete(`/api/report-builder/schedules/${createdScheduleId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /schedules → validation: invalid frequency', async () => {
    const res = await request(app)
      .post('/api/report-builder/schedules')
      .send({ reportId: '1000', frequency: 'hourly' });
    expect(res.status).toBe(400);
  });

  test('DELETE /schedules/:id → 404 for non-existent', async () => {
    const res = await request(app).delete('/api/report-builder/schedules/99999');
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════
//  13. Sharing
// ══════════════════════════════════════════════════════════

describe('Report Builder — Sharing', () => {
  test('POST /reports/:id/share → shares report with user', async () => {
    const res = await request(app)
      .post(`/api/report-builder/reports/1000/share`)
      .send({ userId: 'user2', permission: 'view' });
    expect(res.status).toBe(201);
    expect(res.body.data.userId).toBe('user2');
    expect(res.body.data.permission).toBe('view');
  });

  test('POST /reports/:id/share → shares with role', async () => {
    const res = await request(app)
      .post(`/api/report-builder/reports/1000/share`)
      .send({ role: 'manager', permission: 'edit' });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('manager');
  });

  test('GET /reports/:id/shares → lists shares', async () => {
    const res = await request(app).get('/api/report-builder/reports/1000/shares');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  test('POST /reports/:id/share → validation: missing userId and role', async () => {
    const res = await request(app)
      .post('/api/report-builder/reports/1000/share')
      .send({ permission: 'view' });
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════
//  14. Favorites
// ══════════════════════════════════════════════════════════

describe('Report Builder — Favorites', () => {
  test('POST /reports/:id/favorite → toggles ON', async () => {
    const res = await request(app).post('/api/report-builder/reports/1000/favorite');
    expect(res.status).toBe(200);
    expect(res.body.data.isFavorite).toBe(true);
  });

  test('GET /favorites → lists user favorites', async () => {
    const res = await request(app).get('/api/report-builder/favorites');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('POST /reports/:id/favorite → toggles OFF', async () => {
    const res = await request(app).post('/api/report-builder/reports/1000/favorite');
    expect(res.status).toBe(200);
    expect(res.body.data.isFavorite).toBe(false);
  });

  test('POST /reports/:id/favorite → 404 for non-existent', async () => {
    const res = await request(app).post('/api/report-builder/reports/99999/favorite');
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════
//  15. Version History
// ══════════════════════════════════════════════════════════

describe('Report Builder — Versions', () => {
  test('GET /reports/:id/versions → returns version history', async () => {
    const res = await request(app).get(`/api/report-builder/reports/${createdReportId}/versions`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0]).toHaveProperty('note');
    expect(res.body.data[0]).toHaveProperty('createdAt');
  });
});

// ══════════════════════════════════════════════════════════
//  16. Full Workflow — End-to-End
// ══════════════════════════════════════════════════════════

describe('Report Builder — Full Workflow', () => {
  test('Complete flow: create → design → execute → export → schedule → share', async () => {
    // 1. Create report from template
    const tmplRes = await request(app).post('/api/report-builder/templates/2002/create-report');
    expect(tmplRes.status).toBe(201);
    const rptId = tmplRes.body.data.id;

    // 2. Add a calculated field
    const calcRes = await request(app)
      .post(`/api/report-builder/reports/${rptId}/calculated-fields`)
      .send({ name: 'VAT', formula: '{f_amount} * 0.15', type: 'currency' });
    expect(calcRes.status).toBe(200);

    // 3. Set chart
    const chartRes = await request(app)
      .put(`/api/report-builder/reports/${rptId}/chart`)
      .send({ chartConfig: { type: 'pie', xAxis: 'f_type', title: 'توزيع المعاملات' } });
    expect(chartRes.status).toBe(200);

    // 4. Execute
    const execRes = await request(app)
      .post(`/api/report-builder/reports/${rptId}/execute`)
      .send({ page: 1, pageSize: 5 });
    expect(execRes.status).toBe(200);
    expect(execRes.body.data.rows.length).toBeLessThanOrEqual(5);
    expect(execRes.body.data.chartConfig).toBeTruthy();

    // 5. Export
    const expRes = await request(app)
      .post(`/api/report-builder/reports/${rptId}/export`)
      .send({ format: 'json' });
    expect(expRes.status).toBe(200);
    expect(expRes.body.data.format).toBe('json');

    // 6. Schedule
    const schRes = await request(app)
      .post('/api/report-builder/schedules')
      .send({ reportId: rptId, frequency: 'monthly', time: '07:00', recipients: ['boss@alawael.org'] });
    expect(schRes.status).toBe(201);

    // 7. Share
    const shareRes = await request(app)
      .post(`/api/report-builder/reports/${rptId}/share`)
      .send({ userId: 'manager1', permission: 'edit' });
    expect(shareRes.status).toBe(201);

    // 8. Favorite
    const favRes = await request(app).post(`/api/report-builder/reports/${rptId}/favorite`);
    expect(favRes.status).toBe(200);
    expect(favRes.body.data.isFavorite).toBe(true);

    // 9. Save as template
    const saveTmpl = await request(app)
      .post(`/api/report-builder/reports/${rptId}/save-as-template`)
      .send({ name: 'Flow Template' });
    expect(saveTmpl.status).toBe(201);
  });
});

// ══════════════════════════════════════════════════════════
//  17. Post-Operations Dashboard
// ══════════════════════════════════════════════════════════

describe('Report Builder — Post-Operations Dashboard', () => {
  test('Dashboard reflects all test operations', async () => {
    const res = await request(app).get('/api/report-builder/dashboard/overview');
    expect(res.status).toBe(200);
    const { kpi } = res.body.data;
    expect(kpi.totalReports).toBeGreaterThanOrEqual(5);
    expect(kpi.totalTemplates).toBeGreaterThanOrEqual(4);
    expect(kpi.totalExecutions).toBeGreaterThanOrEqual(4);
  });
});
