const express = require('express');
const router = express.Router();
const SmartFamilyPortalService = require('../services/smartFamilyPortal.service');
const { authenticateToken } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route GET /api/family-portal/feed/:id
 * @desc Get aggregated home screen data for mobile app
 */
router.get('/feed/:id', async (req, res) => {
  try {
    const feed = await SmartFamilyPortalService.getHomeFeed(req.params.id);
    res.json({ success: true, data: feed });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route POST /api/family-portal/cancel-session
 * @desc Attempt to cancel a session (checks 24h policy)
 */
router.post('/cancel-session', async (req, res) => {
  try {
    const { sessionId, reason } = req.body;
    const result = await SmartFamilyPortalService.requestCancellation(sessionId, reason);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
