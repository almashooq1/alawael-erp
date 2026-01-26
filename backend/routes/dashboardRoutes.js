/**
 * =====================================================
 * DASHBOARD ROUTES - مسارات لوحة التحكم
 * =====================================================
 */

const express = require('express');
const router = express.Router();
const dashboardService = require('../services/dashboardService');

// Redis Cache Middleware (NEW - Phase 2)
const { cacheMiddleware } = require('../middleware/cache.middleware');

/**
 * GET /api/dashboard
 * لوحة التحكم الرئيسية
 * Cache: 60 seconds (real-time updates)
 */
router.get('/', cacheMiddleware(60), async (req, res) => {
  try {
    const result = await dashboardService.getMainDashboard();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/dashboard/vehicle/:vehicleId
 * لوحة تحكم مركبة محددة
 * Cache: 5 minutes (semi-static data)
 */
router.get('/vehicle/:vehicleId', cacheMiddleware(300), async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const result = await dashboardService.getVehicleDashboard(vehicleId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/dashboard/driver/:driverId
 * لوحة تحكم سائق محدد
 * Cache: 5 minutes (semi-static data)
 */
router.get('/driver/:driverId', cacheMiddleware(300), async (req, res) => {
  try {
    const { driverId } = req.params;
    const result = await dashboardService.getDriverDashboard(driverId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/dashboard/statistics
 * إحصائيات متقدمة
 */
router.get('/statistics', async (req, res) => {
  try {
    const period = req.query.period || 'month';
    const result = await dashboardService.getAdvancedStatistics(period);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
