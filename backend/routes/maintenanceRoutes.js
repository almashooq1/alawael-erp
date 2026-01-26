/**
 * =====================================================
 * MAINTENANCE ROUTES - مسارات الصيانة
 * =====================================================
 */

const express = require('express');
const router = express.Router();
const maintenanceService = require('../services/maintenanceService');

/**
 * POST /api/maintenance
 * إنشاء سجل صيانة جديد
 */
router.post('/', async (req, res) => {
  try {
    const result = await maintenanceService.createMaintenanceRecord(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/maintenance/vehicle/:vehicleId
 * الحصول على سجلات الصيانة لمركبة
 */
router.get('/vehicle/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const options = {
      type: req.query.type,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    };

    const result = await maintenanceService.getMaintenanceHistory(vehicleId, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/maintenance/schedule
 * جدولة صيانة جديدة
 */
router.post('/schedule', async (req, res) => {
  try {
    const result = await maintenanceService.scheduleMaintenanceService(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/maintenance/scheduled/:vehicleId?
 * الحصول على الصيانات المجدولة
 */
router.get('/scheduled/:vehicleId?', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const result = await maintenanceService.getScheduledMaintenance(vehicleId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/maintenance/recommendations/:vehicleId
 * الحصول على توصيات الصيانة
 */
router.get('/recommendations/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const currentMileage = parseInt(req.query.mileage) || 0;

    const result = await maintenanceService.getMaintenanceRecommendations(
      vehicleId,
      currentMileage
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/maintenance/statistics
 * إحصائيات الصيانة
 */
router.get('/statistics', async (req, res) => {
  try {
    const options = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const result = await maintenanceService.getMaintenanceStatistics(options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/maintenance/types
 * الحصول على أنواع الصيانة المتاحة
 */
router.get('/types', (req, res) => {
  try {
    const result = maintenanceService.getMaintenanceTypes();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/maintenance/:recordId
 * تحديث سجل صيانة
 */
router.put('/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    const result = await maintenanceService.updateMaintenanceRecord(recordId, req.body);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/maintenance/:recordId
 * حذف سجل صيانة
 */
router.delete('/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    const result = await maintenanceService.deleteMaintenanceRecord(recordId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
