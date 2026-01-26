/**
 * =====================================================
 * FUEL ROUTES - مسارات الوقود
 * =====================================================
 */

const express = require('express');
const router = express.Router();
const fuelService = require('../services/fuelService');

/**
 * POST /api/fuel
 * تسجيل تعبئة وقود جديدة
 */
router.post('/', async (req, res) => {
  try {
    const result = await fuelService.recordFuelFill(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/fuel/vehicle/:vehicleId
 * الحصول على سجلات الوقود لمركبة
 */
router.get('/vehicle/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const options = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      fuelType: req.query.fuelType,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    };

    const result = await fuelService.getFuelHistory(vehicleId, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/fuel/efficiency/:vehicleId
 * حساب كفاءة استهلاك الوقود
 */
router.get('/efficiency/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const options = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const result = await fuelService.calculateFuelEfficiency(vehicleId, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/fuel/analysis/:vehicleId
 * تحليل تكاليف الوقود
 */
router.get('/analysis/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const options = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const result = await fuelService.getFuelCostAnalysis(vehicleId, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/fuel/compare/:vehicleId
 * مقارنة كفاءة الوقود بين فترتين
 */
router.post('/compare/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { period1, period2 } = req.body;

    if (!period1 || !period2) {
      return res.status(400).json({
        success: false,
        error: 'يجب توفير فترتين للمقارنة',
      });
    }

    const result = await fuelService.compareFuelEfficiency(vehicleId, period1, period2);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/fuel/alerts/:vehicleId
 * تنبيهات الوقود
 */
router.get('/alerts/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const result = await fuelService.getFuelAlerts(vehicleId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/fuel/prices
 * الحصول على أسعار الوقود الحالية
 */
router.get('/prices', (req, res) => {
  try {
    const result = fuelService.getCurrentPrices();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/fuel/prices
 * تحديث أسعار الوقود
 */
router.put('/prices', (req, res) => {
  try {
    const result = fuelService.updateFuelPrices(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
