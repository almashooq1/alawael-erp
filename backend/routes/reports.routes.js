/**
 * Reporting Routes
 * Endpoints for generating, scheduling, and managing reports
 * Created: February 22, 2026
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/v1/reports/templates
 * Get all available report templates
 */
router.get('/templates', async (req, res) => {
  try {
    const reportingService = req.app.locals.reportingService;
    const templates = Array.from(reportingService.templates.values()).map((t) => ({
      name: t.name,
      type: t.type,
      title: t.title,
      description: t.description,
      fieldCount: t.fields.length,
      options: t.options,
    }));

    res.json({
      success: true,
      count: templates.length,
      templates,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/reports/templates/:name
 * Get specific template details
 */
router.get('/templates/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const reportingService = req.app.locals.reportingService;
    const template = reportingService.getTemplate(name);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    res.json({
      success: true,
      template: {
        name: template.name,
        type: template.type,
        title: template.title,
        description: template.description,
        fields: template.fields,
        options: template.options,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/reports/generate
 * Generate report in specified format
 */
router.post('/generate', async (req, res) => {
  try {
    const { templateName, data, format = 'pdf', email = false } = req.body;

    if (!templateName || !data) {
      return res.status(400).json({
        success: false,
        error: 'templateName and data are required',
      });
    }

if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'data must be a non-empty array',
      });
    }

    const reportingService = req.app.locals.reportingService;
    const report = await reportingService.generateReport(
      templateName,
      data,
      format
    );

    // Send file or return buffer
    res.set({
      'Content-Type':
        format === 'pdf'
          ? 'application/pdf'
          : format === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv',
      'Content-Disposition': `attachment; filename="${report.filename}"`,
    });

    res.send(report.buffer);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/reports/create-template
 * Create custom report template
 */
router.post('/create-template', async (req, res) => {
  try {
    const { name, title, description, fields, options = {} } = req.body;

    if (!name || !title || !fields) {
      return res.status(400).json({
        success: false,
        error: 'name, title, and fields are required',
      });
    }

    if (!Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'fields must be a non-empty array',
      });
    }

    const reportingService = req.app.locals.reportingService;

    const builder = reportingService
      .builder(name)
      .setTitle(title)
      .setDescription(description || '');

    fields.forEach((f) => {
      builder.addField(f.key, f.label, {
        width: f.width,
        format: f.format,
        optional: f.optional,
      });
    });

    Object.entries(options).forEach(([key, value]) => {
      builder.setOption(key, value);
    });

    const template = builder.build();
    reportingService.registerTemplate(template);

    res.status(201).json({
      success: true,
      message: 'Custom template created',
      template: {
        id: template.id,
        name: template.name,
        title: template.title,
        fieldCount: template.fields.length,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/reports/schedule
 * Schedule report for regular generation
 */
router.post('/schedule', async (req, res) => {
  try {
    const {
      reportId,
      templateName,
      frequency = 'daily',
      time = '09:00',
      recipients = [],
      format = 'pdf',
    } = req.body;

    if (!reportId || !templateName) {
      return res.status(400).json({
        success: false,
        error: 'reportId and templateName are required',
      });
    }

    if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
      return res.status(400).json({
        success: false,
        error: 'frequency must be daily, weekly, or monthly',
      });
    }

    const reportingService = req.app.locals.reportingService;
    const schedule = reportingService.scheduleReport(reportId, {
      templateName,
      frequency,
      time,
      recipients,
      format,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: 'Report scheduled',
      schedule: {
        id: schedule.id,
        frequency: schedule.frequency,
        nextRun: schedule.nextRun,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/reports/scheduled
 * Get scheduled reports
 */
router.get('/scheduled', async (req, res) => {
  try {
    const { enabled = true } = req.query;

    const reportingService = req.app.locals.reportingService;
    const schedules = reportingService.scheduler.getScheduledReports({
      enabled: enabled === 'true',
    });

    res.json({
      success: true,
      count: schedules.length,
      schedules: schedules.map((s) => ({
        id: s.id,
        template: s.templateName,
        frequency: s.frequency,
        time: s.time,
        lastRun: s.lastRun,
        nextRun: s.nextRun,
        runCount: s.runCount,
        failureCount: s.failureCount,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /api/v1/reports/scheduled/:id
 * Update scheduled report
 */
router.put('/scheduled/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled, frequency, time, recipients } = req.body;

    const reportingService = req.app.locals.reportingService;
    const schedule = reportingService.scheduler.schedules.get(id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found',
      });
    }

    if (enabled !== undefined) schedule.enabled = enabled;
    if (frequency) schedule.frequency = frequency;
    if (time) schedule.time = time;
    if (recipients) schedule.recipients = recipients;

    schedule.updatedAt = new Date();

    res.json({
      success: true,
      message: 'Schedule updated',
      schedule,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/v1/reports/scheduled/:id
 * Delete scheduled report
 */
router.delete('/scheduled/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const reportingService = req.app.locals.reportingService;
    const deleted = reportingService.scheduler.schedules.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found',
      });
    }

    res.json({
      success: true,
      message: 'Schedule deleted',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/reports/history
 * Get report generation history
 */
router.get('/history', async (req, res) => {
  try {
    const { limit = 50, templateName = null } = req.query;

    const reportingService = req.app.locals.reportingService;
    let history = reportingService.generatedReports.slice(-parseInt(limit));

    if (templateName) {
      history = history.filter((r) => r.template === templateName);
    }

    res.json({
      success: true,
      count: history.length,
      history: history.map((r) => ({
        id: r.id,
        template: r.template,
        format: r.format,
        filename: r.filename,
        size: r.size,
        recordCount: r.recordCount,
        generatedAt: r.generatedAt,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/reports/stats
 * Get reporting system statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const reportingService = req.app.locals.reportingService;
    const stats = reportingService.getStatistics();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/reports/export
 * Export data in multiple formats
 */
router.post('/export', async (req, res) => {
  try {
    const { templateName, data, formats = ['pdf'] } = req.body;

    if (!templateName || !data) {
      return res.status(400).json({
        success: false,
        error: 'templateName and data are required',
      });
    }

    const reportingService = req.app.locals.reportingService;
    const results = {};

    for (const format of formats) {
      try {
        const report = await reportingService.generateReport(
          templateName,
          data,
          format
        );
        results[format] = {
          success: true,
          filename: report.filename,
          size: report.size,
        };
      } catch (error) {
        results[format] = {
          success: false,
          error: error.message,
        };
      }
    }

    res.json({
      success: Object.values(results).some((r) => r.success),
      results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
