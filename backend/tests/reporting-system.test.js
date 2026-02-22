/**
 * Advanced Reporting System Tests
 * Tests for PDF/Excel/CSV generation, scheduling, and templates
 * Created: February 22, 2026
 */

const {
  ReportingService,
  ReportTemplate,
  ReportGenerator,
  ReportBuilder,
} = require('../services/ReportingService');
const { initializeTemplates } = require('../config/reportTemplates');

// Mock data for testing
const mockSalesData = [
  {
    date: '2026-02-20',
    orderId: 'ORD-001',
    customer: 'Ahmed Ali',
    amount: 1500,
    quantity: 3,
    status: 'Completed',
  },
  {
    date: '2026-02-20',
    orderId: 'ORD-002',
    customer: 'Fatima Hassan',
    amount: 2500,
    quantity: 5,
    status: 'Completed',
  },
  {
    date: '2026-02-21',
    orderId: 'ORD-003',
    customer: 'Mohammed Ahmed',
    amount: 800,
    quantity: 2,
    status: 'Pending',
  },
];

const mockInventoryData = [
  {
    productId: 'PROD-001',
    productName: 'Laptop',
    sku: 'LAP-001',
    quantity: 45,
    reorderLevel: 20,
    status: 'In Stock',
    lastUpdated: '2026-02-20',
  },
  {
    productId: 'PROD-002',
    productName: 'Mouse',
    sku: 'MOU-001',
    quantity: 5,
    reorderLevel: 50,
    status: 'Low Stock',
    lastUpdated: '2026-02-21',
  },
];

describe('Advanced Reporting System', () => {
  let reportingService;
  let template;

  beforeEach(() => {
    reportingService = new ReportingService();
    initializeTemplates(reportingService);

    template = reportingService.getTemplate('sales');
  });

  describe('ReportTemplate', () => {
    it('should create a report template', () => {
      expect(template).toBeDefined();
      expect(template.name).toBe('sales');
      expect(template.type).toBe('sales');
      expect(template.title).toBe('Sales Report');
      expect(template.fields).toBeDefined();
      expect(template.fields.length).toBeGreaterThan(0);
    });

    it('should validate data structure', () => {
      const validation = template.validateData(mockSalesData);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid data', () => {
      const invalidData = [{ orderId: 'ORD-001' }]; // Missing required fields

      const validation = template.validateData(invalidData);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should reject empty data', () => {
      const validation = template.validateData([]);
      expect(validation.valid).toBe(false);
    });

    it('should reject non-array data', () => {
      const validation = template.validateData({ data: 'test' });
      expect(validation.valid).toBe(false);
    });
  });

  describe('ReportGenerator', () => {
    it('should create generator for template', () => {
      const generator = new ReportGenerator(template);
      expect(generator.template).toBe(template);
    });

    it('should generate PDF report', async () => {
      const generator = new ReportGenerator(template);
      const result = await generator.generatePDF(mockSalesData);

      expect(result.success).toBe(true);
      expect(result.format).toBe('pdf');
      expect(result.buffer).toBeDefined();
      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.filename).toContain('sales');
      expect(result.filename).toContain('.pdf');
    });

    it('should generate Excel report', async () => {
      const generator = new ReportGenerator(template);
      const result = await generator.generateExcel(mockSalesData);

      expect(result.success).toBe(true);
      expect(result.format).toBe('excel');
      expect(result.buffer).toBeDefined();
      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.filename).toContain('.xlsx');
    });

    it('should generate CSV report', async () => {
      const generator = new ReportGenerator(template);
      const result = await generator.generateCSV(mockSalesData);

      expect(result.success).toBe(true);
      expect(result.format).toBe('csv');
      expect(result.buffer).toBeDefined();
      const csv = result.buffer.toString();
      expect(csv).toContain('Date');
      expect(csv).toContain('ORD-001');
    });

    it('should validate data before generation', async () => {
      const generator = new ReportGenerator(template);

      try {
        await generator.generatePDF([]); // Empty data
        fail('Should throw error');
      } catch (error) {
        expect(error.message).toContain('empty');
      }
    });
  });

  describe('ReportBuilder', () => {
    it('should build custom template fluently', () => {
      const customTemplate = reportingService
        .builder('customSales')
        .setTitle('Custom Sales Report')
        .setDescription('Sales with custom fields')
        .addField('date', 'Date', { width: 12 })
        .addField('orderId', 'Order ID', { width: 15 })
        .addField('amount', 'Amount', { width: 15 })
        .setOption('includeSummary', true)
        .build();

      expect(customTemplate.name).toBe('customSales');
      expect(customTemplate.title).toBe('Custom Sales Report');
      expect(customTemplate.fields.length).toBe(3);
      expect(customTemplate.options.includeSummary).toBe(true);
    });

    it('should create valid template from builder', () => {
      const customTemplate = reportingService
        .builder('newReport')
        .setTitle('New Report')
        .addField('id', 'ID')
        .addField('name', 'Name')
        .build();

      const validation = customTemplate.validateData([
        { id: '1', name: 'Test' },
      ]);

      expect(validation.valid).toBe(true);
    });

    it('should register built template', () => {
      const customTemplate = reportingService
        .builder('registerTest')
        .setTitle('Register Test')
        .addField('field1', 'Field 1')
        .build();

      reportingService.registerTemplate(customTemplate);
      const retrieved = reportingService.getTemplate('registerTest');

      expect(retrieved).toBeDefined();
      expect(retrieved.name).toBe('registerTest');
    });
  });

  describe('ReportScheduler', () => {
    it('should schedule report', () => {
      const schedule = reportingService.scheduleReport('daily-sales', {
        templateName: 'sales',
        frequency: 'daily',
        time: '09:00',
        recipients: ['admin@alawael.com'],
      });

      expect(schedule.id).toBe('daily-sales');
      expect(schedule.frequency).toBe('daily');
      expect(schedule.enabled).toBe(true);
      expect(schedule.nextRun).toBeDefined();
    });

    it('should get scheduled reports', () => {
      reportingService.scheduleReport('report-1', {
        templateName: 'sales',
        frequency: 'daily',
        time: '09:00',
      });

      reportingService.scheduleReport('report-2', {
        templateName: 'inventory',
        frequency: 'weekly',
        time: '10:00',
      });

      const schedules = reportingService.scheduler.getScheduledReports();
      expect(schedules.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter scheduled reports by enabled status', () => {
      const schedule1 = reportingService.scheduleReport('active', {
        templateName: 'sales',
        frequency: 'daily',
        time: '09:00',
      });

      const schedule2 = reportingService.scheduleReport('inactive', {
        templateName: 'inventory',
        frequency: 'daily',
        time: '10:00',
      });

      schedule2.enabled = false;

      const active = reportingService.scheduler.getScheduledReports({
        enabled: true,
      });

      expect(active.length).toBeGreaterThan(0);
      expect(active.every((s) => s.enabled)).toBe(true);
    });

    it('should calculate daily next run time', () => {
      const schedule = reportingService.scheduleReport('daily-test', {
        templateName: 'sales',
        frequency: 'daily',
        time: '14:30',
        recipients: [],
      });

      expect(schedule.nextRun).toBeDefined();
      expect(schedule.nextRun).toBeInstanceOf(Date);
    });
  });

  describe('ReportingService', () => {
    it('should register and retrieve templates', () => {
      const newTemplate = new ReportTemplate(
        'test',
        'custom',
        'Test Report',
        'Test Description',
        [{ key: 'id', label: 'ID' }]
      );

      reportingService.registerTemplate(newTemplate);
      const retrieved = reportingService.getTemplate('test');

      expect(retrieved).toBeDefined();
      expect(retrieved.name).toBe('test');
    });

    it('should generate PDF report', async () => {
      const result = await reportingService.generateReport(
        'sales',
        mockSalesData,
        'pdf'
      );

      expect(result.success).toBe(true);
      expect(result.format).toBe('pdf');
      expect(result.buffer).toBeDefined();
    });

    it('should generate Excel report', async () => {
      const result = await reportingService.generateReport(
        'sales',
        mockSalesData,
        'excel'
      );

      expect(result.success).toBe(true);
      expect(result.format).toBe('excel');
    });

    it('should generate CSV report', async () => {
      const result = await reportingService.generateReport(
        'sales',
        mockSalesData,
        'csv'
      );

      expect(result.success).toBe(true);
      expect(result.format).toBe('csv');
    });

    it('should reject invalid template name', async () => {
      try {
        await reportingService.generateReport(
          'nonexistent',
          mockSalesData,
          'pdf'
        );
        fail('Should throw error');
      } catch (error) {
        expect(error.message).toContain('Template not found');
      }
    });

    it('should reject invalid format', async () => {
      try {
        await reportingService.generateReport('sales', mockSalesData, 'xml');
        fail('Should throw error');
      } catch (error) {
        expect(error.message).toContain('Unsupported format');
      }
    });

    it('should create report builder', () => {
      const builder = reportingService.builder('customReport');
      expect(builder).toBeDefined();
      expect(builder.name).toBe('customReport');
    });

    it('should get report history', async () => {
      // Generate a report first
      await reportingService.generateReport('sales', mockSalesData, 'pdf');

      const history = reportingService.getReportHistory(10);
      expect(history).toBeDefined();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should get reporting statistics', () => {
      const stats = reportingService.getStatistics();

      expect(stats).toHaveProperty('totalReports');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('byFormat');
      expect(stats).toHaveProperty('byTemplate');
      expect(stats).toHaveProperty('scheduledReports');
      expect(stats).toHaveProperty('templates');
    });
  });

  describe('Integration Tests', () => {
    it('should generate multiple format reports', async () => {
      const pdfResult = await reportingService.generateReport(
        'sales',
        mockSalesData,
        'pdf'
      );
      const excelResult = await reportingService.generateReport(
        'sales',
        mockSalesData,
        'excel'
      );
      const csvResult = await reportingService.generateReport(
        'sales',
        mockSalesData,
        'csv'
      );

      expect(pdfResult.success).toBe(true);
      expect(excelResult.success).toBe(true);
      expect(csvResult.success).toBe(true);

      const stats = reportingService.getStatistics();
      expect(stats.byFormat.pdf).toBeGreaterThan(0);
      expect(stats.byFormat.excel).toBeGreaterThan(0);
      expect(stats.byFormat.csv).toBeGreaterThan(0);
    });

    it('should schedule and track reports', () => {
      reportingService.scheduleReport('daily-sales', {
        templateName: 'sales',
        frequency: 'daily',
        time: '09:00',
        recipients: ['admin@alawael.com'],
      });

      reportingService.scheduleReport('weekly-inventory', {
        templateName: 'inventory',
        frequency: 'weekly',
        time: '14:00',
        recipients: ['manager@alawael.com', 'admin@alawael.com'],
      });

      const schedules = reportingService.scheduler.getScheduledReports();
      expect(schedules.length).toBeGreaterThanOrEqual(2);

      const stats = reportingService.getStatistics();
      expect(stats.scheduledReports).toBeGreaterThanOrEqual(2);
    });

    it('should handle multiple data types in reports', async () => {
      const result = await reportingService.generateReport(
        'inventory',
        mockInventoryData,
        'xlsx'
      );

      expect(result.success).toBe(true);
      expect(result.filename).toContain('inventory');
    });
  });
});
