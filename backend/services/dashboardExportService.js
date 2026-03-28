/* eslint-disable no-unused-vars */
/**
 * Dashboard Export Service
 * Export dashboard data to various formats (PDF, Excel, CSV)
 */

const logger = require('../utils/logger');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

class DashboardExportService {
  constructor() {
    this.exportQueue = [];
    this.exportHistory = [];
  }

  /**
   * Export dashboard to PDF
   */
  async exportToPDF(dashboardData, options = {}) {
    try {
      logger.info('📄 Exporting dashboard to PDF...');

      const doc = new PDFDocument();
      const fileName = `dashboard_${Date.now()}.pdf`;

      // Document metadata
      doc.metadata('Title', options.title || 'Executive Dashboard Report');
      doc.metadata('Subject', 'Dashboard Export');
      doc.metadata('Author', options.author || 'System');

      // Header
      doc.fontSize(24).font('Courier-Bold').text('لوحة التحكم التنفيذية', { align: 'center' });
      doc.fontSize(12).text('Executive Dashboard Report', { align: 'center' });
      doc
        .fontSize(10)
        .text(`تاريخ التقرير: ${new Date().toLocaleString('ar-SA')}`, { align: 'center' });
      doc.moveDown();

      // Summary section
      if (dashboardData.executive) {
        doc.fontSize(14).font('Courier-Bold').text('ملخص تنفيذي | Executive Summary');
        doc.fontSize(10);
        const summary = dashboardData.executive;

        const summaryTable = [
          ['المقياس | Metric', 'القيمة | Value'],
          ['إجمالي المؤشرات | Total KPIs', summary.totalKPIs],
          ['على المسار | On Track', summary.kpisOnTrack],
          ['محفوف بالمخاطر | At Risk', summary.kpisAtRisk],
          ['حالات حرجة | Critical', summary.kpisCritical],
        ];

        doc.table(summaryTable, {
          x: 50,
          y: doc.y,
          width: 500,
          cellBorder: true,
          cellPadding: 5,
        });

        doc.moveDown();
      }

      // KPIs section
      if (dashboardData.executive && dashboardData.executive.kpis) {
        doc
          .fontSize(14)
          .font('Courier-Bold')
          .text('المؤشرات الرئيسية | Key Performance Indicators');
        doc.fontSize(10);

        const kpis = dashboardData.executive.kpis.slice(0, 10);
        kpis.forEach(kpi => {
          doc.fontSize(11).font('Courier-Bold').text(kpi.name);
          doc.fontSize(9);
          doc.text(`الحالية: ${kpi.current} ${kpi.unit}`);
          doc.text(`الهدف: ${kpi.target} ${kpi.unit}`);
          doc.text(`الحالة: ${kpi.status}`);
          doc.text(`الاتجاه: ${kpi.changePercent > 0 ? '↑' : '↓'} ${kpi.changePercent}%`);
          doc.moveDown(0.5);
        });
      }

      // Recommendations section
      if (dashboardData.executive && dashboardData.executive.kpis) {
        doc.newPage();
        doc.fontSize(14).font('Courier-Bold').text('التوصيات | Recommendations');
        doc.fontSize(10);
        doc.text('تم توليد التوصيات التالية بناءً على تحليل البيانات الحالية.');
        doc.moveDown();
      }

      // Footer
      const pages = doc.bufferedPageRange().count;
      for (let i = 1; i <= pages; i++) {
        doc.switchToPage(i - 1);
        doc
          .fontSize(9)
          .text(`صفحة ${i} من ${pages}`, 50, doc.page.height - 50, { align: 'center' });
      }

      this.recordExport('PDF', fileName);
      return { fileName, status: 'success', doc };
    } catch (error) {
      logger.error('Error exporting to PDF:', error);
      throw error;
    }
  }

  /**
   * Export dashboard to Excel
   */
  async exportToExcel(dashboardData, options = {}) {
    try {
      logger.info('📊 Exporting dashboard to Excel...');

      const workbook = new ExcelJS.Workbook();
      const fileName = `dashboard_${Date.now()}.xlsx`;

      // Summary sheet
      const summarySheet = workbook.addWorksheet('ملخص | Summary');
      summarySheet.columns = [
        { header: 'المقياس | Metric', key: 'metric', width: 30 },
        { header: 'القيمة | Value', key: 'value', width: 20 },
      ];

      if (dashboardData.executive) {
        summarySheet.addRows([
          { metric: 'إجمالي المؤشرات | Total KPIs', value: dashboardData.executive.totalKPIs },
          { metric: 'على المسار | On Track', value: dashboardData.executive.kpisOnTrack },
          { metric: 'محفوف بالمخاطر | At Risk', value: dashboardData.executive.kpisAtRisk },
          { metric: 'حالات حرجة | Critical', value: dashboardData.executive.kpisCritical },
        ]);
      }

      // KPIs sheet
      const kpisSheet = workbook.addWorksheet('المؤشرات | KPIs');
      kpisSheet.columns = [
        { header: 'الاسم | Name', key: 'name', width: 25 },
        { header: 'الفئة | Category', key: 'category', width: 15 },
        { header: 'الحالية | Current', key: 'current', width: 12 },
        { header: 'الهدف | Target', key: 'target', width: 12 },
        { header: 'الفجوة % | Gap %', key: 'variance_percent', width: 12 },
        { header: 'الحالة | Status', key: 'status', width: 12 },
        { header: 'الاتجاه | Trend', key: 'trend', width: 10 },
      ];

      if (dashboardData.executive && dashboardData.executive.kpis) {
        const rows = dashboardData.executive.kpis.map(kpi => ({
          name: kpi.name,
          category: kpi.category,
          current: kpi.current,
          target: kpi.target,
          variance_percent: kpi.variancePercent,
          status: kpi.status,
          trend: kpi.trend,
        }));
        kpisSheet.addRows(rows);
      }

      // Add styling
      kpisSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      kpisSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };

      this.recordExport('Excel', fileName);
      return { fileName, workbook, status: 'success' };
    } catch (error) {
      logger.error('Error exporting to Excel:', error);
      throw error;
    }
  }

  /**
   * Export dashboard to CSV
   */
  async exportToCSV(dashboardData, options = {}) {
    try {
      logger.info('📋 Exporting dashboard to CSV...');

      const fileName = `dashboard_${Date.now()}.csv`;

      if (!dashboardData.executive || !dashboardData.executive.kpis) {
        throw new Error('No KPI data to export');
      }

      const records = dashboardData.executive.kpis.map(kpi => ({
        'Name|الاسم': kpi.name,
        'Category|الفئة': kpi.category,
        'Current|الحالية': kpi.current,
        'Target|الهدف': kpi.target,
        'Unit|الوحدة': kpi.unit,
        'Gap %|الفجوة %': kpi.variancePercent,
        'Status|الحالة': kpi.status,
        'Trend|الاتجاه': kpi.trend,
      }));

      this.recordExport('CSV', fileName);
      return { fileName, records, status: 'success' };
    } catch (error) {
      logger.error('Error exporting to CSV:', error);
      throw error;
    }
  }

  /**
   * Export custom report with selected metrics
   */
  async exportCustomReport(kpis = [], format = 'pdf', options = {}) {
    try {
      if (format === 'pdf') {
        return await this.exportToPDF({ executive: { kpis } }, options);
      } else if (format === 'excel') {
        return await this.exportToExcel({ executive: { kpis } }, options);
      } else if (format === 'csv') {
        return await this.exportToCSV({ executive: { kpis } }, options);
      }

      throw new Error(`Unsupported format: ${format}`);
    } catch (error) {
      logger.error('Error creating custom report:', error);
      throw error;
    }
  }

  /**
   * Schedule batch export
   */
  async scheduleExport(dashboardId, format, schedule, options = {}) {
    try {
      const exportJob = {
        id: `export_${Date.now()}`,
        dashboardId,
        format,
        schedule, // 'daily', 'weekly', 'monthly'
        options,
        createdAt: new Date(),
        enabled: true,
      };

      this.exportQueue.push(exportJob);
      logger.info(`📅 Scheduled export: ${exportJob.id}`);

      return exportJob;
    } catch (error) {
      logger.error('Error scheduling export:', error);
      throw error;
    }
  }

  /**
   * Record export in history
   */
  recordExport(format, fileName) {
    const record = {
      id: `exp_${Date.now()}`,
      format,
      fileName,
      timestamp: new Date(),
      size: 'pending',
    };

    this.exportHistory.push(record);
    if (this.exportHistory.length > 100) {
      this.exportHistory.shift();
    }

    return record;
  }

  /**
   * Get export history
   */
  getExportHistory(limit = 10) {
    return this.exportHistory.slice(-limit).reverse();
  }

  /**
   * Generate email-ready report
   */
  async generateEmailReport(dashboardData, recipientEmail) {
    try {
      const pdfExport = await this.exportToPDF(dashboardData, {
        title: 'تقرير لوحة التحكم التنفيذية',
      });

      return {
        status: 'ready',
        to: recipientEmail,
        subject: 'تقرير لوحة التحكم التنفيذية - Executive Dashboard Report',
        body: this.generateEmailBody(dashboardData),
        attachment: pdfExport,
      };
    } catch (error) {
      logger.error('Error generating email report:', error);
      throw error;
    }
  }

  /**
   * Generate email body
   */
  generateEmailBody(dashboardData) {
    const summary = dashboardData.executive;

    return `
    لوحة التحكم التنفيذية - Executive Dashboard Report

    ملخص تنفيذي | Executive Summary:
    - إجمالي المؤشرات: ${summary.totalKPIs}
    - على المسار: ${summary.kpisOnTrack}
    - محفوف بالمخاطر: ${summary.kpisAtRisk}
    - حالات حرجة: ${summary.kpisCritical}

    الحالة العامة: ${
      summary.kpisCritical > 0
        ? 'حرجة | Critical'
        : summary.kpisAtRisk > 0
          ? 'محفوف بالمخاطر | At Risk'
          : 'صحي | Healthy'
    }

    تم إنشاء التقرير: ${new Date().toLocaleString('ar-SA')}
    `;
  }

  /**
   * Clean old exports
   */
  cleanOldExports(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const initialCount = this.exportHistory.length;
    this.exportHistory = this.exportHistory.filter(exp => exp.timestamp > cutoffDate);

    logger.info(`🗑️  Cleaned ${initialCount - this.exportHistory.length} old exports`);
    return initialCount - this.exportHistory.length;
  }
}

module.exports = new DashboardExportService();
