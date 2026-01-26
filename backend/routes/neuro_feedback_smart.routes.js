const express = require('express');
const router = express.Router();
const SmartNeuroFeedbackService = require('../services/smartNeuroFeedback.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/neuro-smart/stream
 * @desc Ingest a data packet from EEG headset
 */
router.post('/stream', authorizeRole(['THERAPIST', 'SYSTEM']), async (req, res) => {
  try {
    const result = await SmartNeuroFeedbackService.processEEGStream(req.body.patientId, req.body.waveData);
    // Also check for anomalies
    const anomaly = await SmartNeuroFeedbackService.checkAnomalies(req.body.waveData);

    res.json({ success: true, telemetry: result, alert: anomaly });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/neuro-smart/calibrate
 * @desc Run baseline calibration
 */
router.post('/calibrate', authorizeRole(['THERAPIST']), async (req, res) => {
  try {
    const result = await SmartNeuroFeedbackService.calibrateBaseline(req.body.patientId);
    res.json({ success: true, calibration: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

