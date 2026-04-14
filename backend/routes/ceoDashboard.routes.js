/**
 * CEO Executive Dashboard Routes — مسارات لوحة تحكم الإدارة التنفيذية
 * Phase 19
 */
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken: authenticate, authorize } = require('../middleware/auth');
const svc = require('../services/ceoDashboard.service');

const router = express.Router();

/* ── helpers ── */
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};
const getUserId = req => req.user?.id || req.user?.userId || 'u1';
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ════════════════════════════════════════════
   EXECUTIVE DASHBOARD — لوحة التحكم التنفيذية
   ════════════════════════════════════════════ */
router.get(
  '/dashboard',
  authenticate,
  wrap((req, res) => {
    const data = svc.getExecutiveDashboard();
    res.json({ success: true, data });
  })
);

/* ════════════════════════════════════════════
   REFERENCE DATA — البيانات المرجعية
   ════════════════════════════════════════════ */
router.get('/departments-list', authenticate, (req, res) =>
  res.json({ success: true, data: svc.getDepartmentList() })
);
router.get('/kpi-categories', authenticate, (req, res) =>
  res.json({ success: true, data: svc.getKPICategories() })
);
router.get('/widget-types', authenticate, (req, res) =>
  res.json({ success: true, data: svc.getWidgetTypes() })
);
router.get('/alert-severities', authenticate, (req, res) =>
  res.json({ success: true, data: svc.getAlertSeverities() })
);
router.get('/periods', authenticate, (req, res) =>
  res.json({ success: true, data: svc.getPeriods() })
);
router.get('/strategic-statuses', authenticate, (req, res) =>
  res.json({ success: true, data: svc.getStrategicStatuses() })
);
router.get(
  '/statistics',
  authenticate,
  wrap((req, res) => res.json({ success: true, data: svc.getStatistics() }))
);

/* ════════════════════════════════════════════
   KPIs — مؤشرات الأداء الرئيسية
   ════════════════════════════════════════════ */
router.get(
  '/kpis',
  authenticate,
  wrap((req, res) => {
    const data = svc.listKPIs(req.query.category);
    res.json({ success: true, data });
  })
);

router.get(
  '/kpis/:id',
  authenticate,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getKPI(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'مؤشر الأداء غير موجود' });
    res.json({ success: true, data });
  })
);

router.post(
  '/kpis',
  authenticate,
  authorize(['admin', 'ceo', 'manager']),
  [
    body('code').notEmpty().withMessage('رمز المؤشر مطلوب'),
    body('nameAr').notEmpty().withMessage('الاسم بالعربية مطلوب'),
  ],
  handleValidation,
  wrap((req, res) => {
    const data = svc.createKPI(req.body, getUserId(req));
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/kpis/:id',
  authenticate,
  authorize(['admin', 'ceo', 'manager']),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.updateKPI(req.params.id, req.body, getUserId(req));
    if (!data) return res.status(404).json({ success: false, message: 'مؤشر الأداء غير موجود' });
    res.json({ success: true, data });
  })
);

router.delete(
  '/kpis/:id',
  authenticate,
  authorize(['admin', 'ceo']),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const ok = svc.deleteKPI(req.params.id, getUserId(req));
    if (!ok) return res.status(404).json({ success: false, message: 'مؤشر الأداء غير موجود' });
    res.json({ success: true, message: 'تم حذف مؤشر الأداء بنجاح' });
  })
);

/* ── KPI Trends — اتجاهات المؤشرات ── */
router.get(
  '/kpis/:id/trend',
  authenticate,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getKPITrend(req.params.id, req.query.period);
    res.json({ success: true, data });
  })
);

router.post(
  '/kpis/:id/snapshots',
  authenticate,
  authorize(['admin', 'ceo', 'manager']),
  param('id').notEmpty(),
  [
    body('value').isNumeric().withMessage('القيمة مطلوبة'),
    body('period').notEmpty().withMessage('الفترة مطلوبة'),
  ],
  handleValidation,
  wrap((req, res) => {
    const data = svc.addKPISnapshot(req.params.id, req.body.value, req.body.period, getUserId(req));
    if (!data) return res.status(404).json({ success: false, message: 'مؤشر الأداء غير موجود' });
    res.status(201).json({ success: true, data });
  })
);

/* ════════════════════════════════════════════
   ALERTS — التنبيهات التنفيذية
   ════════════════════════════════════════════ */
router.get(
  '/alerts',
  authenticate,
  wrap((req, res) => {
    const { severity, category, isResolved, unreadOnly } = req.query;
    const filters = {};
    if (severity) filters.severity = severity;
    if (category) filters.category = category;
    if (isResolved !== undefined) filters.isResolved = isResolved === 'true';
    if (unreadOnly) filters.unreadOnly = unreadOnly === 'true';
    const data = svc.listAlerts(filters);
    res.json({ success: true, data });
  })
);

router.get(
  '/alerts/:id',
  authenticate,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getAlert(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'التنبيه غير موجود' });
    res.json({ success: true, data });
  })
);

router.post(
  '/alerts',
  authenticate,
  authorize(['admin', 'ceo', 'manager']),
  [body('titleAr').notEmpty().withMessage('عنوان التنبيه مطلوب')],
  handleValidation,
  wrap((req, res) => {
    const data = svc.createAlert(req.body, getUserId(req));
    res.status(201).json({ success: true, data });
  })
);

router.patch(
  '/alerts/:id/read',
  authenticate,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.markAlertRead(req.params.id, getUserId(req));
    if (!data) return res.status(404).json({ success: false, message: 'التنبيه غير موجود' });
    res.json({ success: true, data });
  })
);

router.patch(
  '/alerts/:id/resolve',
  authenticate,
  authorize(['admin', 'ceo', 'manager']),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.resolveAlert(req.params.id, getUserId(req), req.body.resolution);
    if (!data) return res.status(404).json({ success: false, message: 'التنبيه غير موجود' });
    res.json({ success: true, data });
  })
);

router.delete(
  '/alerts/:id',
  authenticate,
  authorize(['admin', 'ceo']),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const ok = svc.dismissAlert(req.params.id, getUserId(req));
    if (!ok) return res.status(404).json({ success: false, message: 'التنبيه غير موجود' });
    res.json({ success: true, message: 'تم حذف التنبيه بنجاح' });
  })
);

/* ════════════════════════════════════════════
   STRATEGIC GOALS — الأهداف الاستراتيجية
   ════════════════════════════════════════════ */
router.get(
  '/goals',
  authenticate,
  wrap((req, res) => {
    const data = svc.listGoals(req.query.status);
    res.json({ success: true, data });
  })
);

router.get(
  '/goals/:id',
  authenticate,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getGoal(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'الهدف غير موجود' });
    res.json({ success: true, data });
  })
);

router.post(
  '/goals',
  authenticate,
  authorize(['admin', 'ceo']),
  [body('nameAr').notEmpty().withMessage('اسم الهدف بالعربية مطلوب')],
  handleValidation,
  wrap((req, res) => {
    const data = svc.createGoal(req.body, getUserId(req));
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/goals/:id',
  authenticate,
  authorize(['admin', 'ceo', 'manager']),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.updateGoal(req.params.id, req.body, getUserId(req));
    if (!data) return res.status(404).json({ success: false, message: 'الهدف غير موجود' });
    res.json({ success: true, data });
  })
);

router.delete(
  '/goals/:id',
  authenticate,
  authorize(['admin', 'ceo']),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const ok = svc.deleteGoal(req.params.id, getUserId(req));
    if (!ok) return res.status(404).json({ success: false, message: 'الهدف غير موجود' });
    res.json({ success: true, message: 'تم حذف الهدف بنجاح' });
  })
);

/* ════════════════════════════════════════════
   DEPARTMENT PERFORMANCE — أداء الأقسام
   ════════════════════════════════════════════ */
router.get(
  '/departments',
  authenticate,
  wrap((req, res) => {
    const data = svc.listDepartments();
    res.json({ success: true, data });
  })
);

router.get(
  '/departments/comparison',
  authenticate,
  wrap((req, res) => {
    const data = svc.getDepartmentComparison();
    res.json({ success: true, data });
  })
);

router.get(
  '/departments/:id',
  authenticate,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getDepartment(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'القسم غير موجود' });
    res.json({ success: true, data });
  })
);

router.put(
  '/departments/:id',
  authenticate,
  authorize(['admin', 'ceo', 'manager']),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.updateDepartment(req.params.id, req.body, getUserId(req));
    if (!data) return res.status(404).json({ success: false, message: 'القسم غير موجود' });
    res.json({ success: true, data });
  })
);

/* ════════════════════════════════════════════
   WIDGETS & LAYOUTS — الأدوات والتخطيطات
   ════════════════════════════════════════════ */
router.get(
  '/widgets',
  authenticate,
  wrap((req, res) => res.json({ success: true, data: svc.listWidgets() }))
);

router.get(
  '/widgets/:id',
  authenticate,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getWidget(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'الأداة غير موجودة' });
    res.json({ success: true, data });
  })
);

router.post(
  '/widgets',
  authenticate,
  authorize(['admin', 'ceo', 'manager']),
  [body('title').notEmpty().withMessage('عنوان الأداة مطلوب')],
  handleValidation,
  wrap((req, res) => {
    const data = svc.createWidget(req.body, getUserId(req));
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/widgets/:id',
  authenticate,
  authorize(['admin', 'ceo', 'manager']),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.updateWidget(req.params.id, req.body, getUserId(req));
    if (!data) return res.status(404).json({ success: false, message: 'الأداة غير موجودة' });
    res.json({ success: true, data });
  })
);

router.delete(
  '/widgets/:id',
  authenticate,
  authorize(['admin', 'ceo']),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const ok = svc.deleteWidget(req.params.id, getUserId(req));
    if (!ok) return res.status(404).json({ success: false, message: 'الأداة غير موجودة' });
    res.json({ success: true, message: 'تم حذف الأداة بنجاح' });
  })
);

/* ── Layouts ── */
router.get(
  '/layouts',
  authenticate,
  wrap((req, res) => res.json({ success: true, data: svc.listLayouts() }))
);

router.get(
  '/layouts/:id',
  authenticate,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getLayout(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'التخطيط غير موجود' });
    res.json({ success: true, data });
  })
);

router.post(
  '/layouts',
  authenticate,
  authorize(['admin', 'ceo', 'manager']),
  [body('name').notEmpty().withMessage('اسم التخطيط مطلوب')],
  handleValidation,
  wrap((req, res) => {
    const data = svc.createLayout(req.body, getUserId(req));
    res.status(201).json({ success: true, data });
  })
);

router.patch(
  '/layouts/:id/set-default',
  authenticate,
  authorize(['admin', 'ceo']),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.setDefaultLayout(req.params.id, getUserId(req));
    if (!data) return res.status(404).json({ success: false, message: 'التخطيط غير موجود' });
    res.json({ success: true, data });
  })
);

router.delete(
  '/layouts/:id',
  authenticate,
  authorize(['admin', 'ceo']),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const ok = svc.deleteLayout(req.params.id, getUserId(req));
    if (!ok)
      return res
        .status(404)
        .json({ success: false, message: 'لا يمكن حذف التخطيط (افتراضي أو غير موجود)' });
    res.json({ success: true, message: 'تم حذف التخطيط بنجاح' });
  })
);

/* ════════════════════════════════════════════
   BENCHMARKS — المقارنة المعيارية
   ════════════════════════════════════════════ */
router.get(
  '/benchmarks',
  authenticate,
  wrap((req, res) => res.json({ success: true, data: svc.listBenchmarks() }))
);

router.get(
  '/benchmarks/:kpiCode',
  authenticate,
  param('kpiCode').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getBenchmarkForKPI(req.params.kpiCode);
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: 'لا توجد مقارنة معيارية لهذا المؤشر' });
    res.json({ success: true, data });
  })
);

/* ════════════════════════════════════════════
   EXECUTIVE REPORTS — التقارير التنفيذية
   ════════════════════════════════════════════ */
router.get(
  '/reports',
  authenticate,
  wrap((req, res) => res.json({ success: true, data: svc.listReports() }))
);

router.get(
  '/reports/:id',
  authenticate,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getReport(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
    res.json({ success: true, data });
  })
);

router.post(
  '/reports/generate',
  authenticate,
  authorize(['admin', 'ceo', 'manager']),
  wrap((req, res) => {
    const data = svc.generateReport(req.body.type, req.body.period, getUserId(req));
    res.status(201).json({ success: true, data });
  })
);

router.get(
  '/reports/:id/export',
  authenticate,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.exportReport(req.params.id, req.query.format || 'json');
    if (!data) return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
    res.json({ success: true, data });
  })
);

/* ════════════════════════════════════════════
   COMPARATIVE ANALYTICS — التحليلات المقارنة
   ════════════════════════════════════════════ */
router.get(
  '/compare',
  authenticate,
  [
    query('period1').notEmpty().withMessage('الفترة الأولى مطلوبة'),
    query('period2').notEmpty().withMessage('الفترة الثانية مطلوبة'),
  ],
  handleValidation,
  wrap((req, res) => {
    const data = svc.getComparativeAnalysis(req.query.period1, req.query.period2);
    res.json({ success: true, data });
  })
);

/* ════════════════════════════════════════════
   AUDIT LOG — سجل المراجعة
   ════════════════════════════════════════════ */
router.get(
  '/audit-log',
  authenticate,
  authorize(['admin', 'ceo']),
  wrap((req, res) => {
    const MAX_AUDIT_LIMIT = 100;
    const limit = req.query.limit
      ? Math.min(parseInt(req.query.limit, 10), MAX_AUDIT_LIMIT)
      : undefined;
    const data = svc.getAuditLog(limit);
    res.json({ success: true, data });
  })
);

module.exports = router;
