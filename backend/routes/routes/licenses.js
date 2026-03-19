/**
 * License API Routes - مسارات واجهة برمجة تطبيقات الرخص
 * Advanced License Management API Endpoints
 */

const express = require('express');
const router = express.Router();
const licenseService = require('../services/LicenseEnhancedService');
const { authenticate, authorize } = require('../middleware/auth'); // سيتم إضافتها
const logger = require('../utils/logger');
const { asyncHandler, AppError } = require('../utils/errorHandler');

// ==================== MIDDLEWARE ====================

// التحقق من المصادقة لجميع المسارات
router.use(authenticate);

// ==================== CRUD ROUTES ====================

/**
 * POST /api/licenses
 * إنشاء رخصة جديدة
 * الأدوار المسموح: admin, license_manager
 */
router.post(
  '/',
  authorize(['admin', 'license_manager']),
  asyncHandler(async (req, res) => {
    const license = await licenseService.createLicense(req.body, req.user.id);
    res.status(201).json({
      success: true,
      message: 'تم إنشاء الرخصة بنجاح',
      data: license
    });
  })
);

/**
 * GET /api/licenses
 * البحث عن الرخص مع الفلترة
 * المعاملات:
 * - search: البحث النصي
 * - status: حالة الرخصة
 * - licenseType: نوع الرخصة
 * - expiringWithin: الرخص القريبة الانتهاء (بالأيام)
 * - page: رقم الصفحة
 * - limit: عدد النتائج في الصفحة
 * - sortBy: الحقل المراد الترتيب حسبه
 * - sortOrder: ترتيب اصعودي/تنازلي
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search, status, licenseType, expiringWithin, ...paginationOptions } = req.query;

    const result = await licenseService.searchLicenses(
      { search, status, licenseType, expiringWithin },
      {
        ...paginationOptions,
        page: parseInt(paginationOptions.page) || 1,
        limit: parseInt(paginationOptions.limit) || 20
      }
    );

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

/**
 * GET /api/licenses/:id
 * الحصول على تفاصيل رخصة معينة
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const license = await licenseService.getLicenseById(req.params.id);
    res.json({
      success: true,
      data: license
    });
  })
);

/**
 * GET /api/licenses/number/:licenseNumber
 * الحصول على رخصة برقم الرخصة
 */
router.get(
  '/number/:licenseNumber',
  asyncHandler(async (req, res) => {
    const license = await licenseService.getLicenseByNumber(
      req.params.licenseNumber
    );

    if (!license) {
      throw new AppError('الرخصة غير موجودة', 404);
    }

    res.json({
      success: true,
      data: license
    });
  })
);

/**
 * PUT /api/licenses/:id
 * تحديث رخصة
 */
router.put(
  '/:id',
  authorize(['admin', 'license_manager']),
  asyncHandler(async (req, res) => {
    const license = await licenseService.updateLicense(
      req.params.id,
      req.body,
      req.user.id
    );

    res.json({
      success: true,
      message: 'تم تحديث الرخصة بنجاح',
      data: license
    });
  })
);

/**
 * DELETE /api/licenses/:id
 * حذف رخصة
 */
router.delete(
  '/:id',
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    const result = await licenseService.deleteLicense(
      req.params.id,
      req.body.reason || '',
      req.user.id
    );

    res.json({
      success: true,
      message: result.message
    });
  })
);

// ==================== VERIFICATION ROUTES ====================

/**
 * POST /api/licenses/:id/verify
 * التحقق الشامل من الرخصة
 */
router.post(
  '/:id/verify',
  authorize(['admin', 'license_manager', 'compliance_officer']),
  asyncHandler(async (req, res) => {
    const results = await licenseService.verifyLicense(
      req.params.id,
      req.user.id
    );

    res.json({
      success: true,
      message: 'تم التحقق من الرخصة',
      data: results
    });
  })
);

// ==================== RENEWAL ROUTES ====================

/**
 * POST /api/licenses/:id/renew
 * تجديد رخصة
 */
router.post(
  '/:id/renew',
  authorize(['admin', 'license_manager']),
  asyncHandler(async (req, res) => {
    const license = await licenseService.renewLicense(
      req.params.id,
      req.body,
      req.user.id
    );

    res.json({
      success: true,
      message: 'تم تجديد الرخصة بنجاح',
      data: license
    });
  })
);

/**
 * GET /api/licenses/:id/renewal-history
 * الحصول على سجل التجديدات
 */
router.get(
  '/:id/renewal-history',
  asyncHandler(async (req, res) => {
    const history = await licenseService.getRenewalHistory(req.params.id);

    res.json({
      success: true,
      data: history
    });
  })
);

// ==================== ALERT ROUTES ====================

/**
 * POST /api/licenses/alerts/create-automated
 * إنشاء تنبيهات تلقائية
 */
router.post(
  '/alerts/create-automated',
  authorize(['admin', 'system']),
  asyncHandler(async (req, res) => {
    const alerts = await licenseService.createAutomatedAlerts();

    res.json({
      success: true,
      message: `تم إنشاء ${alerts.length} تنبيه`,
      count: alerts.length
    });
  })
);

/**
 * GET /api/licenses/:id/alerts
 * الحصول على تنبيهات رخصة معينة
 */
router.get(
  '/:id/alerts',
  asyncHandler(async (req, res) => {
    const alerts = await licenseService.getActiveAlerts(req.params.id);

    res.json({
      success: true,
      data: alerts,
      count: alerts.length
    });
  })
);

/**
 * GET /api/licenses/alerts/active
 * الحصول على جميع التنبيهات النشطة
 */
router.get(
  '/alerts/active',
  asyncHandler(async (req, res) => {
    const alerts = await licenseService.getActiveAlerts();

    res.json({
      success: true,
      data: alerts,
      count: alerts.length
    });
  })
);

// ==================== STATISTICS ROUTES ====================

/**
 * GET /api/licenses/statistics/overview
 * الحصول على إحصائيات عامة
 */
router.get(
  '/statistics/overview',
  asyncHandler(async (req, res) => {
    const statistics = await licenseService.getStatistics();

    res.json({
      success: true,
      data: statistics
    });
  })
);

// ==================== BULK OPERATIONS ====================

/**
 * POST /api/licenses/bulk/renew
 * تجديد عدة رخص دفعة واحدة
 */
router.post(
  '/bulk/renew',
  authorize(['admin', 'license_manager']),
  asyncHandler(async (req, res) => {
    const { licenseIds, renewalData } = req.body;

    if (!Array.isArray(licenseIds) || licenseIds.length === 0) {
      throw new AppError('يجب تحديد رخصة واحدة على الأقل', 400);
    }

    const results = [];
    for (const id of licenseIds) {
      try {
        const license = await licenseService.renewLicense(
          id,
          renewalData,
          req.user.id
        );
        results.push({ id, success: true, license });
      } catch (error) {
        results.push({ id, success: false, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `تم معالجة ${results.length} رخصة`,
      data: results
    });
  })
);

/**
 * POST /api/licenses/bulk/verify
 * التحقق من عدة رخص
 */
router.post(
  '/bulk/verify',
  authorize(['admin', 'license_manager', 'compliance_officer']),
  asyncHandler(async (req, res) => {
    const { licenseIds } = req.body;

    if (!Array.isArray(licenseIds) || licenseIds.length === 0) {
      throw new AppError('يجب تحديد رخصة واحدة على الأقل', 400);
    }

    const results = [];
    for (const id of licenseIds) {
      try {
        const verificationResults = await licenseService.verifyLicense(
          id,
          req.user.id
        );
        results.push({ id, success: true, verificationResults });
      } catch (error) {
        results.push({ id, success: false, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `تم التحقق من ${results.length} رخصة`,
      data: results
    });
  })
);

// ==================== EXPORT ROUTES ====================

/**
 * POST /api/licenses/export/pdf
 * تصدير الرخص إلى PDF
 */
router.post(
  '/export/pdf',
  authorize(['admin', 'license_manager', 'compliance_officer']),
  asyncHandler(async (req, res) => {
    // سيتم تنفيذه لاحقاً
    res.json({
      success: true,
      message: 'سيتم توفير وظيفة التصدير إلى PDF قريباً'
    });
  })
);

/**
 * POST /api/licenses/export/excel
 * تصدير الرخص إلى Excel
 */
router.post(
  '/export/excel',
  authorize(['admin', 'license_manager', 'compliance_officer']),
  asyncHandler(async (req, res) => {
    // سيتم تنفيذه لاحقاً
    res.json({
      success: true,
      message: 'سيتم توفير وظيفة التصدير إلى Excel قريباً'
    });
  })
);

// ==================== ERROR HANDLING ====================

// معالج الأخطاء الشاملة
router.use((err, req, res, next) => {
  logger.error('License API Error:', err);

  const status = err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred';

  res.status(status).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

module.exports = router;
