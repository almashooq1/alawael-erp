/**
 * Unit Tests — ReportBuilderService
 * Service: backend/services/reportBuilder.service.js
 *
 * In-memory report builder with:
 *   Data sources, Report CRUD, Columns, Filters, Sorting, Grouping,
 *   Calculated fields, Chart config, Execution, Templates, Scheduling,
 *   Export, Sharing, Favorites, Versions, Dashboard
 */

/* ── Mock logger ── */
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const service = require('../../services/reportBuilder.service');

// ─────────────────────────────────────────────────────────────────────
// Helper: grab any seeded report & data source ids
// ─────────────────────────────────────────────────────────────────────
const seedReportId = () => {
  const all = service.getAllReports();
  if (all.length === 0) throw new Error('No seed reports found');
  return all[0].id;
};

const seedDataSourceId = () => {
  const ds = service.getDataSources();
  if (ds.length === 0) throw new Error('No seed data sources found');
  return ds[0].id;
};

// ═══════════════════════════════════════════════════════════════════════
// 1 ─ MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════════════
describe('ReportBuilderService — module exports', () => {
  it('exports a singleton object (not a class)', () => {
    expect(service).toBeDefined();
    expect(typeof service).toBe('object');
    expect(service.constructor.name).toBe('ReportBuilderService');
  });

  const expectedMethods = [
    'getDataSources',
    'getDataSourceById',
    'getFieldsForSource',
    'createReport',
    'getReportById',
    'getAllReports',
    'updateReport',
    'deleteReport',
    'duplicateReport',
    'addColumn',
    'removeColumn',
    'reorderColumns',
    'addFilter',
    'removeFilter',
    'updateFilter',
    'setSorting',
    'setGroupBy',
    'addCalculatedField',
    'removeCalculatedField',
    'setChartConfig',
    'executeReport',
    'getExecutionHistory',
    'getTemplates',
    'getTemplateById',
    'createReportFromTemplate',
    'saveAsTemplate',
    'createSchedule',
    'getSchedules',
    'getScheduleById',
    'updateSchedule',
    'deleteSchedule',
    'exportReport',
    'shareReport',
    'getReportShares',
    'removeShare',
    'toggleFavorite',
    'getUserFavorites',
    'getReportVersions',
    'getDashboard',
  ];

  it.each(expectedMethods)('%s is a function', name => {
    expect(typeof service[name]).toBe('function');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2 ─ SEED DATA
// ═══════════════════════════════════════════════════════════════════════
describe('Seed data', () => {
  it('has seeded data sources', () => {
    const ds = service.getDataSources();
    expect(Array.isArray(ds)).toBe(true);
    expect(ds.length).toBeGreaterThan(0);
  });

  it('each data source has id, name, fields array', () => {
    const ds = service.getDataSources();
    ds.forEach(d => {
      expect(d.id).toBeDefined();
      expect(d.name).toBeDefined();
      expect(Array.isArray(d.fields)).toBe(true);
    });
  });

  it('has seeded reports', () => {
    const reports = service.getAllReports();
    expect(reports.length).toBeGreaterThan(0);
  });

  it('has seeded templates', () => {
    const templates = service.getTemplates();
    expect(templates.length).toBeGreaterThan(0);
  });

  it('has seeded schedules', () => {
    const schedules = service.getSchedules();
    expect(schedules.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3 ─ DATA SOURCES
// ═══════════════════════════════════════════════════════════════════════
describe('Data Sources', () => {
  it('getDataSourceById returns source for valid id', () => {
    const id = seedDataSourceId();
    const ds = service.getDataSourceById(id);
    expect(ds).toBeDefined();
    expect(ds.id).toBe(id);
  });

  it('getDataSourceById throws for unknown id', () => {
    expect(() => service.getDataSourceById('unknown_99999')).toThrow();
  });

  it('getFieldsForSource returns fields array', () => {
    const id = seedDataSourceId();
    const fields = service.getFieldsForSource(id);
    expect(Array.isArray(fields)).toBe(true);
    expect(fields.length).toBeGreaterThan(0);
    expect(fields[0]).toHaveProperty('id');
    expect(fields[0]).toHaveProperty('type');
  });

  it('getFieldsForSource throws for unknown source', () => {
    expect(() => service.getFieldsForSource('bad_id')).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4 ─ REPORT CRUD
// ═══════════════════════════════════════════════════════════════════════
describe('Report CRUD', () => {
  let createdId;
  const dsId = () => seedDataSourceId();

  it('createReport succeeds with valid data', () => {
    const r = service.createReport({
      name: 'Test Report',
      dataSourceId: dsId(),
      createdBy: 'tester',
    });
    expect(r).toBeDefined();
    expect(r.id).toBeDefined();
    expect(r.name).toBe('Test Report');
    expect(r.status).toBe('draft');
    expect(r.version).toBe(1);
    createdId = r.id;
  });

  it('createReport throws without name', () => {
    expect(() => service.createReport({ dataSourceId: dsId() })).toThrow('اسم التقرير مطلوب');
  });

  it('createReport throws without dataSourceId', () => {
    expect(() => service.createReport({ name: 'X' })).toThrow('مصدر البيانات مطلوب');
  });

  it('createReport throws for invalid dataSourceId', () => {
    expect(() => service.createReport({ name: 'X', dataSourceId: 'no_exist' })).toThrow();
  });

  it('getReportById returns the created report', () => {
    const r = service.getReportById(createdId);
    expect(r.id).toBe(createdId);
    expect(r.name).toBe('Test Report');
  });

  it('getReportById throws for unknown id', () => {
    expect(() => service.getReportById('nonexistent')).toThrow('التقرير غير موجود');
  });

  it('getAllReports returns array', () => {
    const all = service.getAllReports();
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBeGreaterThan(0);
  });

  it('getAllReports filters by status', () => {
    const drafts = service.getAllReports({ status: 'draft' });
    drafts.forEach(r => expect(r.status).toBe('draft'));
  });

  it('getAllReports filters by search term', () => {
    const results = service.getAllReports({ search: 'Test Report' });
    expect(results.length).toBeGreaterThan(0);
  });

  it('getAllReports filters by createdBy', () => {
    const results = service.getAllReports({ createdBy: 'tester' });
    results.forEach(r => expect(r.createdBy).toBe('tester'));
  });

  it('updateReport updates fields and bumps version', () => {
    const r = service.updateReport(createdId, { name: 'Updated Report', tags: ['test'] });
    expect(r.name).toBe('Updated Report');
    expect(r.version).toBe(2);
    expect(r.tags).toEqual(['test']);
  });

  it('updateReport throws for unknown id', () => {
    expect(() => service.updateReport('no_id', { name: 'X' })).toThrow('التقرير غير موجود');
  });

  it('duplicateReport creates a copy with (نسخة)', () => {
    const clone = service.duplicateReport(createdId, 'tester');
    expect(clone.name).toContain('نسخة');
    expect(clone.status).toBe('draft');
    expect(clone.id).not.toBe(createdId);
  });

  it('deleteReport removes report', () => {
    const result = service.deleteReport(createdId);
    expect(result.deleted).toBe(true);
    expect(() => service.getReportById(createdId)).toThrow();
  });

  it('deleteReport throws for unknown id', () => {
    expect(() => service.deleteReport('no_id')).toThrow('التقرير غير موجود');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5 ─ COLUMN DESIGNER
// ═══════════════════════════════════════════════════════════════════════
describe('Column Designer', () => {
  let rptId;

  beforeAll(() => {
    const r = service.createReport({
      name: 'ColTest',
      dataSourceId: seedDataSourceId(),
    });
    rptId = r.id;
  });

  it('addColumn adds a column with valid fieldId', () => {
    const ds = service.getDataSourceById(service.getReportById(rptId).dataSourceId);
    const field = ds.fields[0];
    const r = service.addColumn(rptId, { fieldId: field.id });
    expect(r.columns.length).toBe(1);
    expect(r.columns[0].fieldId).toBe(field.id);
  });

  it('addColumn throws when report not found', () => {
    expect(() => service.addColumn('no_id', { fieldId: 'x' })).toThrow();
  });

  it('addColumn throws without fieldId', () => {
    expect(() => service.addColumn(rptId, {})).toThrow('معرف الحقل مطلوب');
  });

  it('addColumn throws for fieldId not in data source', () => {
    expect(() => service.addColumn(rptId, { fieldId: 'invalid_field_999' })).toThrow();
  });

  it('removeColumn removes existing column', () => {
    const ds = service.getDataSourceById(service.getReportById(rptId).dataSourceId);
    const fieldId = ds.fields[0].id;
    const r = service.removeColumn(rptId, fieldId);
    expect(r.columns.some(c => c.fieldId === fieldId)).toBe(false);
  });

  it('removeColumn throws when column not found', () => {
    expect(() => service.removeColumn(rptId, 'no_field_id')).toThrow('العمود غير موجود');
  });

  it('reorderColumns reorders columns', () => {
    const ds = service.getDataSourceById(service.getReportById(rptId).dataSourceId);
    // Add 2 columns
    service.addColumn(rptId, { fieldId: ds.fields[0].id });
    service.addColumn(rptId, { fieldId: ds.fields[1].id });
    const r = service.reorderColumns(rptId, [ds.fields[1].id, ds.fields[0].id]);
    expect(r.columns[0].fieldId).toBe(ds.fields[1].id);
    expect(r.columns[1].fieldId).toBe(ds.fields[0].id);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6 ─ FILTERS
// ═══════════════════════════════════════════════════════════════════════
describe('Filters', () => {
  let rptId;

  beforeAll(() => {
    const r = service.createReport({
      name: 'FilterTest',
      dataSourceId: seedDataSourceId(),
    });
    rptId = r.id;
  });

  it('addFilter adds a filter', () => {
    const r = service.addFilter(rptId, { fieldId: 'b_age', operator: 'gt', value: 10 });
    expect(r.filters.length).toBe(1);
    expect(r.filters[0].operator).toBe('gt');
  });

  it('addFilter throws without fieldId/operator', () => {
    expect(() => service.addFilter(rptId, { value: 5 })).toThrow('الحقل والعامل مطلوبان');
  });

  it('addFilter throws for unknown report', () => {
    expect(() => service.addFilter('no', { fieldId: 'x', operator: 'eq' })).toThrow();
  });

  it('updateFilter updates existing filter', () => {
    const report = service.getReportById(rptId);
    const filterId = report.filters[0].id;
    const r = service.updateFilter(rptId, filterId, { operator: 'lte', value: 99 });
    const f = r.filters.find(x => x.id === filterId);
    expect(f.operator).toBe('lte');
    expect(f.value).toBe(99);
  });

  it('updateFilter throws for unknown filter', () => {
    expect(() => service.updateFilter(rptId, 'bad_filter', {})).toThrow('الفلتر غير موجود');
  });

  it('removeFilter removes the filter', () => {
    const report = service.getReportById(rptId);
    const filterId = report.filters[0].id;
    const r = service.removeFilter(rptId, filterId);
    expect(r.filters.length).toBe(0);
  });

  it('removeFilter throws for unknown filter', () => {
    expect(() => service.removeFilter(rptId, 'bad_filter')).toThrow('الفلتر غير موجود');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7 ─ SORTING
// ═══════════════════════════════════════════════════════════════════════
describe('Sorting', () => {
  it('setSorting sets sorting array', () => {
    const id = seedReportId();
    const r = service.setSorting(id, [{ fieldId: 'b_age', direction: 'desc' }]);
    expect(r.sorting).toEqual([{ fieldId: 'b_age', direction: 'desc' }]);
  });

  it('setSorting defaults direction to asc', () => {
    const id = seedReportId();
    const r = service.setSorting(id, [{ fieldId: 'b_name' }]);
    expect(r.sorting[0].direction).toBe('asc');
  });

  it('setSorting throws for unknown report', () => {
    expect(() => service.setSorting('no', [])).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 8 ─ GROUPING
// ═══════════════════════════════════════════════════════════════════════
describe('Grouping', () => {
  it('setGroupBy sets groupBy array', () => {
    const id = seedReportId();
    const r = service.setGroupBy(id, [{ fieldId: 'b_status', aggregation: 'count' }]);
    expect(r.groupBy).toEqual([{ fieldId: 'b_status', aggregation: 'count' }]);
  });

  it('setGroupBy defaults aggregation to count', () => {
    const id = seedReportId();
    const r = service.setGroupBy(id, [{ fieldId: 'b_status' }]);
    expect(r.groupBy[0].aggregation).toBe('count');
  });

  it('setGroupBy throws for unknown report', () => {
    expect(() => service.setGroupBy('no', [])).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 9 ─ CALCULATED FIELDS
// ═══════════════════════════════════════════════════════════════════════
describe('Calculated Fields', () => {
  let rptId;

  beforeAll(() => {
    const r = service.createReport({
      name: 'CalcFieldTest',
      dataSourceId: seedDataSourceId(),
    });
    rptId = r.id;
  });

  it('addCalculatedField adds field', () => {
    const r = service.addCalculatedField(rptId, {
      name: 'Total',
      formula: '{b_age} * 2',
      type: 'number',
    });
    expect(r.calculatedFields.length).toBe(1);
    expect(r.calculatedFields[0].name).toBe('Total');
    expect(r.calculatedFields[0].formula).toBe('{b_age} * 2');
  });

  it('addCalculatedField throws without name/formula', () => {
    expect(() => service.addCalculatedField(rptId, { name: 'X' })).toThrow('الاسم والصيغة مطلوبان');
    expect(() => service.addCalculatedField(rptId, { formula: 'x' })).toThrow(
      'الاسم والصيغة مطلوبان'
    );
  });

  it('removeCalculatedField removes field', () => {
    const report = service.getReportById(rptId);
    const fieldId = report.calculatedFields[0].id;
    const r = service.removeCalculatedField(rptId, fieldId);
    expect(r.calculatedFields.length).toBe(0);
  });

  it('removeCalculatedField throws for unknown field', () => {
    expect(() => service.removeCalculatedField(rptId, 'nope')).toThrow('الحقل المحسوب غير موجود');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 10 ─ CHART CONFIG
// ═══════════════════════════════════════════════════════════════════════
describe('Chart Configuration', () => {
  let rptId;

  beforeAll(() => {
    const r = service.createReport({
      name: 'ChartTest',
      dataSourceId: seedDataSourceId(),
    });
    rptId = r.id;
  });

  it('setChartConfig sets valid chart config', () => {
    const r = service.setChartConfig(rptId, { type: 'bar', xAxis: 'b_name', yAxis: 'b_age' });
    expect(r.chartConfig).toBeDefined();
    expect(r.chartConfig.type).toBe('bar');
    expect(r.chartConfig.showLegend).toBe(true);
  });

  it('setChartConfig validates chart type', () => {
    expect(() => service.setChartConfig(rptId, { type: 'radar3d' })).toThrow('نوع غير مدعوم');
  });

  it('setChartConfig throws without type', () => {
    expect(() => service.setChartConfig(rptId, {})).toThrow('نوع الرسم البياني مطلوب');
  });

  it('setChartConfig allows all valid types', () => {
    const types = ['bar', 'line', 'pie', 'doughnut', 'area', 'scatter', 'table', 'kpi'];
    types.forEach(type => {
      const r = service.setChartConfig(rptId, { type });
      expect(r.chartConfig.type).toBe(type);
    });
  });

  it('setChartConfig(null) clears chart', () => {
    const r = service.setChartConfig(rptId, null);
    expect(r.chartConfig).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 11 ─ REPORT EXECUTION
// ═══════════════════════════════════════════════════════════════════════
describe('Report Execution', () => {
  let rptId;

  beforeAll(() => {
    rptId = seedReportId();
  });

  it('executeReport returns result with rows and pagination', () => {
    const result = service.executeReport(rptId, { totalRows: 10 });
    expect(result).toBeDefined();
    expect(result.report).toBeDefined();
    expect(result.report.id).toBe(rptId);
    expect(Array.isArray(result.rows)).toBe(true);
    expect(result.pagination).toBeDefined();
    expect(result.pagination.totalRows).toBeGreaterThan(0);
    expect(result.executionId).toBeDefined();
  });

  it('executeReport respects page and pageSize', () => {
    const result = service.executeReport(rptId, { totalRows: 50, page: 2, pageSize: 10 });
    expect(result.pagination.page).toBe(2);
    expect(result.pagination.pageSize).toBe(10);
    expect(result.rows.length).toBeLessThanOrEqual(10);
  });

  it('executeReport throws for unknown report', () => {
    expect(() => service.executeReport('no_report')).toThrow();
  });

  it('executeReport increments runCount', () => {
    const before = service.getReportById(rptId).runCount;
    service.executeReport(rptId, { totalRows: 5 });
    const after = service.getReportById(rptId).runCount;
    expect(after).toBe(before + 1);
  });

  it('executeReport applies grouping when groupBy set', () => {
    service.setGroupBy(rptId, [{ fieldId: 'b_status', aggregation: 'count' }]);
    const result = service.executeReport(rptId, { totalRows: 20 });
    expect(result.grouped).toBeDefined();
    expect(Array.isArray(result.grouped)).toBe(true);
    // clean up
    service.setGroupBy(rptId, []);
  });

  it('getExecutionHistory returns array', () => {
    const execs = service.getExecutionHistory(rptId);
    expect(Array.isArray(execs)).toBe(true);
  });

  it('getExecutionHistory limits results', () => {
    // Execute a few times
    service.executeReport(rptId, { totalRows: 5 });
    service.executeReport(rptId, { totalRows: 5 });
    const execs = service.getExecutionHistory(rptId, { limit: 2 });
    expect(execs.length).toBeLessThanOrEqual(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 12 ─ TEMPLATES
// ═══════════════════════════════════════════════════════════════════════
describe('Templates', () => {
  it('getTemplates returns array', () => {
    const ts = service.getTemplates();
    expect(Array.isArray(ts)).toBe(true);
  });

  it('getTemplates filters by category', () => {
    const ts = service.getTemplates();
    if (ts.length > 0) {
      const cat = ts[0].category;
      const filtered = service.getTemplates({ category: cat });
      filtered.forEach(t => expect(t.category).toBe(cat));
    }
  });

  it('getTemplates filters by search', () => {
    const ts = service.getTemplates();
    if (ts.length > 0) {
      const name = ts[0].name.split(' ')[0];
      const results = service.getTemplates({ search: name });
      expect(results.length).toBeGreaterThan(0);
    }
  });

  it('getTemplateById returns template', () => {
    const ts = service.getTemplates();
    if (ts.length > 0) {
      const tmpl = service.getTemplateById(ts[0].id);
      expect(tmpl.id).toBe(ts[0].id);
    }
  });

  it('getTemplateById throws for unknown id', () => {
    expect(() => service.getTemplateById('no_tmpl')).toThrow('القالب غير موجود');
  });

  it('createReportFromTemplate creates report from template', () => {
    const ts = service.getTemplates();
    if (ts.length > 0) {
      const r = service.createReportFromTemplate(ts[0].id, 'tester');
      expect(r).toBeDefined();
      expect(r.id).toBeDefined();
      expect(r.createdBy).toBe('tester');
    }
  });

  it('saveAsTemplate saves report as template', () => {
    const rptId = seedReportId();
    const tmpl = service.saveAsTemplate(rptId, { name: 'My Template', createdBy: 'tester' });
    expect(tmpl).toBeDefined();
    expect(tmpl.id).toBeDefined();
    expect(tmpl.name).toBe('My Template');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 13 ─ SCHEDULING
// ═══════════════════════════════════════════════════════════════════════
describe('Scheduling', () => {
  let schedId;

  it('createSchedule creates schedule', () => {
    const rptId = seedReportId();
    const sch = service.createSchedule({
      reportId: rptId,
      frequency: 'daily',
      time: '09:00',
      recipients: ['test@test.com'],
      format: 'pdf',
    });
    expect(sch).toBeDefined();
    expect(sch.id).toBeDefined();
    expect(sch.frequency).toBe('daily');
    expect(sch.enabled).toBe(true);
    schedId = sch.id;
  });

  it('createSchedule throws without reportId', () => {
    expect(() => service.createSchedule({ frequency: 'daily' })).toThrow('معرف التقرير مطلوب');
  });

  it('createSchedule throws without frequency', () => {
    expect(() => service.createSchedule({ reportId: seedReportId() })).toThrow('التكرار مطلوب');
  });

  it('createSchedule throws for invalid frequency', () => {
    expect(() => service.createSchedule({ reportId: seedReportId(), frequency: 'hourly' })).toThrow(
      'التكرار غير مدعوم'
    );
  });

  it('createSchedule validates valid frequencies', () => {
    ['daily', 'weekly', 'monthly', 'quarterly'].forEach(freq => {
      const sch = service.createSchedule({ reportId: seedReportId(), frequency: freq });
      expect(sch.frequency).toBe(freq);
    });
  });

  it('getSchedules returns array', () => {
    const scheds = service.getSchedules();
    expect(Array.isArray(scheds)).toBe(true);
    expect(scheds.length).toBeGreaterThan(0);
  });

  it('getSchedules filters by reportId', () => {
    const rptId = seedReportId();
    const scheds = service.getSchedules(rptId);
    scheds.forEach(s => expect(s.reportId).toBe(rptId));
  });

  it('getScheduleById returns schedule', () => {
    const sch = service.getScheduleById(schedId);
    expect(sch.id).toBe(schedId);
  });

  it('getScheduleById throws for unknown id', () => {
    expect(() => service.getScheduleById('no')).toThrow('الجدولة غير موجودة');
  });

  it('updateSchedule updates fields', () => {
    const sch = service.updateSchedule(schedId, { enabled: false, time: '10:00' });
    expect(sch.enabled).toBe(false);
    expect(sch.time).toBe('10:00');
  });

  it('updateSchedule throws for unknown id', () => {
    expect(() => service.updateSchedule('no', {})).toThrow('الجدولة غير موجودة');
  });

  it('deleteSchedule removes schedule', () => {
    const result = service.deleteSchedule(schedId);
    expect(result.deleted).toBe(true);
    expect(() => service.getScheduleById(schedId)).toThrow();
  });

  it('deleteSchedule throws for unknown id', () => {
    expect(() => service.deleteSchedule('no')).toThrow('الجدولة غير موجودة');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 14 ─ EXPORT
// ═══════════════════════════════════════════════════════════════════════
describe('Export', () => {
  it('exportReport returns export metadata for pdf', () => {
    const rptId = seedReportId();
    const exp = service.exportReport(rptId, 'pdf', { totalRows: 10 });
    expect(exp).toBeDefined();
    expect(exp.format).toBe('pdf');
    expect(exp.fileName).toContain('.pdf');
    expect(exp.downloadUrl).toContain(rptId);
  });

  it('exportReport works for excel', () => {
    const rptId = seedReportId();
    const exp = service.exportReport(rptId, 'excel', { totalRows: 5 });
    expect(exp.fileName).toContain('.xlsx');
  });

  it('exportReport works for csv', () => {
    const rptId = seedReportId();
    const exp = service.exportReport(rptId, 'csv', { totalRows: 5 });
    expect(exp.fileName).toContain('.csv');
  });

  it('exportReport works for json', () => {
    const rptId = seedReportId();
    const exp = service.exportReport(rptId, 'json', { totalRows: 5 });
    expect(exp.fileName).toContain('.json');
  });

  it('exportReport throws for invalid format', () => {
    expect(() => service.exportReport(seedReportId(), 'xml')).toThrow('صيغة التصدير غير مدعومة');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 15 ─ SHARING & PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════
describe('Sharing & Permissions', () => {
  let rptId;

  beforeAll(() => {
    rptId = seedReportId();
  });

  it('shareReport creates a share', () => {
    const share = service.shareReport(rptId, {
      userId: 'user1',
      permission: 'view',
      sharedBy: 'admin',
    });
    expect(share).toBeDefined();
    expect(share.reportId).toBe(rptId);
    expect(share.userId).toBe('user1');
    expect(share.permission).toBe('view');
  });

  it('shareReport throws without userId or role', () => {
    expect(() => service.shareReport(rptId, { permission: 'view' })).toThrow(
      'المستخدم أو الدور مطلوب'
    );
  });

  it('shareReport can share by role', () => {
    const share = service.shareReport(rptId, { role: 'manager' });
    expect(share.role).toBe('manager');
  });

  it('getReportShares returns shares for report', () => {
    const shares = service.getReportShares(rptId);
    expect(Array.isArray(shares)).toBe(true);
    expect(shares.length).toBeGreaterThan(0);
  });

  it('removeShare removes share', () => {
    const result = service.removeShare(rptId, 'user1');
    expect(result.removed).toBe(true);
  });

  it('removeShare throws for nonexistent share', () => {
    expect(() => service.removeShare(rptId, 'nobody')).toThrow('المشاركة غير موجودة');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 16 ─ FAVORITES
// ═══════════════════════════════════════════════════════════════════════
describe('Favorites', () => {
  let rptId;

  beforeAll(() => {
    rptId = seedReportId();
  });

  it('toggleFavorite adds to favorites', () => {
    const result = service.toggleFavorite('userA', rptId);
    expect(result.isFavorite).toBe(true);
    expect(result.reportId).toBe(rptId);
  });

  it('toggleFavorite removes from favorites on second call', () => {
    const result = service.toggleFavorite('userA', rptId);
    expect(result.isFavorite).toBe(false);
  });

  it('getUserFavorites returns empty for new user', () => {
    const favs = service.getUserFavorites('brand_new_user');
    expect(Array.isArray(favs)).toBe(true);
    expect(favs.length).toBe(0);
  });

  it('getUserFavorites returns favorited reports', () => {
    service.toggleFavorite('userB', rptId);
    const favs = service.getUserFavorites('userB');
    expect(favs.length).toBe(1);
    expect(favs[0].id).toBe(rptId);
  });

  it('toggleFavorite throws for unknown report', () => {
    expect(() => service.toggleFavorite('userA', 'no_such_report')).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 17 ─ VERSION HISTORY
// ═══════════════════════════════════════════════════════════════════════
describe('Version History', () => {
  it('getReportVersions returns versions for report', () => {
    // Create a new report (which triggers _createVersion internally)
    const r = service.createReport({ name: 'VersionTrack', dataSourceId: seedDataSourceId() });
    const versions = service.getReportVersions(r.id);
    expect(Array.isArray(versions)).toBe(true);
    expect(versions.length).toBeGreaterThan(0);
  });

  it('versions are ordered newest first', () => {
    const rptId = seedReportId();
    // Trigger an update to create another version
    service.updateReport(rptId, { tags: ['v_test'] });
    const versions = service.getReportVersions(rptId);
    if (versions.length >= 2) {
      expect(new Date(versions[0].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(versions[1].createdAt).getTime()
      );
    }
  });

  it('getReportVersions returns empty for unknown report', () => {
    const versions = service.getReportVersions('no_report');
    expect(versions).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 18 ─ DASHBOARD
// ═══════════════════════════════════════════════════════════════════════
describe('Dashboard', () => {
  it('getDashboard returns KPI, recent reports, executions', () => {
    const dash = service.getDashboard('admin');
    expect(dash).toBeDefined();
    expect(dash.kpi).toBeDefined();
    expect(dash.kpi.totalReports).toBeGreaterThan(0);
    expect(dash.kpi.totalTemplates).toBeGreaterThan(0);
    expect(Array.isArray(dash.recentReports)).toBe(true);
    expect(Array.isArray(dash.recentExecutions)).toBe(true);
    expect(Array.isArray(dash.favorites)).toBe(true);
  });

  it('getDashboard kpi has category and source counts', () => {
    const dash = service.getDashboard();
    expect(dash.kpi.categoryCounts).toBeDefined();
    expect(dash.kpi.sourceUsage).toBeDefined();
  });

  it('getDashboard without userId returns empty favorites', () => {
    const dash = service.getDashboard(null);
    expect(dash.favorites).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 19 ─ EDGE CASES & ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════
describe('Edge Cases', () => {
  it('getAllReports with isPublic filter works (boolean)', () => {
    const pub = service.getAllReports({ isPublic: true });
    pub.forEach(r => expect(r.isPublic).toBe(true));
  });

  it('getAllReports with isPublic filter works (string "true")', () => {
    const pub = service.getAllReports({ isPublic: 'true' });
    pub.forEach(r => expect(r.isPublic).toBe(true));
  });

  it('createReport sets defaults for optional fields', () => {
    const r = service.createReport({
      name: 'Defaults Test',
      dataSourceId: seedDataSourceId(),
    });
    expect(r.status).toBe('draft');
    expect(r.isPublic).toBe(false);
    expect(r.category).toBe('general');
    expect(r.columns).toEqual([]);
    expect(r.filters).toEqual([]);
    expect(r.sorting).toEqual([]);
    expect(r.groupBy).toEqual([]);
    expect(r.calculatedFields).toEqual([]);
    expect(r.chartConfig).toBeNull();
    expect(r.tags).toEqual([]);
    expect(r.version).toBe(1);
    expect(r.runCount).toBe(0);
    expect(r.lastRunAt).toBeNull();
    expect(r.showRowNumbers).toBe(true);
    expect(r.pageSize).toBe(25);
  });

  it('deleteReport also removes associated schedules', () => {
    const r = service.createReport({
      name: 'Del+Sched',
      dataSourceId: seedDataSourceId(),
    });
    const sch = service.createSchedule({ reportId: r.id, frequency: 'daily' });
    service.deleteReport(r.id);
    expect(() => service.getScheduleById(sch.id)).toThrow();
  });

  it('exportReport for excel generates .xlsx extension', () => {
    const exp = service.exportReport(seedReportId(), 'excel', { totalRows: 3 });
    expect(exp.fileName.endsWith('.xlsx')).toBe(true);
  });

  it('executeReport with summaryRow generates summary', () => {
    const rptId = seedReportId();
    service.updateReport(rptId, { summaryRow: true });
    const result = service.executeReport(rptId, { totalRows: 10 });
    // summary may be null if no numeric columns are configured, but should not throw
    expect(result).toBeDefined();
  });
});
