const express = require('express');
const router = express.Router();
const SmartImmersiveService = require('../services/smartImmersive.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/immersive-smart/prescribe
 * @desc Generate VR/AR settings for a patient session
 */
router.post('/prescribe', authorizeRole(['THERAPIST', 'DOCTOR']), async (req, res) => {
  try {
    const result = await SmartImmersiveService.prescribeVRScenario(req.body.patientId, req.body.clinicalGoal);
    res.json({ success: true, prescription: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/immersive-smart/telemetry
 * @desc Ingest data from VR Headset
 */
router.post('/telemetry', async (req, res) => {
  try {
    // Typically called by the VR App itself (Unity/Unreal)
    const result = await SmartImmersiveService.analyzeVRTelemetry(req.body.sessionId, req.body.telemetry);
    res.json({ success: true, analysis: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

