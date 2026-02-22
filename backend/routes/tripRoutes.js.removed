/**
 * Trip Routes - مسارات الرحلات
 *
 * API endpoints لإدارة الرحلات
 * ✅ CRUD Operations
 * ✅ Trip Tracking
 * ✅ Statistics
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const authenticate = authenticateToken;
const tripService = require('../services/tripService');
const logger = require('../utils/logger');

// ==================== إدارة الرحلات ====================

/**
 * @route   GET /api/trips
 * @desc    الحصول على جميع الرحلات
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      vehicle: req.query.vehicle,
      driver: req.query.driver,
      startDate: req.query.startDate,
    };

    const result = await tripService.getAllTrips(filters);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في جلب الرحلات:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/trips/statistics
 * @desc    الحصول على إحصائيات الرحلات
 * @access  Private
 */
router.get('/statistics', authenticate, async (req, res) => {
  try {
    const filters = {
      vehicle: req.query.vehicle,
      driver: req.query.driver,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const result = await tripService.getTripStatistics(filters);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في حساب الإحصائيات:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/trips/:id
 * @desc    الحصول على تفاصيل رحلة معينة
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await tripService.getTripDetails(req.params.id);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في جلب تفاصيل الرحلة:', error);
    res.status(404).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/trips
 * @desc    إنشاء رحلة جديدة
 * @access  Private
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const result = await tripService.createTrip(req.body);
    res.status(201).json(result);
  } catch (error) {
    logger.error('خطأ في إنشاء الرحلة:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   PUT /api/trips/:id
 * @desc    تحديث معلومات رحلة
 * @access  Private
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const result = await tripService.updateTrip(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في تحديث الرحلة:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/trips/:id/end
 * @desc    إنهاء رحلة
 * @access  Private
 */
router.post('/:id/end', authenticate, async (req, res) => {
  try {
    const result = await tripService.endTrip(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في إنهاء الرحلة:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   DELETE /api/trips/:id
 * @desc    حذف رحلة
 * @access  Private
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await tripService.deleteTrip(req.params.id);
    res.json(result);
  } catch (error) {
    logger.error('خطأ في حذف الرحلة:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
