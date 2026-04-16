/**
 * مسارات منصة مُدد - نظام حماية الأجور
 * Mudad Platform Routes - Wage Protection System
 *
 * @module routes/mudad
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const mudadService = require('../services/mudad.service');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ============================================================
// إعدادات مُدد — Configuration
// ============================================================

/**
 * @route   GET /api/mudad/config
 * @desc    الحصول على إعدادات مُدد
 * @access  Admin, HR Manager
 */
router.get(
  '/config',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const result = await mudadService.getConfig(req.user.organizationId);
    res.json({ success: true, data: result });
  })
);

/**
 * @route   PUT /api/mudad/config
 * @desc    حفظ/تحديث إعدادات مُدد
 * @access  Admin
 */
router.put(
  '/config',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    const config = await mudadService.saveConfig(
      req.user.organizationId,
      req.body,
      req.user._id || req.user.id
    );
    res.json({ success: true, data: config, message: 'تم حفظ إعدادات مُدد بنجاح' });
  })
);

// ============================================================
// سجلات الرواتب — Salary Records
// ============================================================

/**
 * @route   POST /api/mudad/salary-records/generate
 * @desc    توليد سجلات الرواتب من بيانات الرواتب
 * @access  Admin, HR Manager
 */
router.post(
  '/salary-records/generate',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const { salaryMonth, establishmentId } = req.body;
    if (!salaryMonth || !establishmentId) {
      return res.status(400).json({
        success: false,
        message: 'شهر الراتب ورقم المنشأة مطلوبان',
      });
    }
    const result = await mudadService.generateSalaryRecords(
      salaryMonth,
      establishmentId,
      req.user._id || req.user.id
    );
    res.json({ success: true, data: result });
  })
);

/**
 * @route   GET /api/mudad/salary-records
 * @desc    الحصول على سجلات الرواتب
 * @access  Admin, HR Manager, Finance Manager
 */
router.get(
  '/salary-records',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'hr_manager', 'finance_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const { salaryMonth, establishmentId, status, mudadStatus, branch } = req.query;
    if (!salaryMonth || !establishmentId) {
      return res.status(400).json({
        success: false,
        message: 'شهر الراتب ورقم المنشأة مطلوبان',
      });
    }
    const result = await mudadService.getSalaryRecords(salaryMonth, establishmentId, {
      status,
      mudadStatus,
      branch,
    });
    res.json({ success: true, data: result });
  })
);

// ============================================================
// إدارة الدفعات — Batch Management
// ============================================================

/**
 * @route   POST /api/mudad/batches
 * @desc    إنشاء دفعة جديدة
 * @access  Admin, HR Manager
 */
router.post(
  '/batches',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const { salaryMonth, establishmentId } = req.body;
    const result = await mudadService.createBatch(
      salaryMonth,
      establishmentId,
      req.user._id || req.user.id
    );
    res.status(result.success ? 201 : 400).json({ success: result.success, data: result });
  })
);

/**
 * @route   GET /api/mudad/batches
 * @desc    قائمة الدفعات
 * @access  Admin, HR Manager, Finance Manager
 */
router.get(
  '/batches',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'hr_manager', 'finance_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const { establishmentId, status, salaryMonth } = req.query;
    const batches = await mudadService.getBatches(establishmentId, { status, salaryMonth });
    res.json({ success: true, data: batches });
  })
);

/**
 * @route   POST /api/mudad/batches/:id/validate
 * @desc    التحقق من صحة الدفعة
 * @access  Admin, HR Manager
 */
router.post(
  '/batches/:id/validate',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const result = await mudadService.validateBatch(req.params.id);
    res.json({ success: true, data: result });
  })
);

/**
 * @route   POST /api/mudad/batches/:id/generate-file
 * @desc    توليد ملف WPS
 * @access  Admin, HR Manager
 */
router.post(
  '/batches/:id/generate-file',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const result = await mudadService.generateWPSFile(req.params.id);
    res.json({ success: true, data: result });
  })
);

/**
 * @route   POST /api/mudad/batches/:id/upload
 * @desc    رفع الدفعة لمُدد
 * @access  Admin
 */
router.post(
  '/batches/:id/upload',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    const result = await mudadService.uploadBatch(req.params.id, req.user._id || req.user.id);
    res.json({ success: true, data: result, message: 'تم رفع الدفعة لمنصة مُدد بنجاح' });
  })
);

// ============================================================
// تقارير الامتثال — Compliance Reports
// ============================================================

/**
 * @route   POST /api/mudad/compliance/generate
 * @desc    توليد تقرير امتثال
 * @access  Admin, HR Manager
 */
router.post(
  '/compliance/generate',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const { reportMonth, establishmentId } = req.body;
    const result = await mudadService.generateComplianceReport(
      reportMonth,
      establishmentId,
      req.user._id || req.user.id
    );
    res.json({ success: true, data: result });
  })
);

/**
 * @route   GET /api/mudad/compliance
 * @desc    قائمة تقارير الامتثال
 * @access  Admin, HR Manager, Finance Manager
 */
router.get(
  '/compliance',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'hr_manager', 'finance_manager']),
  asyncHandler(async (req, res) => {
    const { establishmentId, year } = req.query;
    const reports = await mudadService.getComplianceReports(establishmentId, { year });
    res.json({ success: true, data: reports });
  })
);

// ============================================================
// لوحة التحكم — Dashboard
// ============================================================

/**
 * @route   GET /api/mudad/dashboard
 * @desc    إحصائيات لوحة التحكم
 * @access  Admin, HR Manager
 */
router.get(
  '/dashboard',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'hr_manager', 'finance_manager']),
  asyncHandler(async (req, res) => {
    const { establishmentId } = req.query;
    const stats = await mudadService.getDashboardStats(establishmentId);
    res.json({ success: true, data: stats });
  })
);

module.exports = router;
