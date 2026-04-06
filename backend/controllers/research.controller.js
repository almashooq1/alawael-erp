/**
 * Research & Evidence-Based Practice Controller — متحكم البحث العلمي وقياس الأثر
 *
 * Handles HTTP requests for:
 *  1. Research Studies (CRUD + status transitions)
 *  2. Outcome Measures (CRUD + seed standard measures)
 *  3. Anonymized Datasets (CRUD + access logging)
 *  4. Program Effectiveness Reports (CRUD + approval workflow)
 *  5. Benchmarking Reports (CRUD)
 *  6. Research Data Exports (CRUD + approve/revoke)
 *  7. Dashboard / Statistics
 */
const logger = require('../utils/logger');
const researchService = require('../services/research.service');

// ─── Helpers ───────────────────────────────────────────────────────────────

const handleError = (res, error, context) => {
  logger.error(`Research controller error [${context}]:`, {
    message: 'حدث خطأ داخلي',
  });
  const status = error.name === 'ValidationError' ? 400 : 500;
  return res.status(status).json({
    success: false,
    message: status === 400 ? error.message : 'حدث خطأ في الخادم',
  });
};

// ═══════════════════════════════════════════════════════════════════════════
// §1  Research Studies — الدراسات البحثية
// ═══════════════════════════════════════════════════════════════════════════

const getStudies = async (req, res) => {
  try {
    const result = await researchService.getStudies(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error, 'getStudies');
  }
};

const getStudyById = async (req, res) => {
  try {
    const study = await researchService.getStudyById(req.params.id);
    if (!study) return res.status(404).json({ success: false, message: 'الدراسة غير موجودة' });
    res.json({ success: true, data: study });
  } catch (error) {
    handleError(res, error, 'getStudyById');
  }
};

const createStudy = async (req, res) => {
  try {
    const study = await researchService.createStudy(req.body, req.user._id || req.user.id);
    res.status(201).json({ success: true, data: study, message: 'تم إنشاء الدراسة بنجاح' });
  } catch (error) {
    handleError(res, error, 'createStudy');
  }
};

const updateStudy = async (req, res) => {
  try {
    const study = await researchService.updateStudy(req.params.id, req.body);
    if (!study) return res.status(404).json({ success: false, message: 'الدراسة غير موجودة' });
    res.json({ success: true, data: study, message: 'تم تحديث الدراسة بنجاح' });
  } catch (error) {
    handleError(res, error, 'updateStudy');
  }
};

const deleteStudy = async (req, res) => {
  try {
    const study = await researchService.deleteStudy(req.params.id);
    if (!study) return res.status(404).json({ success: false, message: 'الدراسة غير موجودة' });
    res.json({ success: true, message: 'تم حذف الدراسة بنجاح' });
  } catch (error) {
    handleError(res, error, 'deleteStudy');
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// §2  Outcome Measures — مقاييس النتائج
// ═══════════════════════════════════════════════════════════════════════════

const getOutcomeMeasures = async (req, res) => {
  try {
    const result = await researchService.getOutcomeMeasures(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error, 'getOutcomeMeasures');
  }
};

const getOutcomeMeasureById = async (req, res) => {
  try {
    const measure = await researchService.getOutcomeMeasureById(req.params.id);
    if (!measure) return res.status(404).json({ success: false, message: 'المقياس غير موجود' });
    res.json({ success: true, data: measure });
  } catch (error) {
    handleError(res, error, 'getOutcomeMeasureById');
  }
};

const createOutcomeMeasure = async (req, res) => {
  try {
    const measure = await researchService.createOutcomeMeasure(
      req.body,
      req.user._id || req.user.id
    );
    res.status(201).json({ success: true, data: measure, message: 'تم إنشاء المقياس بنجاح' });
  } catch (error) {
    handleError(res, error, 'createOutcomeMeasure');
  }
};

const updateOutcomeMeasure = async (req, res) => {
  try {
    const measure = await researchService.updateOutcomeMeasure(req.params.id, req.body);
    if (!measure) return res.status(404).json({ success: false, message: 'المقياس غير موجود' });
    res.json({ success: true, data: measure, message: 'تم تحديث المقياس بنجاح' });
  } catch (error) {
    handleError(res, error, 'updateOutcomeMeasure');
  }
};

const deleteOutcomeMeasure = async (req, res) => {
  try {
    const measure = await researchService.deleteOutcomeMeasure(req.params.id);
    if (!measure) return res.status(404).json({ success: false, message: 'المقياس غير موجود' });
    res.json({ success: true, message: 'تم حذف المقياس بنجاح' });
  } catch (error) {
    handleError(res, error, 'deleteOutcomeMeasure');
  }
};

const seedStandardMeasures = async (req, res) => {
  try {
    const result = await researchService.seedStandardMeasures(req.user._id || req.user.id);
    res.json({
      success: true,
      data: result,
      message: `تم تحميل ${result.created} مقياس معتمد دولياً (${result.skipped} موجود مسبقاً)`,
    });
  } catch (error) {
    handleError(res, error, 'seedStandardMeasures');
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// §3  Anonymized Datasets — مجموعات البيانات مجهولة الهوية
// ═══════════════════════════════════════════════════════════════════════════

const getDatasets = async (req, res) => {
  try {
    const result = await researchService.getDatasets(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error, 'getDatasets');
  }
};

const getDatasetById = async (req, res) => {
  try {
    const dataset = await researchService.getDatasetById(req.params.id);
    if (!dataset)
      return res.status(404).json({ success: false, message: 'مجموعة البيانات غير موجودة' });

    // Log access
    await researchService.logDatasetAccess(
      req.params.id,
      req.user._id || req.user.id,
      'view',
      req.ip,
      'View dataset details'
    );

    res.json({ success: true, data: dataset });
  } catch (error) {
    handleError(res, error, 'getDatasetById');
  }
};

const createDataset = async (req, res) => {
  try {
    const dataset = await researchService.createDataset(req.body, req.user._id || req.user.id);
    res
      .status(201)
      .json({ success: true, data: dataset, message: 'تم إنشاء مجموعة البيانات بنجاح' });
  } catch (error) {
    handleError(res, error, 'createDataset');
  }
};

const updateDataset = async (req, res) => {
  try {
    const dataset = await researchService.updateDataset(req.params.id, req.body);
    if (!dataset)
      return res.status(404).json({ success: false, message: 'مجموعة البيانات غير موجودة' });
    res.json({ success: true, data: dataset, message: 'تم تحديث مجموعة البيانات بنجاح' });
  } catch (error) {
    handleError(res, error, 'updateDataset');
  }
};

const deleteDataset = async (req, res) => {
  try {
    const dataset = await researchService.deleteDataset(req.params.id);
    if (!dataset)
      return res.status(404).json({ success: false, message: 'مجموعة البيانات غير موجودة' });
    res.json({ success: true, message: 'تم حذف مجموعة البيانات بنجاح' });
  } catch (error) {
    handleError(res, error, 'deleteDataset');
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// §4  Program Effectiveness Reports — تقارير فعالية البرامج
// ═══════════════════════════════════════════════════════════════════════════

const getEffectivenessReports = async (req, res) => {
  try {
    const result = await researchService.getEffectivenessReports(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error, 'getEffectivenessReports');
  }
};

const getEffectivenessReportById = async (req, res) => {
  try {
    const report = await researchService.getEffectivenessReportById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
    res.json({ success: true, data: report });
  } catch (error) {
    handleError(res, error, 'getEffectivenessReportById');
  }
};

const createEffectivenessReport = async (req, res) => {
  try {
    const report = await researchService.createEffectivenessReport(
      req.body,
      req.user._id || req.user.id
    );
    res.status(201).json({ success: true, data: report, message: 'تم إنشاء تقرير الفعالية بنجاح' });
  } catch (error) {
    handleError(res, error, 'createEffectivenessReport');
  }
};

const updateEffectivenessReport = async (req, res) => {
  try {
    const report = await researchService.updateEffectivenessReport(req.params.id, req.body);
    if (!report) return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
    res.json({ success: true, data: report, message: 'تم تحديث تقرير الفعالية بنجاح' });
  } catch (error) {
    handleError(res, error, 'updateEffectivenessReport');
  }
};

const deleteEffectivenessReport = async (req, res) => {
  try {
    const report = await researchService.deleteEffectivenessReport(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
    res.json({ success: true, message: 'تم حذف تقرير الفعالية بنجاح' });
  } catch (error) {
    handleError(res, error, 'deleteEffectivenessReport');
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// §5  Benchmarking Reports — تقارير المقارنة المعيارية
// ═══════════════════════════════════════════════════════════════════════════

const getBenchmarkingReports = async (req, res) => {
  try {
    const result = await researchService.getBenchmarkingReports(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error, 'getBenchmarkingReports');
  }
};

const getBenchmarkingReportById = async (req, res) => {
  try {
    const report = await researchService.getBenchmarkingReportById(req.params.id);
    if (!report)
      return res.status(404).json({ success: false, message: 'تقرير المقارنة غير موجود' });
    res.json({ success: true, data: report });
  } catch (error) {
    handleError(res, error, 'getBenchmarkingReportById');
  }
};

const createBenchmarkingReport = async (req, res) => {
  try {
    const report = await researchService.createBenchmarkingReport(
      req.body,
      req.user._id || req.user.id
    );
    res.status(201).json({ success: true, data: report, message: 'تم إنشاء تقرير المقارنة بنجاح' });
  } catch (error) {
    handleError(res, error, 'createBenchmarkingReport');
  }
};

const updateBenchmarkingReport = async (req, res) => {
  try {
    const report = await researchService.updateBenchmarkingReport(req.params.id, req.body);
    if (!report)
      return res.status(404).json({ success: false, message: 'تقرير المقارنة غير موجود' });
    res.json({ success: true, data: report, message: 'تم تحديث تقرير المقارنة بنجاح' });
  } catch (error) {
    handleError(res, error, 'updateBenchmarkingReport');
  }
};

const deleteBenchmarkingReport = async (req, res) => {
  try {
    const report = await researchService.deleteBenchmarkingReport(req.params.id);
    if (!report)
      return res.status(404).json({ success: false, message: 'تقرير المقارنة غير موجود' });
    res.json({ success: true, message: 'تم حذف تقرير المقارنة بنجاح' });
  } catch (error) {
    handleError(res, error, 'deleteBenchmarkingReport');
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// §6  Research Data Exports — تصدير بيانات لمنصات البحث
// ═══════════════════════════════════════════════════════════════════════════

const getExports = async (req, res) => {
  try {
    const result = await researchService.getExports(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error, 'getExports');
  }
};

const getExportById = async (req, res) => {
  try {
    const exp = await researchService.getExportById(req.params.id);
    if (!exp) return res.status(404).json({ success: false, message: 'التصدير غير موجود' });
    res.json({ success: true, data: exp });
  } catch (error) {
    handleError(res, error, 'getExportById');
  }
};

const createExport = async (req, res) => {
  try {
    const exp = await researchService.createExport(req.body, req.user._id || req.user.id);
    res.status(201).json({ success: true, data: exp, message: 'تم إنشاء طلب التصدير بنجاح' });
  } catch (error) {
    handleError(res, error, 'createExport');
  }
};

const updateExport = async (req, res) => {
  try {
    // ── Mass-assignment protection: whitelist allowed fields ──
    const allowedFields = [
      'title',
      'description',
      'dataScope',
      'format',
      'filters',
      'fields',
      'anonymization',
      'compliance',
      'schedule',
      'destination',
      'status',
      'notes',
    ];
    const updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const exp = await researchService.updateExport(
      req.params.id,
      { $set: updates },
      req.user._id || req.user.id
    );
    if (!exp) return res.status(404).json({ success: false, message: 'التصدير غير موجود' });
    res.json({ success: true, data: exp, message: 'تم تحديث التصدير بنجاح' });
  } catch (error) {
    handleError(res, error, 'updateExport');
  }
};

const approveExport = async (req, res) => {
  try {
    const exp = await researchService.approveExport(req.params.id, req.user._id || req.user.id);
    if (!exp) return res.status(404).json({ success: false, message: 'التصدير غير موجود' });
    res.json({ success: true, data: exp, message: 'تمت الموافقة على التصدير بنجاح' });
  } catch (error) {
    handleError(res, error, 'approveExport');
  }
};

const revokeExport = async (req, res) => {
  try {
    const exp = await researchService.revokeExport(
      req.params.id,
      req.user._id || req.user.id,
      req.body.reason
    );
    if (!exp) return res.status(404).json({ success: false, message: 'التصدير غير موجود' });
    res.json({ success: true, data: exp, message: 'تم إلغاء التصدير بنجاح' });
  } catch (error) {
    handleError(res, error, 'revokeExport');
  }
};

const deleteExport = async (req, res) => {
  try {
    const exp = await researchService.deleteExport(req.params.id);
    if (!exp) return res.status(404).json({ success: false, message: 'التصدير غير موجود' });
    res.json({ success: true, message: 'تم حذف التصدير بنجاح' });
  } catch (error) {
    handleError(res, error, 'deleteExport');
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// §7  Dashboard — لوحة المعلومات
// ═══════════════════════════════════════════════════════════════════════════

const getDashboard = async (req, res) => {
  try {
    const stats = await researchService.getDashboardStats(req.query.organizationId);
    res.json({ success: true, data: stats });
  } catch (error) {
    handleError(res, error, 'getDashboard');
  }
};

module.exports = {
  // Studies
  getStudies,
  getStudyById,
  createStudy,
  updateStudy,
  deleteStudy,

  // Outcome Measures
  getOutcomeMeasures,
  getOutcomeMeasureById,
  createOutcomeMeasure,
  updateOutcomeMeasure,
  deleteOutcomeMeasure,
  seedStandardMeasures,

  // Anonymized Datasets
  getDatasets,
  getDatasetById,
  createDataset,
  updateDataset,
  deleteDataset,

  // Effectiveness Reports
  getEffectivenessReports,
  getEffectivenessReportById,
  createEffectivenessReport,
  updateEffectivenessReport,
  deleteEffectivenessReport,

  // Benchmarking Reports
  getBenchmarkingReports,
  getBenchmarkingReportById,
  createBenchmarkingReport,
  updateBenchmarkingReport,
  deleteBenchmarkingReport,

  // Data Exports
  getExports,
  getExportById,
  createExport,
  updateExport,
  approveExport,
  revokeExport,
  deleteExport,

  // Dashboard
  getDashboard,
};
