const express = require('express');
const router = express.Router();
const SmartProcurementService = require('../services/smartProcurement.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route GET /api/procurement-smart/predict-shortages
 * @desc AI Inventory Forecast
 */
router.get('/predict-shortages', authorizeRole(['ADMIN', 'FINANCE', 'LOGISTICS']), async (req, res) => {
  try {
    const result = await SmartProcurementService.predictShortages();
    res.json({ success: true, forecast: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/procurement-smart/rfq
 * @desc Auto-generate Request for Quote
 */
router.post('/rfq', authorizeRole(['ADMIN', 'FINANCE']), async (req, res) => {
  try {
    const result = await SmartProcurementService.generateAutoRFQ(req.body.items);
    res.json({ success: true, rfq: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
