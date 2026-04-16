/**
 * Unit tests for ReportingService.js — Reporting Service
 * Named exports: ReportTemplate, ReportGenerator, ReportScheduler, ReportBuilder, ReportingService.
 * Pure JS classes — no Mongoose. Mocks: pdfkit, exceljs, date-fns.
 */

/* ── Mock pdfkit as EventEmitter-like stream that fires data+end ──── */
jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => {
    const listeners = {};
    const doc = {
      fontSize: jest.fn().mockReturnThis(),
      font: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      moveDown: jest.fn().mockReturnThis(),
      moveTo: jest.fn().mockReturnThis(),
      lineTo: jest.fn().mockReturnThis(),
      stroke: jest.fn().mockReturnThis(),
      rect: jest.fn().mockReturnThis(),
      fill: jest.fn().mockReturnThis(),
      fillColor: jest.fn().mockReturnThis(),
      strokeColor: jest.fn().mockReturnThis(),
      fillAndStroke: jest.fn().mockReturnThis(),
      addPage: jest.fn().mockReturnThis(),
      heightOfString: jest.fn().mockReturnValue(15),
      widthOfString: jest.fn().mockReturnValue(50),
      save: jest.fn().mockReturnThis(),
      restore: jest.fn().mockReturnThis(),
      pipe: jest.fn().mockReturnThis(),
      y: 100,
      x: 50,
      page: { width: 595, height: 842 },
      bufferedPageRange: jest.fn().mockReturnValue({ start: 0, count: 1 }),
      on: jest.fn().mockImplementation(function (event, cb) {
        listeners[event] = cb;
        return doc;
      }),
      end: jest.fn().mockImplementation(() => {
        // Fire data then end asynchronously to resolve the PDF promise
        process.nextTick(() => {
          if (listeners.data) listeners.data(Buffer.from('pdf-chunk'));
          if (listeners.end) listeners.end();
        });
      }),
    };
    return doc;
  });
});

/* ── Mock exceljs ───────────────────────────────────────────────────── */
jest.mock('exceljs', () => {
  return {
    Workbook: jest.fn().mockImplementation(() => {
      const cells = [];
      const ws = {
        columns: [],
        addRow: jest.fn(row => {
          cells.push(row);
        }),
        getRow: jest.fn().mockReturnValue({ font: {}, fill: {}, eachCell: jest.fn() }),
      };
      // Make columns iterable with forEach + eachCell
      const origDescriptor = Object.getOwnPropertyDescriptor(ws, 'columns');
      let _cols = [];
      Object.defineProperty(ws, 'columns', {
        get() {
          return _cols;
        },
        set(val) {
          _cols = val.map(c => ({
            ...c,
            width: c.width || 15,
            eachCell: jest.fn(),
          }));
        },
        configurable: true,
      });
      return {
        addWorksheet: jest.fn().mockReturnValue(ws),
        xlsx: { writeBuffer: jest.fn().mockResolvedValue(Buffer.from('excel-data')) },
      };
    }),
  };
});

/* ── Mock date-fns ──────────────────────────────────────────────────── */
jest.mock('date-fns', () => ({
  format: jest.fn(() => '2024-01-15_120000'),
  parseISO: jest.fn(s => new Date(s)),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

/* ── SUT ────────────────────────────────────────────────────────────── */
const {
  ReportingService,
  ReportTemplate,
  ReportGenerator,
  ReportScheduler,
  ReportBuilder,
} = require('../../services/ReportingService');

beforeEach(() => jest.clearAllMocks());

/* ═══════════════════════════════════════════════════════════════════════ */
describe('ReportingService module', () => {
  /* ── ReportTemplate ──────────────────────────────────────────────── */
  describe('ReportTemplate', () => {
    test('constructs with all fields', () => {
      const fields = [{ key: 'a' }, { key: 'b' }];
      const t = new ReportTemplate('sales', 'tabular', 'Sales Report', 'Desc', fields, {});
      expect(t.name).toBe('sales');
      expect(t.type).toBe('tabular');
      expect(t.title).toBe('Sales Report');
      expect(t.fields).toHaveLength(2);
      expect(t.id).toMatch(/^template_/);
      expect(t.createdAt).toBeInstanceOf(Date);
    });

    test('validateData — returns valid for matching data', () => {
      const fields = [{ key: 'name' }, { key: 'age' }];
      const t = new ReportTemplate('test', 'tabular', 'T', 'D', fields, {});
      const result = t.validateData([{ name: 'Ali', age: 30 }]);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('validateData — invalid when not array', () => {
      const t = new ReportTemplate('test', 'tabular', 'T', 'D', [{ key: 'x' }], {});
      const result = t.validateData({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Data must be an array');
    });

    test('validateData — invalid for empty data', () => {
      const fields = [{ key: 'name' }];
      const t = new ReportTemplate('test', 'tabular', 'T', 'D', fields, {});
      const result = t.validateData([]);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Data cannot be empty');
    });

    test('validateData — invalid for missing required fields', () => {
      const fields = [{ key: 'name' }, { key: 'email' }];
      const t = new ReportTemplate('test', 'tabular', 'T', 'D', fields, {});
      const result = t.validateData([{ name: 'Ali' }]);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/Missing required fields/);
    });

    test('validateData — optional fields are not required', () => {
      const fields = [{ key: 'name' }, { key: 'notes', optional: true }];
      const t = new ReportTemplate('test', 'tabular', 'T', 'D', fields, {});
      const result = t.validateData([{ name: 'Ali' }]);
      expect(result.valid).toBe(true);
    });

    test('constructor applies default options', () => {
      const t = new ReportTemplate('t', 'custom', 'T', 'D', [], {});
      expect(t.options.pageSize).toBe('A4');
      expect(t.options.orientation).toBe('portrait');
    });
  });

  /* ── ReportGenerator ─────────────────────────────────────────────── */
  describe('ReportGenerator', () => {
    const mkFields = () => [{ key: 'name', label: 'Name' }];
    let template;
    let generator;

    beforeEach(() => {
      template = new ReportTemplate('test', 'tabular', 'Test Report', 'Desc', mkFields(), {});
      generator = new ReportGenerator(template);
    });

    test('throws if template is not ReportTemplate', () => {
      expect(() => new ReportGenerator({})).toThrow('Template must be ReportTemplate instance');
    });

    test('generateCSV — returns CSV result', async () => {
      const data = [{ name: 'Ali' }, { name: 'Sara' }];
      const result = await generator.generateCSV(data);
      expect(result.success).toBe(true);
      expect(result.format).toBe('csv');
      expect(result.buffer).toBeInstanceOf(Buffer);
      const text = result.buffer.toString();
      expect(text).toContain('Name'); // header uses label
      expect(text).toContain('Ali');
      expect(text).toContain('Sara');
    });

    test('generateCSV — escapes commas', async () => {
      const data = [{ name: 'Ali, Jr' }];
      const result = await generator.generateCSV(data);
      const text = result.buffer.toString();
      expect(text).toContain('"Ali, Jr"');
    });

    test('generateCSV — rejects empty data', async () => {
      await expect(generator.generateCSV([])).rejects.toThrow('Data cannot be empty');
    });

    test('generateExcel — returns Excel result', async () => {
      const data = [{ name: 'Ali' }];
      const result = await generator.generateExcel(data);
      expect(result.success).toBe(true);
      expect(result.format).toBe('excel');
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.filename).toMatch(/\.xlsx$/);
    });

    test('generateExcel — rejects empty data', async () => {
      await expect(generator.generateExcel([])).rejects.toThrow('Data cannot be empty');
    });

    test('generatePDF — returns PDF result', async () => {
      const data = [{ name: 'Ali' }];
      const result = await generator.generatePDF(data);
      expect(result.success).toBe(true);
      expect(result.format).toBe('pdf');
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.filename).toMatch(/\.pdf$/);
    });

    test('generatePDF — rejects empty data', async () => {
      await expect(generator.generatePDF([])).rejects.toThrow('Data cannot be empty');
    });
  });

  /* ── ReportScheduler ─────────────────────────────────────────────── */
  describe('ReportScheduler', () => {
    let scheduler;

    beforeEach(() => {
      scheduler = new ReportScheduler();
    });

    test('scheduleReport — stores schedule', () => {
      const s = scheduler.scheduleReport('r1', { frequency: 'daily', time: '09:00' });
      expect(scheduler.schedules.size).toBe(1);
      expect(s.id).toBe('r1');
      expect(s.enabled).toBe(true);
      expect(s.runCount).toBe(0);
    });

    test('getScheduledReports — returns all', () => {
      scheduler.scheduleReport('r1', { frequency: 'daily', time: '09:00' });
      scheduler.scheduleReport('r2', { frequency: 'weekly', time: '10:00' });
      const all = scheduler.getScheduledReports();
      expect(all).toHaveLength(2);
    });

    test('getScheduledReports — filters by enabled', () => {
      scheduler.scheduleReport('r1', { frequency: 'daily', time: '09:00' });
      scheduler.scheduleReport('r2', { frequency: 'weekly', time: '10:00' });
      // Disable one
      scheduler.schedules.get('r2').enabled = false;
      const enabled = scheduler.getScheduledReports({ enabled: true });
      expect(enabled).toHaveLength(1);
      expect(enabled[0].id).toBe('r1');
    });

    test('getScheduledReports — filters by template', () => {
      scheduler.scheduleReport('r1', { frequency: 'daily', time: '09:00', templateName: 'sales' });
      scheduler.scheduleReport('r2', {
        frequency: 'weekly',
        time: '10:00',
        templateName: 'inventory',
      });
      const sales = scheduler.getScheduledReports({ template: 'sales' });
      expect(sales).toHaveLength(1);
    });

    test('executeReport — calls generator and dataFn', async () => {
      scheduler.scheduleReport('r1', { frequency: 'daily', time: '09:00' });
      const template = new ReportTemplate('t', 'tabular', 'T', 'D', [{ key: 'x', label: 'X' }], {});
      const generator = new ReportGenerator(template);
      const dataFn = jest.fn().mockResolvedValue([{ x: 1 }]);
      const res = await scheduler.executeReport('r1', generator, dataFn);
      expect(dataFn).toHaveBeenCalled();
      expect(res.success).toBe(true);
      expect(res.report).toBeDefined();
    });

    test('executeReport — throws if schedule not found', async () => {
      const template = new ReportTemplate('t', 'tabular', 'T', 'D', [{ key: 'x' }], {});
      const generator = new ReportGenerator(template);
      await expect(scheduler.executeReport('missing', generator, jest.fn())).rejects.toThrow(
        'Schedule not found'
      );
    });

    test('executeReport — increments failureCount on error', async () => {
      scheduler.scheduleReport('r1', { frequency: 'daily', time: '09:00' });
      const template = new ReportTemplate('t', 'tabular', 'T', 'D', [{ key: 'x' }], {});
      const generator = new ReportGenerator(template);
      const dataFn = jest.fn().mockRejectedValue(new Error('data fail'));
      await expect(scheduler.executeReport('r1', generator, dataFn)).rejects.toThrow('data fail');
      expect(scheduler.schedules.get('r1').failureCount).toBe(1);
    });

    test('_calculateNextRun — daily returns future Date', () => {
      const next = scheduler._calculateNextRun('daily', '09:00');
      expect(next).toBeInstanceOf(Date);
    });

    test('_calculateNextRun — weekly returns future Date', () => {
      const next = scheduler._calculateNextRun('weekly', '09:00');
      expect(next).toBeInstanceOf(Date);
    });

    test('_calculateNextRun — monthly returns future Date', () => {
      const next = scheduler._calculateNextRun('monthly', '09:00');
      expect(next).toBeInstanceOf(Date);
    });

    test('_calculateNextRun — unknown frequency returns null', () => {
      const next = scheduler._calculateNextRun('yearly', '09:00');
      expect(next).toBeNull();
    });
  });

  /* ── ReportBuilder (fluent API) ──────────────────────────────────── */
  describe('ReportBuilder', () => {
    test('fluent API chains and builds ReportTemplate', () => {
      const builder = new ReportBuilder('sales');
      const result = builder
        .setTitle('Sales Report')
        .setDescription('Monthly sales')
        .addField('amount', 'Amount')
        .addField('date', 'Date')
        .addFilter('status', '==', 'active')
        .addSort('amount', 'DESC')
        .setOption('pageSize', 'A4')
        .build();
      expect(result).toBeInstanceOf(ReportTemplate);
      expect(result.name).toBe('sales');
      expect(result.title).toBe('Sales Report');
      expect(result.fields).toHaveLength(2);
      expect(result.fields[0].key).toBe('amount');
      expect(result.fields[0].label).toBe('Amount');
    });

    test('each method returns builder (chaining)', () => {
      const b = new ReportBuilder('t');
      expect(b.setTitle('X')).toBe(b);
      expect(b.setDescription('Y')).toBe(b);
      expect(b.addField('f', 'F')).toBe(b);
      expect(b.addFilter('k', '==', 'v')).toBe(b);
      expect(b.addSort('k', 'ASC')).toBe(b);
      expect(b.setOption('k', 'v')).toBe(b);
    });

    test('addField with options', () => {
      const b = new ReportBuilder('t');
      b.addField('num', 'Number', { width: 20, optional: true });
      expect(b.fields[0].width).toBe(20);
      expect(b.fields[0].optional).toBe(true);
    });
  });

  /* ── ReportingService ────────────────────────────────────────────── */
  describe('ReportingService', () => {
    let svc;

    beforeEach(() => {
      svc = new ReportingService();
    });

    test('registerTemplate — adds to templates map', () => {
      const t = new ReportTemplate('sales', 'tabular', 'Sales', 'Desc', [{ key: 'amount' }], {});
      svc.registerTemplate(t);
      expect(svc.templates.size).toBe(1);
    });

    test('registerTemplate — throws for non-Template', () => {
      expect(() => svc.registerTemplate({})).toThrow('Template must be ReportTemplate instance');
    });

    test('getTemplate — returns registered', () => {
      const t = new ReportTemplate('sales', 'tabular', 'Sales', 'Desc', [{ key: 'amount' }], {});
      svc.registerTemplate(t);
      expect(svc.getTemplate('sales')).toBe(t);
    });

    test('getTemplate — returns undefined for unregistered', () => {
      expect(svc.getTemplate('nope')).toBeUndefined();
    });

    test('generateReport — CSV format', async () => {
      const f = [{ key: 'name', label: 'Name' }];
      const t = new ReportTemplate('sales', 'tabular', 'T', 'D', f, {});
      svc.registerTemplate(t);
      const result = await svc.generateReport('sales', [{ name: 'Ali' }], 'csv');
      expect(result.success).toBe(true);
      expect(result.format).toBe('csv');
    });

    test('generateReport — Excel format', async () => {
      const f = [{ key: 'name', label: 'Name' }];
      const t = new ReportTemplate('sales', 'tabular', 'T', 'D', f, {});
      svc.registerTemplate(t);
      const result = await svc.generateReport('sales', [{ name: 'Ali' }], 'excel');
      expect(result.success).toBe(true);
      expect(result.format).toBe('excel');
    });

    test('generateReport — PDF format', async () => {
      const f = [{ key: 'name', label: 'Name' }];
      const t = new ReportTemplate('sales', 'tabular', 'T', 'D', f, {});
      svc.registerTemplate(t);
      const result = await svc.generateReport('sales', [{ name: 'Ali' }], 'pdf');
      expect(result.success).toBe(true);
      expect(result.format).toBe('pdf');
    });

    test('generateReport — throws for unknown template', async () => {
      await expect(svc.generateReport('nope', [], 'csv')).rejects.toThrow(
        'Template not found: nope'
      );
    });

    test('generateReport — throws for unsupported format', async () => {
      const f = [{ key: 'name', label: 'Name' }];
      const t = new ReportTemplate('rep', 'tabular', 'T', 'D', f, {});
      svc.registerTemplate(t);
      await expect(svc.generateReport('rep', [{ name: 'x' }], 'xml')).rejects.toThrow(
        'Unsupported format: xml'
      );
    });

    test('generateReport — pushes to generatedReports', async () => {
      const f = [{ key: 'name', label: 'Name' }];
      const t = new ReportTemplate('s', 'tabular', 'T', 'D', f, {});
      svc.registerTemplate(t);
      await svc.generateReport('s', [{ name: 'A' }], 'csv');
      expect(svc.generatedReports).toHaveLength(1);
      expect(svc.generatedReports[0].template).toBe('s');
    });

    test('builder — returns ReportBuilder', () => {
      const b = svc.builder('myrep');
      expect(b).toBeInstanceOf(ReportBuilder);
      expect(b.name).toBe('myrep');
    });

    test('scheduleReport — delegates to scheduler', () => {
      svc.scheduleReport('r1', { frequency: 'daily', time: '09:00' });
      expect(svc.scheduler.schedules.size).toBe(1);
    });

    test('getReportHistory — returns array', () => {
      const history = svc.getReportHistory(10);
      expect(Array.isArray(history)).toBe(true);
      expect(history).toHaveLength(0);
    });

    test('getStatistics — returns full stats object', () => {
      const stats = svc.getStatistics();
      expect(stats.totalReports).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.byFormat).toEqual({});
      expect(stats.byTemplate).toEqual({});
      expect(stats.scheduledReports).toBe(0);
      expect(stats.templates).toBe(0);
    });
  });
});
