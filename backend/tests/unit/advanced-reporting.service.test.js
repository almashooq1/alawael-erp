/**
 * Unit Tests — AdvancedReportingService
 * Pure in-memory class, no external dependencies.
 */

const AdvancedReportingService = require('../../services/advancedReportingService');

let service;

beforeEach(() => {
  service = new AdvancedReportingService();
});

/* ═══════════════════════════════════════════════════
   1. Module Exports (3)
   ═══════════════════════════════════════════════════ */
describe('Module exports', () => {
  it('exports a constructor function', () => {
    expect(typeof AdvancedReportingService).toBe('function');
  });

  it('is NOT a singleton instance', () => {
    // module.exports should be the class itself
    expect(AdvancedReportingService).not.toHaveProperty('reports');
  });

  it('initializeTemplates is called during construction', () => {
    const spy = jest.spyOn(AdvancedReportingService.prototype, 'initializeTemplates');
    const s = new AdvancedReportingService();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});

/* ═══════════════════════════════════════════════════
   2. Constructor & Initialization (6)
   ═══════════════════════════════════════════════════ */
describe('Constructor & initialization', () => {
  it('creates reports Map', () => {
    expect(service.reports).toBeInstanceOf(Map);
  });

  it('creates templates Map', () => {
    expect(service.templates).toBeInstanceOf(Map);
  });

  it('creates schedules Map', () => {
    expect(service.schedules).toBeInstanceOf(Map);
  });

  it('populates 4 default templates', () => {
    expect(service.templates.size).toBe(4);
  });

  it('workflow-summary template has correct fields and charts', () => {
    const t = service.templates.get('workflow-summary');
    expect(t.fields).toEqual(['status', 'priority', 'owner', 'createdAt', 'completedAt']);
    expect(t.charts).toEqual(['pie', 'bar', 'timeline']);
  });

  it('performance template has correct fields and charts', () => {
    const t = service.templates.get('performance');
    expect(t.fields).toEqual(['employee', 'department', 'metric', 'score', 'trend']);
    expect(t.charts).toEqual(['bar', 'line', 'gauge']);
  });
});

/* ═══════════════════════════════════════════════════
   3. generateReport (15)
   ═══════════════════════════════════════════════════ */
describe('generateReport', () => {
  const tpl = { name: 'Test', format: 'html', sections: [] };
  const data = [
    { value: 10, status: 'completed' },
    { value: 20, status: 'pending' },
  ];

  it('returns a report with id, content, summary, statistics', () => {
    const r = service.generateReport(tpl, data);
    expect(r).toHaveProperty('id');
    expect(r).toHaveProperty('content');
    expect(r).toHaveProperty('summary');
    expect(r).toHaveProperty('statistics');
  });

  it('generates HTML format by default', () => {
    const r = service.generateReport({ name: 'HTML Test', sections: [] }, data);
    expect(r.content).toContain('<');
  });

  it('generates CSV format when template.format is csv', () => {
    const r = service.generateReport({ name: 'CSV', format: 'csv', sections: [] }, data);
    expect(r.content).toContain(',');
  });

  it('returns error when template is null', () => {
    const r = service.generateReport(null, data);
    expect(r.error).toBe('Invalid template');
    expect(r.content).toBeNull();
  });

  it('returns error when template is undefined', () => {
    const r = service.generateReport(undefined, data);
    expect(r.error).toBe('Invalid template');
  });

  it('returns error when data is not an array', () => {
    const r = service.generateReport(tpl, 'bad');
    expect(r.error).toBe('Invalid data format');
    expect(r.content).toBeNull();
  });

  it('returns error when data is null', () => {
    const r = service.generateReport(tpl, null);
    expect(r.error).toBe('Invalid data format');
  });

  it('applies filters with equals operator', () => {
    const opts = { filters: [{ field: 'status', operator: 'equals', value: 'completed' }] };
    const r = service.generateReport(tpl, data, opts);
    expect(r.statistics.count).toBe(1);
  });

  it('filter passes through items when operator is not equals', () => {
    const opts = { filters: [{ field: 'status', operator: 'contains', value: 'comp' }] };
    const r = service.generateReport(tpl, data, opts);
    // non-equals filters always return true, so all pass
    expect(r.statistics.count).toBe(2);
  });

  it('stores report in reports Map', () => {
    const r = service.generateReport(tpl, data);
    expect(service.reports.has(r.id)).toBe(true);
  });

  it('includes data property with filteredData', () => {
    const r = service.generateReport(tpl, data);
    expect(r.data).toEqual(data);
  });

  it('calculates aggregations when provided', () => {
    const opts = { aggregations: { total: { type: 'sum', field: 'value' } } };
    const r = service.generateReport(tpl, data, opts);
    expect(r.aggregations.total).toBe(30);
  });

  it('aggregations undefined when not provided', () => {
    const r = service.generateReport(tpl, data);
    expect(r.aggregations).toBeUndefined();
  });

  it('generates recommendations array', () => {
    const r = service.generateReport(tpl, data);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });

  it('works with empty data array', () => {
    const r = service.generateReport(tpl, []);
    expect(r.statistics.count).toBe(0);
  });
});

/* ═══════════════════════════════════════════════════
   4. Summary Generation (10)
   ═══════════════════════════════════════════════════ */
describe('generateSummary', () => {
  it('workflow-summary: computes total, completed, pending, avgDuration', () => {
    const data = [
      { status: 'completed', createdAt: '2024-01-01', completedAt: '2024-01-02' },
      { status: 'pending' },
      { status: 'completed', createdAt: '2024-01-01', completedAt: '2024-01-03' },
    ];
    const s = service.generateSummary(data, 'workflow-summary');
    expect(s.keyMetrics.total).toBe(3);
    expect(s.keyMetrics.completed).toBe(2);
    expect(s.keyMetrics.pending).toBe(1);
    expect(typeof s.keyMetrics.avgDuration).toBe('number');
  });

  it('performance: avgScore, topPerformer, improvementAreas', () => {
    const data = [
      { score: 80, employee: 'A' },
      { score: 90, employee: 'B' },
    ];
    const s = service.generateSummary(data, 'performance');
    expect(s.keyMetrics).toHaveProperty('avgScore');
    expect(s.keyMetrics).toHaveProperty('topPerformer');
    expect(s.keyMetrics).toHaveProperty('improvementAreas');
  });

  it('performance: topPerformer is the highest scorer', () => {
    const data = [
      { score: 80, employee: 'A' },
      { score: 95, employee: 'B' },
    ];
    const s = service.generateSummary(data, 'performance');
    expect(s.keyMetrics.topPerformer.score).toBe(95);
  });

  it('financial: computes totalIncome, totalExpense, balance', () => {
    const data = [
      { income: 1000, expense: 400 },
      { income: 500, expense: 200 },
    ];
    const s = service.generateSummary(data, 'financial');
    expect(s.keyMetrics.totalIncome).toBe(1500);
    expect(s.keyMetrics.totalExpense).toBe(600);
    expect(s.keyMetrics.balance).toBe(900);
  });

  it('financial: handles zero income/expense', () => {
    const s = service.generateSummary([], 'financial');
    expect(s.keyMetrics.totalIncome).toBe(0);
    expect(s.keyMetrics.totalExpense).toBe(0);
    expect(s.keyMetrics.balance).toBe(0);
  });

  it('hr-analytics: metrics include totalEmployees, avgAttendance, totalLeaves, avgPerformance', () => {
    const data = [
      { employee: 'A', attendance: 90, leaves: 3, performance: 80 },
      { employee: 'B', attendance: 85, leaves: 5, performance: 75 },
    ];
    const s = service.generateSummary(data, 'hr-analytics');
    expect(s.keyMetrics.totalEmployees).toBe(2);
    expect(s.keyMetrics.totalLeaves).toBe(8);
  });

  it('hr-analytics: unique employees counted', () => {
    const data = [
      { employee: 'A', attendance: 90, leaves: 2, performance: 80 },
      { employee: 'A', attendance: 92, leaves: 1, performance: 82 },
    ];
    const s = service.generateSummary(data, 'hr-analytics');
    expect(s.keyMetrics.totalEmployees).toBe(1);
  });

  it('default/generic: returns totalRecords = data.length', () => {
    const data = [{ x: 1 }, { x: 2 }];
    const s = service.generateSummary(data, 'unknown-template');
    expect(s.keyMetrics.totalRecords).toBe(2);
  });

  it('handles template passed as object with name property', () => {
    const data = [{ income: 100, expense: 50 }];
    const s = service.generateSummary(data, { name: 'financial' });
    expect(s.keyMetrics.totalIncome).toBe(100);
  });

  it('returns totalRecords in summary', () => {
    const data = [{ a: 1 }, { a: 2 }, { a: 3 }];
    const s = service.generateSummary(data, 'generic');
    expect(s.totalRecords).toBe(3);
  });
});

/* ═══════════════════════════════════════════════════
   5. Statistics (10)
   ═══════════════════════════════════════════════════ */
describe('calculateStatistics', () => {
  it('computes average correctly', () => {
    const data = [{ value: 10 }, { value: 20 }, { value: 30 }];
    const s = service.calculateStatistics(data);
    expect(s.average).toBe(20);
  });

  it('computes median for odd count', () => {
    const data = [{ value: 10 }, { value: 20 }, { value: 30 }];
    const s = service.calculateStatistics(data);
    expect(s.median).toBe(20);
  });

  it('computes median for even count', () => {
    const data = [{ value: 10 }, { value: 20 }, { value: 30 }, { value: 40 }];
    const s = service.calculateStatistics(data);
    expect(s.median).toBe(25);
  });

  it('computes min and max', () => {
    const data = [{ value: 5 }, { value: 100 }, { value: 50 }];
    const s = service.calculateStatistics(data);
    expect(s.min).toBe(5);
    expect(s.max).toBe(100);
  });

  it('computes standard deviation', () => {
    const data = [{ value: 10 }, { value: 20 }, { value: 30 }];
    const s = service.calculateStatistics(data);
    // stddev of [10,20,30] with population formula: sqrt(200/3) ≈ 8.165
    expect(s.standardDeviation).toBeCloseTo(8.165, 2);
  });

  it('returns count', () => {
    const data = [{ value: 1 }, { value: 2 }];
    const s = service.calculateStatistics(data);
    expect(s.count).toBe(2);
  });

  it('returns defaults for empty data', () => {
    const s = service.calculateStatistics([]);
    expect(s.count).toBe(0);
    expect(s.average).toBe(0);
    expect(s.median).toBe(0);
    expect(s.standardDeviation).toBe(0);
    expect(s.min).toBeNull();
    expect(s.max).toBeNull();
  });

  it('single item: average = value, stddev = 0', () => {
    const s = service.calculateStatistics([{ value: 42 }]);
    expect(s.average).toBe(42);
    expect(s.standardDeviation).toBe(0);
    expect(s.median).toBe(42);
  });

  it('handles missing value property (treats as 0)', () => {
    const data = [{ name: 'x' }, { name: 'y' }];
    const s = service.calculateStatistics(data);
    expect(s.average).toBe(0);
    expect(s.min).toBe(0);
    expect(s.max).toBe(0);
  });

  it('returns distribution object', () => {
    const s = service.calculateStatistics([{ value: 10 }]);
    expect(s).toHaveProperty('distribution');
    expect(typeof s.distribution).toBe('object');
  });
});

/* ═══════════════════════════════════════════════════
   6. Recommendations (4)
   ═══════════════════════════════════════════════════ */
describe('generateRecommendations', () => {
  it('recommends when pending > completed', () => {
    const report = { summary: { keyMetrics: { pending: 10, completed: 3 } } };
    const recs = service.generateRecommendations(report, []);
    expect(recs.length).toBeGreaterThanOrEqual(1);
    expect(recs[0].priority).toBe('high');
    expect(recs[0].action).toBe('review-pending-tasks');
  });

  it('recommends when standardDeviation > average', () => {
    const report = { statistics: { standardDeviation: 50, average: 10 } };
    const recs = service.generateRecommendations(report, []);
    expect(recs.length).toBeGreaterThanOrEqual(1);
    expect(recs.some(r => r.action === 'analyze-outliers')).toBe(true);
  });

  it('returns both recommendations when both conditions met', () => {
    const report = {
      summary: { keyMetrics: { pending: 10, completed: 2 } },
      statistics: { standardDeviation: 100, average: 5 },
    };
    const recs = service.generateRecommendations(report, []);
    expect(recs.length).toBe(2);
  });

  it('returns empty when no conditions met', () => {
    const report = {
      summary: { keyMetrics: { pending: 1, completed: 10 } },
      statistics: { standardDeviation: 1, average: 50 },
    };
    const recs = service.generateRecommendations(report, []);
    expect(recs.length).toBe(0);
  });
});

/* ═══════════════════════════════════════════════════
   7. Sections (3)
   ═══════════════════════════════════════════════════ */
describe('generateSections', () => {
  const data = [{ value: 1 }];

  it('returns exactly 4 sections', () => {
    const sections = service.generateSections(data, 'test');
    expect(sections).toHaveLength(4);
  });

  it('sections have correct Arabic titles', () => {
    const sections = service.generateSections(data, 'test');
    const titles = sections.map(s => s.title);
    expect(titles).toEqual(['نظرة عامة', 'التفاصيل', 'الاتجاهات', 'المقارنات']);
  });

  it('each section has content property', () => {
    const sections = service.generateSections(data, 'test');
    sections.forEach(s => {
      expect(s).toHaveProperty('content');
    });
  });
});

/* ═══════════════════════════════════════════════════
   8. Charts (4)
   ═══════════════════════════════════════════════════ */
describe('generateCharts', () => {
  const data = [{ value: 10 }, { value: 20 }];

  it('generates charts for workflow-summary template', () => {
    const charts = service.generateCharts(data, 'workflow-summary');
    expect(charts.length).toBe(3); // pie, bar, timeline
    expect(charts.map(c => c.type)).toEqual(['pie', 'bar', 'timeline']);
  });

  it('generates charts for performance template', () => {
    const charts = service.generateCharts(data, 'performance');
    expect(charts.length).toBe(3);
    expect(charts.map(c => c.type)).toEqual(['bar', 'line', 'gauge']);
  });

  it('each chart has title, data, options', () => {
    const charts = service.generateCharts(data, 'financial');
    charts.forEach(c => {
      expect(c).toHaveProperty('title');
      expect(c).toHaveProperty('data');
      expect(c).toHaveProperty('options');
    });
  });

  it('returns empty array when template not in map', () => {
    const charts = service.generateCharts(data, 'nonexistent');
    expect(charts).toEqual([]);
  });
});

/* ═══════════════════════════════════════════════════
   9. Scheduling (14)
   ═══════════════════════════════════════════════════ */
describe('Scheduling', () => {
  it('scheduleReport creates a schedule with object config', () => {
    const s = service.scheduleReport({
      templateId: 't1',
      frequency: 'weekly',
      recipients: ['a@b.com'],
    });
    expect(s).toHaveProperty('scheduleId');
    expect(s.templateId).toBe('t1');
    expect(s.frequency).toBe('weekly');
    expect(s.status).toBe('active');
    expect(s.isActive).toBe(true);
  });

  it('scheduleReport stores in schedules Map', () => {
    const s = service.scheduleReport({ templateId: 't1' });
    expect(service.schedules.has(s.scheduleId)).toBe(true);
  });

  it('scheduleReport with string arg (old style)', () => {
    const s = service.scheduleReport('myTemplate');
    expect(s.templateId).toBe('myTemplate');
    expect(s.frequency).toBe('daily');
  });

  it('scheduleReport defaults frequency to daily', () => {
    const s = service.scheduleReport({ templateId: 't1' });
    expect(s.frequency).toBe('daily');
  });

  it('calculateNextRun daily: ~24h from now', () => {
    const now = Date.now();
    const next = service.calculateNextRun('daily');
    expect(next.getTime()).toBeGreaterThan(now);
    expect(next.getTime() - now).toBeLessThanOrEqual(25 * 60 * 60 * 1000);
  });

  it('calculateNextRun weekly: ~7d from now', () => {
    const now = Date.now();
    const next = service.calculateNextRun('weekly');
    const diff = next.getTime() - now;
    expect(diff).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
  });

  it('calculateNextRun monthly: next month', () => {
    const now = new Date();
    const next = service.calculateNextRun('monthly');
    expect(next.getMonth()).not.toBe(now.getMonth());
  });

  it('calculateNextRun quarterly: +3 months', () => {
    const now = new Date();
    const next = service.calculateNextRun('quarterly');
    // At least 2 months ahead
    const monthDiff =
      (next.getFullYear() - now.getFullYear()) * 12 + next.getMonth() - now.getMonth();
    expect(monthDiff).toBe(3);
  });

  it('calculateNextRun yearly: +1 year', () => {
    const now = new Date();
    const next = service.calculateNextRun('yearly');
    expect(next.getFullYear()).toBe(now.getFullYear() + 1);
  });

  it('calculateNextRun with time sets hours', () => {
    const next = service.calculateNextRun('weekly', '09:30');
    expect(next.getHours()).toBe(9);
    expect(next.getMinutes()).toBe(30);
  });

  it('getSchedule returns existing schedule', () => {
    const s = service.scheduleReport({ templateId: 't1' });
    expect(service.getSchedule(s.scheduleId)).toBeDefined();
    expect(service.getSchedule(s.scheduleId).templateId).toBe('t1');
  });

  it('pauseSchedule sets status=paused and isActive=false', () => {
    const s = service.scheduleReport({ templateId: 'x' });
    const paused = service.pauseSchedule(s.scheduleId);
    expect(paused.status).toBe('paused');
    expect(paused.isActive).toBe(false);
  });

  it('resumeSchedule sets status=active and isActive=true', () => {
    const s = service.scheduleReport({ templateId: 'x' });
    service.pauseSchedule(s.scheduleId);
    const resumed = service.resumeSchedule(s.scheduleId);
    expect(resumed.status).toBe('active');
    expect(resumed.isActive).toBe(true);
  });

  it('deleteSchedule removes from map and returns true', () => {
    const s = service.scheduleReport({ templateId: 'x' });
    expect(service.deleteSchedule(s.scheduleId)).toBe(true);
    expect(service.getSchedule(s.scheduleId)).toBeUndefined();
  });
});

/* ═══════════════════════════════════════════════════
   10. Export (16)
   ═══════════════════════════════════════════════════ */
describe('Export', () => {
  let reportId;

  beforeEach(() => {
    const tpl = { name: 'Export Test', format: 'html', sections: [] };
    const data = [
      { value: 10, name: 'A' },
      { value: 20, name: 'B' },
    ];
    const r = service.generateReport(tpl, data);
    reportId = r.id;
  });

  it('exportReport returns null for nonexistent report', () => {
    expect(service.exportReport('no_such_id')).toBeNull();
  });

  it('exportReport pdf: returns PDF object', () => {
    const result = service.exportReport(reportId, 'pdf');
    expect(result.format).toBe('PDF');
    expect(result.status).toBe('ready-for-export');
    expect(result).toHaveProperty('fileName');
  });

  it('exportReport excel: returns sheets array', () => {
    const result = service.exportReport(reportId, 'excel');
    expect(result).toHaveProperty('sheets');
    expect(result.sheets).toHaveLength(2);
  });

  it('exportReport csv: returns string', () => {
    const result = service.exportReport(reportId, 'csv');
    expect(typeof result).toBe('string');
  });

  it('exportReport json: returns valid JSON string', () => {
    const result = service.exportReport(reportId, 'json');
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('exportReport html: returns HTML string with title', () => {
    const result = service.exportReport(reportId, 'html');
    expect(result).toContain('Export Test');
    expect(result).toContain('<html');
  });

  it('exportReport default format: returns report object', () => {
    const result = service.exportReport(reportId, 'unknown');
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('summary');
  });

  it('exportToPDF returns correct structure', () => {
    const report = { title: 'Test', generatedAt: new Date() };
    const pdf = service.exportToPDF(report);
    expect(pdf.format).toBe('PDF');
    expect(pdf.fileName).toBe('Test.pdf');
    expect(pdf.content).toBe(report);
    expect(pdf.status).toBe('ready-for-export');
  });

  it('exportToExcel returns fileName and 2 sheets', () => {
    const report = { title: 'Test', summary: {}, statistics: {} };
    const excel = service.exportToExcel(report);
    expect(excel.fileName).toContain('Test');
    expect(excel.fileName).toContain('.xlsx');
    expect(excel.sheets[0].name).toBe('الملخص');
    expect(excel.sheets[1].name).toBe('الإحصائيات');
  });

  it('exportToCSV with includeMetadata adds title row', () => {
    const report = { title: 'R', generatedAt: new Date(), data: [{ a: 1 }] };
    const csv = service.exportToCSV(report, 'file.csv', { includeMetadata: true });
    expect(csv).toContain('Report Title');
  });

  it('exportToCSV with explicit columns', () => {
    const report = { title: 'R', data: [{ a: 1, b: 2, c: 3 }] };
    const csv = service.exportToCSV(report, 'f.csv', { columns: ['a', 'c'] });
    expect(csv).toContain('a,c');
    expect(csv).not.toContain('b');
  });

  it('exportToCSV fallback when no data', () => {
    const report = { title: 'R', summary: { total: 5 } };
    const csv = service.exportToCSV(report, 'f.csv');
    expect(csv).toContain('Report Summary');
  });

  it('exportToCSV data rows included', () => {
    const report = {
      data: [
        { x: 10, y: 20 },
        { x: 30, y: 40 },
      ],
    };
    const csv = service.exportToCSV(report, 'f.csv');
    expect(csv).toContain('x,y');
    expect(csv).toContain('10,20');
  });

  it('exportToHTML contains title and summary section', () => {
    const report = { title: 'My Report', generatedAt: new Date(), summary: {}, sections: [] };
    const html = service.exportToHTML(report);
    expect(html).toContain('<h1>My Report</h1>');
    expect(html).toContain('الملخص');
  });

  it('exportToHTML renders sections', () => {
    const report = {
      title: 'R',
      generatedAt: new Date(),
      summary: {},
      sections: [{ title: 'S1', content: { x: 1 } }],
    };
    const html = service.exportToHTML(report);
    expect(html).toContain('S1');
  });

  it('exportReport defaults to pdf', () => {
    const result = service.exportReport(reportId);
    expect(result.format).toBe('PDF');
  });
});

/* ═══════════════════════════════════════════════════
   11. Templates (10)
   ═══════════════════════════════════════════════════ */
describe('Templates', () => {
  it('createTemplate stores and returns template with id', () => {
    const t = service.createTemplate({ name: 'Custom', description: 'desc' });
    expect(t).toHaveProperty('id');
    expect(t.name).toBe('Custom');
  });

  it('getTemplate retrieves existing template', () => {
    const t = service.createTemplate({ name: 'X' });
    const found = service.getTemplate(t.id);
    expect(found).toBeDefined();
    expect(found.name).toBe('X');
  });

  it('getTemplate returns undefined for nonexistent', () => {
    expect(service.getTemplate('no_id')).toBeUndefined();
  });

  it('updateTemplate merges updates', () => {
    const t = service.createTemplate({ name: 'Old', version: 1 });
    const updated = service.updateTemplate(t.id, { name: 'New', extra: true });
    expect(updated.name).toBe('New');
    expect(updated.extra).toBe(true);
    expect(updated.version).toBe(1); // preserved
  });

  it('updateTemplate returns null for nonexistent', () => {
    expect(service.updateTemplate('nope', { name: 'X' })).toBeNull();
  });

  it('deleteTemplate removes from map', () => {
    const t = service.createTemplate({ name: 'Del' });
    expect(service.deleteTemplate(t.id)).toBe(true);
    expect(service.getTemplate(t.id)).toBeUndefined();
  });

  it('deleteTemplate returns false for nonexistent', () => {
    expect(service.deleteTemplate('nope')).toBe(false);
  });

  it('listTemplates returns array', () => {
    const list = service.listTemplates();
    expect(Array.isArray(list)).toBe(true);
  });

  it('listTemplates includes defaults', () => {
    const list = service.listTemplates();
    expect(list.length).toBeGreaterThanOrEqual(4);
  });

  it('listTemplates includes newly created template', () => {
    service.createTemplate({ name: 'Extra' });
    const list = service.listTemplates();
    expect(list.some(t => t.name === 'Extra')).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════
   12. Validate Template (8)
   ═══════════════════════════════════════════════════ */
describe('validateTemplate', () => {
  const valid = { name: 'T', description: 'D', format: 'html', sections: [{ type: 'text' }] };

  it('valid template returns valid:true', () => {
    const r = service.validateTemplate(valid);
    expect(r.valid).toBe(true);
    expect(r.errors).toBeUndefined();
  });

  it('missing name', () => {
    const r = service.validateTemplate({ ...valid, name: '' });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('name is required');
  });

  it('missing description', () => {
    const r = service.validateTemplate({ ...valid, description: '' });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('description is required');
  });

  it('missing format', () => {
    const r = service.validateTemplate({ ...valid, format: '' });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('format is required');
  });

  it('missing sections', () => {
    const r = service.validateTemplate({ ...valid, sections: undefined });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('sections is required');
  });

  it('empty sections array', () => {
    const r = service.validateTemplate({ ...valid, sections: [] });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('At least one section is required');
  });

  it('non-array sections', () => {
    const r = service.validateTemplate({ ...valid, sections: 'bad' });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('sections must be an array');
  });

  it('null template', () => {
    const r = service.validateTemplate(null);
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('Invalid template object');
  });
});

/* ═══════════════════════════════════════════════════
   13. Email (3)
   ═══════════════════════════════════════════════════ */
describe('emailReport', () => {
  const report = { title: 'R' };

  it('returns success with recipients', () => {
    const res = service.emailReport(report, {
      recipients: ['a@b.com', 'c@d.com'],
      subject: 'Test',
    });
    expect(res.success).toBe(true);
    expect(res.status).toBe('sent');
    expect(res.recipientCount).toBe(2);
    expect(res.recipients).toEqual(['a@b.com', 'c@d.com']);
    expect(res.subject).toBe('Test');
  });

  it('returns empty recipients when none provided', () => {
    const res = service.emailReport(report);
    expect(res.recipientCount).toBe(0);
    expect(res.recipients).toEqual([]);
  });

  it('uses default subject "Report" when not specified', () => {
    const res = service.emailReport(report, {});
    expect(res.subject).toBe('Report');
  });
});

/* ═══════════════════════════════════════════════════
   14. History (8)
   ═══════════════════════════════════════════════════ */
describe('History', () => {
  it('saveToHistory stores report and returns with historyId', () => {
    const res = service.saveToHistory({ title: 'Saved' });
    expect(res).toHaveProperty('historyId');
    expect(res).toHaveProperty('id');
    expect(res.title).toBe('Saved');
  });

  it('getReportFromHistory retrieves saved report', () => {
    const res = service.saveToHistory({ title: 'H' });
    const found = service.getReportFromHistory(res.historyId);
    expect(found).toBeDefined();
    expect(found.id).toBe(res.historyId);
  });

  it('getReportFromHistory returns undefined for nonexistent', () => {
    expect(service.getReportFromHistory('nope')).toBeUndefined();
  });

  it('getReportHistory returns all reports', () => {
    const a = service.saveToHistory({ title: 'A' });
    // manually insert second entry with distinct key to avoid Date.now() collision
    const bId = a.historyId + '_b';
    service.reports.set(bId, { title: 'B', id: bId });
    const all = service.getReportHistory();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it('deleteFromHistory removes report', () => {
    const res = service.saveToHistory({ title: 'Del' });
    expect(service.deleteFromHistory(res.historyId)).toBe(true);
    expect(service.getReportFromHistory(res.historyId)).toBeUndefined();
  });

  it('clearCache clears all reports and returns count', () => {
    const a = service.saveToHistory({ title: 'A' });
    service.reports.set(a.historyId + '_b', { title: 'B' });
    const result = service.clearCache();
    expect(result.cleared).toBeGreaterThanOrEqual(2);
    expect(service.reports.size).toBe(0);
  });

  it('clearCache returns cleared:0 when empty', () => {
    const result = service.clearCache();
    expect(result.cleared).toBe(0);
  });

  it('getFromHistory is an alias that reads from reports Map', () => {
    const res = service.saveToHistory({ title: 'Alias' });
    const found = service.getFromHistory(res.historyId);
    expect(found).toBeDefined();
    expect(found.id).toBe(res.historyId);
  });
});

/* ═══════════════════════════════════════════════════
   15. Aggregation (12)
   ═══════════════════════════════════════════════════ */
describe('Aggregation', () => {
  const data = [
    { category: 'A', amount: 100 },
    { category: 'A', amount: 200 },
    { category: 'B', amount: 50 },
    { category: 'B', amount: 150 },
  ];

  it('aggregate sum', () => {
    expect(service.aggregate(data, { type: 'sum', field: 'amount' })).toBe(500);
  });

  it('aggregate avg', () => {
    expect(service.aggregate(data, { type: 'avg', field: 'amount' })).toBe(125);
  });

  it('aggregate count', () => {
    expect(service.aggregate(data, { type: 'count' })).toBe(4);
  });

  it('aggregate min', () => {
    expect(service.aggregate(data, { type: 'min', field: 'amount' })).toBe(50);
  });

  it('aggregate max', () => {
    expect(service.aggregate(data, { type: 'max', field: 'amount' })).toBe(200);
  });

  it('aggregate returns 0 for empty data', () => {
    expect(service.aggregate([], { type: 'sum', field: 'amount' })).toBe(0);
  });

  it('aggregate returns 0 for null data', () => {
    expect(service.aggregate(null, { type: 'sum', field: 'amount' })).toBe(0);
  });

  it('aggregate returns 0 for unknown type', () => {
    expect(service.aggregate(data, { type: 'unknown', field: 'amount' })).toBe(0);
  });

  it('groupAndAggregate groups correctly', () => {
    const result = service.groupAndAggregate(data, {
      groupBy: 'category',
      aggregations: { total: { type: 'sum', field: 'amount' } },
    });
    expect(result).toHaveLength(2);
    const groupA = result.find(r => r.category === 'A');
    const groupB = result.find(r => r.category === 'B');
    expect(groupA.total).toBe(300);
    expect(groupB.total).toBe(200);
  });

  it('groupAndAggregate with multiple aggregations', () => {
    const result = service.groupAndAggregate(data, {
      groupBy: 'category',
      aggregations: {
        total: { type: 'sum', field: 'amount' },
        average: { type: 'avg', field: 'amount' },
        count: { type: 'count' },
      },
    });
    const groupA = result.find(r => r.category === 'A');
    expect(groupA.total).toBe(300);
    expect(groupA.average).toBe(150);
    expect(groupA.count).toBe(2);
  });

  it('groupAndAggregate returns empty when no groupBy', () => {
    expect(service.groupAndAggregate(data, {})).toEqual([]);
  });

  it('groupAndAggregate returns empty when no aggregations', () => {
    expect(service.groupAndAggregate(data, { groupBy: 'category' })).toEqual([]);
  });
});

/* ═══════════════════════════════════════════════════
   16. Chart Data (6)
   ═══════════════════════════════════════════════════ */
describe('generateChartData', () => {
  const data = [
    { month: 'Jan', sales: 100, region: 'East' },
    { month: 'Feb', sales: 200, region: 'East' },
    { month: 'Mar', sales: 150, region: 'West' },
  ];

  it('bar chart with xField/yField', () => {
    const chart = service.generateChartData(data, {
      type: 'bar',
      xField: 'month',
      yField: 'sales',
    });
    expect(chart.labels).toEqual(['Jan', 'Feb', 'Mar']);
    expect(chart.datasets[0].data).toEqual([100, 200, 150]);
    expect(chart.datasets[0].label).toBe('sales');
  });

  it('line chart with xField/yField', () => {
    const chart = service.generateChartData(data, {
      type: 'line',
      xField: 'month',
      yField: 'sales',
    });
    expect(chart.labels).toEqual(['Jan', 'Feb', 'Mar']);
    expect(chart.datasets[0].data).toEqual([100, 200, 150]);
  });

  it('pie chart groups by field', () => {
    const chart = service.generateChartData(data, { type: 'pie', field: 'region' });
    expect(chart.labels).toContain('East');
    expect(chart.labels).toContain('West');
    expect(chart.datasets[0].data).toContain(2); // East count
    expect(chart.datasets[0].data).toContain(1); // West count
  });

  it('returns title and legend from options', () => {
    const chart = service.generateChartData(data, {
      type: 'bar',
      xField: 'month',
      yField: 'sales',
      title: 'Sales',
      legend: true,
    });
    expect(chart.title).toBe('Sales');
    expect(chart.legend).toBe(true);
  });

  it('returns empty labels/datasets when no matching config', () => {
    const chart = service.generateChartData(data, { type: 'bar' });
    // xField/yField not provided, so datasets stay empty
    expect(chart.labels).toEqual([]);
    expect(chart.datasets).toEqual([]);
  });

  it('empty options returns default structure', () => {
    const chart = service.generateChartData(data, {});
    expect(chart).toHaveProperty('labels');
    expect(chart).toHaveProperty('datasets');
  });
});

/* ═══════════════════════════════════════════════════
   17. Helpers (10)
   ═══════════════════════════════════════════════════ */
describe('Helpers', () => {
  it('calculateDuration returns minutes', () => {
    const mins = service.calculateDuration('2024-01-01T00:00:00Z', '2024-01-01T01:30:00Z');
    expect(mins).toBe(90);
  });

  it('calculateDuration returns 0 when startDate missing', () => {
    expect(service.calculateDuration(null, '2024-01-01')).toBe(0);
  });

  it('calculateDuration returns 0 when endDate missing', () => {
    expect(service.calculateDuration('2024-01-01', null)).toBe(0);
  });

  it('calculateAverageDuration with completed items returns hours', () => {
    const data = [
      {
        status: 'completed',
        createdAt: '2024-01-01T00:00:00Z',
        completedAt: '2024-01-01T02:00:00Z',
      },
      {
        status: 'completed',
        createdAt: '2024-01-01T00:00:00Z',
        completedAt: '2024-01-01T04:00:00Z',
      },
    ];
    const avg = service.calculateAverageDuration(data);
    expect(avg).toBe(3); // (2+4)/2
  });

  it('calculateAverageDuration returns 0 when no completed items', () => {
    expect(service.calculateAverageDuration([{ status: 'pending' }])).toBe(0);
  });

  it('calculateAverage returns string with 2 decimals', () => {
    const data = [{ score: 10 }, { score: 20 }, { score: 30 }];
    const avg = service.calculateAverage(data, 'score');
    expect(avg).toBe('20.00');
  });

  it('findTopPerformer returns item with highest score', () => {
    const data = [{ score: 50 }, { score: 90 }, { score: 70 }];
    const top = service.findTopPerformer(data);
    expect(top.score).toBe(90);
  });

  it('findImprovementAreas returns lowest 5 by score', () => {
    const data = Array.from({ length: 10 }, (_, i) => ({ score: (i + 1) * 10 }));
    const areas = service.findImprovementAreas(data);
    expect(areas).toHaveLength(5);
    expect(areas[0].score).toBe(10);
    expect(areas[4].score).toBe(50);
  });

  it('getChartTitle returns Arabic for known types', () => {
    expect(service.getChartTitle('pie', 'x')).toBe('توزيع النسب المئوية');
    expect(service.getChartTitle('bar', 'x')).toBe('مقارنة الأعمدة');
  });

  it('getChartTitle returns chartType string when unknown', () => {
    expect(service.getChartTitle('unknown', 'x')).toBe('unknown');
  });
});

/* ═══════════════════════════════════════════════════
   18. HTML / CSV Generation (8)
   ═══════════════════════════════════════════════════ */
describe('_generateHtmlContent', () => {
  it('renders title in h1', () => {
    const html = service._generateHtmlContent({ name: 'Hello' }, []);
    expect(html).toContain('<h1>Hello</h1>');
  });

  it('renders description in p', () => {
    const html = service._generateHtmlContent({ name: 'T', description: 'Desc' }, []);
    expect(html).toContain('<p>Desc</p>');
  });

  it('renders title section', () => {
    const tpl = { sections: [{ type: 'title', content: 'Heading' }] };
    const html = service._generateHtmlContent(tpl, []);
    expect(html).toContain('<h2>Heading</h2>');
  });

  it('renders summary section with fields', () => {
    const tpl = { sections: [{ type: 'summary', fields: ['name'] }] };
    const data = [{ name: 'Alice' }, { name: 'Bob' }];
    const html = service._generateHtmlContent(tpl, data);
    expect(html).toContain('Summary');
    expect(html).toContain('Alice');
    expect(html).toContain('Bob');
  });

  it('renders table section with columns', () => {
    const tpl = { sections: [{ type: 'table', columns: ['id', 'val'] }] };
    const data = [{ id: 1, val: 'X' }];
    const html = service._generateHtmlContent(tpl, data);
    expect(html).toContain('<th>id</th>');
    expect(html).toContain('<td>1</td>');
    expect(html).toContain('<td>X</td>');
  });

  it('auto-table when no sections provided', () => {
    const data = [{ a: 1, b: 2 }];
    const html = service._generateHtmlContent({}, data);
    expect(html).toContain('<th>a</th>');
    expect(html).toContain('<td>1</td>');
  });

  it('returns "No data available" when empty data and no sections', () => {
    const html = service._generateHtmlContent({}, []);
    expect(html).toContain('No data available');
  });
});

describe('_generateCsvContent', () => {
  it('renders CSV with headers and values', () => {
    const data = [{ name: 'Alice', age: 30 }];
    const csv = service._generateCsvContent({}, data);
    expect(csv).toContain('name,age');
    expect(csv).toContain('Alice,30');
  });

  it('returns fallback for empty data', () => {
    const csv = service._generateCsvContent({}, []);
    expect(csv).toBe('name,value\ndata,1\n');
  });

  it('quotes values containing commas', () => {
    const data = [{ desc: 'hello, world', val: 42 }];
    const csv = service._generateCsvContent({}, data);
    expect(csv).toContain('"hello, world"');
  });
});

/* ═══════════════════════════════════════════════════
   19. Additional edge-case coverage
   ═══════════════════════════════════════════════════ */
describe('Additional edge cases', () => {
  it('generateOverview returns description and period', () => {
    const o = service.generateOverview([{ a: 1 }, { a: 2 }]);
    expect(o.description).toContain('2');
    expect(o).toHaveProperty('period');
  });

  it('generateDetailedAnalysis returns correct shape', () => {
    const a = service.generateDetailedAnalysis([{ x: 1 }], 'test');
    expect(a.analyzed).toBe(1);
    expect(a.template_type).toBe('test');
    expect(a).toHaveProperty('analyzed_at');
  });

  it('generateTrends returns fixed values', () => {
    const t = service.generateTrends([]);
    expect(t.trend).toBe('صاعد');
    expect(t.change_percent).toBe('+5.2%');
    expect(t.analyzed_period).toBe('الشهر الماضي');
  });

  it('generateComparisons returns fixed values', () => {
    const c = service.generateComparisons([], 'test');
    expect(c.compared_to).toBe('الفترة السابقة');
    expect(c.performance).toBe('أفضل');
    expect(c.improvement).toBe('+12%');
  });

  it('prepareChartData returns labels and datasets', () => {
    const cd = service.prepareChartData([{ value: 5 }], 'bar');
    expect(cd).toHaveProperty('labels');
    expect(cd).toHaveProperty('datasets');
    expect(cd.datasets[0].data).toEqual([5]);
  });

  it('getChartOptions returns responsive options', () => {
    const opts = service.getChartOptions('pie');
    expect(opts.responsive).toBe(true);
    expect(opts.plugins.legend.display).toBe(true);
  });

  it('pauseSchedule returns undefined for nonexistent', () => {
    expect(service.pauseSchedule('none')).toBeUndefined();
  });

  it('resumeSchedule returns undefined for nonexistent', () => {
    expect(service.resumeSchedule('none')).toBeUndefined();
  });

  it('deleteSchedule returns false for nonexistent', () => {
    expect(service.deleteSchedule('none')).toBe(false);
  });

  it('calculateNextRun default case falls to +1 day', () => {
    const now = Date.now();
    const next = service.calculateNextRun('custom-unknown');
    expect(next.getTime() - now).toBeLessThanOrEqual(25 * 60 * 60 * 1000);
    expect(next.getTime()).toBeGreaterThan(now);
  });

  it('emailReport returns emailId and messageId', () => {
    const res = service.emailReport({}, { recipients: ['x@y.z'] });
    expect(res).toHaveProperty('emailId');
    expect(res).toHaveProperty('messageId');
    expect(res).toHaveProperty('sentAt');
  });

  it('generateReport with chart section in HTML', () => {
    const tpl = {
      name: 'Chart TPL',
      format: 'html',
      sections: [{ type: 'chart', field: 'value' }],
    };
    const r = service.generateReport(tpl, [{ value: 1 }]);
    expect(r.content).toContain('Chart');
  });

  it('findTopPerformer returns null for empty array', () => {
    expect(service.findTopPerformer([])).toBeNull();
  });

  it('findImprovementAreas returns all when fewer than 5', () => {
    const data = [{ score: 10 }, { score: 20 }];
    const areas = service.findImprovementAreas(data);
    expect(areas).toHaveLength(2);
  });
});
