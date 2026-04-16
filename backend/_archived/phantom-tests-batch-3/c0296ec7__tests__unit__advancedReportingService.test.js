/**
 * Unit tests — advancedReportingService.js
 * Class constructor (module.exports = AdvancedReportingService), in-memory state
 */
'use strict';

const AdvancedReportingService = require('../../services/advancedReportingService');

let svc;

beforeEach(() => {
  svc = new AdvancedReportingService();
});

/* ================================================================ */
describe('AdvancedReportingService', () => {
  /* ── constructor ─────────────────────────────────────────────── */
  describe('constructor', () => {
    it('initializes maps', () => {
      expect(svc.reports).toBeInstanceOf(Map);
      expect(svc.schedules).toBeInstanceOf(Map);
    });

    it('initializes 4 default templates', () => {
      expect(svc.templates.size).toBe(4);
    });
  });

  /* ── generateReport ──────────────────────────────────────────── */
  describe('generateReport', () => {
    const template = { name: 'تقرير اختبار', format: 'html' };

    it('generates html report with statistics', () => {
      const data = [{ value: 80 }, { value: 90 }];
      const res = svc.generateReport(template, data);
      expect(res.content).toContain('<');
      expect(res.statistics.count).toBe(2);
      expect(res.statistics.average).toBe(85);
    });

    it('generates csv report', () => {
      const t = { name: 'csv', format: 'csv' };
      const res = svc.generateReport(t, [{ name: 'أحمد', value: 80 }]);
      expect(res.content).toContain('name');
    });

    it('stores report in map', () => {
      svc.generateReport(template, [{ value: 1 }]);
      expect(svc.reports.size).toBe(1);
    });

    it('applies filters', () => {
      const data = [
        { status: 'active', value: 10 },
        { status: 'inactive', value: 5 },
      ];
      const res = svc.generateReport(template, data, {
        filters: [{ field: 'status', operator: 'equals', value: 'active' }],
      });
      expect(res.statistics.count).toBe(1);
    });

    it('handles empty data', () => {
      const res = svc.generateReport(template, []);
      expect(res.statistics.count).toBe(0);
    });

    it('returns error for null template', () => {
      const res = svc.generateReport(null, []);
      expect(res.error).toBeDefined();
    });

    it('returns error for non-array data', () => {
      const res = svc.generateReport(template, 'bad');
      expect(res.error).toBeDefined();
    });
  });

  /* ── generateSummary ─────────────────────────────────────────── */
  describe('generateSummary', () => {
    it('generates workflow-summary', () => {
      const data = [{ status: 'completed' }, { status: 'pending' }];
      const res = svc.generateSummary(data, 'workflow-summary');
      expect(res.keyMetrics.completed).toBe(1);
      expect(res.keyMetrics.pending).toBe(1);
    });

    it('generates financial summary', () => {
      const data = [{ income: 1000, expense: 400 }];
      const res = svc.generateSummary(data, 'financial');
      expect(res.keyMetrics.totalIncome).toBe(1000);
      expect(res.keyMetrics.balance).toBe(600);
    });

    it('generates hr-analytics summary', () => {
      const data = [{ employee: 'E1', attendance: 95, leaves: 2, performance: 80 }];
      const res = svc.generateSummary(data, 'hr-analytics');
      expect(res.keyMetrics.totalEmployees).toBe(1);
    });

    it('falls back to generic', () => {
      const res = svc.generateSummary([{ x: 1 }], 'unknown');
      expect(res.keyMetrics.totalRecords).toBe(1);
    });
  });

  /* ── calculateStatistics ─────────────────────────────────────── */
  describe('calculateStatistics', () => {
    it('computes count/average/median/stdDev/min/max', () => {
      const data = [{ value: 10 }, { value: 20 }, { value: 30 }];
      const s = svc.calculateStatistics(data);
      expect(s.count).toBe(3);
      expect(s.average).toBe(20);
      expect(s.median).toBe(20);
      expect(s.min).toBe(10);
      expect(s.max).toBe(30);
      expect(s.standardDeviation).toBeGreaterThan(0);
    });

    it('handles empty data', () => {
      const s = svc.calculateStatistics([]);
      expect(s.count).toBe(0);
    });
  });

  /* ── scheduleReport ──────────────────────────────────────────── */
  describe('scheduleReport', () => {
    it('creates scheduled report', () => {
      const res = svc.scheduleReport({ frequency: 'daily' });
      expect(res.scheduleId).toBeDefined();
      expect(svc.schedules.size).toBe(1);
    });

    it('calculates next run for daily', () => {
      const next = svc.calculateNextRun('daily');
      expect(next).toBeInstanceOf(Date);
      expect(next.getTime()).toBeGreaterThan(Date.now());
    });

    it('calculates next run for weekly', () => {
      const next = svc.calculateNextRun('weekly');
      expect(next.getTime() - Date.now()).toBeGreaterThanOrEqual(6 * 24 * 3600 * 1000);
    });

    it('calculates next run for monthly', () => {
      const next = svc.calculateNextRun('monthly');
      expect(next.getTime()).toBeGreaterThan(Date.now());
    });

    it('calculates next run for quarterly', () => {
      const next = svc.calculateNextRun('quarterly');
      expect(next.getTime() - Date.now()).toBeGreaterThanOrEqual(80 * 24 * 3600 * 1000);
    });

    it('calculates next run for yearly', () => {
      const next = svc.calculateNextRun('yearly');
      expect(next.getFullYear()).toBeGreaterThan(new Date().getFullYear());
    });
  });

  /* ── schedule operations ─────────────────────────────────────── */
  describe('schedule operations', () => {
    let schedId;
    beforeEach(() => {
      const r = svc.scheduleReport({ frequency: 'daily' });
      schedId = r.scheduleId;
    });

    it('getSchedule', () => {
      expect(svc.getSchedule(schedId)).toBeDefined();
    });

    it('pauseSchedule', () => {
      svc.pauseSchedule(schedId);
      expect(svc.getSchedule(schedId).status).toBe('paused');
    });

    it('resumeSchedule', () => {
      svc.pauseSchedule(schedId);
      svc.resumeSchedule(schedId);
      expect(svc.getSchedule(schedId).status).toBe('active');
    });

    it('deleteSchedule', () => {
      svc.deleteSchedule(schedId);
      expect(svc.getSchedule(schedId)).toBeUndefined();
    });
  });

  /* ── exportReport ────────────────────────────────────────────── */
  describe('exportReport', () => {
    let reportId;
    beforeEach(() => {
      const r = svc.generateReport({ name: 'test', format: 'html' }, [{ value: 1 }]);
      reportId = r.id;
    });

    it('exports as json', () => {
      const res = svc.exportReport(reportId, 'json');
      expect(typeof res).toBe('string');
      expect(JSON.parse(res).id).toBe(reportId);
    });

    it('exports as csv', () => {
      const res = svc.exportReport(reportId, 'csv');
      expect(res).toContain('value');
    });

    it('exports as html', () => {
      const res = svc.exportReport(reportId, 'html');
      expect(res).toContain('<!DOCTYPE html>');
    });

    it('exports as pdf', () => {
      const res = svc.exportReport(reportId, 'pdf');
      expect(res.format).toBe('PDF');
    });

    it('exports as excel', () => {
      const res = svc.exportReport(reportId, 'excel');
      expect(res.fileName).toContain('.xlsx');
    });

    it('returns null for missing report', () => {
      expect(svc.exportReport('nonexistent', 'json')).toBeNull();
    });
  });

  /* ── template CRUD ───────────────────────────────────────────── */
  describe('template CRUD', () => {
    it('createTemplate', () => {
      const t = svc.createTemplate({ name: 'تقرير خاص', fields: ['a'] });
      expect(t.name).toBe('تقرير خاص');
      expect(svc.templates.size).toBe(5);
    });

    it('getTemplate', () => {
      const t = svc.createTemplate({ name: 'test' });
      expect(svc.getTemplate(t.id)).toBeDefined();
    });

    it('updateTemplate', () => {
      const t = svc.createTemplate({ name: 'old' });
      svc.updateTemplate(t.id, { name: 'new' });
      expect(svc.getTemplate(t.id).name).toBe('new');
    });

    it('deleteTemplate', () => {
      const t = svc.createTemplate({ name: 'del' });
      svc.deleteTemplate(t.id);
      expect(svc.getTemplate(t.id)).toBeUndefined();
    });

    it('listTemplates', () => {
      expect(svc.listTemplates().length).toBeGreaterThanOrEqual(4);
    });
  });

  /* ── validateTemplate ────────────────────────────────────────── */
  describe('validateTemplate', () => {
    it('validates correct template', () => {
      const res = svc.validateTemplate({
        name: 'test',
        description: 'desc',
        format: 'html',
        sections: [{ type: 'title', content: 'T' }],
      });
      expect(res.valid).toBe(true);
    });

    it('rejects missing fields', () => {
      const res = svc.validateTemplate({ name: 'test' });
      expect(res.valid).toBe(false);
      expect(res.errors.length).toBeGreaterThan(0);
    });

    it('rejects null template', () => {
      expect(svc.validateTemplate(null).valid).toBe(false);
    });
  });

  /* ── aggregate ───────────────────────────────────────────────── */
  describe('aggregate', () => {
    const data = [{ v: 10 }, { v: 20 }, { v: 30 }];

    it('sum', () => {
      expect(svc.aggregate(data, { type: 'sum', field: 'v' })).toBe(60);
    });

    it('avg', () => {
      expect(svc.aggregate(data, { type: 'avg', field: 'v' })).toBe(20);
    });

    it('count', () => {
      expect(svc.aggregate(data, { type: 'count' })).toBe(3);
    });

    it('min', () => {
      expect(svc.aggregate(data, { type: 'min', field: 'v' })).toBe(10);
    });

    it('max', () => {
      expect(svc.aggregate(data, { type: 'max', field: 'v' })).toBe(30);
    });

    it('returns 0 for empty', () => {
      expect(svc.aggregate([], { type: 'sum', field: 'v' })).toBe(0);
    });
  });

  /* ── groupAndAggregate ───────────────────────────────────────── */
  describe('groupAndAggregate', () => {
    it('groups and sums', () => {
      const data = [
        { dept: 'A', val: 10 },
        { dept: 'A', val: 20 },
        { dept: 'B', val: 5 },
      ];
      const res = svc.groupAndAggregate(data, {
        groupBy: 'dept',
        aggregations: { total: { type: 'sum', field: 'val' } },
      });
      expect(res.find(r => r.dept === 'A').total).toBe(30);
      expect(res.find(r => r.dept === 'B').total).toBe(5);
    });

    it('returns empty for missing options', () => {
      expect(svc.groupAndAggregate([], {})).toEqual([]);
    });
  });

  /* ── generateChartData ───────────────────────────────────────── */
  describe('generateChartData', () => {
    const data = [
      { label: 'A', value: 10 },
      { label: 'B', value: 20 },
    ];

    it('bar chart', () => {
      const res = svc.generateChartData(data, { type: 'bar', xField: 'label', yField: 'value' });
      expect(res.labels).toEqual(['A', 'B']);
      expect(res.datasets[0].data).toEqual([10, 20]);
    });

    it('line chart', () => {
      const res = svc.generateChartData(data, { type: 'line', xField: 'label', yField: 'value' });
      expect(res.labels).toEqual(['A', 'B']);
    });

    it('pie chart', () => {
      const pieData = [{ category: 'X' }, { category: 'X' }, { category: 'Y' }];
      const res = svc.generateChartData(pieData, { type: 'pie', field: 'category' });
      expect(res.labels).toContain('X');
      expect(res.labels).toContain('Y');
    });
  });

  /* ── exportToCSV ─────────────────────────────────────────────── */
  describe('exportToCSV', () => {
    it('converts report data to CSV', () => {
      const report = {
        data: [
          { x: 1, y: 2 },
          { x: 3, y: 4 },
        ],
      };
      const csv = svc.exportToCSV(report);
      expect(csv).toContain('x');
      expect(csv).toContain('1');
    });

    it('handles report with no data', () => {
      const csv = svc.exportToCSV({ summary: { total: 5 } });
      expect(csv).toContain('Report Summary');
    });
  });

  /* ── calculateDuration ───────────────────────────────────────── */
  describe('calculateDuration', () => {
    it('returns minutes diff', () => {
      const start = new Date('2025-01-01T00:00:00');
      const end = new Date('2025-01-01T01:00:00');
      expect(svc.calculateDuration(start, end)).toBe(60);
    });

    it('returns 0 for missing dates', () => {
      expect(svc.calculateDuration(null, null)).toBe(0);
    });
  });

  /* ── emailReport ─────────────────────────────────────────────── */
  describe('emailReport', () => {
    it('returns email result with success', () => {
      const res = svc.emailReport(
        { title: 'Report' },
        {
          recipients: ['test@test.com'],
          subject: 'Report Email',
        }
      );
      expect(res.success).toBe(true);
      expect(res.status).toBe('sent');
      expect(res.recipientCount).toBe(1);
    });
  });

  /* ── history / cache ─────────────────────────────────────────── */
  describe('history and cache', () => {
    it('saveToHistory and getReportHistory', () => {
      svc.saveToHistory({ title: 'Test' });
      expect(svc.getReportHistory().length).toBe(1);
    });

    it('clearCache empties reports', () => {
      svc.generateReport({ name: 'T', format: 'html' }, [{ value: 1 }]);
      const res = svc.clearCache();
      expect(res.cleared).toBeGreaterThanOrEqual(1);
      expect(svc.reports.size).toBe(0);
    });
  });

  /* ── helper methods ──────────────────────────────────────────── */
  describe('helper methods', () => {
    it('calculateAverage', () => {
      expect(Number(svc.calculateAverage([{ s: 10 }, { s: 20 }], 's'))).toBe(15);
    });

    it('findTopPerformer', () => {
      const data = [{ score: 70 }, { score: 95 }, { score: 80 }];
      expect(svc.findTopPerformer(data).score).toBe(95);
    });

    it('generateOverview', () => {
      const o = svc.generateOverview([1, 2, 3]);
      expect(o.description).toContain('3');
    });

    it('generateTrends', () => {
      expect(svc.generateTrends([]).trend).toBe('صاعد');
    });
  });
});
