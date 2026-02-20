/**
 * Driver Routes - مسارات إدارة السائقين
 */

const express = require('express');
const DriverController = require('../controllers/driver.controller');

const router = express.Router();

// ===== السائقين الأساسيين =====

/**
 * إنشاء سائق جديد
 * POST /api/drivers
 */
router.post('/', DriverController.createDriver);

/**
 * جلب جميع السائقين
 * GET /api/drivers
 */
router.get('/', DriverController.getAllDrivers);

/**
 * جلب سائق بواسطة ID
 * GET /api/drivers/:id
 */
router.get('/:id', DriverController.getDriver);

/**
 * تحديث بيانات السائق
 * PUT /api/drivers/:id
 */
router.put('/:id', DriverController.updateDriver);

/**
 * حذف سائق (إلغاء التفعيل)
 * DELETE /api/drivers/:id
 */
router.delete('/:id', DriverController.deleteDriver);

// ===== الأداء والتقييم =====

/**
 * جلب تقرير الأداء الشامل
 * GET /api/drivers/:id/performance
 */
router.get('/:id/performance', DriverController.getPerformance);

/**
 * جلب إحصائيات عامة عن السائقين
 * GET /api/drivers/analytics/overview
 */
router.get('/analytics/overview', DriverController.getAnalyticsOverview);

// ===== الانتهاكات =====

/**
 * إضافة انتهاك للسائق
 * POST /api/drivers/:id/violations
 */
router.post('/:id/violations', DriverController.addViolation);

/**
 * جلب قائمة الانتهاكات
 * GET /api/drivers/:id/violations
 */
router.get('/:id/violations', DriverController.getViolations);

// ===== الشهادات =====

/**
 * إضافة شهادة للسائق
 * POST /api/drivers/:id/certifications
 */
router.post('/:id/certifications', DriverController.addCertification);

// ===== تعيين السيارات =====

/**
 * تعيين سيارة للسائق
 * POST /api/drivers/:id/assign-vehicle
 */
router.post('/:id/assign-vehicle', DriverController.assignVehicle);

// ===== التدريب =====

/**
 * جلب السائقين الذين يحتاجون تدريب
 * GET /api/drivers/training/needs
 */
router.get('/training/needs', DriverController.getDriversNeedingTraining);

// ===== التنبؤات والمقاييس =====

/**
 * جلب أفضل السائقين
 * GET /api/drivers/top/performers
 */
router.get('/top/performers', DriverController.getTopPerformers);

/**
 * التنبؤ برخصات القيادة التي ستنتهي قريباً
 * GET /api/drivers/predictions/expiring-licenses
 */
router.get('/predictions/expiring-licenses', DriverController.getExpiringLicenses);

/**
 * جلب التنبؤ بمعدل الغياب
 * GET /api/drivers/:id/predictions/absence
 */
router.get('/:id/predictions/absence', DriverController.getAbsencePrediction);

/**
 * جلب اتجاه الأداء
 * GET /api/drivers/:id/predictions/trend
 */
router.get('/:id/predictions/trend', DriverController.getPerformanceTrend);

module.exports = router;
