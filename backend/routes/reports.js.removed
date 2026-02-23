/**
 * Simple & Flexible Reporting System
 * نظام التقارير البسيط والمرن
 *
 * الميزات:
 * ✅ تقارير مخصصة مرنة
 * ✅ Export (PDF/Excel/CSV)
 * ✅ Scheduled Reports
 * ✅ Advanced Analytics
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const cron = require('node-cron');

// ============================================================================
// REPORT TEMPLATES
// ============================================================================

const REPORT_TEMPLATES = {
  PAYMENT_SUMMARY: {
    name: 'ملخص الدفع',
    fields: ['date', 'totalAmount', 'successRate', 'failedCount', 'refunds'],
    description: 'تقرير ملخص معاملات الدفع',
  },

  EMAIL_REPORT: {
    name: 'تقرير البريد الإلكتروني',
    fields: ['date', 'sent', 'delivered', 'bounced', 'opened', 'clicked'],
    description: 'تقرير إحصائيات البريد الإلكتروني',
  },

  SMS_REPORT: {
    name: 'تقرير الرسائل النصية',
    fields: ['date', 'sent', 'delivered', 'failed', 'cost'],
    description: 'تقرير إحصائيات الرسائل النصية',
  },

  USER_ACTIVITY: {
    name: 'تقرير نشاط المستخدمين',
    fields: ['date', 'activeUsers', 'newUsers', 'actions', 'engagementRate'],
    description: 'تقرير نشاط وتفاعل المستخدمين',
  },

  SYSTEM_HEALTH: {
    name: 'تقرير صحة النظام',
    fields: ['date', 'uptime', 'errorRate', 'avgResponseTime', 'activeConnections'],
    description: 'تقرير صحة وأداء النظام',
  },

  REVENUE: {
    name: 'تقرير الإيرادات',
    fields: ['date', 'revenue', 'expenses', 'profit', 'transactionCount', 'avgTransaction'],
    description: 'تقرير الإيرادات والأرباح',
  },
};

// ============================================================================
// MOCK DATA GENERATORS
// ============================================================================

const generatePaymentData = (startDate, endDate) => {
  const days = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
  const data = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    data.push({
      date: date.toISOString().split('T')[0],
      totalAmount: Math.floor(Math.random() * 50000 + 10000),
      successRate: Math.floor(Math.random() * 5 + 95), // 95-100%
      failedCount: Math.floor(Math.random() * 50),
      refunds: Math.floor(Math.random() * 20),
    });
  }
  return data;
};

const generateEmailData = (startDate, endDate) => {
  const days = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
  const data = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const sent = Math.floor(Math.random() * 10000 + 5000);
    data.push({
      date: date.toISOString().split('T')[0],
      sent,
      delivered: Math.floor(sent * 0.98),
      bounced: Math.floor(sent * 0.02),
      opened: Math.floor(sent * 0.45),
      clicked: Math.floor(sent * 0.12),
    });
  }
  return data;
};

const generateSmsData = (startDate, endDate) => {
  const days = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
  const data = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const sent = Math.floor(Math.random() * 5000 + 2000);
    data.push({
      date: date.toISOString().split('T')[0],
      sent,
      delivered: Math.floor(sent * 0.99),
      failed: Math.floor(sent * 0.01),
      cost: (sent * 0.05).toFixed(2),
    });
  }
  return data;
};

const generateUserActivity = (startDate, endDate) => {
  const days = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
  const data = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const activeUsers = Math.floor(Math.random() * 5000 + 2000);
    data.push({
      date: date.toISOString().split('T')[0],
      activeUsers,
      newUsers: Math.floor(Math.random() * 500 + 100),
      actions: Math.floor(Math.random() * 50000 + 10000),
      engagementRate: (Math.random() * 30 + 40).toFixed(2),
    });
  }
  return data;
};

const generateSystemHealth = (startDate, endDate) => {
  const days = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
  const data = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    data.push({
      date: date.toISOString().split('T')[0],
      uptime: (Math.random() * 2 + 99.5).toFixed(2),
      errorRate: (Math.random() * 0.05).toFixed(3),
      avgResponseTime: Math.floor(Math.random() * 100 + 50),
      activeConnections: Math.floor(Math.random() * 500 + 100),
    });
  }
  return data;
};

const generateRevenueData = (startDate, endDate) => {
  const days = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
  const data = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const revenue = Math.floor(Math.random() * 100000 + 50000);
    const expenses = Math.floor(revenue * (Math.random() * 0.2 + 0.3));
    data.push({
      date: date.toISOString().split('T')[0],
      revenue,
      expenses,
      profit: revenue - expenses,
      transactionCount: Math.floor(Math.random() * 2000 + 500),
      avgTransaction: (revenue / (Math.random() * 2000 + 500)).toFixed(2),
    });
  }
  return data;
};

// ============================================================================
// REPORT GENERATION
// ============================================================================

/**
 * Generate report with custom filters
 */
const generateReport = (templateType, filters = {}) => {
  const template = REPORT_TEMPLATES[templateType];
  if (!template) throw new Error('Template not found');

  const {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate = new Date(),
    groupBy = 'daily',
  } = filters;

  let data = [];

  switch (templateType) {
    case 'PAYMENT_SUMMARY':
      data = generatePaymentData(startDate, endDate);
      break;
    case 'EMAIL_REPORT':
      data = generateEmailData(startDate, endDate);
      break;
    case 'SMS_REPORT':
      data = generateSmsData(startDate, endDate);
      break;
    case 'USER_ACTIVITY':
      data = generateUserActivity(startDate, endDate);
      break;
    case 'SYSTEM_HEALTH':
      data = generateSystemHealth(startDate, endDate);
      break;
    case 'REVENUE':
      data = generateRevenueData(startDate, endDate);
      break;
  }

  return {
    template: template.name,
    description: template.description,
    generatedAt: new Date(),
    period: { startDate, endDate },
    data,
    summary: calculateSummary(data, template.fields),
  };
};

const calculateSummary = (data, fields) => {
  const summary = {};
  const numericFields = fields.filter(f => data.length > 0 && typeof data[0][f] === 'number');

  numericFields.forEach(field => {
    const values = data.map(d => d[field]);
    summary[field] = {
      total: values.reduce((a, b) => a + b, 0),
      average: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
      min: Math.min(...values),
      max: Math.max(...values),
    };
  });

  return summary;
};

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Export to CSV
 */
const exportToCSV = report => {
  const headers = Object.keys(report.data[0] || {});
  let csv = headers.join(',') + '\n';

  report.data.forEach(row => {
    csv += headers.map(h => row[h]).join(',') + '\n';
  });

  return csv;
};

/**
 * Export to Excel
 */
const exportToExcel = async report => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('التقرير');

  // Add headers
  if (report.data.length > 0) {
    const headers = Object.keys(report.data[0]);
    worksheet.addRow(headers);

    // Add data
    report.data.forEach(row => {
      worksheet.addRow(headers.map(h => row[h]));
    });
  }

  // Add summary
  if (Object.keys(report.summary).length > 0) {
    worksheet.addRow([]);
    worksheet.addRow(['الملخص']);
    Object.entries(report.summary).forEach(([field, stats]) => {
      worksheet.addRow([field, `المجموع: ${stats.total}`, `المتوسط: ${stats.average}`]);
    });
  }

  return await workbook.writeBuffer();
};

/**
 * Export to PDF
 */
const exportToPDF = report => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const buffers = [];

    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Title
    doc.fontSize(16).text(report.template, 100, 50);
    doc.fontSize(10).text(report.description, 100, 70);

    // Period
    doc
      .fontSize(10)
      .text(
        `الفترة: ${report.period.startDate.toISOString().split('T')[0]} إلى ${report.period.endDate.toISOString().split('T')[0]}`,
        100,
        90
      );
    doc.text(`تاريخ التوليد: ${report.generatedAt.toLocaleString()}`, 100, 105);

    // Summary
    if (Object.keys(report.summary).length > 0) {
      doc.fontSize(12).text('الملخص الإحصائي:', 100, 130);
      let y = 150;
      Object.entries(report.summary).forEach(([field, stats]) => {
        doc.fontSize(10).text(`${field}:`, 100, y);
        doc.fontSize(9).text(`  المجموع: ${stats.total}`, 120, y + 15);
        doc.text(`  المتوسط: ${stats.average}`, 120, y + 30);
        y += 50;
      });
    }

    // Table data
    if (report.data.length > 0) {
      doc.fontSize(12).text('البيانات:', 100, y + 20);
      const headers = Object.keys(report.data[0]);
      let tableY = y + 50;

      doc.fontSize(9);
      headers.forEach((h, i) => {
        doc.text(h, 100 + i * 70, tableY);
      });

      tableY += 15;
      report.data.slice(0, 10).forEach(row => {
        headers.forEach((h, i) => {
          doc.text(String(row[h]).substring(0, 10), 100 + i * 70, tableY);
        });
        tableY += 12;
      });

      if (report.data.length > 10) {
        doc.text(`... و ${report.data.length - 10} سجلات أخرى`, 100, tableY);
      }
    }

    doc.end();
  });
};

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/reports/templates
 * List all available report templates
 */
router.get('/templates', authenticateToken, (req, res) => {
  try {
    const templates = Object.entries(REPORT_TEMPLATES).map(([key, value]) => ({
      id: key,
      name: value.name,
      description: value.description,
      fields: value.fields,
    }));

    res.json({
      success: true,
      templates,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/reports/generate
 * Generate a custom report
 */
router.post('/generate', authenticateToken, (req, res) => {
  try {
    const { templateType, filters } = req.body;

    if (!templateType) {
      return res.status(400).json({
        success: false,
        error: 'templateType is required',
      });
    }

    const report = generateReport(templateType, filters);

    res.json({
      success: true,
      report,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/reports/export
 * Export report to different formats
 */
router.post('/export', authenticateToken, async (req, res) => {
  try {
    const { templateType, format = 'csv', filters } = req.body;

    const report = generateReport(templateType, filters);

    let data, contentType, filename;

    switch (format.toLowerCase()) {
      case 'csv':
        data = exportToCSV(report);
        contentType = 'text/csv; charset=utf-8';
        filename = `${templateType}_${Date.now()}.csv`;
        break;

      case 'excel':
      case 'xlsx':
        data = await exportToExcel(report);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `${templateType}_${Date.now()}.xlsx`;
        break;

      case 'pdf':
        data = await exportToPDF(report);
        contentType = 'application/pdf';
        filename = `${templateType}_${Date.now()}.pdf`;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Unsupported format. Use: csv, excel, pdf',
        });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', contentType);
    res.send(data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/reports/schedule
 * Schedule a report to be generated periodically
 */
router.post('/schedule', authenticateToken, (req, res) => {
  try {
    const { templateType, schedule, format = 'csv', email } = req.body;

    if (!templateType || !schedule) {
      return res.status(400).json({
        success: false,
        error: 'templateType and schedule are required',
      });
    }

    // Validate cron expression
    if (!cron.validate(schedule)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid cron expression',
      });
    }

    // Schedule the task
    const task = cron.schedule(schedule, async () => {
      console.log(`Running scheduled report: ${templateType}`);

      const report = generateReport(templateType);

      // In production, send via email
      if (email) {
        console.log(`Report would be sent to: ${email}`);
      }
    });

    res.json({
      success: true,
      message: 'Report scheduled successfully',
      schedule: {
        templateType,
        schedule,
        format,
        email,
        nextRun: 'Check system logs',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/reports/analytics
 * Get advanced analytics and insights
 */
router.get('/analytics', authenticateToken, (req, res) => {
  try {
    const { reportType = 'PAYMENT_SUMMARY', days = 30 } = req.query;

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const report = generateReport(reportType, { startDate, endDate });

    // Calculate trends
    const dataPoints = report.data;
    const trends = {};

    if (dataPoints.length > 1) {
      const numericFields = Object.keys(dataPoints[0]).filter(
        k => typeof dataPoints[0][k] === 'number'
      );

      numericFields.forEach(field => {
        const first = dataPoints[0][field];
        const last = dataPoints[dataPoints.length - 1][field];
        const change = (((last - first) / first) * 100).toFixed(2);

        trends[field] = {
          first,
          last,
          change: `${change}%`,
          trend: last > first ? '📈 صاعد' : '📉 هابط',
        };
      });
    }

    res.json({
      success: true,
      report: report.template,
      period: `آخر ${days} يوم`,
      summary: report.summary,
      trends,
      insights: generateInsights(report),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const generateInsights = report => {
  const insights = [];

  Object.entries(report.summary).forEach(([field, stats]) => {
    if (stats.average > stats.max * 0.8) {
      insights.push(`⚠️ ${field}: القيمة الحالية مرتفعة جداً (${stats.average})`);
    }
    if (stats.average < stats.min * 0.5) {
      insights.push(`⚠️ ${field}: القيمة الحالية منخفضة جداً (${stats.average})`);
    }
  });

  return insights.length > 0 ? insights : ['✅ جميع المؤشرات طبيعية'];
};

/**
 * GET /api/v1/reports/:id
 * Get a specific report by ID
 */
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const report = generateReport(id);

    res.json({
      success: true,
      report,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/reports/compare
 * Compare multiple reports
 */
router.post('/compare', authenticateToken, (req, res) => {
  try {
    const { templates, filters } = req.body;

    if (!templates || templates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'templates array is required',
      });
    }

    const reports = templates.map(templateType => ({
      template: templateType,
      data: generateReport(templateType, filters),
    }));

    res.json({
      success: true,
      comparison: reports,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
