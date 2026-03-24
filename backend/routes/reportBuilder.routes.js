/**
 * Report Builder Routes — مسارات منشئ التقارير المخصصة
 *
 * 28 API endpoints:
 *   📊 Dashboard:    KPIs, recent reports, favorites
 *   📋 Reports:      CRUD + duplicate + publish
 *   🏗️  Designer:     Add/remove/reorder columns, filters, sorting, grouping, calculated fields, chart config
 *   ▶️  Execution:    Run report, execution history
 *   📁 Templates:    List, get, create from template, save as template
 *   📤 Export:       PDF, Excel, CSV, JSON
 *   ⏰ Schedules:    CRUD for scheduled delivery
 *   🔗 Sharing:      Share, list shares, remove share
 *   ⭐ Favorites:    Toggle, list
 *   📜 Versions:     Version history
 *   📂 DataSources:  List sources, get fields
 *
 * Base path: /api/report-builder  (dual-mounted with /api/v1/report-builder)
 */

const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const _logger = require('../utils/logger');

// ── Service ──
const reportBuilder = require('../services/reportBuilder.service');

// ── Validation helper ──
function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return true;
  }
  return false;
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD — لوحة التحكم
// ══════════════════════════════════════════════════════════════════════════════

router.get('/dashboard/overview', authenticate, async (req, res) => {
  try {
    const data = reportBuilder.getDashboard(req.user?.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// DATA SOURCES — مصادر البيانات
// ══════════════════════════════════════════════════════════════════════════════

router.get('/data-sources', authenticate, async (req, res) => {
  try {
    const data = reportBuilder.getDataSources();
    res.json({ success: true, data, total: data.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/data-sources/:id/fields', authenticate, [param('id').notEmpty()], async (req, res) => {
  try {
    if (handleValidation(req, res)) return;
    const fields = reportBuilder.getFieldsForSource(req.params.id);
    res.json({ success: true, data: fields });
  } catch (err) {
    const status = err.message.includes('غير موجود') ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// REPORT CRUD — إدارة التقارير
// ══════════════════════════════════════════════════════════════════════════════

router.get('/reports', authenticate, async (req, res) => {
  try {
    const data = reportBuilder.getAllReports(req.query);
    res.json({ success: true, data, total: data.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/reports/:id', authenticate, [param('id').notEmpty()], async (req, res) => {
  try {
    if (handleValidation(req, res)) return;
    const report = reportBuilder.getReportById(req.params.id);
    const versions = reportBuilder.getReportVersions(req.params.id);
    const shares = reportBuilder.getReportShares(req.params.id);
    res.json({ success: true, data: { ...report, versions, shares } });
  } catch (err) {
    const status = err.message.includes('غير موجود') ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

router.post(
  '/reports',
  authenticate,
  authorize(['admin', 'manager', 'report_manager']),
  [
    body('name').notEmpty().withMessage('اسم التقرير مطلوب'),
    body('dataSourceId').notEmpty().withMessage('مصدر البيانات مطلوب'),
  ],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;
      const report = reportBuilder.createReport({ ...req.body, createdBy: req.user?.id });
      res.status(201).json({ success: true, data: report });
    } catch (err) {
      const status = err.message.includes('غير موجود') ? 404 : 400;
      res.status(status).json({ success: false, error: err.message });
    }
  }
);

router.put(
  '/reports/:id',
  authenticate,
  authorize(['admin', 'manager', 'report_manager']),
  [param('id').notEmpty()],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;
      const report = reportBuilder.updateReport(req.params.id, {
        ...req.body,
        updatedBy: req.user?.id,
      });
      res.json({ success: true, data: report });
    } catch (err) {
      const status = err.message.includes('غير موجود') ? 404 : 400;
      res.status(status).json({ success: false, error: err.message });
    }
  }
);

router.delete(
  '/reports/:id',
  authenticate,
  authorize(['admin', 'manager']),
  [param('id').notEmpty()],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;
      reportBuilder.deleteReport(req.params.id);
      res.json({ success: true, message: 'تم حذف التقرير' });
    } catch (err) {
      const status = err.message.includes('غير موجود') ? 404 : 500;
      res.status(status).json({ success: false, error: err.message });
    }
  }
);

router.post(
  '/reports/:id/duplicate',
  authenticate,
  authorize(['admin', 'manager', 'report_manager']),
  [param('id').notEmpty()],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;
      const report = reportBuilder.duplicateReport(req.params.id, req.user?.id);
      res.status(201).json({ success: true, data: report });
    } catch (err) {
      const status = err.message.includes('غير موجود') ? 404 : 500;
      res.status(status).json({ success: false, error: err.message });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// REPORT DESIGNER — مصمم التقرير (سحب وإفلات)
// ══════════════════════════════════════════════════════════════════════════════

// Add column (drag field → report)
router.post(
  '/reports/:id/columns',
  authenticate,
  authorize(['admin', 'manager', 'report_manager']),
  [param('id').notEmpty(), body('fieldId').notEmpty().withMessage('معرف الحقل مطلوب')],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;
      const report = reportBuilder.addColumn(req.params.id, req.body);
      res.json({ success: true, data: report });
    } catch (err) {
      const status = err.message.includes('غير موجود') ? 404 : 400;
      res.status(status).json({ success: false, error: err.message });
    }
  }
);

// Remove column
router.delete(
  '/reports/:id/columns/:fieldId',
  authenticate,
  authorize(['admin', 'manager', 'report_manager']),
  async (req, res) => {
    try {
      const report = reportBuilder.removeColumn(req.params.id, req.params.fieldId);
      res.json({ success: true, data: report });
    } catch (err) {
      const status = err.message.includes('غير موجود') ? 404 : 500;
      res.status(status).json({ success: false, error: err.message });
    }
  }
);

// Reorder columns (after drag-and-drop)
router.put(
  '/reports/:id/columns/reorder',
  authenticate,
  authorize(['admin', 'manager', 'report_manager']),
  [param('id').notEmpty(), body('orderedFieldIds').isArray().withMessage('ترتيب الحقول مطلوب')],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;
      const report = reportBuilder.reorderColumns(req.params.id, req.body.orderedFieldIds);
      res.json({ success: true, data: report });
    } catch (err) {
      const status = err.message.includes('غير موجود') ? 404 : 400;
      res.status(status).json({ success: false, error: err.message });
    }
  }
);

// Add filter
router.post(
  '/reports/:id/filters',
  authenticate,
  authorize(['admin', 'manager', 'report_manager']),
  [
    param('id').notEmpty(),
    body('fieldId').notEmpty().withMessage('معرف الحقل مطلوب'),
    body('operator').notEmpty().withMessage('العامل مطلوب'),
  ],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;
      const report = reportBuilder.addFilter(req.params.id, req.body);
      res.json({ success: true, data: report });
    } catch (err) {
      const status = err.message.includes('غير موجود') ? 404 : 400;
      res.status(status).json({ success: false, error: err.message });
    }
  }
);

// Remove filter
router.delete('/reports/:id/filters/:filterId', authenticate, async (req, res) => {
  try {
    const report = reportBuilder.removeFilter(req.params.id, req.params.filterId);
    res.json({ success: true, data: report });
  } catch (err) {
    const status = err.message.includes('غير موجود') ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

// Update filter
router.put(
  '/reports/:id/filters/:filterId',
  authenticate,
  authorize(['admin', 'manager', 'report_manager']),
  async (req, res) => {
    try {
      const report = reportBuilder.updateFilter(req.params.id, req.params.filterId, req.body);
      res.json({ success: true, data: report });
    } catch (err) {
      const status = err.message.includes('غير موجود') ? 404 : 500;
      res.status(status).json({ success: false, error: err.message });
    }
  }
);

// Set sorting
router.put(
  '/reports/:id/sorting',
  authenticate,
  authorize(['admin', 'manager', 'report_manager']),
  [param('id').notEmpty()],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;
      const report = reportBuilder.setSorting(req.params.id, req.body.sorting);
      res.json({ success: true, data: report });
    } catch (err) {
      const status = err.message.includes('غير موجود') ? 404 : 400;
      res.status(status).json({ success: false, error: err.message });
    }
  }
);

// Set grouping
router.put(
  '/reports/:id/group-by',
  authenticate,
  authorize(['admin', 'manager', 'report_manager']),
  [param('id').notEmpty()],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;
      const report = reportBuilder.setGroupBy(req.params.id, req.body.groupBy);
      res.json({ success: true, data: report });
    } catch (err) {
      const status = err.message.includes('غير موجود') ? 404 : 400;
      res.status(status).json({ success: false, error: err.message });
    }
  }
);

// Add calculated field
router.post(
  '/reports/:id/calculated-fields',
  authenticate,
  authorize(['admin', 'manager', 'report_manager']),
  [
    param('id').notEmpty(),
    body('name').notEmpty().withMessage('اسم الحقل مطلوب'),
    body('formula').notEmpty().withMessage('الصيغة مطلوبة'),
  ],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;
      const report = reportBuilder.addCalculatedField(req.params.id, req.body);
      res.json({ success: true, data: report });
    } catch (err) {
      const status = err.message.includes('غير موجود') ? 404 : 400;
      res.status(status).json({ success: false, error: err.message });
    }
  }
);

// Remove calculated field
router.delete('/reports/:id/calculated-fields/:fieldId', authenticate, async (req, res) => {
  try {
    const report = reportBuilder.removeCalculatedField(req.params.id, req.params.fieldId);
    res.json({ success: true, data: report });
  } catch (err) {
    const status = err.message.includes('غير موجود') ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

// Set chart configuration
router.put(
  '/reports/:id/chart',
  authenticate,
  authorize(['admin', 'manager', 'report_manager']),
  [param('id').notEmpty()],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;
      const report = reportBuilder.setChartConfig(req.params.id, req.body.chartConfig);
      res.json({ success: true, data: report });
    } catch (err) {
      const status = err.message.includes('غير موجود') ? 404 : 400;
      res.status(status).json({ success: false, error: err.message });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// EXECUTION — تنفيذ التقرير
// ══════════════════════════════════════════════════════════════════════════════

router.post('/reports/:id/execute', authenticate, [param('id').notEmpty()], async (req, res) => {
  try {
    if (handleValidation(req, res)) return;
    const result = reportBuilder.executeReport(req.params.id, {
      ...req.query,
      ...req.body,
      userId: req.user?.id,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    const status = err.message.includes('غير موجود') ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

router.get('/reports/:id/executions', authenticate, [param('id').notEmpty()], async (req, res) => {
  try {
    if (handleValidation(req, res)) return;
    const data = reportBuilder.getExecutionHistory(req.params.id, req.query);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATES — القوالب
// ══════════════════════════════════════════════════════════════════════════════

router.get('/templates', authenticate, async (req, res) => {
  try {
    const data = reportBuilder.getTemplates(req.query);
    res.json({ success: true, data, total: data.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/templates/:id', authenticate, [param('id').notEmpty()], async (req, res) => {
  try {
    if (handleValidation(req, res)) return;
    const tmpl = reportBuilder.getTemplateById(req.params.id);
    res.json({ success: true, data: tmpl });
  } catch (err) {
    const status = err.message.includes('غير موجود') ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

router.post(
  '/templates/:id/create-report',
  authenticate,
  authorize(['admin', 'manager', 'report_manager']),
  [param('id').notEmpty()],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;
      const report = reportBuilder.createReportFromTemplate(req.params.id, req.user?.id);
      res.status(201).json({ success: true, data: report });
    } catch (err) {
      const status = err.message.includes('غير موجود') ? 404 : 500;
      res.status(status).json({ success: false, error: err.message });
    }
  }
);

router.post(
  '/reports/:id/save-as-template',
  authenticate,
  authorize(['admin', 'manager']),
  [param('id').notEmpty()],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;
      const tmpl = reportBuilder.saveAsTemplate(req.params.id, {
        ...req.body,
        createdBy: req.user?.id,
      });
      res.status(201).json({ success: true, data: tmpl });
    } catch (err) {
      const status = err.message.includes('غير موجود') ? 404 : 500;
      res.status(status).json({ success: false, error: err.message });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT — تصدير
// ══════════════════════════════════════════════════════════════════════════════

router.post(
  '/reports/:id/export',
  authenticate,
  [
    param('id').notEmpty(),
    body('format').isIn(['pdf', 'excel', 'csv', 'json']).withMessage('صيغة غير مدعومة'),
  ],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;
      const result = reportBuilder.exportReport(req.params.id, req.body.format, req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      const status = err.message.includes('غير موجود') ? 404 : 400;
      res.status(status).json({ success: false, error: err.message });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// SCHEDULES — الجدولة
// ══════════════════════════════════════════════════════════════════════════════

router.get('/schedules', authenticate, async (req, res) => {
  try {
    const data = reportBuilder.getSchedules(req.query.reportId);
    res.json({ success: true, data, total: data.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post(
  '/schedules',
  authenticate,
  authorize(['admin', 'manager', 'report_manager']),
  [
    body('reportId').notEmpty().withMessage('معرف التقرير مطلوب'),
    body('frequency')
      .isIn(['daily', 'weekly', 'monthly', 'quarterly'])
      .withMessage('التكرار غير مدعوم'),
  ],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;
      const schedule = reportBuilder.createSchedule({ ...req.body, createdBy: req.user?.id });
      res.status(201).json({ success: true, data: schedule });
    } catch (err) {
      const status = err.message.includes('غير موجود') ? 404 : 400;
      res.status(status).json({ success: false, error: err.message });
    }
  }
);

router.put(
  '/schedules/:id',
  authenticate,
  authorize(['admin', 'manager', 'report_manager']),
  [param('id').notEmpty()],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;
      const schedule = reportBuilder.updateSchedule(req.params.id, req.body);
      res.json({ success: true, data: schedule });
    } catch (err) {
      const status = err.message.includes('غير موجود') ? 404 : 400;
      res.status(status).json({ success: false, error: err.message });
    }
  }
);

router.delete(
  '/schedules/:id',
  authenticate,
  authorize(['admin', 'manager']),
  [param('id').notEmpty()],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;
      reportBuilder.deleteSchedule(req.params.id);
      res.json({ success: true, message: 'تم حذف الجدولة' });
    } catch (err) {
      const status = err.message.includes('غير موجود') ? 404 : 500;
      res.status(status).json({ success: false, error: err.message });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// SHARING — المشاركة
// ══════════════════════════════════════════════════════════════════════════════

router.post(
  '/reports/:id/share',
  authenticate,
  authorize(['admin', 'manager']),
  [param('id').notEmpty()],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;
      const share = reportBuilder.shareReport(req.params.id, {
        ...req.body,
        sharedBy: req.user?.id,
      });
      res.status(201).json({ success: true, data: share });
    } catch (err) {
      const status = err.message.includes('غير موجود') ? 404 : 400;
      res.status(status).json({ success: false, error: err.message });
    }
  }
);

router.get('/reports/:id/shares', authenticate, [param('id').notEmpty()], async (req, res) => {
  try {
    if (handleValidation(req, res)) return;
    const data = reportBuilder.getReportShares(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// FAVORITES — المفضلة
// ══════════════════════════════════════════════════════════════════════════════

router.post('/reports/:id/favorite', authenticate, [param('id').notEmpty()], async (req, res) => {
  try {
    if (handleValidation(req, res)) return;
    const result = reportBuilder.toggleFavorite(req.user?.id || 'u1', req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    const status = err.message.includes('غير موجود') ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

router.get('/favorites', authenticate, async (req, res) => {
  try {
    const data = reportBuilder.getUserFavorites(req.user?.id || 'u1');
    res.json({ success: true, data, total: data.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// VERSIONS — سجل الإصدارات
// ══════════════════════════════════════════════════════════════════════════════

router.get('/reports/:id/versions', authenticate, [param('id').notEmpty()], async (req, res) => {
  try {
    if (handleValidation(req, res)) return;
    const data = reportBuilder.getReportVersions(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
