const express = require('express');
const router = express.Router();
const SmartReceptionService = require('../services/smartReception.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

// Public route for Kiosk (Secured by API Key usually, simpler here)
router.post('/kiosk-checkin', async (req, res) => {
  try {
    const result = await SmartReceptionService.selfCheckIn(req.body.type, req.body.identifier);
    res.json({ success: true, ticket: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.use(authenticateToken);

/**
 * @route POST /api/reception-smart/visitor-badge
 * @desc Issue digital pass for guest
 */
router.post('/visitor-badge', authorizeRole(['RECEPTION', 'SECURITY']), async (req, res) => {
  try {
    const result = await SmartReceptionService.issueVisitorBadge(req.body);
    res.json({ success: true, badge: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/reception-smart/queue-status
 * @desc Dashboard for waiting room
 */
router.get('/queue-status', async (req, res) => {
  try {
    const result = await SmartReceptionService.getQueueMetrics();
    res.json({ success: true, metrics: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

