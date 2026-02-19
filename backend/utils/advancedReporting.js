/**
 * Advanced Reporting System
 * نظام التقارير المتقدم
 *
 * يوفر قدرات متقدمة لإنشاء وتصدير التقارير بصيغ متعددة
 * مع تحليلات معمقة ورسوم بيانية احترافية
 */

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

/**
 * Report Generator - مولد التقارير
 * ينشئ تقارير شاملة مع رسوم بيانية وتحليلات
 */
class ReportGenerator {
  constructor() {
    this.reportsDir = path.join(__dirname, '../../reports');
    this.ensureReportsDirectory();
  }

  /**
   * إنشاء مجلد التقارير
   */
  ensureReportsDirectory() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * إنشاء تقرير PDF
   */
  async generatePDFReport(data, options = {}) {
    const {
      title = 'تقرير متقدم',
      author = 'النظام',
      includeCharts = true,
      includeAnalytics = true,
    } = options;

    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: title,
        Author: author,
        CreationDate: new Date(),
      },
    });

    const filename = `report_${Date.now()}.pdf`;
    const filepath = path.join(this.reportsDir, filename);
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Header
    doc.fontSize(24).text(title, { align: 'center' }).moveDown();

    // Metadata
    doc
      .fontSize(10)
      .text(`تاريخ الإنشاء: ${new Date().toLocaleString('ar-EG')}`, { align: 'right' })
      .text(`الكاتب: ${author}`, { align: 'right' })
      .moveDown();

    // Content
    doc.fontSize(12);

    if (data.summary) {
      doc.fontSize(16).text('ملخص تنفيذي', { underline: true }).moveDown();
      doc.fontSize(12).text(data.summary).moveDown();
    }

    if (data.sections && Array.isArray(data.sections)) {
      data.sections.forEach((section, index) => {
        doc
          .fontSize(14)
          .text(`${index + 1}. ${section.title}`, { underline: true })
          .moveDown(0.5);

        doc.fontSize(12).text(section.content).moveDown();

        if (section.data && Array.isArray(section.data)) {
          section.data.forEach(item => {
            doc.fontSize(11).text(`   • ${item}`, { indent: 20 });
          });
          doc.moveDown();
        }
      });
    }

    // Analytics Section
    if (includeAnalytics && data.analytics) {
      doc.addPage().fontSize(16).text('التحليلات والإحصائيات', { underline: true }).moveDown();

      Object.entries(data.analytics).forEach(([key, value]) => {
        doc.fontSize(12).text(`${key}: ${value}`, { indent: 20 }).moveDown(0.3);
      });
    }

    // Footer
    doc.fontSize(8).text(`صفحة 1`, { align: 'center' });

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        resolve({
          success: true,
          filename,
          filepath,
          size: fs.statSync(filepath).size,
        });
      });
      stream.on('error', reject);
    });
  }

  /**
   * إنشاء تقرير Excel
   */
  async generateExcelReport(data, options = {}) {
    const { title = 'تقرير Excel', sheetName = 'البيانات', includeCharts = true } = options;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'النظام';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(sheetName);

    // Header Row
    worksheet.columns = data.columns || [
      { header: 'المعرف', key: 'id', width: 10 },
      { header: 'الاسم', key: 'name', width: 30 },
      { header: 'القيمة', key: 'value', width: 20 },
      { header: 'التاريخ', key: 'date', width: 25 },
    ];

    // Style Header
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };

    // Add Data
    if (data.rows && Array.isArray(data.rows)) {
      data.rows.forEach(row => {
        worksheet.addRow(row);
      });
    }

    // Add Summary Sheet
    if (data.summary) {
      const summarySheet = workbook.addWorksheet('الملخص');
      summarySheet.addRow(['ملخص التقرير']);
      summarySheet.addRow([]);

      Object.entries(data.summary).forEach(([key, value]) => {
        summarySheet.addRow([key, value]);
      });

      summarySheet.getColumn(1).font = { bold: true };
    }

    // Save File
    const filename = `report_${Date.now()}.xlsx`;
    const filepath = path.join(this.reportsDir, filename);

    await workbook.xlsx.writeFile(filepath);

    return {
      success: true,
      filename,
      filepath,
      size: fs.statSync(filepath).size,
    };
  }

  /**
   * إنشاء تقرير CSV
   */
  async generateCSVReport(data, options = {}) {
    const { delimiter = ',' } = options;

    let csvContent = '';

    // Headers
    if (data.headers && Array.isArray(data.headers)) {
      csvContent += data.headers.join(delimiter) + '\n';
    }

    // Rows
    if (data.rows && Array.isArray(data.rows)) {
      data.rows.forEach(row => {
        csvContent += row.join(delimiter) + '\n';
      });
    }

    const filename = `report_${Date.now()}.csv`;
    const filepath = path.join(this.reportsDir, filename);

    fs.writeFileSync(filepath, csvContent, 'utf8');

    return {
      success: true,
      filename,
      filepath,
      size: fs.statSync(filepath).size,
    };
  }

  /**
   * إنشاء تقرير JSON
   */
  async generateJSONReport(data, options = {}) {
    const { pretty = true } = options;

    const jsonContent = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);

    const filename = `report_${Date.now()}.json`;
    const filepath = path.join(this.reportsDir, filename);

    fs.writeFileSync(filepath, jsonContent, 'utf8');

    return {
      success: true,
      filename,
      filepath,
      size: fs.statSync(filepath).size,
    };
  }
}

/**
 * Report Analytics - تحليلات التقارير
 * يحلل البيانات ويستخرج الإحصائيات الهامة
 */
class ReportAnalytics {
  /**
   * تحليل البيانات الأساسية
   */
  static analyzeData(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return { error: 'No data provided' };
    }

    return {
      totalRecords: data.length,
      firstRecord: data[0],
      lastRecord: data[data.length - 1],
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * حساب الإحصائيات العددية
   */
  static calculateStatistics(numbers) {
    if (!Array.isArray(numbers) || numbers.length === 0) {
      return null;
    }

    const sum = numbers.reduce((a, b) => a + b, 0);
    const avg = sum / numbers.length;
    const sorted = [...numbers].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);

    return {
      count: numbers.length,
      sum,
      average: avg,
      median,
      min,
      max,
      range: max - min,
    };
  }

  /**
   * تحليل الاتجاهات
   */
  static analyzeTrends(data, key) {
    if (!Array.isArray(data) || data.length < 2) {
      return null;
    }

    const values = data.map(item => item[key]).filter(v => typeof v === 'number');

    if (values.length < 2) return null;

    const changes = [];
    for (let i = 1; i < values.length; i++) {
      const change = ((values[i] - values[i - 1]) / values[i - 1]) * 100;
      changes.push(change);
    }

    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    const trend = avgChange > 0 ? 'increasing' : avgChange < 0 ? 'decreasing' : 'stable';

    return {
      trend,
      averageChange: avgChange.toFixed(2) + '%',
      totalChange: (((values[values.length - 1] - values[0]) / values[0]) * 100).toFixed(2) + '%',
    };
  }

  /**
   * إنشاء ملخص تلقائي
   */
  static generateSummary(data, options = {}) {
    const analytics = this.analyzeData(data);

    let summary = `تقرير شامل يحتوي على ${analytics.totalRecords} سجل.\n`;
    summary += `تم إنشاء التقرير في ${new Date().toLocaleString('ar-EG')}.\n`;

    if (options.includeStatistics) {
      const numericFields = Object.keys(data[0] || {}).filter(
        key => typeof data[0][key] === 'number'
      );

      numericFields.forEach(field => {
        const values = data.map(item => item[field]);
        const stats = this.calculateStatistics(values);
        summary += `\nإحصائيات ${field}:\n`;
        summary += `  - المتوسط: ${stats.average.toFixed(2)}\n`;
        summary += `  - النطاق: ${stats.min} - ${stats.max}\n`;
      });
    }

    return summary;
  }
}

/**
 * Report Scheduler - جدولة التقارير
 * يتيح جدولة إنشاء التقارير تلقائياً
 */
class ReportScheduler {
  constructor() {
    this.schedules = new Map();
  }

  /**
   * جدولة تقرير
   */
  scheduleReport(name, generator, interval) {
    if (this.schedules.has(name)) {
      clearInterval(this.schedules.get(name));
    }

    const intervalId = setInterval(async () => {
      try {
        await generator();
        console.log(`✅ تم إنشاء التقرير المجدول: ${name}`);
      } catch (error) {
        console.error(`❌ خطأ في التقرير المجدول ${name}:`, error);
      }
    }, interval);

    this.schedules.set(name, intervalId);

    return {
      success: true,
      name,
      interval,
      nextRun: new Date(Date.now() + interval),
    };
  }

  /**
   * إلغاء جدولة تقرير
   */
  cancelSchedule(name) {
    if (this.schedules.has(name)) {
      clearInterval(this.schedules.get(name));
      this.schedules.delete(name);
      return { success: true, message: `تم إلغاء جدولة ${name}` };
    }
    return { success: false, message: 'الجدولة غير موجودة' };
  }

  /**
   * الحصول على جميع الجدولات
   */
  getAllSchedules() {
    return Array.from(this.schedules.keys());
  }
}

/**
 * Report Exporter - مُصدّر التقارير
 * يصدر التقارير بصيغ متعددة
 */
class ReportExporter {
  /**
   * تصدير متعدد الصيغ
   */
  static async exportMultipleFormats(data, formats = ['pdf', 'excel', 'csv', 'json']) {
    const generator = new ReportGenerator();
    const results = {};

    for (const format of formats) {
      try {
        switch (format.toLowerCase()) {
          case 'pdf':
            results.pdf = await generator.generatePDFReport(data);
            break;
          case 'excel':
          case 'xlsx':
            results.excel = await generator.generateExcelReport(data);
            break;
          case 'csv':
            results.csv = await generator.generateCSVReport(data);
            break;
          case 'json':
            results.json = await generator.generateJSONReport(data);
            break;
        }
      } catch (error) {
        results[format] = { success: false, error: error.message };
      }
    }

    return {
      success: true,
      formats: Object.keys(results),
      results,
    };
  }

  /**
   * ضغط التقارير
   */
  static async compressReports(files) {
    const archiver = require('archiver');
    const output = fs.createWriteStream(`reports_${Date.now()}.zip`);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);

    files.forEach(file => {
      archive.file(file, { name: path.basename(file) });
    });

    await archive.finalize();

    return {
      success: true,
      archiveSize: archive.pointer(),
    };
  }
}

// Export all classes
module.exports = {
  ReportGenerator,
  ReportAnalytics,
  ReportScheduler,
  ReportExporter,
};
