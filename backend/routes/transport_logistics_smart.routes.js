const express = require('express');
const router = express.Router();
const SmartTransportLogisticsService = require('../services/smartTransportLogistics.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/transport-logistics-smart/optimize
 * @desc Generate efficient path for school bus
 */
router.post('/optimize', authorizeRole(['ADMIN', 'TRANSPORT_MANAGER']), async (req, res) => {
  try {
    const result = await SmartTransportLogisticsService.optimizeDailyRoute(req.body.busId, req.body.students);
    res.json({ success: true, route: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/transport-logistics-smart/track/:studentId
 * @desc Parent view of bus location
 */
router.get('/track/:studentId', authorizeRole(['PARENT', 'ADMIN']), async (req, res) => {
  try {
    const result = await SmartTransportLogisticsService.getBusLocation(req.params.studentId);
    res.json({ success: true, tracking: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
