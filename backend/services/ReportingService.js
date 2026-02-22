/**
 * Advanced Reporting Service
 * PDF export, scheduled reports, email delivery, custom queries
 * Created: February 22, 2026
 */

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { format } = require('date-fns');
const path = require('path');

/**
 * Report Template class
 * Defines report structure, fields, and formatting
 */
class ReportTemplate {
  constructor(name, type, title, description, fields, options = {}) {
    this.id = `template_${Date.now()}`;
    this.name = name;
    this.type = type; // 'sales', 'inventory', 'financial', 'users', 'custom'
    this.title = title;
    this.description = description;
    this.fields = fields; // Column definitions
    this.options = {
      includeCharts: options.includeCharts || false,
      includeSummary: options.includeSummary || true,
      pageSize: options.pageSize || 'A4',
      orientation: options.orientation || 'portrait',
      ...options,
    };
    this.createdAt = new Date();
  }

  /**
   * Validate data against template fields
   */
  validateData(data) {
    const errors = [];

    if (!Array.isArray(data)) {
      errors.push('Data must be an array');
    }

    if (data.length === 0) {
      errors.push('Data cannot be empty');
    }

    // Validate columns exist in first row
    if (data.length > 0) {
      const firstRow = data[0];
      const missingFields = this.fields.filter(
        (f) => !(f.key in firstRow) && !f.optional
      );

      if (missingFields.length > 0) {
        errors.push(
          `Missing required fields: ${missingFields.map((f) => f.key).join(', ')}`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Report Generator
 * Generates PDF, Excel, CSV reports from data
 */
class ReportGenerator {
  constructor(template) {
    if (!(template instanceof ReportTemplate)) {
      throw new Error('Template must be ReportTemplate instance');
    }
    this.template = template;
  }

  /**
   * Generate PDF report
   */
  async generatePDF(data, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const validation = this.template.validateData(data);
        if (!validation.valid) {
          throw new Error(validation.errors.join('; '));
        }

        const doc = new PDFDocument({
          size: this.template.options.pageSize,
          margin: 40,
        });

        // Collect PDF data
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve({
            success: true,
            format: 'pdf',
            buffer: pdfBuffer,
            size: pdfBuffer.length,
            filename: `${this.template.name}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.pdf`,
          });
        });
        doc.on('error', reject);

        // Add content
        this._addPDFHeader(doc);
        this._addPDFTable(doc, data);
        this._addPDFSummary(doc, data);
        this._addPDFFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate Excel report
   */
  async generateExcel(data, options = {}) {
    try {
      const validation = this.template.validateData(data);
      if (!validation.valid) {
        throw new Error(validation.errors.join('; '));
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(this.template.name);

      // Add header
      const columns = this.template.fields.map((f) => ({
        header: f.label || f.key,
        key: f.key,
        width: f.width || 15,
      }));

      worksheet.columns = columns;

      // Style header
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF366092' },
      };

      // Add data rows
      data.forEach((row) => {
        worksheet.addRow(row);
      });

      // Auto-fit columns
      worksheet.columns.forEach((col) => {
        let maxLength = 0;
        col.eachCell?.({ includeEmpty: true }, (cell) => {
          const cellLength = cell.value?.toString().length || 0;
          if (cellLength > maxLength) {
            maxLength = cellLength;
          }
        });
        col.width = Math.min(maxLength + 2, 50);
      });

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();

      return {
        success: true,
        format: 'excel',
        buffer,
        size: buffer.length,
        filename: `${this.template.name}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.xlsx`,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate CSV report
   */
  async generateCSV(data, options = {}) {
    try {
      const validation = this.template.validateData(data);
      if (!validation.valid) {
        throw new Error(validation.errors.join('; '));
      }

      // Build CSV
      const headers = this.template.fields.map((f) => f.label || f.key);
      const rows = data.map((row) =>
        this.template.fields.map((f) => {
          const value = row[f.key];
          const stringValue = String(value || '');
          // Escape quotes and wrap if contains comma
          return stringValue.includes(',')
            ? `"${stringValue.replace(/"/g, '""')}"`
            : stringValue;
        })
      );

      const csv =
        [headers.join(',')].concat(rows.map((r) => r.join(','))).join('\n') +
        '\n';

      return {
        success: true,
        format: 'csv',
        buffer: Buffer.from(csv, 'utf-8'),
        size: Buffer.from(csv, 'utf-8').length,
        filename: `${this.template.name}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add PDF header
   */
  _addPDFHeader(doc) {
    doc.fontSize(18).font('Helvetica-Bold').text(this.template.title, { align: 'center' });

    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(this.template.description || '', { align: 'center' });

    doc.moveDown(0.3);
    doc
      .fontSize(9)
      .text(`Generated: ${format(new Date(), 'PPPp')}`, { align: 'right' });

    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
    doc.moveDown(1);
  }

  /**
   * Add PDF table
   */
  _addPDFTable(doc, data) {
    const pageWidth =
      this.template.options.pageSize === 'A4' ? 595 : 612;
    const availableWidth = pageWidth - 80;

    const columns = this.template.fields;
    const columnWidth = availableWidth / columns.length;

    // Table header
    const startX = 40;
    let currentY = doc.y;

    doc.fontSize(10).font('Helvetica-Bold');
    columns.forEach((col, i) => {
      doc.text(col.label || col.key, startX + i * columnWidth, currentY, {
        width: columnWidth,
      });
    });

    currentY += 15;
    doc
      .moveTo(startX, currentY)
      .lineTo(startX + availableWidth, currentY)
      .stroke();
    currentY += 5;

    // Table rows
    doc.fontSize(9).font('Helvetica');
    data.slice(0, 100).forEach((row) => {
      // Limit to 100 rows per page
      let maxHeight = 15;

      columns.forEach((col) => {
        const value = row[col.key] || '';
        const wrappedText = doc.heightOfString(String(value), {
          width: columnWidth - 5,
        });
        maxHeight = Math.max(maxHeight, wrappedText);
      });

      // Check if we need new page
      if (currentY + maxHeight > doc.page.height - 50) {
        doc.addPage();
        currentY = 40;
      }

      columns.forEach((col, i) => {
        const value = row[col.key] || '';
        doc.text(String(value), startX + i * columnWidth + 2, currentY, {
          width: columnWidth - 5,
        });
      });

      currentY += maxHeight + 5;
    });

    doc.moveDown(1);
  }

  /**
   * Add PDF summary
   */
  _addPDFSummary(doc, data) {
    if (!this.template.options.includeSummary) return;

    doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fontSize(12).font('Helvetica-Bold').text('Summary', { underline: true });

    doc.fontSize(10).font('Helvetica');
    doc.text(`Total Records: ${data.length}`);
    doc.text(`Report Generated: ${format(new Date(), 'PPPp')}`);

    doc.moveDown();
  }

  /**
   * Add PDF footer
   */
  _addPDFFooter(doc) {
    const footerY = doc.page.height - 30;
    doc.fontSize(8).text('AlAwael ERP System', 40, footerY);
    doc.text(`Page ${doc.bufferedPageRange().count}`, doc.page.width - 100, footerY);
  }
}

/**
 * Report Scheduler
 * Manages scheduled report generation and delivery
 */
class ReportScheduler {
  constructor() {
    this.schedules = new Map();
    this.executedReports = [];
  }

  /**
   * Schedule report generation
   */
  scheduleReport(reportId, config) {
    const schedule = {
      id: reportId,
      ...config,
      createdAt: new Date(),
      lastRun: null,
      nextRun: this._calculateNextRun(config.frequency, config.time),
      enabled: true,
      runCount: 0,
      failureCount: 0,
    };

    this.schedules.set(reportId, schedule);
    return schedule;
  }

  /**
   * Get scheduled reports
   */
  getScheduledReports(filter = {}) {
    let reports = Array.from(this.schedules.values());

    if (filter.enabled !== undefined) {
      reports = reports.filter((r) => r.enabled === filter.enabled);
    }

    if (filter.template) {
      reports = reports.filter((r) => r.templateName === filter.template);
    }

    return reports;
  }

  /**
   * Execute scheduled report
   */
  async executeReport(reportId, generator, dataFn) {
    try {
      const schedule = this.schedules.get(reportId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      // Get data
      const data = await dataFn();

      // Generate report
      const report = await generator.generatePDF(data);

      // Update schedule
      schedule.lastRun = new Date();
      schedule.nextRun = this._calculateNextRun(
        schedule.frequency,
        schedule.time
      );
      schedule.runCount++;

      // Track execution
      const execution = {
        scheduledReportId: reportId,
        timestamp: new Date(),
        success: true,
        filename: report.filename,
        size: report.size,
        recipientCount: schedule.recipients?.length || 0,
      };

      this.executedReports.push(execution);

      return {
        success: true,
        report,
        schedule,
      };
    } catch (error) {
      const schedule = this.schedules.get(reportId);
      if (schedule) {
        schedule.failureCount++;
      }

      this.executedReports.push({
        scheduledReportId: reportId,
        timestamp: new Date(),
        success: false,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Calculate next run time
   */
  _calculateNextRun(frequency, time) {
    const now = new Date();

    switch (frequency) {
      case 'daily':
        const daily = new Date(now);
        const [hours, minutes] = time.split(':').map(Number);
        daily.setHours(hours, minutes, 0, 0);
        if (daily < now) {
          daily.setDate(daily.getDate() + 1);
        }
        return daily;

      case 'weekly':
        const weekly = new Date(now);
        weekly.setDate(weekly.getDate() + 7); // TODO: handle day of week
        return weekly;

      case 'monthly':
        const monthly = new Date(now);
        monthly.setMonth(monthly.getMonth() + 1);
        return monthly;

      default:
        return null;
    }
  }
}

/**
 * Report Builder
 * Fluent API for building custom reports
 */
class ReportBuilder {
  constructor(name) {
    this.name = name;
    this.title = name;
    this.description = '';
    this.fields = [];
    this.filters = [];
    this.sorts = [];
    this.options = {};
  }

  setTitle(title) {
    this.title = title;
    return this;
  }

  setDescription(description) {
    this.description = description;
    return this;
  }

  addField(key, label, options = {}) {
    this.fields.push({
      key,
      label,
      width: options.width || 15,
      format: options.format,
      optional: options.optional || false,
    });
    return this;
  }

  addFilter(field, operator, value) {
    this.filters.push({ field, operator, value });
    return this;
  }

  addSort(field, direction = 'ASC') {
    this.sorts.push({ field, direction });
    return this;
  }

  setOption(key, value) {
    this.options[key] = value;
    return this;
  }

  build() {
    return new ReportTemplate(
      this.name,
      'custom',
      this.title,
      this.description,
      this.fields,
      this.options
    );
  }
}

/**
 * Advanced Reporting Service
 * Unified interface for all reporting operations
 */
class ReportingService {
  constructor() {
    this.templates = new Map();
    this.scheduler = new ReportScheduler();
    this.generatedReports = [];
  }

  /**
   * Register report template
   */
  registerTemplate(template) {
    if (!(template instanceof ReportTemplate)) {
      throw new Error('Template must be ReportTemplate instance');
    }
    this.templates.set(template.name, template);
    return template;
  }

  /**
   * Get template
   */
  getTemplate(name) {
    return this.templates.get(name);
  }

  /**
   * Generate report in specified format
   */
  async generateReport(templateName, data, format = 'pdf') {
    try {
      const template = this.getTemplate(templateName);
      if (!template) {
        throw new Error(`Template not found: ${templateName}`);
      }

      const generator = new ReportGenerator(template);

      let result;
      switch (format.toLowerCase()) {
        case 'pdf':
          result = await generator.generatePDF(data);
          break;
        case 'excel':
        case 'xlsx':
          result = await generator.generateExcel(data);
          break;
        case 'csv':
          result = await generator.generateCSV(data);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      const report = {
        id: `report_${Date.now()}`,
        template: templateName,
        format,
        filename: result.filename,
        size: result.size,
        buffer: result.buffer,
        generatedAt: new Date(),
        recordCount: data.length,
      };

      this.generatedReports.push(report);
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create custom report builder
   */
  builder(name) {
    return new ReportBuilder(name);
  }

  /**
   * Schedule report
   */
  scheduleReport(reportId, config) {
    return this.scheduler.scheduleReport(reportId, config);
  }

  /**
   * Get report history
   */
  getReportHistory(limit = 50) {
    return this.generatedReports.slice(-limit);
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const byFormat = {};
    const byTemplate = {};

    this.generatedReports.forEach((report) => {
      byFormat[report.format] = (byFormat[report.format] || 0) + 1;
      byTemplate[report.template] = (byTemplate[report.template] || 0) + 1;
    });

    return {
      totalReports: this.generatedReports.length,
      totalSize: this.generatedReports.reduce((sum, r) => sum + r.size, 0),
      byFormat,
      byTemplate,
      scheduledReports: this.scheduler.schedules.size,
      templates: this.templates.size,
    };
  }
}

module.exports = {
  ReportingService,
  ReportTemplate,
  ReportGenerator,
  ReportScheduler,
  ReportBuilder,
};
