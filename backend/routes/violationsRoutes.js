/**
 * =====================================================
 * VIOLATIONS ROUTES - مسارات المخالفات
 * =====================================================
 */

const express = require('express');
const router = express.Router();
const violationsService = require('../services/violationsService');

/**
 * POST /api/violations
 * تسجيل مخالفة جديدة
 */
router.post('/', async (req, res) => {
  try {
    const result = await violationsService.createViolation(req.body);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/violations
 * الحصول على المخالفات (مع فلاتر)
 */
router.get('/', async (req, res) => {
  try {
    const filters = {
      vehicleId: req.query.vehicleId,
      driverId: req.query.driverId,
      status: req.query.status,
      type: req.query.type,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    };

    const result = await violationsService.getViolations(filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/violations/:id/status
 * تحديث حالة مخالفة
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, ...data } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'الحالة مطلوبة',
      });
    }

    const result = await violationsService.updateViolationStatus(id, status, data);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/violations/driver/:driverId/points
 * الحصول على نقاط المخالفات للسائق
 */
router.get('/driver/:driverId/points', async (req, res) => {
  try {
    const { driverId } = req.params;
    const result = await violationsService.getDriverViolationPoints(driverId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/violations/statistics
 * إحصائيات المخالفات
 */
router.get('/statistics', async (req, res) => {
  try {
    const filters = {
      vehicleId: req.query.vehicleId,
      driverId: req.query.driverId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const result = await violationsService.getViolationStatistics(filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/violations/types
 * أنواع المخالفات المتاحة
 */
router.get('/types', (req, res) => {
  try {
    const result = violationsService.getViolationTypes();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/violations/alerts
 * تنبيهات المخالفات
 */
router.get('/alerts', async (req, res) => {
  try {
    const vehicleId = req.query.vehicleId;
    const driverId = req.query.driverId;

    const result = await violationsService.getViolationAlerts(vehicleId, driverId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
