/**
 * Driver Training & Certification Routes - مسارات تدريب وشهادات السائقين
 */

const express = require('express');
const router = express.Router();
const DriverTrainingController = require('../controllers/driverTrainingController');
const { protect, authorize } = require('../middleware/auth');

// ─── Training Programs ──────────────────────────────────────────────

/**
 * @route   POST /api/driver-training
 * @desc    إنشاء برنامج تدريبي
 * @access  Private (Admin, Manager)
 */
router.post('/', protect, authorize('admin', 'manager'), DriverTrainingController.createTraining);

/**
 * @route   GET /api/driver-training
 * @desc    جلب جميع البرامج التدريبية
 * @access  Private
 */
router.get('/', protect, DriverTrainingController.getAllTrainings);

/**
 * @route   GET /api/driver-training/statistics
 * @desc    إحصائيات التدريب
 * @access  Private
 */
router.get('/statistics', protect, DriverTrainingController.getStatistics);

/**
 * @route   GET /api/driver-training/driver/:driverId
 * @desc    تدريبات السائق
 * @access  Private
 */
router.get('/driver/:driverId', protect, DriverTrainingController.getDriverTrainings);

/**
 * @route   GET /api/driver-training/:id
 * @desc    جلب برنامج تدريبي
 * @access  Private
 */
router.get('/:id', protect, DriverTrainingController.getTrainingById);

/**
 * @route   PUT /api/driver-training/:id
 * @desc    تحديث برنامج تدريبي
 * @access  Private (Admin, Manager)
 */
router.put('/:id', protect, authorize('admin', 'manager'), DriverTrainingController.updateTraining);

/**
 * @route   POST /api/driver-training/:id/enroll
 * @desc    تسجيل سائق في برنامج
 * @access  Private (Admin, Manager)
 */
router.post(
  '/:id/enroll',
  protect,
  authorize('admin', 'manager'),
  DriverTrainingController.enrollDriver
);

/**
 * @route   PUT /api/driver-training/:id/result/:driverId
 * @desc    تحديث نتيجة المشارك
 * @access  Private (Admin, Manager)
 */
router.put(
  '/:id/result/:driverId',
  protect,
  authorize('admin', 'manager'),
  DriverTrainingController.updateParticipantResult
);

/**
 * @route   POST /api/driver-training/:id/certificate
 * @desc    إصدار شهادة
 * @access  Private (Admin, Manager)
 */
router.post(
  '/:id/certificate',
  protect,
  authorize('admin', 'manager'),
  DriverTrainingController.issueCertificate
);

// ─── Certifications ─────────────────────────────────────────────────

/**
 * @route   POST /api/driver-training/certifications
 * @desc    إنشاء شهادة مباشرة
 * @access  Private (Admin, Manager)
 */
router.post(
  '/certifications',
  protect,
  authorize('admin', 'manager'),
  DriverTrainingController.createCertification
);

/**
 * @route   GET /api/driver-training/certifications/expiring
 * @desc    شهادات تنتهي قريباً
 * @access  Private
 */
router.get('/certifications/expiring', protect, DriverTrainingController.getExpiringCertifications);

/**
 * @route   GET /api/driver-training/certifications/expired
 * @desc    شهادات منتهية
 * @access  Private
 */
router.get('/certifications/expired', protect, DriverTrainingController.getExpiredCertifications);

/**
 * @route   GET /api/driver-training/certifications/driver/:driverId
 * @desc    شهادات السائق
 * @access  Private
 */
router.get(
  '/certifications/driver/:driverId',
  protect,
  DriverTrainingController.getDriverCertifications
);

/**
 * @route   PUT /api/driver-training/certifications/:id
 * @desc    تحديث شهادة
 * @access  Private (Admin, Manager)
 */
router.put(
  '/certifications/:id',
  protect,
  authorize('admin', 'manager'),
  DriverTrainingController.updateCertification
);

/**
 * @route   POST /api/driver-training/certifications/:id/renew
 * @desc    تجديد شهادة
 * @access  Private (Admin, Manager)
 */
router.post(
  '/certifications/:id/renew',
  protect,
  authorize('admin', 'manager'),
  DriverTrainingController.renewCertification
);

module.exports = router;
