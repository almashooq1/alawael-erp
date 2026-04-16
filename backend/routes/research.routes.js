/**
 * Research & Evidence-Based Practice Routes — مسارات البحث العلمي وقياس الأثر
 *
 * Base paths (mounted via dualMount):
 *   /api/research/…
 *   /api/v1/research/…
 *
 * Modules:
 *   /studies            — Research studies management
 *   /outcome-measures   — Internationally-recognized outcome measures (FIM, WHODAS, Barthel, GAS, …)
 *   /datasets           — Anonymized data for scientific research
 *   /effectiveness      — Evidence-based program effectiveness reports
 *   /benchmarking       — Comparative benchmarking with other centers
 *   /exports            — Data export to research platforms (REDCap, SPSS, Stata, R, …)
 *   /dashboard          — Statistics & KPIs
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/research.controller');
const { authenticateToken: authenticate, authorize } = require('../middleware/auth');

const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
// All routes require authentication
router.use(authenticate);
router.use(requireBranchAccess);
// ─── Dashboard ─────────────────────────────────────────────────────────────
router.get('/dashboard', controller.getDashboard);

// ─── Research Studies (الدراسات البحثية) ───────────────────────────────────
router.get('/studies', controller.getStudies);
router.get('/studies/:id', controller.getStudyById);
router.post(
  '/studies',
  authorize(['admin', 'manager', 'researcher', 'doctor']),
  controller.createStudy
);
router.put(
  '/studies/:id',
  authorize(['admin', 'manager', 'researcher', 'doctor']),
  controller.updateStudy
);
router.delete('/studies/:id', authorize(['admin', 'manager']), controller.deleteStudy);

// ─── Outcome Measures (مقاييس النتائج المعتمدة دولياً) ─────────────────────
router.get('/outcome-measures', controller.getOutcomeMeasures);
router.get('/outcome-measures/:id', controller.getOutcomeMeasureById);
router.post(
  '/outcome-measures',
  authorize(['admin', 'manager', 'researcher']),
  controller.createOutcomeMeasure
);
router.put(
  '/outcome-measures/:id',
  authorize(['admin', 'manager', 'researcher']),
  controller.updateOutcomeMeasure
);
router.delete('/outcome-measures/:id', authorize(['admin']), controller.deleteOutcomeMeasure);
router.post('/outcome-measures/seed', authorize(['admin']), controller.seedStandardMeasures);

// ─── Anonymized Datasets (مجموعات البيانات مجهولة الهوية) ──────────────────
router.get('/datasets', controller.getDatasets);
router.get('/datasets/:id', controller.getDatasetById);
router.post('/datasets', authorize(['admin', 'manager', 'researcher']), controller.createDataset);
router.put(
  '/datasets/:id',
  authorize(['admin', 'manager', 'researcher']),
  controller.updateDataset
);
router.delete('/datasets/:id', authorize(['admin', 'manager']), controller.deleteDataset);

// ─── Program Effectiveness Reports (تقارير فعالية البرامج التأهيلية) ────────
router.get('/effectiveness', controller.getEffectivenessReports);
router.get('/effectiveness/:id', controller.getEffectivenessReportById);
router.post(
  '/effectiveness',
  authorize(['admin', 'manager', 'researcher', 'doctor']),
  controller.createEffectivenessReport
);
router.put(
  '/effectiveness/:id',
  authorize(['admin', 'manager', 'researcher', 'doctor']),
  controller.updateEffectivenessReport
);
router.delete(
  '/effectiveness/:id',
  authorize(['admin', 'manager']),
  controller.deleteEffectivenessReport
);

// ─── Benchmarking Reports (تقارير المقارنة المعيارية) ──────────────────────
router.get('/benchmarking', controller.getBenchmarkingReports);
router.get('/benchmarking/:id', controller.getBenchmarkingReportById);
router.post('/benchmarking', authorize(['admin', 'manager']), controller.createBenchmarkingReport);
router.put(
  '/benchmarking/:id',
  authorize(['admin', 'manager']),
  controller.updateBenchmarkingReport
);
router.delete('/benchmarking/:id', authorize(['admin']), controller.deleteBenchmarkingReport);

// ─── Data Exports (تصدير بيانات لمنصات البحث) ─────────────────────────────
router.get('/exports', controller.getExports);
router.get('/exports/:id', controller.getExportById);
router.post('/exports', authorize(['admin', 'manager', 'researcher']), controller.createExport);
router.put('/exports/:id', authorize(['admin', 'manager', 'researcher']), controller.updateExport);
router.post('/exports/:id/approve', authorize(['admin', 'manager']), controller.approveExport);
router.post('/exports/:id/revoke', authorize(['admin']), controller.revokeExport);
router.delete('/exports/:id', authorize(['admin']), controller.deleteExport);

module.exports = router;
