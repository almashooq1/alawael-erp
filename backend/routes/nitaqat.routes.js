/**
 * Nitaqat Routes — مسارات نطاقات + WPS + عقود قوى
 *
 * البرومبت 18: تكامل وزارة الموارد البشرية (MHRSD)
 *
 * نطاقات:
 *   POST /api/nitaqat/calculate          — حساب نطاقات المنشأة
 *   GET  /api/nitaqat/latest             — آخر حساب
 *   GET  /api/nitaqat/history            — سجل الحسابات
 *   POST /api/nitaqat/what-if            — تحليل "ماذا لو"
 *   GET  /api/nitaqat/dashboard          — لوحة التحكم
 *   GET  /api/nitaqat/activity-params    — معاملات الأنشطة
 *   POST /api/nitaqat/activity-params    — إضافة/تعديل معاملات
 *
 * WPS / مُدد:
 *   POST /api/nitaqat/wps/generate       — توليد ملف SIF
 *   POST /api/nitaqat/wps/validate       — التحقق من الامتثال
 *   PUT  /api/nitaqat/wps/:period/upload — تسجيل رفع الملف
 *   GET  /api/nitaqat/wps                — سجلات WPS
 *   GET  /api/nitaqat/wps/dashboard      — لوحة WPS
 *
 * العقود (قوى):
 *   POST /api/nitaqat/contracts          — إنشاء عقد
 *   POST /api/nitaqat/contracts/:id/submit-qiwa — رفع لقوى
 *   PUT  /api/nitaqat/contracts/:id/status — تحديث الحالة
 *   GET  /api/nitaqat/contracts          — قائمة العقود
 *   GET  /api/nitaqat/contracts/:id      — تفاصيل عقد
 *   GET  /api/nitaqat/contracts/stats    — إحصاءات
 *
 * @module routes/nitaqat
 */
'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const nitaqatService = require('../services/nitaqat.service');
const wpsService = require('../services/wps-enhanced.service');
const contractService = require('../services/contract.service');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// جميع المسارات تتطلب مصادقة
router.use(authenticateToken);
router.use(requireBranchAccess);
// ══════════════════════════════════════════════════════
// نطاقات — Nitaqat
// ══════════════════════════════════════════════════════

/**
 * POST /api/nitaqat/calculate
 * حساب نطاقات المنشأة من بيانات الموظفين الفعليين
 */
router.post(
  '/calculate',
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const { organization, employees } = req.body;
    if (!organization || !employees) {
      return res.status(400).json({ success: false, message: 'organization وemployees مطلوبان' });
    }
    const result = await nitaqatService.calculateNitaqat(
      organization,
      employees,
      req.user._id || req.user.id
    );
    res.json({ success: true, data: result });
  })
);

/**
 * GET /api/nitaqat/latest?organizationId=xxx
 * آخر حساب نطاقات للمنشأة
 */
router.get(
  '/latest',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.query;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'organizationId مطلوب' });
    }
    const result = await nitaqatService.getLatestCalculation(organizationId);
    res.json({ success: true, data: result });
  })
);

/**
 * GET /api/nitaqat/history?organizationId=xxx&limit=12
 * سجل حسابات نطاقات (تاريخي)
 */
router.get(
  '/history',
  asyncHandler(async (req, res) => {
    const { organizationId, limit } = req.query;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'organizationId مطلوب' });
    }
    const result = await nitaqatService.getCalculationHistory(organizationId, Number(limit) || 12);
    res.json({ success: true, data: result });
  })
);

/**
 * POST /api/nitaqat/what-if
 * تحليل "ماذا لو" — كم سعودي يلزم للنطاق الأعلى
 */
router.post(
  '/what-if',
  asyncHandler(async (req, res) => {
    const { organizationId, additionalSaudis } = req.body;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'organizationId مطلوب' });
    }
    const result = await nitaqatService.whatIfAnalysis(
      organizationId,
      Number(additionalSaudis) || 1
    );
    res.json({ success: true, data: result });
  })
);

/**
 * GET /api/nitaqat/dashboard?organizationId=xxx
 * لوحة تحكم نطاقات
 */
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.query;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'organizationId مطلوب' });
    }
    const result = await nitaqatService.getDashboardStats(organizationId);
    res.json({ success: true, data: result });
  })
);

/**
 * GET /api/nitaqat/activity-params
 * قائمة معاملات الأنشطة الاقتصادية
 */
router.get(
  '/activity-params',
  asyncHandler(async (req, res) => {
    const result = await nitaqatService.listActivityParams();
    res.json({ success: true, data: result });
  })
);

/**
 * POST /api/nitaqat/activity-params
 * إضافة / تحديث معاملات نشاط اقتصادي
 */
router.post(
  '/activity-params',
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    const result = await nitaqatService.upsertActivityParams(req.body);
    res.json({ success: true, data: result, message: 'تم حفظ معاملات النشاط بنجاح' });
  })
);

// ══════════════════════════════════════════════════════
// WPS / مُدد — حماية الأجور
// ══════════════════════════════════════════════════════

/**
 * GET /api/nitaqat/wps/dashboard?organizationId=xxx
 * لوحة تحكم WPS — يجب قبل /wps/:period
 */
router.get(
  '/wps/dashboard',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.query;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'organizationId مطلوب' });
    }
    const result = await wpsService.getDashboardStats(organizationId);
    res.json({ success: true, data: result });
  })
);

/**
 * GET /api/nitaqat/wps?organizationId=xxx
 * سجلات WPS للمنشأة
 */
router.get(
  '/wps',
  asyncHandler(async (req, res) => {
    const { organizationId, status, year } = req.query;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'organizationId مطلوب' });
    }
    const result = await wpsService.getRecords(organizationId, { status, year });
    res.json({ success: true, data: result });
  })
);

/**
 * POST /api/nitaqat/wps/generate
 * توليد ملف SIF من بيانات الرواتب
 */
router.post(
  '/wps/generate',
  authorize(['admin', 'hr_manager', 'finance_manager']),
  asyncHandler(async (req, res) => {
    const { organization, period, payrollItems } = req.body;
    if (!organization || !period || !payrollItems) {
      return res
        .status(400)
        .json({ success: false, message: 'organization وperiod وpayrollItems مطلوبة' });
    }
    const result = await wpsService.generateSalaryFile(
      organization,
      period,
      payrollItems,
      req.user._id || req.user.id
    );
    res.json({
      success: true,
      data: {
        record: result.record,
        fileName: result.fileName,
        previewLines: result.fileContent.split('\n').slice(0, 5),
      },
      message: 'تم توليد ملف SIF بنجاح',
    });
  })
);

/**
 * POST /api/nitaqat/wps/validate
 * التحقق من امتثال بنود الرواتب مع WPS
 */
router.post(
  '/wps/validate',
  authorize(['admin', 'hr_manager', 'finance_manager']),
  asyncHandler(async (req, res) => {
    const { payrollItems } = req.body;
    if (!payrollItems || !Array.isArray(payrollItems)) {
      return res.status(400).json({ success: false, message: 'payrollItems مطلوبة' });
    }
    const result = wpsService.validateCompliance(payrollItems);
    res.json({ success: true, data: result });
  })
);

/**
 * PUT /api/nitaqat/wps/:period/upload
 * تسجيل رفع الملف لمُدد
 */
router.put(
  '/wps/:period/upload',
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const { period } = req.params;
    const { organizationId, mudadNotes } = req.body;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'organizationId مطلوب' });
    }
    const result = await wpsService.markAsUploaded(
      organizationId,
      period,
      req.user._id || req.user.id,
      mudadNotes
    );
    res.json({ success: true, data: result, message: 'تم تسجيل رفع الملف لمُدد' });
  })
);

// ══════════════════════════════════════════════════════
// عقود العمل (قوى) — Contracts
// ══════════════════════════════════════════════════════

/**
 * GET /api/nitaqat/contracts/stats?organizationId=xxx
 * إحصاءات العقود — يجب قبل /:id
 */
router.get(
  '/contracts/stats',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.query;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'organizationId مطلوب' });
    }
    const result = await contractService.getStats(organizationId);
    res.json({ success: true, data: result });
  })
);

/**
 * GET /api/nitaqat/contracts
 * قائمة عقود المنشأة
 */
router.get(
  '/contracts',
  asyncHandler(async (req, res) => {
    const { organizationId, status, employeeId, contractType } = req.query;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'organizationId مطلوب' });
    }
    const result = await contractService.getContracts(organizationId, {
      status,
      employeeId,
      contractType,
    });
    res.json({ success: true, data: result });
  })
);

/**
 * POST /api/nitaqat/contracts
 * إنشاء عقد عمل جديد (مسودة)
 */
router.post(
  '/contracts',
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const { employeeId, organizationId, ...data } = req.body;
    if (!employeeId || !organizationId) {
      return res
        .status(400)
        .json({ success: false, message: 'employeeId وorganizationId مطلوبان' });
    }
    const result = await contractService.createContract(
      employeeId,
      organizationId,
      data,
      req.user._id || req.user.id
    );
    res.status(201).json({ success: true, data: result, message: 'تم إنشاء العقد بنجاح' });
  })
);

/**
 * GET /api/nitaqat/contracts/:id
 * تفاصيل عقد واحد
 */
router.get(
  '/contracts/:id',
  asyncHandler(async (req, res) => {
    const result = await contractService.getContract(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'العقد غير موجود' });
    res.json({ success: true, data: result });
  })
);

/**
 * POST /api/nitaqat/contracts/:id/submit-qiwa
 * رفع العقد لمنصة قوى للتوثيق
 */
router.post(
  '/contracts/:id/submit-qiwa',
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const { employeeData, organizationData } = req.body;
    if (!employeeData || !organizationData) {
      return res
        .status(400)
        .json({ success: false, message: 'employeeData وorganizationData مطلوبان' });
    }
    const result = await contractService.submitToQiwa(
      req.params.id,
      { ...employeeData, updatedBy: req.user._id || req.user.id },
      organizationData
    );
    res.json({ success: true, data: result, message: 'تم رفع العقد لمنصة قوى بنجاح' });
  })
);

/**
 * PUT /api/nitaqat/contracts/:id/status
 * تحديث حالة العقد
 */
router.put(
  '/contracts/:id/status',
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'status مطلوب' });
    const result = await contractService.updateStatus(
      req.params.id,
      status,
      req.user._id || req.user.id
    );
    res.json({ success: true, data: result, message: 'تم تحديث حالة العقد' });
  })
);

module.exports = router;
