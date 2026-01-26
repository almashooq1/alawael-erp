const express = require('express');
const router = express.Router();
const SmartInventoryService = require('../services/smartInventory.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route GET /api/inventory-smart/predictions
 * @desc Get AI Predictions for stock depletion
 */
router.get('/predictions', authorizeRole(['ADMIN', 'INVENTORY_MANAGER']), async (req, res) => {
  try {
    const data = await SmartInventoryService.predictDepletion();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route GET /api/inventory-smart/maintenance
 * @desc Check health status of expensive rehab equipment
 */
router.get('/maintenance', authorizeRole(['ADMIN', 'INVENTORY_MANAGER']), async (req, res) => {
  try {
    const alerts = await SmartInventoryService.checkMaintenanceStatus();
    res.json({ success: true, alerts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

