const express = require('express');
const router = express.Router();
const SmartTelehealthService = require('../services/smartTelehealth.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/telehealth-smart/init
 * @desc Initialize a secure video room for a session
 */
router.post('/init', authorizeRole(['THERAPIST', 'ADMIN', 'CARE_MANAGER']), async (req, res) => {
  try {
    const { sessionId, therapistId, patientId } = req.body;
    const room = await SmartTelehealthService.createSessionRoom(sessionId, therapistId, patientId);
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route POST /api/telehealth-smart/analyze-engagement
 * @desc Analyze session participation metrics (from WebRTC hooks)
 */
router.post('/analyze-engagement', authorizeRole(['THERAPIST', 'ADMIN']), async (req, res) => {
  try {
    // Mock payload from video server
    const analysis = await SmartTelehealthService.analyzeSessionEngagement(req.body);
    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
